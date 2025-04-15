import { findOrCreateBrandByName } from '@/lib/models/brand';
import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
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

export type ApiGetWarehouseResponse = Prisma.ItemGetPayload<{
  include: {
    brand: { select: { name: true } };
    countings: {
      select: { inventory: { select: { createdAt: true } } };
    };
  };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');
  const items = await prisma.item.findMany({
    include: {
      brand: { select: { name: true } },
      countings: {
        select: { inventory: { select: { createdAt: true } } },
        take: 1,
        orderBy: { inventory: { createdAt: 'desc' } },
      },
    },
  });
  return res.json(items);
}
