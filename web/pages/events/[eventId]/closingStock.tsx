// pages/events/[eventId]/closingStock.tsx
import EventStockCountingPage from '@/components/countPage/eventStockCountingPage';
import { GetServerSidePropsContext } from 'next';

export default function ClosingStockPage({ eventId }: { eventId: string }) {
  return <EventStockCountingPage eventId={eventId} mode="CLOSING" />;
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
