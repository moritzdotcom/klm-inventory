import { GetServerSidePropsContext } from 'next';
import { useEffect, useState } from 'react';
import { ApiGetEventResponse } from '../api/events/[eventId]';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Divider, Skeleton } from '@mui/material';
import StartInventoryButton from '@/components/inventories/startInventoryButton';
import { translateSize } from '@/lib/models/item';

export default function EventShowPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<ApiGetEventResponse['event']>();
  const [previousEvent, setPreviousEvent] =
    useState<ApiGetEventResponse['previousEvent']>();

  useEffect(() => {
    axios(`/api/events/${eventId}`).then(({ data }) => {
      setEvent(data.event);
      setPreviousEvent(data.previousEvent);
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          <h3 className="w-full text-xl text-center text-sky-700">
            {event?.name}
          </h3>
          <p className="invisible">Zurück</p>
        </div>
      </header>
      {event ? (
        <div className="px-3 flex flex-col gap-3">
          <InventoryCta event={event} />
          {previousEvent && (
            <InventoryComparison event={event} previousEvent={previousEvent} />
          )}
        </div>
      ) : (
        <div className="px-3">
          <Skeleton variant="rounded" height={90} />
        </div>
      )}
    </div>
  );
}

function InventoryCta({ event }: { event: ApiGetEventResponse['event'] }) {
  if (event.inventories.length == 0)
    return (
      <>
        <h3 className="mt-5 text-lg text-gray-600 text-center">
          Für diese Veranstaltung wurde noch keine Inventur durchgeführt
        </h3>
        <StartInventoryButton
          eventId={event.id}
          className="btn-primary w-full max-w-md mx-auto"
        />
      </>
    );
  if (!event.inventories[0]?.done)
    return (
      <>
        <h3 className="mt-5 text-lg text-gray-600 text-center">
          Die Inventur für diese Veranstaltung wurde noch nicht abgeschlossen.
          Möchtest du diese fortsetzen?
        </h3>
        <Link
          href={`/inventories/${event.inventories[0].id}/count`}
          className="btn-primary w-full max-w-md mx-auto"
        >
          Inventur fortsetzen
        </Link>
      </>
    );
}

function InventoryComparison({
  event,
  previousEvent,
}: {
  event: ApiGetEventResponse['event'];
  previousEvent: ApiGetEventResponse['previousEvent'];
}) {
  if (previousEvent?.inventories.length > 0 && event.inventories.length > 0) {
    const countings = event.inventories[0].countings;
    const previousCountings = previousEvent.inventories[0].countings;

    const previousMap = new Map(
      previousCountings.map(({ item, amount }) => [item.id, amount])
    );

    const commonCountings = countings
      .filter(({ item }) => previousMap.has(item.id))
      .map(({ item }) => ({
        ...item,
        prevAmountInStock: previousMap.get(item.id),
      }));

    return (
      <>
        <h2 className="text-sky-700 text-lg text-center mt-5">
          Lagerbestand im Vergleich zu letztem Event{' '}
          <span className="font-semibold">({previousEvent.name})</span>
        </h2>
        {commonCountings.map((item) => {
          return (
            <div key={item.id} className="px-4 py-2 shadow rounded-md">
              <h4 className="text-gray-500">{item.brand.name}</h4>
              <h5 className="mb-2 text-sky-700">
                {item.name} ({translateSize(item.sizeInMl)})
              </h5>
              <Divider />
              <div className="flex justify-evenly gap-2 mt-2">
                <div className="flex flex-col items-center">
                  <p className="text-sky-700 font-bold text-lg">
                    {item.amountInStock}
                  </p>
                  <p className="text-gray-500">Jetzt</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sky-700 font-bold text-lg">
                    {item.prevAmountInStock}
                  </p>
                  <p className="text-gray-500">Vorher</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sky-700 font-bold text-lg">
                    {item.amountInStock - (item.prevAmountInStock || 0)}
                  </p>
                  <p className="text-gray-500">Delta</p>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { eventId } = context.query;
  return {
    props: {
      eventId,
    },
  };
}
