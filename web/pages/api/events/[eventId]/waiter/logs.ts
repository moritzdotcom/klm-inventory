// pages/api/events/[eventId]/waiter/logs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getServerSession } from '@/lib/models/session';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getWaiterLogs(eventId: string) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      name: true,
      date: true,
      settlement: {
        select: {
          logs: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              quantityDelta: true,
              unitPriceCents: true,
              createdAt: true,
              item: {
                select: {
                  name: true,
                  sizeInMl: true,
                  brand: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              creator: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, 'Event nicht gefunden');
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
    },
    logs:
      event.settlement?.logs.map((log) => ({
        id: log.id,
        quantityDelta: log.quantityDelta,
        unitPriceCents: log.unitPriceCents,
        totalCents: log.quantityDelta * log.unitPriceCents,
        createdAt: log.createdAt,
        creatorName: log.creator.name,
        item: {
          name: log.item.name,
          sizeInMl: log.item.sizeInMl,
          brandName: log.item.brand.name,
        },
      })) ?? [],
  };
}

export type ApiGetWaiterLogsResponse = Awaited<
  ReturnType<typeof getWaiterLogs>
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

    const eventId =
      typeof req.query.eventId === 'string' ? req.query.eventId : null;

    if (!eventId) {
      throw new ApiError(400, 'Ungültige Event-ID');
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);

      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    return res.status(200).json(await getWaiterLogs(eventId));
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Interner Serverfehler',
    });
  }
}
