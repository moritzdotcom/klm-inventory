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

export type ApiGetInventoriesResponse = ({
  creator: {
    name: string;
  };
  lastEvent: {
    name: string;
    id: string;
    date: Date;
  };
} & {
  id: string;
  createdAt: Date;
  creatorId: string;
  eventId: string;
  done: boolean;
})[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');
  const inventories = await prisma.inventory.findMany({
    include: { lastEvent: true, creator: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(inventories);
}

export type ApiPostInventoryResponse = {
  id: string;
  createdAt: Date;
  creatorId: string;
  eventId: string;
  done: boolean;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { eventId } = req.body;
  if (typeof eventId !== 'string')
    return res.status(400).json('Event required');

  const inventory = await prisma.inventory.create({
    data: { eventId, creatorId: session.id },
  });

  return res.json(inventory);
}
