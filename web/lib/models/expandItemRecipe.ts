import { Prisma, RecipeUnit } from '@prisma/client';

export type ExpandedRecipeComponent = {
  ingredientItemId: string;
  amount: number;
  unit: RecipeUnit;
};

export async function expandItemRecipeToLeaves(
  tx: Prisma.TransactionClient,
  itemId: string,
): Promise<ExpandedRecipeComponent[]> {
  const rows = await expandRecursively(tx, itemId, 1, []);

  return aggregateRecipeRows(rows);
}

async function expandRecursively(
  tx: Prisma.TransactionClient,
  itemId: string,
  multiplier: number,
  path: string[],
): Promise<ExpandedRecipeComponent[]> {
  if (path.includes(itemId)) {
    throw new Error('Circular item recipe detected');
  }

  const components = await tx.itemRecipeComponent.findMany({
    where: {
      parentItemId: itemId,
    },
    select: {
      ingredientItemId: true,
      amount: true,
      unit: true,
    },
  });

  /**
   * Ein Item ohne Rezept ist selbst ein physischer Verbrauchsartikel.
   */
  if (components.length === 0) {
    return [
      {
        ingredientItemId: itemId,
        amount: multiplier,
        unit: RecipeUnit.UNIT,
      },
    ];
  }

  const result: ExpandedRecipeComponent[] = [];

  for (const component of components) {
    if (component.unit === RecipeUnit.MILLILITER) {
      /**
       * Milliliter-Komponenten sind immer Blätter:
       * zum Beispiel 40 ml Lillet aus einer 0,7-l-Flasche.
       */
      result.push({
        ingredientItemId: component.ingredientItemId,
        amount: multiplier * component.amount,
        unit: RecipeUnit.MILLILITER,
      });

      continue;
    }

    const nestedRows = await expandRecursively(
      tx,
      component.ingredientItemId,
      multiplier * component.amount,
      [...path, itemId],
    );

    result.push(...nestedRows);
  }

  return result;
}

function aggregateRecipeRows(rows: ExpandedRecipeComponent[]) {
  const map = new Map<string, ExpandedRecipeComponent>();

  for (const row of rows) {
    const key = `${row.ingredientItemId}:${row.unit}`;

    const existing = map.get(key);

    if (existing) {
      existing.amount += row.amount;
    } else {
      map.set(key, {
        ...row,
      });
    }
  }

  return Array.from(map.values());
}
