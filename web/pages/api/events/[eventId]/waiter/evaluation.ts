// pages/api/events/[eventId]/waiter/evaluation.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { calculateWaiterSettlement } from '@/lib/models/waiterSettlement';
import { getServerSession } from '@/lib/models/session';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseEventId(req: NextApiRequest) {
  const { eventId } = req.query;

  if (typeof eventId !== 'string' || !eventId) {
    throw new ApiError(400, 'Ungültige Event-ID');
  }

  return eventId;
}

function parseNonNegativeInteger(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ApiError(400, `${field} muss eine positive Ganzzahl oder 0 sein`);
  }

  return value;
}

async function getEvaluation(eventId: string) {
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
          waiterName: true,
          prepaidMinimumSpendCents: true,
          cashRevenueCents: true,
          cardRevenueCents: true,
          closedAt: true,
          issues: {
            where: {
              quantity: {
                gt: 0,
              },
            },
            select: {
              itemId: true,
              quantity: true,
              unitPriceCents: true,
              item: {
                select: {
                  name: true,
                  sizeInMl: true,
                  category: true,
                  brand: {
                    select: {
                      name: true,
                    },
                  },
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

  if (!event.settlement?.closedAt) {
    throw new ApiError(409, 'Das Event wurde noch nicht abgeschlossen');
  }

  const items = event.settlement.issues
    .map((issue) => ({
      itemId: issue.itemId,
      name: issue.item.name,
      brandName: issue.item.brand.name,
      category: issue.item.category,
      sizeInMl: issue.item.sizeInMl,
      quantity: issue.quantity,
      unitPriceCents: issue.unitPriceCents,
      totalCents: issue.quantity * issue.unitPriceCents,
    }))
    .sort((a, b) =>
      `${a.brandName} ${a.name}`.localeCompare(
        `${b.brandName} ${b.name}`,
        'de',
      ),
    );

  const calculation = calculateWaiterSettlement(
    items,
    event.settlement.prepaidMinimumSpendCents,
    event.settlement.cashRevenueCents,
    event.settlement.cardRevenueCents,
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
    },
    settlement: {
      waiterName: event.settlement.waiterName,
      prepaidMinimumSpendCents: event.settlement.prepaidMinimumSpendCents,
      cashRevenueCents: event.settlement.cashRevenueCents,
      cardRevenueCents: event.settlement.cardRevenueCents,
      closedAt: event.settlement.closedAt,
    },
    items,
    calculation,
  };
}

export type ApiGetWaiterEvaluationResponse = Awaited<
  ReturnType<typeof getEvaluation>
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

    const eventId = parseEventId(req);

    switch (req.method) {
      case 'GET': {
        return res.status(200).json(await getEvaluation(eventId));
      }

      case 'PATCH': {
        const cashRevenueCents = parseNonNegativeInteger(
          req.body?.cashRevenueCents,
          'cashRevenueCents',
        );

        const cardRevenueCents = parseNonNegativeInteger(
          req.body?.cardRevenueCents,
          'cardRevenueCents',
        );

        const settlement = await prisma.eventSettlement.findUnique({
          where: {
            eventId,
          },
          select: {
            closedAt: true,
          },
        });

        if (!settlement?.closedAt) {
          throw new ApiError(409, 'Das Event wurde noch nicht abgeschlossen');
        }

        await prisma.eventSettlement.update({
          where: {
            eventId,
          },
          data: {
            cashRevenueCents,
            cardRevenueCents,
          },
        });

        return res.status(200).json(await getEvaluation(eventId));
      }

      default: {
        res.setHeader('Allow', ['GET', 'PATCH']);

        return res.status(405).json({
          error: 'Method not allowed',
        });
      }
    }
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
