// lib/events/resolveDerivedOpenBarSales.ts

import { RecipeUnit } from '@prisma/client';

export type RecipeGraphItem = {
  id: string;
  name: string;
  sizeInMl: number | null;
  priceCents: number;

  inventoryEnabled: boolean;
  deriveFromOpenBarStock: boolean;
  openBarInferencePriority: number;
  openBarInferenceIngredientId: string | null;

  brand: {
    id: string;
    name: string;
  };

  recipeComponents: Array<{
    ingredientItemId: string;
    amount: number;
    unit: RecipeUnit;
  }>;
};

export type NormalizedAmount = {
  itemId: string;

  /**
   * Sobald eine Gebindegröße bekannt ist, rechnen wir intern immer in ml.
   *
   * Beispiel:
   * 3 Flaschen Secco à 750 ml => 2.250 ml
   */
  unit: RecipeUnit;
  amount: number;
};

export type ExpandedRecipeComponent = NormalizedAmount & {
  name: string;
  sizeInMl: number | null;
};

export type DerivedOpenBarSale = {
  item: {
    id: string;
    name: string;
    priceCents: number;
    brand: {
      id: string;
      name: string;
    };
  };

  /**
   * Rekonstruierte Anzahl verkaufter Produkte.
   *
   * Nur ganze Einheiten:
   * Ein halber Aperol Baum wird nicht als Verkauf gezählt.
   */
  quantity: number;

  revenueCents: number;

  inferenceIngredient: {
    itemId: string;
    availableAmount: number;
    requiredAmountPerSale: number;
    unit: RecipeUnit;
  };

  /**
   * Vollständig auf physische Lagerartikel heruntergebrochen.
   */
  consumedIngredients: ExpandedRecipeComponent[];
};

export type DerivedIngredientAllocation = {
  derivedSaleItem: {
    id: string;
    name: string;
  };

  derivedSaleQuantity: number;

  amount: number;
  unit: RecipeUnit;
};

export type ResolveDerivedOpenBarSalesResult = {
  derivedSales: DerivedOpenBarSale[];

  /**
   * Noch nicht zugeordneter Rohverbrauch nach Abzug
   * aller abgeleiteten Produkte.
   */
  remainingConsumption: Map<string, NormalizedAmount>;

  /**
   * Für die Anzeige in den Artikelkarten:
   * Welche Mengen wurden für Boote, Bäume etc. abgezogen?
   */
  allocationsByIngredientId: Map<string, DerivedIngredientAllocation[]>;

  warnings: string[];
};

export function resolveDerivedOpenBarSales({
  items,
  rawConsumption,
}: {
  items: RecipeGraphItem[];
  rawConsumption: Map<string, NormalizedAmount>;
}): ResolveDerivedOpenBarSalesResult {
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const remainingConsumption = cloneConsumptionMap(rawConsumption);

  const allocationsByIngredientId = new Map<
    string,
    DerivedIngredientAllocation[]
  >();

  const warnings: string[] = [];
  const derivedSales: DerivedOpenBarSale[] = [];

  const inferableItems = items
    .filter(
      (item) =>
        item.deriveFromOpenBarStock &&
        item.priceCents > 0 &&
        item.openBarInferenceIngredientId &&
        item.recipeComponents.length > 0,
    )
    .sort(
      (a, b) =>
        b.openBarInferencePriority - a.openBarInferencePriority ||
        a.name.localeCompare(b.name),
    );

  for (const product of inferableItems) {
    const expandedRecipe = expandRecipeToInventoryItems({
      productItemId: product.id,
      itemsById,
    });

    const inferenceIngredientId = product.openBarInferenceIngredientId;

    if (!inferenceIngredientId) continue;

    const inferenceComponent = expandedRecipe.find(
      (component) => component.itemId === inferenceIngredientId,
    );

    if (!inferenceComponent) {
      warnings.push(
        `Für "${product.brand.name} ${product.name}" ist ein Leitartikel hinterlegt, der nach der Rezeptauflösung nicht vorkommt.`,
      );

      continue;
    }

    const availableInferenceIngredient = remainingConsumption.get(
      inferenceIngredientId,
    );

    if (!availableInferenceIngredient) continue;

    if (availableInferenceIngredient.unit !== inferenceComponent.unit) {
      warnings.push(
        `Für "${product.brand.name} ${product.name}" konnte der Leitartikel nicht ausgewertet werden, weil unterschiedliche Einheiten verwendet werden.`,
      );

      continue;
    }

    /**
     * Snapshot vor dem Abzug.
     *
     * Wichtig: Das Objekt aus der Map wird später mutiert.
     * Deshalb speichern wir den ursprünglichen Wert separat.
     */
    const availableAmountBeforeAllocation = availableInferenceIngredient.amount;

    const quantity = Math.floor(
      Math.max(availableAmountBeforeAllocation, 0) / inferenceComponent.amount,
    );

    if (quantity <= 0) continue;

    const consumedIngredients = expandedRecipe.map((component) => ({
      ...component,
      amount: component.amount * quantity,
    }));

    for (const component of consumedIngredients) {
      subtractRemainingConsumption({
        consumption: remainingConsumption,
        component,
      });

      const allocations = allocationsByIngredientId.get(component.itemId) || [];

      allocations.push({
        derivedSaleItem: {
          id: product.id,
          name: product.name,
        },

        derivedSaleQuantity: quantity,

        amount: component.amount,
        unit: component.unit,
      });

      allocationsByIngredientId.set(component.itemId, allocations);
    }

    derivedSales.push({
      item: {
        id: product.id,
        name: product.name,
        priceCents: product.priceCents,
        brand: product.brand,
      },

      quantity,
      revenueCents: quantity * product.priceCents,

      inferenceIngredient: {
        itemId: inferenceIngredientId,
        availableAmount: availableAmountBeforeAllocation,
        requiredAmountPerSale: inferenceComponent.amount,
        unit: inferenceComponent.unit,
      },

      consumedIngredients,
    });
  }

  return {
    derivedSales,
    remainingConsumption,
    allocationsByIngredientId,
    warnings,
  };
}

export function expandRecipeToInventoryItems({
  productItemId,
  itemsById,
}: {
  productItemId: string;
  itemsById: Map<string, RecipeGraphItem>;
}): ExpandedRecipeComponent[] {
  const mergedComponents = new Map<string, ExpandedRecipeComponent>();

  const expandProduct = ({
    itemId,
    multiplier,
    path,
  }: {
    itemId: string;
    multiplier: number;
    path: string[];
  }) => {
    if (path.includes(itemId)) {
      throw new Error(
        `Zirkuläre Rezeptur erkannt: ${[...path, itemId].join(' -> ')}`,
      );
    }

    const product = itemsById.get(itemId);

    if (!product) {
      throw new Error(`Artikel "${itemId}" wurde nicht gefunden.`);
    }

    for (const component of product.recipeComponents) {
      const ingredient = itemsById.get(component.ingredientItemId);

      if (!ingredient) {
        throw new Error(
          `Rezeptbestandteil "${component.ingredientItemId}" wurde nicht gefunden.`,
        );
      }

      const nestedRecipe =
        !ingredient.inventoryEnabled && ingredient.recipeComponents.length > 0;

      if (nestedRecipe) {
        if (component.unit !== 'UNIT') {
          throw new Error(
            `Der verschachtelte Rezeptartikel "${ingredient.name}" muss als UNIT eingebunden werden.`,
          );
        }

        expandProduct({
          itemId: ingredient.id,
          multiplier: multiplier * component.amount,
          path: [...path, itemId],
        });

        continue;
      }

      addNormalizedComponent({
        target: mergedComponents,
        item: ingredient,
        unit: component.unit,
        amount: component.amount * multiplier,
      });
    }
  };

  expandProduct({
    itemId: productItemId,
    multiplier: 1,
    path: [],
  });

  return [...mergedComponents.values()];
}

function addNormalizedComponent({
  target,
  item,
  unit,
  amount,
}: {
  target: Map<string, ExpandedRecipeComponent>;
  item: RecipeGraphItem;
  unit: RecipeUnit;
  amount: number;
}) {
  const normalized = normalizeAmount({
    itemId: item.id,
    sizeInMl: item.sizeInMl,
    amount,
    unit,
  });

  const current = target.get(item.id);

  if (!current) {
    target.set(item.id, {
      ...normalized,
      name: item.name,
      sizeInMl: item.sizeInMl,
    });
    return;
  }

  if (current.unit !== normalized.unit) {
    throw new Error(
      `Für "${item.brand.name} ${item.name}" konnten die Rezeptmengen nicht zusammengeführt werden.`,
    );
  }

  current.amount += normalized.amount;
}

export function normalizeAmount({
  itemId,
  sizeInMl,
  amount,
  unit,
}: {
  itemId: string;
  sizeInMl: number | null;
  amount: number;
  unit: RecipeUnit;
}): NormalizedAmount {
  if (unit === 'UNIT' && sizeInMl) {
    return {
      itemId,
      unit: 'MILLILITER',
      amount: amount * sizeInMl,
    };
  }

  return {
    itemId,
    unit,
    amount,
  };
}

function subtractRemainingConsumption({
  consumption,
  component,
}: {
  consumption: Map<string, NormalizedAmount>;
  component: ExpandedRecipeComponent;
}) {
  const current = consumption.get(component.itemId);

  if (!current) {
    consumption.set(component.itemId, {
      ...component,
      amount: -component.amount,
    });

    return;
  }

  if (current.unit !== component.unit) {
    throw new Error(
      `Der Verbrauch für Artikel "${component.itemId}" verwendet widersprüchliche Einheiten.`,
    );
  }

  current.amount -= component.amount;
}

function cloneConsumptionMap(consumption: Map<string, NormalizedAmount>) {
  return new Map(
    [...consumption.entries()].map(([itemId, value]) => [itemId, { ...value }]),
  );
}
