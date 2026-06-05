// pages/api/events/[eventId]/openingStock.ts

import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

type OpeningStockItem = Prisma.ItemGetPayload<{
  include: {
    brand: true;
  };
}>;

export type EventOpeningStockCounting = {
  itemId: string;
  amount: number;
};

export type ApiGetEventOpeningStockResponse = {
  event: {
    id: string;
    name: string;
    date: string;
  };
  completedAt: string | null;
  items: OpeningStockItem[];
  countings: EventOpeningStockCounting[];
};

export type ApiPostEventOpeningStockResponse = EventOpeningStockCounting;

export type ApiPutEventOpeningStockResponse = {
  completedAt: string;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { eventId } = req.query;

  if (typeof eventId !== 'string') {
    return res.status(400).json('Invalid event ID');
  }

  if (req.method === 'GET') {
    return handleGET(req, res, eventId);
  }

  if (req.method === 'POST') {
    return handlePOST(req, res, eventId);
  }

  if (req.method === 'PUT') {
    return handlePUT(req, res, eventId);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json(`Method ${req.method} not allowed`);
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetEventOpeningStockResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const [event, items] = await Promise.all([
    prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        date: true,
        inventory: {
          select: {
            openingCompletedAt: true,
            countings: {
              where: {
                phase: 'OPENING',
                item: {
                  inventoryEnabled: true,
                },
              },
              select: {
                itemId: true,
                amount: true,
              },
            },
          },
        },
      },
    }),
    prisma.item.findMany({
      where: {
        inventoryEnabled: true,
      },
      include: {
        brand: true,
      },
    }),
  ]);

  if (!event) return res.status(404).json('Event not found');

  return res.json({
    event: {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
    },
    completedAt: event.inventory?.openingCompletedAt?.toISOString() || null,
    items,
    countings: event.inventory?.countings || [],
  });
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse<ApiPostEventOpeningStockResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { itemId, amount } = req.body;

  if (typeof itemId !== 'string') {
    return res.status(400).json('Invalid item ID');
  }

  const parsedAmount = typeof amount === 'number' ? amount : Number(amount);

  if (!Number.isInteger(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json('Amount must be a positive integer or zero');
  }

  try {
    const counting = await prisma.$transaction(async (tx) => {
      const [event, item] = await Promise.all([
        tx.event.findUnique({
          where: {
            id: eventId,
          },
          select: {
            id: true,
          },
        }),
        tx.item.findFirst({
          where: {
            id: itemId,
            inventoryEnabled: true,
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (!event) throw new ApiError(404, 'Event not found');
      if (!item) throw new ApiError(404, 'Item not found');

      const eventInventory = await tx.eventInventory.upsert({
        where: {
          eventId,
        },
        create: {
          eventId,
        },
        update: {},
        select: {
          id: true,
          openingCompletedAt: true,
        },
      });

      if (eventInventory.openingCompletedAt) {
        throw new ApiError(409, 'Opening stock has already been completed');
      }

      return tx.eventInventoryCounting.upsert({
        where: {
          eventInventoryId_itemId_phase: {
            eventInventoryId: eventInventory.id,
            itemId,
            phase: 'OPENING',
          },
        },
        create: {
          eventInventoryId: eventInventory.id,
          itemId,
          phase: 'OPENING',
          amount: parsedAmount,
        },
        update: {
          amount: parsedAmount,
        },
        select: {
          itemId: true,
          amount: true,
        },
      });
    });

    return res.json(counting);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse<ApiPutEventOpeningStockResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  try {
    const eventInventory = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: {
          id: eventId,
        },
        select: {
          id: true,
        },
      });

      if (!event) throw new ApiError(404, 'Event not found');

      const inventory = await tx.eventInventory.upsert({
        where: {
          eventId,
        },
        create: {
          eventId,
        },
        update: {},
        select: {
          id: true,
          openingCompletedAt: true,
        },
      });

      if (inventory.openingCompletedAt) {
        return inventory;
      }

      return tx.eventInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          openingCompletedAt: new Date(),
        },
        select: {
          openingCompletedAt: true,
        },
      });
    });

    if (!eventInventory.openingCompletedAt) {
      return res.status(500).json('Could not finalize opening stock');
    }

    return res.json({
      completedAt: eventInventory.openingCompletedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}

function handleApiError(res: NextApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.status).json(error.message);
  }

  console.error(error);
  return res.status(500).json('Internal server error');
}
