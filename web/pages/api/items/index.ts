import { findOrCreateBrandByName } from '@/lib/models/brand';
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

export type ApiGetItemsResponse = Prisma.ItemGetPayload<{
  include: { brand: { select: { name: true } } };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const items = await prisma.item.findMany({
    include: { brand: { select: { name: true } } },
  });
  return res.json(items);
}

export type ApiPostItemResponse = Prisma.ItemGetPayload<{
  include: { brand: { select: { name: true } } };
}>;

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    category,
    brandName,
    sizeInMl,
    image,
    amountInStock,
    amountPerCrate,
  } = req.body;

  const brand = await findOrCreateBrandByName(brandName);

  const item = await prisma.item.create({
    data: {
      name,
      category,
      brandId: brand.id,
      sizeInMl,
      image,
      amountInStock: Number(amountInStock),
      amountPerCrate: Number(amountPerCrate),
    },
    include: { brand: { select: { name: true } } },
  });

  return res.json(item);
}
