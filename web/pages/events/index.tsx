// pages/events/index.tsx

import { useEffect, useState } from 'react';
import { ApiGetEventsResponse, ApiPostEventsResponse } from '../api/events';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import { LinearProgress, Skeleton } from '@mui/material';
import NewEventDialog from '@/components/dialogs/newEvent';

export default function EventsPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [events, setEvents] = useState<ApiGetEventsResponse>([]);
  const [loading, setLoading] = useState(true);

  const handleNewEvent = (event: ApiPostEventsResponse) => {
    setEvents((currentEvents) => [event, ...currentEvents]);
    setNewDialogOpen(false);
  };

  useEffect(() => {
    setLoading(true);

    axios
      .get<ApiGetEventsResponse>('/api/events')
      .then(({ data }) => setEvents(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 z-10 pt-4 pb-3 px-3 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            <span>Zurück</span>
          </Link>

          <h1 className="w-full text-3xl text-center text-sky-700">
            Veranstaltungen
          </h1>

          <span className="invisible text-sm">Zurück</span>
        </div>

        <button
          type="button"
          onClick={() => setNewDialogOpen(true)}
          className="btn-primary mt-5 w-full flex items-center justify-center gap-1"
        >
          <AddIcon />
          <span>Neue Veranstaltung</span>
        </button>
      </header>

      <main className="px-3">
        <div className="pt-5 flex flex-col gap-4">
          {renderEvents(loading, events)}
        </div>
      </main>

      <NewEventDialog
        maxWidth="sm"
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onSuccess={handleNewEvent}
      />
    </div>
  );
}

function renderEvents(loading: boolean, events: ApiGetEventsResponse) {
  if (loading) {
    return (
      <>
        <EventSkeleton />
        <EventSkeleton />
        <EventSkeleton />
      </>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        Noch keine Veranstaltungen vorhanden.
      </div>
    );
  }

  return events.map((event) => <EventCard key={event.id} event={event} />);
}

function EventSkeleton() {
  return <Skeleton variant="rounded" height={190} />;
}

function EventCard({ event }: { event: ApiGetEventsResponse[number] }) {
  const progressPercent =
    (event.progress.completed / event.progress.total) * 100;

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium text-sky-800">{event.name}</h2>

          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.date).toLocaleDateString('de-DE', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>

        <ChevronRightRoundedIcon className="text-gray-400" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            event.progress.done ? 'text-emerald-600' : 'text-gray-600'
          }`}
        >
          {event.progress.done ? (
            <span className="flex items-center gap-1">
              <AssignmentTurnedInRoundedIcon fontSize="small" />
              Event abgeschlossen
            </span>
          ) : (
            `${event.progress.completed} von ${event.progress.total} Schritten erledigt`
          )}
        </p>
      </div>

      <LinearProgress
        variant="determinate"
        value={progressPercent}
        className="mt-2 rounded-full"
      />

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <ChecklistItem
          label="Anfangsbestand"
          done={event.checklist.openingStock}
        />

        <ChecklistItem
          label="MA-Getränke"
          done={event.checklist.employeeDrinks}
        />

        <ChecklistItem
          label="Tischkellner"
          done={event.checklist.waiterSettlement}
        />

        <ChecklistItem label="Endbestand" done={event.checklist.closingStock} />
      </div>
    </Link>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-sm ${
        done ? 'text-emerald-600' : 'text-gray-400'
      }`}
    >
      {done ? (
        <CheckCircleRoundedIcon fontSize="small" />
      ) : (
        <RadioButtonUncheckedRoundedIcon fontSize="small" />
      )}

      <span>{label}</span>
    </div>
  );
}
