// pages/events/[eventId]/analysis.tsx

import {
  ApiGetEventAnalysisResponse,
  ApiPutEventAnalysisPayload,
  ApiPutEventAnalysisResponse,
} from '@/pages/api/events/[eventId]/analysis';

import { itemCompareFn, translateSize } from '@/lib/models/item';

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalBarRoundedIcon from '@mui/icons-material/LocalBarRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { ItemCategory } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';

type AnalysisData = ApiGetEventAnalysisResponse;

const CATEGORY_ORDER: ItemCategory[] = [
  'WATER',
  'SOFTDRINK',
  'BEER',
  'WINE',
  'CHAMPAGNE',
  'LIQUOR',
  'SPECIALS',
];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  WATER: 'Wasser',
  SOFTDRINK: 'Softdrinks',
  BEER: 'Bier',
  WINE: 'Wein',
  CHAMPAGNE: 'Champagner',
  LIQUOR: 'Spirituosen',
  SPECIALS: 'Sonstiges',
};

export default function EventAnalysisPage({ eventId }: { eventId: string }) {
  const [data, setData] = useState<AnalysisData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const [cashRevenue, setCashRevenue] = useState('');
  const [cardRevenue, setCardRevenue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    axios
      .get<AnalysisData>(`/api/events/${eventId}/analysis`)
      .then(({ data }) => {
        setData(data);

        setCashRevenue(
          centsToInputValue(data.revenue.openBar.cashRevenueCents),
        );

        setCardRevenue(
          centsToInputValue(data.revenue.openBar.cardRevenueCents),
        );

        setNote(data.note || '');
      })
      .catch((error) => {
        console.error(error);
        setError(getApiErrorMessage(error));
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const groupedRows = useMemo(() => {
    if (!data) return [];

    const meaningfulRows = data.analysis.rows
      .filter((row) => {
        return (
          row.openingUnits !== 0 ||
          row.employeeDrinkUnits !== 0 ||
          row.closingUnits !== 0 ||
          row.waiterUnits !== 0 ||
          row.waiterMilliliters !== 0 ||
          row.openBarEquivalentUnits !== 0
        );
      })
      .sort((a, b) => itemCompareFn(a.item, b.item));

    return CATEGORY_ORDER.map((category) => ({
      category,
      rows: meaningfulRows.filter((row) => row.item.category === category),
    })).filter((group) => group.rows.length > 0);
  }, [data]);

  const saveOpenBarRevenue = async () => {
    const openBarCashRevenueCents = inputValueToCents(cashRevenue);
    const openBarCardRevenueCents = inputValueToCents(cardRevenue);

    if (openBarCashRevenueCents === null || openBarCardRevenueCents === null) {
      setError(
        'Bitte gib gültige Umsätze mit maximal zwei Nachkommastellen ein.',
      );

      return;
    }

    setSaving(true);
    setSaved(false);
    setError(undefined);

    const payload: ApiPutEventAnalysisPayload = {
      openBarCashRevenueCents,
      openBarCardRevenueCents,
      analysisNote: note,
    };

    try {
      const { data: response } = await axios.put<ApiPutEventAnalysisResponse>(
        `/api/events/${eventId}/analysis`,
        payload,
      );

      setData((currentData) => {
        if (!currentData) return currentData;

        const openBarTotalRevenueCents =
          response.openBarCashRevenueCents + response.openBarCardRevenueCents;

        const cashTotal =
          currentData.revenue.waiter.cashRevenueCents +
          response.openBarCashRevenueCents;

        const cardTotal =
          currentData.revenue.waiter.cardRevenueCents +
          response.openBarCardRevenueCents;

        return {
          ...currentData,
          note: response.analysisNote,

          revenue: {
            ...currentData.revenue,

            openBar: {
              cashRevenueCents: response.openBarCashRevenueCents,
              cardRevenueCents: response.openBarCardRevenueCents,
              totalRevenueCents: openBarTotalRevenueCents,
            },

            total: {
              cashRevenueCents: cashTotal,
              cardRevenueCents: cardTotal,
              totalRevenueCents:
                cashTotal +
                cardTotal +
                currentData.revenue.waiter.prepaidMinimumSpendCents,
            },
          },
        };
      });

      setSaved(true);
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AnalysisSkeleton />;
  }

  if (!data) {
    return (
      <PageWrapper>
        <Alert severity="error">
          {error || 'Die Event-Abrechnung konnte nicht geladen werden.'}
        </Alert>

        <Button
          component={Link}
          href={`/events/${eventId}`}
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
        >
          Zur Event-Übersicht
        </Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <AnalysisHeader eventId={eventId} eventName={data.event.name} />

      <Stack spacing={2} sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(undefined)}>
            {error}
          </Alert>
        )}

        {saved && (
          <Alert severity="success" onClose={() => setSaved(false)}>
            Die Thekenumsätze wurden gespeichert.
          </Alert>
        )}

        {data.analysis.warnings.length > 0 && (
          <Alert severity="warning">
            <Typography fontWeight={600}>
              Die Auswertung enthält {data.analysis.warnings.length}{' '}
              {data.analysis.warnings.length === 1 ? 'Hinweis' : 'Hinweise'}.
            </Typography>

            <Box
              component="ul"
              sx={{
                mt: 1,
                mb: 0,
                pl: 2.5,
              }}
            >
              {data.analysis.warnings.map((warning, index) => (
                <Typography
                  component="li"
                  variant="body2"
                  key={`${warning.code}-${index}`}
                  sx={{ mb: 0.5 }}
                >
                  {warning.message}
                </Typography>
              ))}
            </Box>
          </Alert>
        )}
      </Stack>

      <Section title="Umsatzübersicht" sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Reservierungen MVZ"
              value={formatCurrency(
                data.revenue.waiter.prepaidMinimumSpendCents,
              )}
              helper="Vorab bezahlt"
              icon={<LocalBarRoundedIcon />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Tischkellner"
              value={formatCurrency(data.revenue.waiter.totalRevenueCents)}
              helper="Gemeldete Einnahmen"
              icon={<LocalBarRoundedIcon />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Offene Theke"
              value={formatCurrency(data.revenue.openBar.totalRevenueCents)}
              helper="Gemeldete Einnahmen"
              icon={<PointOfSaleRoundedIcon />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 12 }}>
            <MetricCard
              title="Gesamtumsatz"
              value={formatCurrency(data.revenue.total.totalRevenueCents)}
              helper="MVZ, Tischkellner und Theke"
              icon={<EuroRoundedIcon />}
              emphasized
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Umsätze offene Theke" sx={{ mt: 3 }}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              Trage hier die tatsächlich gemeldeten Einnahmen der offenen Theke
              ein. Die Warenmengen werden unabhängig davon aus den Beständen
              berechnet.
            </Typography>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Barumsatz offene Theke"
                  value={cashRevenue}
                  onChange={(event) => setCashRevenue(event.target.value)}
                  fullWidth
                  inputProps={{
                    inputMode: 'decimal',
                  }}
                  InputProps={{
                    endAdornment: (
                      <Typography color="text.secondary">€</Typography>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Kartenzahlungen offene Theke"
                  value={cardRevenue}
                  onChange={(event) => setCardRevenue(event.target.value)}
                  fullWidth
                  inputProps={{
                    inputMode: 'decimal',
                  }}
                  InputProps={{
                    endAdornment: (
                      <Typography color="text.secondary">€</Typography>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Notiz zur Abrechnung"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              minRows={3}
              fullWidth
              placeholder="Beispielsweise Fehlmengen, Rückgaben oder Auffälligkeiten"
              sx={{ mt: 2 }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<SaveRoundedIcon />}
              disabled={saving}
              onClick={saveOpenBarRevenue}
              sx={{
                mt: 2,
                borderRadius: 2,
                py: 1.25,
              }}
            >
              {saving ? 'Speichert ...' : 'Thekenumsätze speichern'}
            </Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Warenfluss" sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Betroffene Artikel"
              value={`${data.analysis.summary.affectedItemCount}`}
              helper="Artikel mit Warenbewegung"
              icon={<Inventory2RoundedIcon />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Geschätzter Thekenumsatz"
              value={formatCurrency(
                data.analysis.summary.openBarEstimatedRevenueCents,
              )}
              helper="Direkte Preise und Rezept-Hochrechnungen"
              icon={<PointOfSaleRoundedIcon />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              title="Auffälligkeiten"
              value={`${data.analysis.summary.negativeRowCount}`}
              helper="Negative Verbrauchswerte"
              icon={<ErrorOutlineRoundedIcon />}
              warning={data.analysis.summary.negativeRowCount > 0}
            />
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          Der geschätzte Thekenumsatz basiert auf den hinterlegten
          Artikelpreisen. Artikel ohne eigenen Verkaufspreis werden anhand ihrer
          verkaufbaren Rezeptartikel hochgerechnet. Da die offenen
          Thekenverkäufe nicht einzeln boniert wurden, handelt es sich um eine
          Näherung.
        </Alert>
      </Section>

      <Section title="Abgeleitete Thekenverkäufe" sx={{ mt: 3 }}>
        {data.analysis.derivedOpenBarSales.length === 0 ? (
          <Alert severity="info">
            Es wurden keine zusammengesetzten Verkäufe aus dem Warenverbrauch
            abgeleitet.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {data.analysis.derivedOpenBarSales.map((sale) => (
              <DerivedOpenBarSaleCard key={sale.item.id} sale={sale} />
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Artikelübersicht" sx={{ mt: 3 }}>
        {groupedRows.length === 0 ? (
          <Alert severity="info">
            Für dieses Event wurden keine Warenbewegungen gefunden.
          </Alert>
        ) : (
          <Stack spacing={3}>
            {groupedRows.map((group) => (
              <Box key={group.category}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mb: 1,
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}
                >
                  {CATEGORY_LABELS[group.category]}
                </Typography>

                <Stack spacing={1.5}>
                  {group.rows.map((row) => (
                    <AnalysisItemCard key={row.item.id} row={row} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Section>

      <Button
        component={Link}
        href={`/events/${eventId}`}
        variant="outlined"
        fullWidth
        size="large"
        sx={{
          mt: 3,
          borderRadius: 2,
          py: 1.25,
        }}
      >
        Zur Event-Übersicht
      </Button>
    </PageWrapper>
  );
}

function AnalysisHeader({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        mx: -2,
        px: 2,
        py: 1.5,
        bgcolor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '88px minmax(0, 1fr) 88px',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Button
          component={Link}
          href={`/events/${eventId}`}
          variant="text"
          size="small"
          startIcon={<ArrowBackIosIcon fontSize="inherit" />}
          sx={{
            justifyContent: 'flex-start',
            minWidth: 0,
            px: 0,
            textTransform: 'none',
          }}
        >
          Zurück
        </Button>

        <Box
          sx={{
            minWidth: 0,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" color="primary" noWrap>
            Event-Abrechnung
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block' }}
          >
            {eventName}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <CheckCircleRoundedIcon color="success" />
        </Box>
      </Box>
    </Box>
  );
}

function Section({
  title,
  children,
  sx,
}: {
  title: string;
  children: ReactNode;
  sx?: Record<string, unknown>;
}) {
  return (
    <Box component="section" sx={sx}>
      <Typography
        variant="h6"
        sx={{
          mb: 1.5,
          color: 'primary.main',
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>

      {children}
    </Box>
  );
}

function DerivedOpenBarSaleCard({
  sale,
}: {
  sale: ApiGetEventAnalysisResponse['analysis']['derivedOpenBarSales'][number];
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: 'primary.light',
        bgcolor: 'primary.50',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Abgeleiteter Verkauf
            </Typography>

            <Typography
              variant="subtitle1"
              color="primary"
              sx={{ fontWeight: 700 }}
            >
              {sale.item.brand.name} {sale.item.name}
            </Typography>
          </Box>

          <Typography
            variant="subtitle1"
            color="primary"
            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {formatCurrency(sale.revenueCents)}
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="body2">
          {formatNumber(sale.inferenceIngredient.availableAmount)}{' '}
          {formatRecipeUnit(sale.inferenceIngredient.unit)} ÷{' '}
          {formatNumber(sale.inferenceIngredient.requiredAmountPerSale)}{' '}
          {formatRecipeUnit(sale.inferenceIngredient.unit)} je Verkauf ={' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            {formatNumber(sale.quantity)} × {sale.item.name}
          </Box>
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {formatNumber(sale.quantity)} × {formatCurrency(sale.item.priceCents)}{' '}
          ={' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            {formatCurrency(sale.revenueCents)}
          </Box>
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 1.5,
            mb: 0.5,
            fontWeight: 700,
          }}
        >
          Abgezogene Zutaten
        </Typography>

        <Stack spacing={0.25}>
          {sale.consumedIngredients.map((ingredient) => (
            <Typography
              key={ingredient.itemId}
              variant="caption"
              color="text.secondary"
            >
              - {formatConsumedIngredientAmount(ingredient)} {ingredient.name}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function formatRecipeUnit(unit: 'UNIT' | 'MILLILITER') {
  return unit === 'MILLILITER' ? 'ml' : 'Gebinde';
}

function formatConsumedIngredientAmount(ingredient: {
  amount: number;
  unit: 'UNIT' | 'MILLILITER';
  sizeInMl: number | null;
}) {
  if (ingredient.unit === 'MILLILITER' && ingredient.sizeInMl) {
    return `${formatNumber(ingredient.amount / ingredient.sizeInMl)} Fl.`;
  }

  return `${formatNumber(ingredient.amount)} ${
    ingredient.unit === 'MILLILITER' ? 'ml' : 'Geb.'
  }`;
}

function AnalysisItemCard({
  row,
}: {
  row: ApiGetEventAnalysisResponse['analysis']['rows'][number];
}) {
  const warning = row.hasNegativeOpenBarConsumption;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: warning ? 'error.light' : 'divider',
        bgcolor: warning ? 'error.50' : 'background.paper',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {row.item.brand.name}
            </Typography>

            <Typography
              variant="subtitle1"
              color="primary"
              sx={{
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              {row.item.name}{' '}
              {row.item.sizeInMl ? `(${translateSize(row.item.sizeInMl)})` : ''}
            </Typography>
          </Box>

          {warning && <ErrorOutlineRoundedIcon color="error" />}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <StockValue label="Anfang" value={`${row.openingUnits}`} />
          </Grid>

          <Grid size={{ xs: 6, sm: 2.4 }}>
            <StockValue
              label="Tischkellner"
              value={formatWaiterUsage(row.waiterUnits, row.waiterMilliliters)}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 2.4 }}>
            <StockValue label="MA" value={`${row.employeeDrinkUnits}`} />
          </Grid>

          <Grid size={{ xs: 6, sm: 2.4 }}>
            <StockValue label="Ende" value={`${row.closingUnits}`} />
          </Grid>

          <Grid size={{ xs: 12, sm: 2.4 }}>
            <StockValue
              label="Offene Theke"
              value={formatEquivalentUnits(row.openBarEquivalentUnits)}
              emphasized
              warning={warning}
            />
          </Grid>
        </Grid>

        {row.derivedProductAllocations.length > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 700,
              }}
            >
              Abzug für abgeleitete Verkäufe
            </Typography>

            <Stack spacing={0.5}>
              {row.derivedProductAllocations.map((allocation) => (
                <Typography
                  key={allocation.derivedSaleItem.id}
                  variant="body2"
                  color="text.secondary"
                >
                  - {formatNumber(allocation.amount)}{' '}
                  {formatRecipeUnit(allocation.unit)} für{' '}
                  {formatNumber(allocation.derivedSaleQuantity)} ×{' '}
                  {allocation.derivedSaleItem.name}
                </Typography>
              ))}
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Typography variant="body2">
              Verbleibender Einzelverbrauch:{' '}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {formatEquivalentUnits(row.openBarEquivalentUnits)}
              </Box>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 0.75,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Geschätzter Umsatz offene Theke
          </Typography>

          <Typography
            variant="subtitle2"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            {formatCurrency(row.openBarEstimatedRevenueCents)}
          </Typography>
        </Box>

        <OpenBarValuationCalculation row={row} />
      </CardContent>
    </Card>
  );
}

function OpenBarValuationCalculation({
  row,
}: {
  row: ApiGetEventAnalysisResponse['analysis']['rows'][number];
}) {
  const valuation = row.openBarValuation;

  if (row.openBarEquivalentUnits <= 0) {
    return null;
  }

  if (valuation.method === 'NONE') {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Für diesen Artikel konnte kein Verkaufspreis und kein geeignetes Rezept
        zur Umsatzschätzung gefunden werden.
      </Alert>
    );
  }

  if (
    valuation.method === 'DIRECT_ITEM_PRICE' &&
    valuation.directUnitPriceCents !== null
  ) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'action.hover',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}
        >
          Berechnung
        </Typography>

        <Typography variant="body2">
          {formatNumber(row.openBarEquivalentUnits)} Gebinde ×{' '}
          {formatCurrency(valuation.directUnitPriceCents)} ={' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            {formatCurrency(valuation.estimatedRevenueCents)}
          </Box>
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', fontWeight: 700 }}
      >
        Hochrechnung anhand von Rezeptartikeln
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, lineHeight: 1.5 }}
      >
        Dieser Artikel besitzt keinen eigenen Verkaufspreis. Deshalb werden
        mögliche Verkaufsszenarien berechnet und anschließend gemittelt.
      </Typography>

      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {valuation.recipeScenarios.map((scenario) => (
          <Box
            key={scenario.recipeItem.id}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {scenario.recipeItem.brand.name} {scenario.recipeItem.name}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.5,
                lineHeight: 1.55,
              }}
            >
              {formatRecipeAmount(
                scenario.consumedIngredientAmount,
                scenario.recipeUnit,
              )}{' '}
              ÷{' '}
              {formatRecipeAmount(
                scenario.recipeIngredientAmount,
                scenario.recipeUnit,
              )}{' '}
              = {formatNumber(scenario.theoreticalSalesCount)} Verkäufe
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                lineHeight: 1.55,
              }}
            >
              {formatNumber(scenario.theoreticalSalesCount)} ×{' '}
              {formatCurrency(scenario.recipeItem.priceCents)} ={' '}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {formatCurrency(scenario.estimatedRevenueCents)}
              </Box>
            </Typography>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="body2">
        Mittelwert aus {valuation.recipeScenarios.length}{' '}
        {valuation.recipeScenarios.length === 1 ? 'Szenario' : 'Szenarien'}:{' '}
        <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {formatCurrency(valuation.estimatedRevenueCents)}
        </Box>
      </Typography>
    </Box>
  );
}

function formatRecipeAmount(value: number, unit: 'UNIT' | 'MILLILITER') {
  if (unit === 'MILLILITER') {
    return `${formatNumber(value)} ml`;
  }

  return `${formatNumber(value)} Gebinde`;
}

function StockValue({
  label,
  value,
  emphasized,
  warning,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  warning?: boolean;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Typography
        variant="subtitle2"
        sx={{
          mt: 0.25,
          fontWeight: 700,
          color: warning
            ? 'error.main'
            : emphasized
              ? 'primary.main'
              : 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon,
  emphasized,
  warning,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
  emphasized?: boolean;
  warning?: boolean;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 3,
        borderColor: warning
          ? 'error.light'
          : emphasized
            ? 'primary.light'
            : 'divider',
        bgcolor: warning
          ? 'error.50'
          : emphasized
            ? 'primary.50'
            : 'background.paper',
      }}
    >
      <CardContent
        sx={{
          p: 2,
          '&:last-child': {
            pb: 2,
          },
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: warning ? 'error.100' : 'primary.50',
            color: warning ? 'error.main' : 'primary.main',
          }}
        >
          {icon}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {title}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            mt: 0.25,
            fontWeight: 700,
            color: warning
              ? 'error.main'
              : emphasized
                ? 'primary.main'
                : 'text.primary',
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

function formatWaiterUsage(units: number, milliliters: number) {
  const values: string[] = [];

  if (units !== 0) {
    values.push(`${formatNumber(units)} Geb.`);
  }

  if (milliliters !== 0) {
    values.push(`${formatNumber(milliliters)} ml`);
  }

  return values.length > 0 ? values.join(' + ') : '0';
}

function formatEquivalentUnits(value: number) {
  return `${formatNumber(value)} Geb.`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(valueInCents / 100);
}

function centsToInputValue(valueInCents: number) {
  return (valueInCents / 100).toFixed(2).replace('.', ',');
}

function inputValueToCents(value: string) {
  const normalizedValue = value.trim().replace(/\./g, '').replace(',', '.');

  if (!normalizedValue) return 0;

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  const axiosError = error as AxiosError<string>;

  const messages: Record<string, string> = {
    'Opening stock has not been completed':
      'Der Anfangsbestand wurde noch nicht abgeschlossen.',

    'Employee drinks have not been completed':
      'Die Mitarbeitergetränke wurden noch nicht abgeschlossen.',

    'Waiter settlement has not been completed':
      'Die Tischkellner-Abrechnung wurde noch nicht abgeschlossen.',

    'Closing stock has not been completed':
      'Der Endbestand wurde noch nicht abgeschlossen.',
  };

  return (
    messages[axiosError.response?.data || ''] ||
    axiosError.response?.data ||
    'Die Event-Abrechnung konnte nicht geladen werden.'
  );
}

function AnalysisSkeleton() {
  return (
    <PageWrapper>
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={150} />
        <Skeleton variant="rounded" height={280} />
        <Skeleton variant="rounded" height={150} />
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 960,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        pt: 1,
        pb: 4,
      }}
    >
      {children}
    </Box>
  );
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { eventId } = context.query;

  if (typeof eventId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      eventId,
    },
  };
}
