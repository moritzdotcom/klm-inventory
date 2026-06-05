import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
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
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, inventoryId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`,
    );
  }
}

const inventoryArgs = {
  include: {
    creator: {
      select: {
        id: true,
        name: true,
      },
    },

    countings: {
      include: {
        item: {
          include: {
            brand: true,
          },
        },
      },
    },
  },
} satisfies Prisma.InventoryDefaultArgs;

export type ApiGetInventoryResponse = Prisma.InventoryGetPayload<
  typeof inventoryArgs
>;

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetInventoryResponse | string>,
  inventoryId: string,
) {
  const session = await getServerSession(req);

  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  const inventory = await prisma.inventory.findUnique({
    where: {
      id: inventoryId,
    },

    ...inventoryArgs,
  });

  if (!inventory) {
    return res.status(404).json('Inventory not found');
  }

  return res.json(inventory);
}

export type ApiPutInventoryResponse = {
  id: string;
  label: string | null;
  note: string | null;
  creatorId: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
) {
  const { done, note } = req.body;

  const inventory = await prisma.inventory.update({
    where: { id },
    data: {
      done,
      note,
    },
  });

  return res.json(inventory);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  inventoryId: string,
) {
  const session = await getServerSession(req);

  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  const inventory = await prisma.inventory.delete({
    where: {
      id: inventoryId,
    },
  });

  return res.json(inventory);
}
