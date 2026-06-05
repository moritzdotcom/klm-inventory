// pages/events/[eventId]/waiter/evaluation.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Button,
  InputAdornment,
  Skeleton,
  TextField,
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import type { ApiGetWaiterEvaluationResponse } from '@/pages/api/events/[eventId]/waiter/evaluation';
import { calculateWaiterSettlement } from '@/lib/models/waiterSettlement';
import { translateSize } from '@/lib/models/item';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatEuroInput(cents: number) {
  if (cents === 0) return '';

  return String((cents / 100).toFixed(2)).replace('.', ',');
}

function parseOptionalEuroInput(value: string) {
  const normalized = value.replace(',', '.').trim();

  if (!normalized) return 0;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export default function WaiterEvaluationPage() {
  const router = useRouter();

  const eventId =
    typeof router.query.eventId === 'string' ? router.query.eventId : null;

  const [data, setData] = useState<ApiGetWaiterEvaluationResponse | null>(null);

  const [cashRevenue, setCashRevenue] = useState('');
  const [cardRevenue, setCardRevenue] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    axios
      .get<ApiGetWaiterEvaluationResponse>(
        `/api/events/${eventId}/waiter/evaluation`,
      )
      .then(({ data }) => {
        setData(data);

        setCashRevenue(formatEuroInput(data.settlement.cashRevenueCents));

        setCardRevenue(formatEuroInput(data.settlement.cardRevenueCents));
      })
      .catch((error) => {
        setError(
          axios.isAxiosError(error)
            ? (error.response?.data?.error ??
                'Die Auswertung konnte nicht geladen werden.')
            : 'Die Auswertung konnte nicht geladen werden.',
        );
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const localCalculation = useMemo(() => {
    if (!data) return null;

    const cashRevenueCents = parseOptionalEuroInput(cashRevenue);

    const cardRevenueCents = parseOptionalEuroInput(cardRevenue);

    if (cashRevenueCents === null || cardRevenueCents === null) {
      return null;
    }

    return calculateWaiterSettlement(
      data.items,
      data.settlement.prepaidMinimumSpendCents,
      cashRevenueCents,
      cardRevenueCents,
    );
  }, [cardRevenue, cashRevenue, data]);

  const handleSaveRevenue = async () => {
    if (!eventId) return;

    const cashRevenueCents = parseOptionalEuroInput(cashRevenue);

    const cardRevenueCents = parseOptionalEuroInput(cardRevenue);

    if (cashRevenueCents === null || cardRevenueCents === null) {
      setError('Bitte gib gültige Umsätze ein.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await axios.patch<ApiGetWaiterEvaluationResponse>(
        `/api/events/${eventId}/waiter/evaluation`,
        {
          cashRevenueCents,
          cardRevenueCents,
        },
      );

      setData(response.data);
    } catch (error) {
      setError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error ??
              'Die Umsätze konnten nicht gespeichert werden.')
          : 'Die Umsätze konnten nicht gespeichert werden.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Skeleton variant="rounded" height={110} />
        <Skeleton variant="rounded" height={260} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={260} sx={{ mt: 2 }} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Alert severity="error">
          {error ?? 'Die Auswertung ist nicht verfügbar.'}
        </Alert>
      </main>
    );
  }

  const calculation = localCalculation ?? data.calculation;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-6">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/events/waiter"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            Events
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Auswertung
          </h1>

          <span className="invisible text-sm">Events</span>
        </div>
      </header>

      <section className="px-3 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {formatDate(data.event.date)}
          </p>

          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {data.event.name}
          </h2>

          {data.settlement.waiterName && (
            <p className="mt-1 text-sm text-gray-500">
              Tischkellner: {data.settlement.waiterName}
            </p>
          )}

          <Button
            component={Link}
            href={`/events/${data.event.id}/waiter/logs`}
            variant="text"
            startIcon={<HistoryRoundedIcon />}
            sx={{
              mt: 2,
              px: 0,
              textTransform: 'none',
            }}
          >
            Änderungsprotokoll anzeigen
          </Button>
        </div>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <section className="mt-4">
          <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Herausgegebene Artikel
          </h3>

          {data.items.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
              <p className="text-gray-500">
                Es wurden keine Artikel herausgegeben.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {data.items.map((item, index) => (
                <article
                  key={item.itemId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 font-semibold text-sky-700">
                    {item.quantity}×
                  </div>

                  <div className="min-w-0 flex-grow">
                    <p className="text-xs text-gray-400">{item.brandName}</p>

                    <p className="truncate font-medium text-gray-900">
                      {item.name}{' '}
                      {item.sizeInMl ? `(${translateSize(item.sizeInMl)})` : ''}
                    </p>

                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.unitPriceCents)} je Artikel
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold text-gray-800">
                    {formatCurrency(item.totalCents)}
                  </p>
                </article>
              ))}

              <div className="flex justify-between bg-gray-50 px-4 py-3">
                <p className="font-semibold text-gray-600">Warenwert gesamt</p>

                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(calculation.issuedTotalCents)}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900">
            Umsatz des Tischkellners
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Die Berechnung aktualisiert sich direkt während der Eingabe.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <ReadOnlyRow
              label="Vorab bezahlter Mindestverzehr"
              value={formatCurrency(data.settlement.prepaidMinimumSpendCents)}
            />

            <TextField
              fullWidth
              label="Bargeld"
              value={cashRevenue}
              onChange={(event) => setCashRevenue(event.target.value)}
              inputProps={{
                inputMode: 'decimal',
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Kartenumsatz"
              value={cardRevenue}
              onChange={(event) => setCardRevenue(event.target.value)}
              inputProps={{
                inputMode: 'decimal',
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              disabled={saving || !localCalculation}
              onClick={handleSaveRevenue}
              sx={{
                minHeight: 46,
                borderRadius: 3,
                textTransform: 'none',
              }}
            >
              Umsätze speichern
            </Button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900">Ergebnis</h3>

          <div className="mt-3 flex flex-col gap-2">
            <ReadOnlyRow
              label="MVZ-Vorauszahlung"
              value={formatCurrency(data.settlement.prepaidMinimumSpendCents)}
            />

            <ReadOnlyRow
              label="Bargeld"
              value={formatCurrency(parseOptionalEuroInput(cashRevenue) ?? 0)}
            />

            <ReadOnlyRow
              label="Kartenumsatz"
              value={formatCurrency(parseOptionalEuroInput(cardRevenue) ?? 0)}
            />

            <ReadOnlyRow
              label="Warenwert"
              value={`− ${formatCurrency(calculation.issuedTotalCents)}`}
            />
          </div>

          <div
            className={`mt-4 rounded-xl px-4 py-3 ${
              calculation.balanceCents >= 0 ? 'bg-emerald-50' : 'bg-red-50'
            }`}
          >
            <p className="text-sm text-gray-500">
              {calculation.balanceCents >= 0
                ? 'Überschuss'
                : 'Noch vom Tischkellner zu zahlen'}
            </p>

            <p
              className={`mt-0.5 text-3xl font-bold ${
                calculation.balanceCents >= 0
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }`}
            >
              {formatCurrency(Math.abs(calculation.balanceCents))}
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="shrink-0 font-semibold text-gray-800">{value}</p>
    </div>
  );
}
