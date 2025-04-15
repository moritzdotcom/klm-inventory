import {
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { ApiGetEventsResponse } from '../api/events';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useRouter } from 'next/router';

export default function NewInventoryPage() {
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<ApiGetEventsResponse>([]);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: inventory } = await axios({
        url: `/api/inventories`,
        method: 'POST',
        data: {
          eventId,
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
      <p className="mb-5 text-gray-700">Wähle die letzte Veranstaltung aus</p>
      <form onSubmit={onSubmit} className="w-full flex flex-col gap-5">
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
        <button className="btn-primary" type="submit" disabled={loading}>
          Inventur beginnen
        </button>
      </form>
    </div>
  );
}
