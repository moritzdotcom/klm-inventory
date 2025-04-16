import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { ApiGetEventsResponse, ApiPostEventsResponse } from '../api/events';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useRouter } from 'next/router';
import ErrorMessage from '@/components/utils/errorMessage';

export default function NewInventoryPage() {
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<ApiGetEventsResponse>([]);
  const router = useRouter();

  const [eventName, setEventName] = useState('');
  const [eventNameError, setEventNameError] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDateError, setEventDateError] = useState('');
  const [eventFormDirty, setEventFormDirty] = useState(false);
  const [eventSubmitError, setEventSubmitError] = useState('');

  const createEvent = async () => {
    if (events.length > 0) return true;

    setEventSubmitError('');
    setEventFormDirty(true);
    if (!validateEventInputs()) return false;
    try {
      const { data: event }: { data: ApiPostEventsResponse } = await axios({
        url: `/api/events`,
        method: 'POST',
        data: {
          name: eventName,
          date: eventDate,
        },
      });
      setEventName('');
      setEventNameError('');
      setEventDate('');
      setEventDateError('');
      setEventFormDirty(false);
      return event;
    } catch (e) {
      if (isAxiosError(e)) {
        setEventSubmitError(e.response?.data);
      }
    }
    return false;
  };

  const validateEventInputs = () => {
    setEventNameError('');
    setEventDateError('');
    if (!eventName) setEventNameError('Name darf nicht leer sein');
    if (!eventDate) setEventDateError('Datum darf nicht leer sein');
    return Boolean(eventName && eventDate);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const event = await createEvent();
    if (!event) return;
    try {
      const { data: inventory } = await axios({
        url: `/api/inventories`,
        method: 'POST',
        data: {
          eventId: typeof event == 'boolean' ? eventId : event.id,
        },
      });
      router.push(`/inventories/${inventory.id}/count`);
    } catch (e) {
      if (isAxiosError(e)) {
        console.log(e.response?.data);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!eventFormDirty) return;
    validateEventInputs();
  }, [eventName, eventDate]);

  useEffect(() => {
    axios('/api/events').then(({ data }: { data: ApiGetEventsResponse }) => {
      const eventsWithoutInventory = data
        .filter((e) => e.inventories.length == 0)
        .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));
      setEventId(eventsWithoutInventory[0]?.id || '');
      setEvents(eventsWithoutInventory);
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 mt-4">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/" className="flex items-center text-sm text-sky-600">
          <ArrowBackIosIcon fontSize="inherit" />
          <p>Zurück</p>
        </Link>
        <h3 className="w-full text-3xl text-center text-sky-700">
          Neue Inventur
        </h3>
        <p className="invisible">Zurück</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full flex flex-col gap-5 mt-[25vh]"
      >
        {events.length > 0 ? (
          <>
            <p className="text-gray-700">Wähle die letzte Veranstaltung aus</p>
            <FormControl fullWidth>
              <InputLabel>Veranstaltung</InputLabel>
              <Select
                value={eventId}
                label="Veranstaltung"
                onChange={(e) => setEventId(e.target.value)}
              >
                {events.map((e) => (
                  <MenuItem value={e.id} key={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        ) : (
          <>
            <p className="text-gray-700">
              Erstelle zunächst eine Veranstaltung
            </p>
            <div>
              <TextField
                label="Name"
                variant="outlined"
                fullWidth
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.currentTarget.value)}
              />
              <ErrorMessage message={eventNameError} />
            </div>
            <div>
              <TextField
                slotProps={{ inputLabel: { shrink: true } }}
                label="Datum"
                variant="outlined"
                fullWidth
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.currentTarget.value)}
              />
              <ErrorMessage message={eventDateError} />
            </div>
          </>
        )}
        <ErrorMessage message={eventSubmitError} />
        <button
          className="btn-primary disabled:opacity-80"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Lädt...' : 'Inventur beginnen'}
        </button>
      </form>
    </div>
  );
}
