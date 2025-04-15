import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { inventoryId } = req.query;
  if (typeof inventoryId !== 'string')
    return res.status(400).json('InventoryId Required');

  if (req.method === 'GET') {
    await handleGET(req, res, inventoryId);
  } else if (req.method === 'PUT') {
    await handlePUT(req, res, inventoryId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetInventoryResponse = Prisma.InventoryGetPayload<{
  include: {
    lastEvent: { select: { name: true } };
    countings: { include: { item: { include: { brand: true } } } };
  };
}>;

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      lastEvent: { select: { name: true } },
      countings: { include: { item: { include: { brand: true } } } },
    },
  });

  return res.json(inventory);
}

export type ApiPutInventoryResponse = {
  id: string;
  createdAt: Date;
  creatorId: string;
  eventId: string;
  done: boolean;
};

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const { done } = req.body;

  const inventory = await prisma.inventory.update({
    where: { id },
    data: {
      done,
    },
  });

  return res.json(inventory);
}
