import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetEventsResponse = ({
  inventories: {
    done: boolean;
  }[];
} & {
  name: string;
  id: string;
  date: Date;
})[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');
  const events = await prisma.event.findMany({
    include: { inventories: { select: { done: true } } },
    orderBy: { date: 'desc' },
  });
  return res.json(events);
}

export type ApiPostEventsResponse = {
  inventories: {
    done: boolean;
  }[];
} & {
  name: string;
  id: string;
  date: Date;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json('Name and Date required');

  const event = await prisma.event.create({
    data: {
      name,
      date: new Date(date),
    },
    include: { inventories: { select: { done: true } } },
  });

  return res.json(event);
}
