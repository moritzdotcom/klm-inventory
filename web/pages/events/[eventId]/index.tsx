// pages/events/[eventId]/index.tsx

import { GetServerSidePropsContext } from 'next';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalBarRoundedIcon from '@mui/icons-material/LocalBarRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';

import { Alert, LinearProgress, Skeleton } from '@mui/material';

import { ApiGetEventResponse } from '../../api/events/[eventId]';

type EventDetailData = ApiGetEventResponse;

export default function EventShowPage({ eventId }: { eventId: string }) {
  const [data, setData] = useState<EventDetailData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    axios
      .get<EventDetailData>(`/api/events/${eventId}`)
      .then(({ data }) => setData(data))
      .catch((error) => {
        console.error(error);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <header className="w-full sticky top-0 z-10 pt-4 pb-3 px-3 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            <span>Zurück</span>
          </Link>

          <h1 className="w-full truncate text-xl text-center text-sky-700">
            {data?.event.name || 'Veranstaltung'}
          </h1>

          <span className="invisible text-sm">Zurück</span>
        </div>
      </header>

      <main className="px-3">
        {loading && <EventPageSkeleton />}

        {!loading && error && (
          <Alert severity="error">
            Die Veranstaltung konnte nicht geladen werden.
          </Alert>
        )}

        {!loading && data && <EventDashboard data={data} />}
      </main>
    </div>
  );
}

function EventDashboard({ data }: { data: EventDetailData }) {
  const { event, checklist, progress, inventoryItemCount } = data;

  const metrics = useMemo(() => {
    const countings = event.inventory?.countings || [];
    const employeeDrinkIssues = event.inventory?.employeeDrinkIssues || [];
    const waiterIssues = event.settlement?.issues || [];

    const openingCount = countings.filter(
      (counting) => counting.phase === 'OPENING',
    ).length;

    const closingCount = countings.filter(
      (counting) => counting.phase === 'CLOSING',
    ).length;

    const employeeDrinkQuantity = employeeDrinkIssues.reduce(
      (sum, issue) => sum + issue.quantity,
      0,
    );

    const waiterIssueQuantity = waiterIssues.reduce(
      (sum, issue) => sum + issue.quantity,
      0,
    );

    const waiterRevenueCents =
      (event.settlement?.cashRevenueCents || 0) +
      (event.settlement?.cardRevenueCents || 0);

    return {
      openingCount,
      closingCount,
      employeeDrinkQuantity,
      waiterIssueQuantity,
      waiterRevenueCents,
    };
  }, [event]);

  const progressPercent =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="pt-2">
        <p className="text-sm text-gray-500">
          {new Date(event.date).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Fortschritt</p>

              <p
                className={`mt-1 font-medium ${
                  progress.done ? 'text-emerald-600' : 'text-gray-700'
                }`}
              >
                {progress.done
                  ? 'Alle Schritte abgeschlossen'
                  : `${progress.completed} von ${progress.total} Schritten erledigt`}
              </p>
            </div>

            {progress.done && (
              <AssignmentTurnedInRoundedIcon className="text-emerald-500" />
            )}
          </div>

          {progressPercent < 1 && (
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              className="mt-3 rounded-full"
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-sky-800">
          Event-Abrechnung
        </h2>

        <div className="flex flex-col gap-3">
          <WorkflowCard
            title="1. Anfangsbestand"
            description="Was nehmen wir mit? Was befindet sich vor Beginn im Kühlwagen?"
            statusText={
              checklist.openingStock
                ? `${metrics.openingCount} Artikel erfasst`
                : `${metrics.openingCount} von ${inventoryItemCount} Artikeln erfasst`
            }
            href={`/events/${event.id}/openingStock`}
            done={checklist.openingStock}
            icon={<Inventory2RoundedIcon />}
          />

          <WorkflowCard
            title="2. Mitarbeitergetränke"
            description="Getränke erfassen, die während des Events an das Team ausgegeben werden."
            statusText={
              checklist.employeeDrinks
                ? `${metrics.employeeDrinkQuantity} Getränke gebucht`
                : metrics.employeeDrinkQuantity > 0
                  ? `${metrics.employeeDrinkQuantity} Getränke bisher gebucht`
                  : 'Noch nicht abgeschlossen'
            }
            href={`/events/${event.id}/employeeDrinks`}
            done={checklist.employeeDrinks}
            icon={<GroupsRoundedIcon />}
          />

          <WorkflowCard
            title="3. Tischkellner"
            description="Ausgaben und Einnahmen des Tischkellners erfassen und abrechnen."
            statusText={
              checklist.waiterSettlement
                ? `${metrics.waiterIssueQuantity} Artikel · ${formatCurrency(
                    metrics.waiterRevenueCents,
                  )} Umsatz`
                : metrics.waiterIssueQuantity > 0
                  ? `${metrics.waiterIssueQuantity} Artikel bisher ausgegeben`
                  : 'Noch nicht abgeschlossen'
            }
            href={`/events/${event.id}/waiter`}
            done={checklist.waiterSettlement}
            icon={<LocalBarRoundedIcon />}
          />

          <WorkflowCard
            title="4. Endbestand"
            description="Welche Waren sind nach dem Event noch im Kühlwagen vorhanden?"
            statusText={
              checklist.closingStock
                ? `${metrics.closingCount} Artikel erfasst`
                : `${metrics.closingCount} von ${inventoryItemCount} Artikeln erfasst`
            }
            href={`/events/${event.id}/closingStock`}
            done={checklist.closingStock}
            icon={<WarehouseRoundedIcon />}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-sky-800">Auswertung</h2>

        <AnalysisCard
          href={`/events/${event.id}/analysis`}
          enabled={progress.done}
        />
      </section>
    </div>
  );
}

function WorkflowCard({
  title,
  description,
  statusText,
  href,
  done,
  icon,
}: {
  title: string;
  description: string;
  statusText: string;
  href: string;
  done: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-700'
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-800">{title}</h3>

            <ArrowForwardIosRoundedIcon
              className="shrink-0 text-gray-400"
              fontSize="small"
            />
          </div>

          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>

          <div
            className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
              done ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            {done ? (
              <CheckCircleRoundedIcon fontSize="small" />
            ) : (
              <RadioButtonUncheckedRoundedIcon fontSize="small" />
            )}

            <span>{statusText}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AnalysisCard({ href, enabled }: { href: string; enabled: boolean }) {
  const content = (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        enabled ? 'border-sky-200 bg-sky-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            enabled ? 'bg-white text-sky-700' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {enabled ? <PointOfSaleRoundedIcon /> : <LockRoundedIcon />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-medium ${
                enabled ? 'text-sky-800' : 'text-gray-500'
              }`}
            >
              Offener Thekenverkauf
            </h3>

            {enabled && (
              <ArrowForwardIosRoundedIcon
                className="shrink-0 text-sky-500"
                fontSize="small"
              />
            )}
          </div>

          <p className="mt-1 text-sm leading-5 text-gray-500">
            Berechnung aus Anfangsbestand, Tischkellner-Ausgaben,
            Mitarbeitergetränken und Endbestand.
          </p>

          <p
            className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
              enabled ? 'text-sky-700' : 'text-gray-400'
            }`}
          >
            {enabled
              ? 'Auswertung anzeigen'
              : 'Erst nach Abschluss aller vier Schritte verfügbar'}
          </p>
        </div>
      </div>
    </div>
  );

  if (!enabled) return content;

  return <Link href={href}>{content}</Link>;
}

function EventPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant="rounded" height={110} />
      <Skeleton variant="rounded" height={145} />
      <Skeleton variant="rounded" height={145} />
      <Skeleton variant="rounded" height={145} />
      <Skeleton variant="rounded" height={145} />
      <Skeleton variant="rounded" height={120} />
    </div>
  );
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(valueInCents / 100);
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
