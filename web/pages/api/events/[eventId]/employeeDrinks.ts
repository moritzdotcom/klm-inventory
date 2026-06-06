// pages/api/events/[eventId]/employeeDrinks.ts

import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

type EmployeeDrinkItem = Prisma.ItemGetPayload<{
  include: {
    brand: true;
  };
}>;

export type EventEmployeeDrinkIssueDto = {
  itemId: string;
  quantity: number;
  updatedAt: string;
};

export type ApiGetEventEmployeeDrinksResponse = {
  event: {
    id: string;
    name: string;
    date: string;
  };
  completedAt: string | null;
  items: EmployeeDrinkItem[];
  issues: EventEmployeeDrinkIssueDto[];
};

export type ApiPostEventEmployeeDrinksResponse = EventEmployeeDrinkIssueDto;

export type ApiPutEventEmployeeDrinksResponse = {
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
  res: NextApiResponse<ApiGetEventEmployeeDrinksResponse | string>,
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
            employeeDrinksCompletedAt: true,
            employeeDrinkIssues: {
              select: {
                itemId: true,
                quantity: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    }),

    prisma.item.findMany({
      where: {
        OR: [{ inventoryEnabled: true, waiterEnabled: true }],
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
    completedAt:
      event.inventory?.employeeDrinksCompletedAt?.toISOString() || null,
    items,
    issues:
      event.inventory?.employeeDrinkIssues.map((issue) => ({
        itemId: issue.itemId,
        quantity: issue.quantity,
        updatedAt: issue.updatedAt.toISOString(),
      })) || [],
  });
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse<ApiPostEventEmployeeDrinksResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { itemId, quantityDelta } = req.body;

  if (typeof itemId !== 'string') {
    return res.status(400).json('Invalid item ID');
  }

  const parsedQuantityDelta =
    typeof quantityDelta === 'number' ? quantityDelta : Number(quantityDelta);

  if (!Number.isInteger(parsedQuantityDelta) || parsedQuantityDelta === 0) {
    return res.status(400).json('Quantity delta must be a non-zero integer');
  }

  try {
    const issue = await prisma.$transaction(async (tx) => {
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
          employeeDrinksCompletedAt: true,
        },
      });

      if (eventInventory.employeeDrinksCompletedAt) {
        throw new ApiError(409, 'Employee drinks have already been completed');
      }

      const existingIssue = await tx.eventEmployeeDrinkIssue.findUnique({
        where: {
          eventInventoryId_itemId: {
            eventInventoryId: eventInventory.id,
            itemId,
          },
        },
        select: {
          quantity: true,
        },
      });

      const nextQuantity = (existingIssue?.quantity || 0) + parsedQuantityDelta;

      if (nextQuantity < 0) {
        throw new ApiError(409, 'Employee drink quantity cannot be negative');
      }

      const updatedIssue = await tx.eventEmployeeDrinkIssue.upsert({
        where: {
          eventInventoryId_itemId: {
            eventInventoryId: eventInventory.id,
            itemId,
          },
        },
        create: {
          eventInventoryId: eventInventory.id,
          itemId,
          quantity: nextQuantity,
        },
        update: {
          quantity: nextQuantity,
        },
        select: {
          itemId: true,
          quantity: true,
          updatedAt: true,
        },
      });

      await tx.eventEmployeeDrinkLog.create({
        data: {
          eventInventoryId: eventInventory.id,
          itemId,
          creatorId: session.id,
          quantityDelta: parsedQuantityDelta,
        },
      });

      return updatedIssue;
    });

    return res.json({
      itemId: issue.itemId,
      quantity: issue.quantity,
      updatedAt: issue.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse<ApiPutEventEmployeeDrinksResponse | string>,
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
          employeeDrinksCompletedAt: true,
        },
      });

      if (inventory.employeeDrinksCompletedAt) {
        return inventory;
      }

      return tx.eventInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          employeeDrinksCompletedAt: new Date(),
        },
        select: {
          employeeDrinksCompletedAt: true,
        },
      });
    });

    if (!eventInventory.employeeDrinksCompletedAt) {
      return res.status(500).json('Could not finalize employee drinks');
    }

    return res.json({
      completedAt: eventInventory.employeeDrinksCompletedAt.toISOString(),
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
