import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getServerSession } from '@/lib/models/session';

async function getItemOptions() {
  return prisma.item.findMany({
    orderBy: [
      {
        brand: {
          name: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
    select: {
      id: true,
      name: true,
      sizeInMl: true,
      inventoryEnabled: true,
      waiterEnabled: true,
      brand: {
        select: {
          name: true,
        },
      },
    },
  });
}

export type ApiGetItemOptionsResponse = Awaited<
  ReturnType<typeof getItemOptions>
>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await getServerSession(req);

  if (!user?.id) {
    return res.status(401).json({
      error: 'Nicht angemeldet',
    });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  return res.status(200).json(await getItemOptions());
}
