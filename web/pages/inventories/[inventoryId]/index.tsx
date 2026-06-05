import ExcelIcon from '@/components/icons/excel';
import { downloadTableAsExcel } from '@/lib/excel';

import {
  itemCompareFn,
  translateCategory,
  translateSize,
} from '@/lib/models/item';

import { ApiGetInventoryResponse } from '@/pages/api/inventories/[inventoryId]';

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import axios from 'axios';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function InventoryShowPage({
  inventoryId,
}: {
  inventoryId: string;
}) {
  const [inventory, setInventory] = useState<ApiGetInventoryResponse>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    axios
      .get<ApiGetInventoryResponse>(`/api/inventories/${inventoryId}`)
      .then(({ data }) => setInventory(data))
      .catch((error) => {
        console.error(error);

        setError('Die Inventur konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [inventoryId]);

  const orderedItems = useMemo(() => {
    if (!inventory) return [];

    return inventory.countings
      .map(({ amount, item }) => ({
        ...item,
        amountInStock: amount,
      }))
      .sort(itemCompareFn);
  }, [inventory]);

  const columnWidths = useMemo(() => {
    return {
      category:
        getMaxLength(orderedItems, (item) => translateCategory(item.category)) *
          8 +
        24,

      brand: getMaxLength(orderedItems, (item) => item.brand.name) * 8 + 24,

      name: getMaxLength(orderedItems, (item) => item.name) * 8 + 24,
    };
  }, [orderedItems]);

  const downloadExcel = () => {
    if (!inventory) return;

    const data = orderedItems.map((item) => ({
      Kategorie: translateCategory(item.category),
      Marke: item.brand.name,
      Artikel: item.name,
      Gebindegröße: translateSize(item.sizeInMl),
      Bestand: item.amountInStock,
      'Flaschen pro Kiste': item.amountPerCrate,
      Kästen: calculateCrates(item.amountInStock, item.amountPerCrate),
      'Aufgenommen am': formatDate(inventory.createdAt),
      Ersteller: inventory.creator.name,
    }));

    const dateStr = formatCompactDate(inventory.createdAt);

    const label = sanitizeFileName(inventory.label || 'Inventur');

    downloadTableAsExcel({
      data,
      fileName: `${label}-${dateStr}.xlsx`,
      sheetName: `Lagerbestand-${dateStr}`,
    });
  };

  return (
    <PageWrapper>
      <PageHeader inventory={inventory} loading={loading} />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <InventorySkeleton />}

      {!loading && inventory && (
        <>
          <InventorySummaryCard inventory={inventory} />

          {inventory.note && (
            <Card
              variant="outlined"
              sx={{
                mt: 2,
                borderRadius: 3,
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
                <Typography variant="subtitle2" color="text.secondary">
                  Notiz
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.75,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {inventory.note}
                </Typography>
              </CardContent>
            </Card>
          )}

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1.5}
            sx={{
              mt: 2.5,
            }}
          >
            {!inventory.done && (
              <Button
                component={Link}
                href={`/inventories/${inventoryId}/count`}
                variant="contained"
                color="warning"
                fullWidth
                startIcon={<EditRoundedIcon />}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                }}
              >
                Inventur fortsetzen
              </Button>
            )}

            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<ExcelIcon />}
              onClick={downloadExcel}
              sx={{
                borderRadius: 2,
                py: 1.25,
              }}
            >
              Bestandsliste herunterladen
            </Button>
          </Stack>

          <InventoryTable
            inventory={inventory}
            orderedItems={orderedItems}
            columnWidths={columnWidths}
          />
        </>
      )}
    </PageWrapper>
  );
}

function PageHeader({
  inventory,
  loading,
}: {
  inventory?: ApiGetInventoryResponse;
  loading: boolean;
}) {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        mx: {
          xs: -2,
          sm: -3,
        },
        px: {
          xs: 2,
          sm: 3,
        },
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
          href="/inventories"
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
          {loading ? (
            <>
              <Skeleton
                variant="text"
                sx={{
                  mx: 'auto',
                  maxWidth: 160,
                  fontSize: '0.75rem',
                }}
              />

              <Skeleton
                variant="text"
                sx={{
                  mx: 'auto',
                  maxWidth: 260,
                  fontSize: '1.5rem',
                }}
              />
            </>
          ) : (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                }}
              >
                Lagerinventur
              </Typography>

              <Typography
                variant="h6"
                color="primary"
                noWrap
                sx={{
                  fontWeight: 600,
                }}
              >
                {getInventoryLabel(inventory)}
              </Typography>
            </>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {inventory?.done ? (
            <CheckCircleRoundedIcon color="success" />
          ) : (
            <PendingActionsRoundedIcon color="warning" />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function InventorySummaryCard({
  inventory,
}: {
  inventory: ApiGetInventoryResponse;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2.5,
        borderRadius: 3,
      }}
    >
      <CardContent
        sx={{
          p: {
            xs: 2,
            sm: 2.5,
          },
          '&:last-child': {
            pb: {
              xs: 2,
              sm: 2.5,
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: inventory.done
                ? 'rgba(46, 125, 50, 0.10)'
                : 'rgba(237, 108, 2, 0.10)',
              color: inventory.done ? 'success.main' : 'warning.main',
            }}
          >
            <Inventory2RoundedIcon />
          </Box>

          <Box
            sx={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {getInventoryLabel(inventory)}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatDateTime(inventory.createdAt)}
              {' · '}
              von {inventory.creator.name}
            </Typography>

            <Chip
              size="small"
              color={inventory.done ? 'success' : 'warning'}
              variant="outlined"
              label={
                inventory.done
                  ? 'Inventur abgeschlossen'
                  : 'Inventur noch offen'
              }
              sx={{ mt: 1.5 }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <SummaryValue
            label="Gezählte Artikel"
            value={`${inventory.countings.length}`}
          />

          <SummaryValue
            label="Erstellt am"
            value={formatDate(inventory.createdAt)}
          />

          <SummaryValue
            label="Zuletzt geändert"
            value={formatDateTime(inventory.updatedAt)}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Typography
        variant="subtitle1"
        sx={{
          mt: 0.25,
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function InventoryTable({
  inventory,
  orderedItems,
  columnWidths,
}: {
  inventory: ApiGetInventoryResponse;
  orderedItems: Array<
    ApiGetInventoryResponse['countings'][number]['item'] & {
      amountInStock: number;
    }
  >;
  columnWidths: {
    category: number;
    brand: number;
    name: number;
  };
}) {
  return (
    <Box component="section" sx={{ mt: 3 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 1.5,
          color: 'primary.main',
          fontWeight: 600,
        }}
      >
        Artikelübersicht
      </Typography>

      {orderedItems.length === 0 ? (
        <Alert severity="info">
          In dieser Inventur wurden noch keine Artikel erfasst.
        </Alert>
      ) : (
        <TableContainer
          component={Card}
          variant="outlined"
          sx={{
            maxHeight: '65vh',
            borderRadius: 3,
          }}
        >
          <Table stickyHeader size="small" aria-label="Bestandsliste">
            <TableHead>
              <TableRow>
                <HeaderCell minWidth={columnWidths.category}>
                  Kategorie
                </HeaderCell>

                <HeaderCell minWidth={columnWidths.brand}>Marke</HeaderCell>

                <HeaderCell minWidth={columnWidths.name}>Artikel</HeaderCell>

                <HeaderCell minWidth={110}>Gebindegröße</HeaderCell>

                <HeaderCell minWidth={90} align="right">
                  Bestand
                </HeaderCell>

                <HeaderCell minWidth={135} align="right">
                  Flaschen pro Kiste
                </HeaderCell>

                <HeaderCell minWidth={90} align="right">
                  Kästen
                </HeaderCell>

                <HeaderCell minWidth={140} align="right">
                  Aufgenommen am
                </HeaderCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {orderedItems.map((item) => (
                <TableRow
                  hover
                  key={item.id}
                  sx={{
                    '&:last-child td': {
                      borderBottom: 0,
                    },
                  }}
                >
                  <TableCell>{translateCategory(item.category)}</TableCell>

                  <TableCell>{item.brand.name}</TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                  </TableCell>

                  <TableCell>{translateSize(item.sizeInMl)}</TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.amountInStock}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">{item.amountPerCrate}</TableCell>

                  <TableCell align="right">
                    {calculateCrates(item.amountInStock, item.amountPerCrate)}
                  </TableCell>

                  <TableCell align="right">
                    {formatDate(inventory.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function HeaderCell({
  children,
  minWidth,
  align = 'left',
}: {
  children: React.ReactNode;
  minWidth: number;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <TableCell
      align={align}
      sx={{
        minWidth,
        verticalAlign: 'bottom',
        bgcolor: 'background.paper',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </TableCell>
  );
}

function InventorySkeleton() {
  return (
    <Stack spacing={2} sx={{ mt: 2.5 }}>
      <Skeleton variant="rounded" height={190} />
      <Skeleton variant="rounded" height={48} />
      <Skeleton variant="rounded" height={420} />
    </Stack>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1100,
        mx: 'auto',
        px: {
          xs: 2,
          sm: 3,
        },
        pb: 4,
      }}
    >
      {children}
    </Box>
  );
}

function getInventoryLabel(inventory?: ApiGetInventoryResponse) {
  if (!inventory) return 'Inventur';

  return inventory.label || `Inventur vom ${formatDate(inventory.createdAt)}`;
}

function getMaxLength<T>(
  items: T[],
  accessor: (item: T) => string | undefined,
) {
  if (items.length === 0) return 0;

  return Math.max(
    ...items.map((item) => accessor(item)?.toString().length || 0),
  );
}

function calculateCrates(amount: number, amountPerCrate: number) {
  if (!amountPerCrate) return 0;

  return Math.round((amount * 100) / amountPerCrate) / 100;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCompactDate(value: Date | string) {
  const date = new Date(value);

  const year = `${date.getFullYear()}`.slice(2);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}${month}${day}`;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { inventoryId } = context.query;

  if (typeof inventoryId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      inventoryId,
    },
  };
}
