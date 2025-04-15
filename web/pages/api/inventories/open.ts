import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetOpenInventoriesResponse = ({
  creator: {
    name: string;
    id: string;
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
    where: { done: false },
    include: { lastEvent: true, creator: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(inventories);
}
