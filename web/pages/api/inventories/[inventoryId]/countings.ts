import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { ItemCategory } from '@prisma/client';
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

export type ApiGetInventoryCountingResponse = {
  countings: {
    amount: number;
    itemId: string;
  }[];
  items: ({
    brand: {
      name: string;
      id: string;
    };
  } & {
    name: string;
    id: string;
    category: ItemCategory;
    brandId: string;
    sizeInMl: number;
    image: string;
    amountInStock: number;
    amountPerCrate: number;
  })[];
};

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');
  const { inventoryId } = req.query;
  if (typeof inventoryId !== 'string')
    return res.status(400).json('InventoryId Required');

  const countings = await prisma.counting.findMany({
    where: { inventoryId },
    select: { amount: true, itemId: true },
  });
  const items = await prisma.item.findMany({ include: { brand: true } });
  return res.json({ countings, items });
}

export type ApiPostInventoryCountingResponse = {
  id: string;
  inventoryId: string;
  amount: number;
  itemId: string;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { inventoryId } = req.query;
  if (typeof inventoryId !== 'string')
    return res.status(400).json('InventoryId Required');

  const { itemId, amount } = req.body;

  const item = await prisma.item.update({
    where: { id: itemId },
    data: {
      amountInStock: Number(amount),
      countings: {
        upsert: {
          where: { itemId_inventoryId: { inventoryId, itemId } },
          create: { amount: Number(amount), inventoryId },
          update: { amount: Number(amount) },
        },
      },
    },
    select: {
      countings: {
        where: { inventoryId },
      },
    },
  });

  return res.json(item.countings[0]);
}
