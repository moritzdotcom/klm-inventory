import { Prisma, RecipeUnit } from '@prisma/client';

export type RecipeComponentPayload = {
  ingredientItemId: string;
  amount: number;
  unit: RecipeUnit;
};

export class RecipeValidationError extends Error {}

export function parseRecipeComponents(
  value: unknown,
): RecipeComponentPayload[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new RecipeValidationError('Die Rezeptur muss eine Liste sein.');
  }

  const rows = value.map((rawRow) => {
    const row = rawRow as Record<string, unknown>;

    const ingredientItemId =
      typeof row.ingredientItemId === 'string' ? row.ingredientItemId : '';

    const amount =
      typeof row.amount === 'number'
        ? row.amount
        : Number.parseInt(String(row.amount), 10);

    const unit = row.unit as RecipeUnit;

    if (!ingredientItemId) {
      throw new RecipeValidationError('Eine Zutat enthält keine Artikel-ID.');
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RecipeValidationError(
        'Die Zutatenmenge muss größer als 0 sein.',
      );
    }

    if (!Object.values(RecipeUnit).includes(unit)) {
      throw new RecipeValidationError(
        'Eine Zutat enthält eine ungültige Einheit.',
      );
    }

    return {
      ingredientItemId,
      amount,
      unit,
    };
  });

  const ingredientIds = rows.map((row) => row.ingredientItemId);

  if (new Set(ingredientIds).size !== ingredientIds.length) {
    throw new RecipeValidationError(
      'Eine Zutat darf nicht mehrfach vorkommen.',
    );
  }

  return rows;
}

export async function validateRecipeComponents(
  tx: Prisma.TransactionClient,
  parentItemId: string,
  rows: RecipeComponentPayload[],
) {
  if (rows.some((row) => row.ingredientItemId === parentItemId)) {
    throw new RecipeValidationError(
      'Ein Artikel darf nicht Bestandteil seines eigenen Rezeptes sein.',
    );
  }

  const ingredientIds = rows.map((row) => row.ingredientItemId);

  const ingredients = await tx.item.findMany({
    where: {
      id: {
        in: ingredientIds,
      },
    },
    select: {
      id: true,
      name: true,
      sizeInMl: true,
    },
  });

  if (ingredients.length !== ingredientIds.length) {
    throw new RecipeValidationError(
      'Mindestens eine Zutat wurde nicht gefunden.',
    );
  }

  const ingredientMap = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  for (const row of rows) {
    const ingredient = ingredientMap.get(row.ingredientItemId);

    if (
      row.unit === RecipeUnit.MILLILITER &&
      (!ingredient?.sizeInMl || ingredient.sizeInMl <= 0)
    ) {
      throw new RecipeValidationError(
        `${ingredient?.name ?? 'Zutat'} besitzt keine Gebindegröße. Ein Verbrauch in Millilitern ist deshalb nicht möglich.`,
      );
    }
  }

  await assertNoRecipeCycle(tx, parentItemId, ingredientIds);
}

async function assertNoRecipeCycle(
  tx: Prisma.TransactionClient,
  parentItemId: string,
  initialIngredientIds: string[],
) {
  const visited = new Set<string>();
  let frontier = [...initialIngredientIds];

  while (frontier.length > 0) {
    if (frontier.includes(parentItemId)) {
      throw new RecipeValidationError(
        'Die Rezeptur würde einen Kreislauf erzeugen.',
      );
    }

    const nextIds = frontier.filter((itemId) => !visited.has(itemId));

    if (nextIds.length === 0) return;

    nextIds.forEach((itemId) => visited.add(itemId));

    const nestedComponents = await tx.itemRecipeComponent.findMany({
      where: {
        parentItemId: {
          in: nextIds,
        },
      },
      select: {
        ingredientItemId: true,
      },
    });

    frontier = nestedComponents.map((component) => component.ingredientItemId);
  }
}
