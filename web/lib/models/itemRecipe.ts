import { RecipeUnit } from '@prisma/client';

export type RecipeComponentInput = {
  ingredientItemId: string;
  amount: number;
  unit: RecipeUnit;
};

export type RecipeItemOption = {
  id: string;
  name: string;
  sizeInMl: number | null;
  inventoryEnabled: boolean;
  waiterEnabled: boolean;
  brand: {
    name: string;
  };
};

export type RecipeComponentView = {
  id: string;
  amount: number;
  unit: RecipeUnit;
  ingredientItem: RecipeItemOption;
};

export function translateRecipeUnit(unit: RecipeUnit) {
  switch (unit) {
    case RecipeUnit.UNIT:
      return 'Flasche / Stück';

    case RecipeUnit.MILLILITER:
      return 'Milliliter';
  }
}

export function formatRecipeAmount(amount: number, unit: RecipeUnit) {
  if (unit === RecipeUnit.MILLILITER) {
    return `${amount} ml`;
  }

  return `${amount} ×`;
}

export function getRecipeIngredientLabel(
  item: Pick<RecipeItemOption, 'name' | 'sizeInMl' | 'brand'>,
) {
  const size = item.sizeInMl ? ` · ${translateSizeValue(item.sizeInMl)}` : '';

  return `${item.brand.name} · ${item.name}${size}`;
}

function translateSizeValue(sizeInMl: number) {
  if (sizeInMl >= 1000) {
    return `${(sizeInMl / 1000).toLocaleString('de-DE')} l`;
  }

  return `${sizeInMl} ml`;
}
