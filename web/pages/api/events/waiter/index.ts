// pages/api/events/waiter/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { calculateWaiterSettlement } from '@/lib/models/waiterSettlement';
import { getServerSession } from '@/lib/models/session';

async function getWaiterEvents() {
  const events = await prisma.event.findMany({
    orderBy: {
      date: 'desc',
    },
    select: {
      id: true,
      name: true,
      date: true,
      settlement: {
        select: {
          waiterName: true,
          prepaidMinimumSpendCents: true,
          cashRevenueCents: true,
          cardRevenueCents: true,
          closedAt: true,
          issues: {
            select: {
              quantity: true,
              unitPriceCents: true,
            },
          },
        },
      },
    },
  });

  return events.map((event) => {
    const settlement = event.settlement;

    const calculation = calculateWaiterSettlement(
      settlement?.issues ?? [],
      settlement?.prepaidMinimumSpendCents ?? 0,
      settlement?.cashRevenueCents ?? 0,
      settlement?.cardRevenueCents ?? 0,
    );

    return {
      id: event.id,
      name: event.name,
      date: event.date,

      waiterName: settlement?.waiterName ?? null,
      closedAt: settlement?.closedAt ?? null,

      prepaidMinimumSpendCents: settlement?.prepaidMinimumSpendCents ?? 0,

      issuedQuantity: calculation.issuedQuantity,
      issuedTotalCents: calculation.issuedTotalCents,

      collectedTotalCents: calculation.collectedTotalCents,
      balanceCents: calculation.balanceCents,
    };
  });
}

export type ApiGetWaiterEventsResponse = Awaited<
  ReturnType<typeof getWaiterEvents>
>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const user = await getServerSession(req);

    if (!user?.id) {
      return res.status(401).json({
        error: 'Nicht angemeldet',
      });
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);

      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    return res.status(200).json(await getWaiterEvents());
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Interner Serverfehler',
    });
  }
}
