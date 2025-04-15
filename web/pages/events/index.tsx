import { useEffect, useState } from 'react';
import { ApiGetEventsResponse, ApiPostEventsResponse } from '../api/events';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import AddIcon from '@mui/icons-material/Add';
import { Skeleton } from '@mui/material';
import NewEventDialog from '@/components/dialogs/newEvent';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';

export default function EventsPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [events, setEvents] = useState<ApiGetEventsResponse>([]);
  const [loading, setLoading] = useState(true);

  const handleNewEvent = (event: ApiPostEventsResponse) => {
    setEvents((e) => [event, ...e]);
    setNewDialogOpen(false);
  };

  useEffect(() => {
    setLoading(true);
    axios('/api/events')
      .then(({ data }) => setEvents(data))
      .catch(console.log)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          <h3 className="w-full text-3xl text-center text-sky-700">
            Veranstaltungen
          </h3>
          <p className="invisible">Zurück</p>
        </div>
        <button
          onClick={() => setNewDialogOpen(true)}
          className="btn-primary mt-5 w-full flex items-center justify-center gap-1"
        >
          <AddIcon />
          <p>Neue Veranstaltung</p>
        </button>
      </header>
      <div className="px-3">
        <div className="pt-5 flex flex-col gap-5">
          {renderEvents(loading, events)}
        </div>
        <NewEventDialog
          maxWidth="sm"
          open={newDialogOpen}
          onClose={() => setNewDialogOpen(false)}
          onSuccess={handleNewEvent}
        />
      </div>
    </div>
  );
}

function renderEvents(loading: boolean, events: ApiGetEventsResponse) {
  if (loading)
    return (
      <>
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
      </>
    );

  if (events.length == 0) {
    return <h3 className="text-center">Noch Keine Veranstaltungen</h3>;
  }

  return events.map((event) => (
    <Link
      href={`/events/${event.id}`}
      className="w-full rounded-md shadow px-4 py-5 text-xl text-sky-700"
      key={event.id}
    >
      <h5 className="text-xl mb-2">{event.name}</h5>
      <div className="flex items-center justify-between text-lg">
        <p className="text-gray-700">
          {new Date(event.date).toLocaleDateString('de')}
        </p>
        {event.inventories.length > 0 ? (
          event.inventories[0]?.done ? (
            <p className="text-emerald-500 flex items-center gap-1">
              <AssignmentTurnedInIcon /> Inventur fertig
            </p>
          ) : (
            <p className="text-amber-500 flex items-center gap-1">
              <AssignmentLateIcon /> Inventur offen
            </p>
          )
        ) : (
          <></>
        )}
      </div>
    </Link>
  ));
}
