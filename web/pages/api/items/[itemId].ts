import { findOrCreateBrandByName } from '@/lib/models/brand';
import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { ItemCategory, Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { itemId } = req.query;
  if (typeof itemId !== 'string') return res.status(400).json('Invalid ID');

  if (req.method === 'GET') {
    await handleGET(req, res, itemId);
  } else if (req.method === 'PUT') {
    await handlePUT(req, res, itemId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, itemId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetItemResponse = Prisma.ItemGetPayload<{
  include: {
    brand: true;
    countings: { include: { inventory: { select: { createdAt: true } } } };
  };
}>;

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      brand: true,
      countings: { include: { inventory: { select: { createdAt: true } } } },
    },
  });
  return res.json(item);
}

export type ApiPutItemResponse = Prisma.ItemGetPayload<{
  include: {
    brand: true;
  };
}>;

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const {
    name,
    category,
    brandName,
    sizeInMl,
    image,
    amountInStock,
    amountPerCrate,
  } = req.body;

  const brand = brandName
    ? await findOrCreateBrandByName(brandName)
    : undefined;
  const item = await prisma.item.update({
    where: { id },
    data: {
      name: name ? name : undefined,
      category: category ? category : undefined,
      brandId: brand ? brand.id : undefined,
      sizeInMl: sizeInMl ? sizeInMl : undefined,
      image: image ? image : undefined,
      amountInStock: amountInStock ? Number(amountInStock) : undefined,
      amountPerCrate: amountPerCrate ? Number(amountPerCrate) : undefined,
    },
    include: { brand: true },
  });

  return res.json(item);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const item = await prisma.item.delete({
    where: { id },
  });

  return res.json(item);
}
