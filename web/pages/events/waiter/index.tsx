// pages/events/waiter/index.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Alert, Button, Chip, Skeleton } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { ApiGetWaiterEventsResponse } from '@/pages/api/events/waiter';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function WaiterEventsPage() {
  const [events, setEvents] = useState<ApiGetWaiterEventsResponse>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<ApiGetWaiterEventsResponse>('/api/events/waiter')
      .then(({ data }) => setEvents(data))
      .catch(() =>
        setError('Die Veranstaltungen konnten nicht geladen werden.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-6">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            Zurück
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Tischkellner
          </h1>

          <span className="invisible text-sm">Zurück</span>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          Herausgaben tracken und abgeschlossene Events auswerten
        </p>
      </header>

      <section className="px-3 pt-4">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton variant="rounded" height={190} />
            <Skeleton variant="rounded" height={190} />
            <Skeleton variant="rounded" height={190} />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-gray-500">
              Noch keine Veranstaltungen angelegt.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EventCard({ event }: { event: ApiGetWaiterEventsResponse[number] }) {
  const isClosed = Boolean(event.closedAt);

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {formatDate(event.date)}
          </p>

          <h2 className="mt-1 text-lg font-semibold text-gray-900">
            {event.name}
          </h2>

          {event.waiterName && (
            <p className="mt-0.5 text-sm text-gray-500">
              Kellner: {event.waiterName}
            </p>
          )}
        </div>

        <Chip
          size="small"
          label={isClosed ? 'Abgeschlossen' : 'Offen'}
          color={isClosed ? 'success' : 'warning'}
          variant="outlined"
          sx={{
            fontWeight: 600,
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryTile
          label="MVZ"
          value={formatCurrency(event.prepaidMinimumSpendCents)}
        />

        <SummaryTile label="Flaschen" value={String(event.issuedQuantity)} />

        <SummaryTile
          label="Warenwert"
          value={formatCurrency(event.issuedTotalCents)}
        />
      </div>

      <div
        className={`mt-3 rounded-xl px-3 py-2 ${
          event.balanceCents >= 0 ? 'bg-emerald-50' : 'bg-red-50'
        }`}
      >
        <p className="text-xs text-gray-500">
          {event.balanceCents >= 0
            ? 'Aktueller Überschuss'
            : 'Aktuell noch offen'}
        </p>

        <p
          className={`text-lg font-semibold ${
            event.balanceCents >= 0 ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {formatCurrency(Math.abs(event.balanceCents))}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          fullWidth
          component={Link}
          href={`/events/${event.id}/waiter`}
          variant="contained"
          startIcon={<PointOfSaleRoundedIcon />}
          sx={{
            minHeight: 44,
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Herausgaben tracken
        </Button>

        {isClosed && (
          <Button
            fullWidth
            component={Link}
            href={`/events/${event.id}/waiter/evaluation`}
            variant="outlined"
            startIcon={<ReceiptLongRoundedIcon />}
            endIcon={<ChevronRightRoundedIcon />}
            sx={{
              minHeight: 44,
              borderRadius: 3,
              textTransform: 'none',
            }}
          >
            Auswertung
          </Button>
        )}
      </div>
    </article>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-2 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}
