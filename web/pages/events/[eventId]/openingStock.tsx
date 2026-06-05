// pages/events/[eventId]/openingStock.tsx
import EventStockCountingPage from '@/components/countPage/eventStockCountingPage';
import { GetServerSidePropsContext } from 'next';

export default function OpeningStockPage({ eventId }: { eventId: string }) {
  return <EventStockCountingPage eventId={eventId} mode="OPENING" />;
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
