import type { NextApiRequest, NextApiResponse } from 'next';
import { ItemCategory } from '@prisma/client';
import prisma from '@/lib/prismadb';
import {
  RecipeValidationError,
  parseRecipeComponents,
  replaceItemRecipe,
} from '@/lib/models/saveItemRecipe';
import { getServerSession } from '@/lib/models/session';
import { findOrCreateBrandByName } from '@/lib/models/brand';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseInteger(value: unknown, field: string) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed)) {
    throw new ApiError(400, `${field} muss eine Ganzzahl sein.`);
  }

  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const user = await getServerSession(req);

    if (!user?.id) {
      return res.status(401).json({
        error: 'Nicht angemeldet',
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);

      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    const name = String(req.body?.name ?? '').trim();
    const brandName = String(req.body?.brandName ?? '').trim();
    const category = req.body?.category as ItemCategory;

    const priceCents = parseInteger(req.body?.priceCents, 'priceCents');

    const inventoryEnabled =
      typeof req.body?.inventoryEnabled === 'boolean'
        ? req.body.inventoryEnabled
        : false;

    const waiterEnabled =
      typeof req.body?.waiterEnabled === 'boolean'
        ? req.body.waiterEnabled
        : true;

    const recipeComponents = parseRecipeComponents(req.body?.recipeComponents);

    if (!name) {
      throw new ApiError(400, 'Der Name fehlt.');
    }

    if (!brandName) {
      throw new ApiError(400, 'Die Marke fehlt.');
    }

    if (!Object.values(ItemCategory).includes(category)) {
      throw new ApiError(400, 'Ungültige Kategorie.');
    }

    if (priceCents < 0) {
      throw new ApiError(400, 'Der Preis darf nicht negativ sein.');
    }

    if (recipeComponents.length === 0) {
      throw new ApiError(400, 'Ein Rezept benötigt mindestens eine Zutat.');
    }

    const brand = await findOrCreateBrandByName(brandName);

    const item = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.item.create({
        data: {
          name,
          brandId: brand.id,
          category,
          priceCents,

          // Rezeptprodukte haben kein eigenes physisches Gebinde.
          sizeInMl: null,
          amountInStock: 0,
          amountPerCrate: 1,

          inventoryEnabled,
          waiterEnabled,
        },
      });

      await replaceItemRecipe(tx, createdItem.id, recipeComponents);

      return createdItem;
    });

    return res.status(201).json({
      item,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    if (error instanceof RecipeValidationError) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Interner Serverfehler',
    });
  }
}
