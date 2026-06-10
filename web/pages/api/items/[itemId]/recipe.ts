import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import {
  RecipeValidationError,
  parseRecipeComponents,
  replaceItemRecipe,
} from '@/lib/models/saveItemRecipe';
import { getServerSession } from '@/lib/models/session';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getRecipe(itemId: string) {
  const item = await prisma.item.findUnique({
    where: {
      id: itemId,
    },
    select: {
      id: true,
      name: true,
      deriveFromOpenBarStock: true,
      openBarInferencePriority: true,
      openBarInferenceIngredientId: true,
      brand: {
        select: {
          name: true,
        },
      },
      recipeComponents: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          amount: true,
          unit: true,
          ingredientItemId: true,
          ingredientItem: {
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
              recipeComponents: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new ApiError(404, 'Artikel nicht gefunden.');
  }

  return {
    item: {
      id: item.id,
      name: item.name,
      deriveFromOpenBarStock: item.deriveFromOpenBarStock,
      openBarInferencePriority: item.openBarInferencePriority,
      openBarInferenceIngredientId: item.openBarInferenceIngredientId,
      brand: item.brand,
    },
    components: item.recipeComponents.map((component) => ({
      id: component.id,
      amount: component.amount,
      unit: component.unit,
      ingredientItemId: component.ingredientItemId,
      ingredientItem: {
        id: component.ingredientItem.id,
        name: component.ingredientItem.name,
        sizeInMl: component.ingredientItem.sizeInMl,
        inventoryEnabled: component.ingredientItem.inventoryEnabled,
        waiterEnabled: component.ingredientItem.waiterEnabled,
        isRecipe: component.ingredientItem.recipeComponents.length > 0,
        brand: component.ingredientItem.brand,
      },
    })),
  };
}

export type ApiGetItemRecipeResponse = Awaited<ReturnType<typeof getRecipe>>;

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

    const itemId =
      typeof req.query.itemId === 'string' ? req.query.itemId : null;

    if (!itemId) {
      throw new ApiError(400, 'Ungültige Artikel-ID.');
    }

    switch (req.method) {
      case 'GET': {
        return res.status(200).json(await getRecipe(itemId));
      }

      case 'PUT': {
        const {
          deriveFromOpenBarStock = false,
          openBarInferencePriority = 0,
          openBarInferenceIngredientId = null,
        } = req.body;

        const recipeComponents = parseRecipeComponents(
          req.body?.recipeComponents,
        );

        if (deriveFromOpenBarStock && !openBarInferenceIngredientId) {
          return res.status(400).json({
            error:
              'Für die Ableitung aus dem Warenverbrauch muss ein Leitartikel ausgewählt werden.',
          });
        }

        if (
          !Number.isInteger(openBarInferencePriority) ||
          openBarInferencePriority < 0
        ) {
          return res.status(400).json({
            error: 'Die Priorität ist ungültig.',
          });
        }

        await prisma.$transaction(async (tx) => {
          const exists = await tx.item.findUnique({
            where: {
              id: itemId,
            },
            select: {
              id: true,
            },
          });

          if (!exists) {
            throw new ApiError(404, 'Artikel nicht gefunden.');
          }

          await tx.item.update({
            where: {
              id: itemId,
            },

            data: {
              deriveFromOpenBarStock,
              openBarInferencePriority: deriveFromOpenBarStock
                ? openBarInferencePriority
                : 0,
              openBarInferenceIngredientId: deriveFromOpenBarStock
                ? openBarInferenceIngredientId
                : null,
            },
          });

          await replaceItemRecipe(tx, itemId, recipeComponents);
        });

        return res.status(200).json(await getRecipe(itemId));
      }

      default: {
        res.setHeader('Allow', ['GET', 'PUT']);

        return res.status(405).json({
          error: 'Method not allowed',
        });
      }
    }
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
