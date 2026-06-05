// pages/api/events/[eventId].ts
import {
  getEventChecklist,
  getEventChecklistProgress,
} from '@/lib/models/eventChecklist';
import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const eventDetailArgs = {
  include: {
    inventory: {
      include: {
        countings: {
          include: {
            item: {
              include: {
                brand: true,
              },
            },
          },
          orderBy: [
            {
              phase: 'asc',
            },
            {
              item: {
                category: 'asc',
              },
            },
          ],
        },
        employeeDrinkIssues: {
          include: {
            item: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    },
    settlement: {
      include: {
        issues: {
          include: {
            item: {
              include: {
                brand: true,
              },
            },
            recipeSnapshot: {
              include: {
                ingredientItem: {
                  include: {
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EventDefaultArgs;

type ApiEventDetail = Prisma.EventGetPayload<typeof eventDetailArgs>;

export type ApiGetEventResponse = {
  event: ApiEventDetail;
  inventoryItemCount: number;
  checklist: {
    openingStock: boolean;
    employeeDrinks: boolean;
    waiterSettlement: boolean;
    closingStock: boolean;
  };
  progress: {
    completed: number;
    total: number;
    done: boolean;
  };
};

export type ApiPutEventResponse = {
  id: string;
  name: string;
  date: Date;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { eventId } = req.query;

  if (typeof eventId !== 'string') {
    return res.status(400).json('Invalid ID');
  }

  if (req.method === 'GET') {
    return handleGET(req, res, eventId);
  }

  if (req.method === 'PUT') {
    return handlePUT(req, res, eventId);
  }

  if (req.method === 'DELETE') {
    return handleDELETE(req, res, eventId);
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json(`Method ${req.method} not allowed`);
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetEventResponse | string>,
  id: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const [event, inventoryItemCount] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      ...eventDetailArgs,
    }),
    prisma.item.count({
      where: {
        inventoryEnabled: true,
      },
    }),
  ]);

  if (!event) return res.status(404).json('No event found');

  const checklist = getEventChecklist(event);

  return res.json({
    event,
    inventoryItemCount,
    checklist,
    progress: getEventChecklistProgress(checklist),
  });
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse<ApiPutEventResponse | string>,
  id: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { name, date } = req.body;

  if (name !== undefined && typeof name !== 'string') {
    return res.status(400).json('Invalid name');
  }

  if (date !== undefined && Number.isNaN(new Date(date).getTime())) {
    return res.status(400).json('Invalid date');
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      date: date ? new Date(date) : undefined,
    },
    select: {
      id: true,
      name: true,
      date: true,
    },
  });

  return res.json(event);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const event = await prisma.event.delete({
    where: { id },
  });

  return res.json(event);
}
