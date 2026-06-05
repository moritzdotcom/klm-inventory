// pages/api/events/index.ts
import {
  getEventChecklist,
  getEventChecklistProgress,
} from '@/lib/models/eventChecklist';
import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export type ApiGetEventsResponse = Array<{
  id: string;
  name: string;
  date: string;
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
}>;

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'GET') {
    return handleGET(req, res);
  }

  if (req.method === 'POST') {
    return handlePOST(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json(`Method ${req.method} not allowed`);
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetEventsResponse | string>,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const events = await prisma.event.findMany({
    orderBy: {
      date: 'desc',
    },
    select: {
      id: true,
      name: true,
      date: true,
      inventory: {
        select: {
          openingCompletedAt: true,
          employeeDrinksCompletedAt: true,
          closingCompletedAt: true,
        },
      },
      settlement: {
        select: {
          closedAt: true,
        },
      },
    },
  });

  return res.json(
    events.map((event) => {
      const checklist = getEventChecklist(event);

      return {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
        checklist,
        progress: getEventChecklistProgress(checklist),
      };
    }),
  );
}

/**
 * Deine bestehende POST-Logik kannst du grundsätzlich beibehalten.
 * Wichtig: Gib nach dem Erstellen dieselbe Struktur wie im GET zurück,
 * damit die neue Veranstaltung direkt korrekt in die Liste eingefügt wird.
 */
async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { name, date } = req.body;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json('Name is required');
  }

  if (!date || Number.isNaN(new Date(date).getTime())) {
    return res.status(400).json('Valid date is required');
  }

  const event = await prisma.event.create({
    data: {
      name: name.trim(),
      date: new Date(date),
    },
    select: {
      id: true,
      name: true,
      date: true,
      inventory: {
        select: {
          openingCompletedAt: true,
          employeeDrinksCompletedAt: true,
          closingCompletedAt: true,
        },
      },
      settlement: {
        select: {
          closedAt: true,
        },
      },
    },
  });

  const checklist = getEventChecklist(event);

  return res.status(201).json({
    id: event.id,
    name: event.name,
    date: event.date.toISOString(),
    checklist,
    progress: getEventChecklistProgress(checklist),
  });
}

export type ApiPostEventsResponse = ApiGetEventsResponse[number];
