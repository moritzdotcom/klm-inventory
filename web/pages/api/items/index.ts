import { findOrCreateBrandByName } from '@/lib/models/brand';
import { replaceItemRecipe } from '@/lib/models/saveItemRecipe';
import { getServerSession } from '@/lib/models/session';
import { parseRecipeComponents } from '@/lib/models/validateItemRecipe';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`,
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
    priceCents,
    amountInStock,
    amountPerCrate,
    inventoryEnabled,
    waiterEnabled,
  } = req.body;

  const brand = await findOrCreateBrandByName(brandName);

  const recipeComponents = parseRecipeComponents(req.body.recipeComponents);

  const item = await prisma.$transaction(async (tx) => {
    const createdItem = await tx.item.create({
      data: {
        name,
        brandId: brand.id,
        category,
        sizeInMl: sizeInMl ? Number(sizeInMl) : null,
        image,
        amountInStock: amountInStock ? Number(amountInStock) : 0,
        amountPerCrate: amountPerCrate ? Number(amountPerCrate) : 1,
        priceCents,
        inventoryEnabled,
        waiterEnabled,
      },
      include: {
        brand: true,
      },
    });

    await replaceItemRecipe(tx, createdItem.id, recipeComponents);

    return createdItem;
  });

  return res.json(item);
}
