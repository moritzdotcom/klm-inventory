// pages/api/inventories/index.ts

import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export type ApiInventoryListItem = {
  id: string;
  label: string | null;
  note: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;

  creator: {
    id: string;
    name: string;
  };

  countedItemsCount: number;
};

export type ApiGetInventoriesResponse = {
  inventories: ApiInventoryListItem[];
  inventoryItemCount: number;
};

export type ApiPostInventoriesPayload = {
  label?: string;
  note?: string;
};

export type ApiPostInventoriesResponse = ApiInventoryListItem;

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
  res: NextApiResponse<ApiGetInventoriesResponse | string>,
) {
  const session = await getServerSession(req);

  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  const [inventories, inventoryItemCount] = await Promise.all([
    prisma.inventory.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      select: {
        id: true,
        label: true,
        note: true,
        done: true,
        createdAt: true,
        updatedAt: true,

        creator: {
          select: {
            id: true,
            name: true,
          },
        },

        _count: {
          select: {
            countings: true,
          },
        },
      },
    }),

    prisma.item.count({
      where: {
        inventoryEnabled: true,
      },
    }),
  ]);

  return res.json({
    inventoryItemCount,

    inventories: inventories.map((inventory) => ({
      id: inventory.id,
      label: inventory.label,
      note: inventory.note,
      done: inventory.done,
      createdAt: inventory.createdAt.toISOString(),
      updatedAt: inventory.updatedAt.toISOString(),

      creator: inventory.creator,

      countedItemsCount: inventory._count.countings,
    })),
  });
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse<ApiPostInventoriesResponse | string>,
) {
  const session = await getServerSession(req);

  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  const { label, note } = req.body as ApiPostInventoriesPayload;

  if (label !== undefined && typeof label !== 'string') {
    return res.status(400).json('Invalid label');
  }

  if (note !== undefined && typeof note !== 'string') {
    return res.status(400).json('Invalid note');
  }

  const inventory = await prisma.inventory.create({
    data: {
      creatorId: session.id,

      label: label?.trim() || null,
      note: note?.trim() || null,
    },

    select: {
      id: true,
      label: true,
      note: true,
      done: true,
      createdAt: true,
      updatedAt: true,

      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return res.status(201).json({
    id: inventory.id,
    label: inventory.label,
    note: inventory.note,
    done: inventory.done,
    createdAt: inventory.createdAt.toISOString(),
    updatedAt: inventory.updatedAt.toISOString(),

    creator: inventory.creator,

    countedItemsCount: 0,
  });
}
