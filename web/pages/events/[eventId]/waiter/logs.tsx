// pages/events/[eventId]/waiter/logs.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Skeleton } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import type { ApiGetWaiterLogsResponse } from '@/pages/api/events/[eventId]/waiter/logs';
import { translateSize } from '@/lib/models/item';

function formatCurrency(cents: number) {
  return (Math.abs(cents) / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatTimestamp(value: string | Date) {
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WaiterLogsPage() {
  const router = useRouter();

  const eventId =
    typeof router.query.eventId === 'string' ? router.query.eventId : null;

  const [data, setData] = useState<ApiGetWaiterLogsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    axios
      .get<ApiGetWaiterLogsResponse>(`/api/events/${eventId}/waiter/logs`)
      .then(({ data }) => setData(data))
      .catch(() =>
        setError('Das Änderungsprotokoll konnte nicht geladen werden.'),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Skeleton variant="rounded" height={80} />
        <Skeleton variant="rounded" height={320} sx={{ mt: 2 }} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-6">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href={`/events/${eventId}/waiter/evaluation`}
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            Auswertung
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Protokoll
          </h1>

          <span className="invisible text-sm">Auswertung</span>
        </div>
      </header>

      <section className="px-3 pt-4">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {data && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {data.event.name}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Jede Herausgabe und jede Korrektur in zeitlicher Reihenfolge
            </p>
          </div>
        )}

        {data?.logs.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
            <p className="text-gray-500">
              Noch keine Protokolleinträge vorhanden.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {data?.logs.map((log, index) => {
              const isAddition = log.quantityDelta > 0;

              return (
                <article
                  key={log.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    index > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <div
                    className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-2 font-bold ${
                      isAddition
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {isAddition ? '+' : ''}
                    {log.quantityDelta}
                  </div>

                  <div className="min-w-0 flex-grow">
                    <p className="truncate font-medium text-gray-900">
                      {log.item.brandName} {log.item.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {translateSize(log.item.sizeInMl)} ·{' '}
                      {formatCurrency(log.unitPriceCents)} je Artikel
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatTimestamp(log.createdAt)} · {log.creatorName}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      isAddition ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {isAddition ? '+' : '−'}
                    {formatCurrency(log.totalCents)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
