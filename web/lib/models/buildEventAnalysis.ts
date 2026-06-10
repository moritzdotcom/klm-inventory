// lib/events/buildEventAnalysis.ts

import { ItemCategory, RecipeUnit } from '@prisma/client';
import {
  DerivedIngredientAllocation,
  DerivedOpenBarSale,
  normalizeAmount,
  RecipeGraphItem,
  resolveDerivedOpenBarSales,
} from './resolveDerivedOpenBarSales';

export type EventAnalysisItem = {
  id: string;
  name: string;
  category: ItemCategory;
  sizeInMl: number | null;
  priceCents: number;
  inventoryEnabled: boolean;

  brand: {
    id: string;
    name: string;
  };
};

type RecipeParentItem = {
  id: string;
  name: string;
  priceCents: number;
  waiterEnabled: boolean;
  brand: {
    id: string;
    name: string;
  };
};

type AnalysisInputItem = EventAnalysisItem & {
  /**
   * Rezeptartikel, in denen der physische Lagerartikel verwendet wird.
   *
   * Beispiel:
   * Espresso Martini Bag -> Espresso Martini, Espresso Martini Shot
   */
  deriveFromOpenBarStock: boolean;
  openBarInferencePriority: number;
  openBarInferenceIngredientId: string | null;
  recipeComponents: Array<{
    ingredientItemId: string;
    amount: number;
    unit: RecipeUnit;
  }>;

  usedInRecipes: Array<{
    amount: number;
    unit: RecipeUnit;
    parentItem: RecipeParentItem;
  }>;
};

type InventoryCounting = {
  itemId: string;
  phase: 'OPENING' | 'CLOSING';
  amount: number;
};

type EmployeeDrinkIssue = {
  itemId: string;
  quantity: number;
};

type WaiterIssue = {
  itemId: string;
  quantity: number;
  hidden: boolean;
  item: EventAnalysisItem;
  recipeSnapshot: Array<{
    ingredientItemId: string;
    amount: number;
    unit: RecipeUnit;
  }>;
};

export type EventAnalysisWarning = {
  code:
    | 'MISSING_RECIPE_SNAPSHOT'
    | 'MILLILITER_USAGE_WITHOUT_ITEM_SIZE'
    | 'NEGATIVE_OPEN_BAR_CONSUMPTION'
    | 'MISSING_OPEN_BAR_VALUATION';
  itemId: string;
  message: string;
};

export type EventAnalysisRecipeRevenueScenario = {
  recipeItem: {
    id: string;
    name: string;
    priceCents: number;
    brand: {
      id: string;
      name: string;
    };
  };

  /**
   * Verbrauchter Ausgangsartikel.
   * Beim Bag beispielsweise 10.000 ml.
   */
  consumedIngredientAmount: number;

  /**
   * Verbrauch pro verkauftem Rezeptartikel.
   * Beim normalen Espresso Martini beispielsweise 120 ml.
   */
  recipeIngredientAmount: number;

  recipeUnit: RecipeUnit;

  /**
   * Fiktiv verkaufbare Menge des Rezeptartikels.
   * Beim Martini: 10.000 ml / 120 ml = 83,333...
   */
  theoreticalSalesCount: number;

  /**
   * theoreticalSalesCount * Verkaufspreis
   */
  estimatedRevenueCents: number;
};

export type EventAnalysisOpenBarValuation = {
  method: 'DIRECT_ITEM_PRICE' | 'RECIPE_AVERAGE' | 'NONE';

  /**
   * Geschätzter Umsatz an der offenen Theke.
   *
   * Bei DIRECT_ITEM_PRICE:
   * Verbrauchte Gebinde * Artikelpreis
   *
   * Bei RECIPE_AVERAGE:
   * Mittelwert der Rezept-Szenarien
   */
  estimatedRevenueCents: number;

  /**
   * Nur bei direkter Bewertung gesetzt.
   */
  directUnitPriceCents: number | null;

  /**
   * Nur bei RECIPE_AVERAGE befüllt.
   */
  recipeScenarios: EventAnalysisRecipeRevenueScenario[];
};

export type EventAnalysisRow = {
  item: EventAnalysisItem;

  openingUnits: number;
  employeeDrinkUnits: number;
  closingUnits: number;

  waiterUnits: number;
  waiterMilliliters: number;

  /**
   * Rohverbrauch vor dem Abzug abgeleiteter Produkte.
   */
  rawOpenBarMilliliters: number | null;
  rawOpenBarEquivalentUnits: number;

  /**
   * Verbleibender Einzelverbrauch nach dem Abzug von
   * Aperol Boot, Aperol Baum etc.
   */
  openBarMilliliters: number | null;
  openBarEquivalentUnits: number;

  /**
   * Für die verständliche Anzeige im Frontend.
   */
  derivedProductAllocations: DerivedIngredientAllocation[];

  openBarEstimatedRevenueCents: number;
  openBarStockValueCents: number;

  openBarValuation: EventAnalysisOpenBarValuation;

  hasNegativeOpenBarConsumption: boolean;
};

export type EventAnalysisResult = {
  rows: EventAnalysisRow[];

  /**
   * Beispielsweise:
   * - 3 × Aperol Boot
   * - 16 × Aperol Baum
   */
  derivedOpenBarSales: DerivedOpenBarSale[];

  warnings: EventAnalysisWarning[];

  summary: {
    derivedOpenBarRevenueCents: number;
    directOpenBarRevenueCents: number;
    openBarEstimatedRevenueCents: number;

    openBarStockValueCents: number;

    negativeRowCount: number;
    affectedItemCount: number;
  };
};

export function buildEventAnalysis(input: {
  items: AnalysisInputItem[];
  countings: InventoryCounting[];
  employeeDrinkIssues: EmployeeDrinkIssue[];
  waiterIssues: WaiterIssue[];
}): EventAnalysisResult {
  const { items, countings, employeeDrinkIssues, waiterIssues } = input;

  const warnings: EventAnalysisWarning[] = [];

  const openingMap = new Map<string, number>();
  const closingMap = new Map<string, number>();
  const employeeDrinkMap = new Map<string, number>();

  const waiterUsageMap = new Map<
    string,
    {
      units: number;
      milliliters: number;
    }
  >();

  for (const counting of countings) {
    const targetMap = counting.phase === 'OPENING' ? openingMap : closingMap;

    targetMap.set(counting.itemId, counting.amount);
  }

  for (const issue of employeeDrinkIssues) {
    employeeDrinkMap.set(issue.itemId, issue.quantity);
  }

  const addWaiterUsage = (itemId: string, unit: RecipeUnit, amount: number) => {
    const existing = waiterUsageMap.get(itemId) || {
      units: 0,
      milliliters: 0,
    };

    if (unit === 'UNIT') {
      existing.units += amount;
    } else {
      existing.milliliters += amount;
    }

    waiterUsageMap.set(itemId, existing);
  };

  for (const waiterIssue of waiterIssues) {
    if (waiterIssue.quantity === 0) continue;

    /**
     * Physischer Lagerartikel ohne Rezeptur:
     * Beispielsweise eine Flasche Estrella oder Wasser.
     */
    if (
      waiterIssue.recipeSnapshot.length === 0 &&
      waiterIssue.item.inventoryEnabled
    ) {
      addWaiterUsage(waiterIssue.itemId, 'UNIT', waiterIssue.quantity);

      continue;
    }

    /**
     * Abstraktes Verkaufsprodukt ohne Rezeptur:
     * Beispielsweise ein Verkaufsprodukt, dessen Rezept versehentlich fehlt.
     */
    if (waiterIssue.recipeSnapshot.length === 0) {
      warnings.push({
        code: 'MISSING_RECIPE_SNAPSHOT',
        itemId: waiterIssue.itemId,
        message: `Für "${waiterIssue.item.brand.name} ${waiterIssue.item.name}" fehlt ein Rezeptur-Snapshot. Der Tischkellnerverbrauch konnte nicht vollständig aufgelöst werden.`,
      });

      continue;
    }

    /**
     * Rezeptartikel auf physische Lagerartikel herunterbrechen.
     *
     * Beispiel:
     * 3 Espresso Martinis mit jeweils 120 ml Bag
     * => 360 ml Tischkellnerverbrauch beim Bag.
     */
    for (const component of waiterIssue.recipeSnapshot) {
      addWaiterUsage(
        component.ingredientItemId,
        component.unit,
        component.amount * waiterIssue.quantity,
      );
    }
  }

  const inventoryItems = items.filter((item) => item.inventoryEnabled);

  const rawRows = inventoryItems.map((item) => {
    const openingUnits = openingMap.get(item.id) || 0;
    const closingUnits = closingMap.get(item.id) || 0;
    const employeeDrinkUnits = employeeDrinkMap.get(item.id) || 0;

    const waiterUsage = waiterUsageMap.get(item.id) || {
      units: 0,
      milliliters: 0,
    };

    let rawOpenBarMilliliters: number | null = null;
    let rawOpenBarEquivalentUnits: number;

    if (item.sizeInMl) {
      rawOpenBarMilliliters =
        openingUnits * item.sizeInMl -
        closingUnits * item.sizeInMl -
        employeeDrinkUnits * item.sizeInMl -
        waiterUsage.units * item.sizeInMl -
        waiterUsage.milliliters;

      rawOpenBarEquivalentUnits = rawOpenBarMilliliters / item.sizeInMl;
    } else {
      rawOpenBarEquivalentUnits =
        openingUnits - closingUnits - employeeDrinkUnits - waiterUsage.units;
    }

    return {
      item,
      openingUnits,
      closingUnits,
      employeeDrinkUnits,
      waiterUsage,
      rawOpenBarMilliliters,
      rawOpenBarEquivalentUnits,
    };
  });

  const rawConsumption = new Map(
    rawRows.map((row) => {
      return [
        row.item.id,
        normalizeAmount({
          itemId: row.item.id,
          sizeInMl: row.item.sizeInMl,
          amount: row.rawOpenBarEquivalentUnits,
          unit: 'UNIT',
        }),
      ];
    }),
  );

  const {
    derivedSales,
    remainingConsumption,
    allocationsByIngredientId,
    warnings: derivedSalesWarnings,
  } = resolveDerivedOpenBarSales({
    items: items as RecipeGraphItem[],
    rawConsumption,
  });

  for (const message of derivedSalesWarnings) {
    warnings.push({
      code: 'MISSING_OPEN_BAR_VALUATION',
      itemId: '',
      message,
    });
  }

  const rows = rawRows.map<EventAnalysisRow>((rawRow) => {
    const { item } = rawRow;

    const remaining = remainingConsumption.get(item.id);

    let openBarMilliliters: number | null = null;
    let openBarEquivalentUnits = 0;

    if (remaining) {
      if (remaining.unit === 'MILLILITER' && item.sizeInMl) {
        openBarMilliliters = remaining.amount;
        openBarEquivalentUnits = remaining.amount / item.sizeInMl;
      } else {
        openBarEquivalentUnits = remaining.amount;
      }
    }

    const hasNegativeOpenBarConsumption = openBarEquivalentUnits < 0;

    if (hasNegativeOpenBarConsumption) {
      warnings.push({
        code: 'NEGATIVE_OPEN_BAR_CONSUMPTION',
        itemId: item.id,
        message: `Für "${item.brand.name} ${item.name}" wurde nach der Rezeptauflösung ein negativer offener Thekenverbrauch berechnet. Prüfe die Bestände oder die Rezeptkonfiguration.`,
      });
    }

    const openBarValuation = buildOpenBarValuation({
      item,
      openBarEquivalentUnits,
      openBarMilliliters,
    });

    return {
      item: toPublicItem(item),

      openingUnits: rawRow.openingUnits,
      employeeDrinkUnits: rawRow.employeeDrinkUnits,
      closingUnits: rawRow.closingUnits,

      waiterUnits: rawRow.waiterUsage.units,
      waiterMilliliters: rawRow.waiterUsage.milliliters,

      rawOpenBarMilliliters: rawRow.rawOpenBarMilliliters,
      rawOpenBarEquivalentUnits: rawRow.rawOpenBarEquivalentUnits,

      openBarMilliliters,
      openBarEquivalentUnits,

      derivedProductAllocations: allocationsByIngredientId.get(item.id) || [],

      openBarEstimatedRevenueCents: openBarValuation.estimatedRevenueCents,

      openBarStockValueCents: openBarValuation.estimatedRevenueCents,

      openBarValuation,

      hasNegativeOpenBarConsumption,
    };
  });

  const derivedOpenBarRevenueCents = derivedSales.reduce(
    (sum, sale) => sum + sale.revenueCents,
    0,
  );

  const directOpenBarRevenueCents = rows.reduce(
    (sum, row) => sum + Math.max(row.openBarEstimatedRevenueCents, 0),
    0,
  );

  const openBarEstimatedRevenueCents =
    derivedOpenBarRevenueCents + directOpenBarRevenueCents;

  return {
    rows,

    derivedOpenBarSales: derivedSales,

    warnings,

    summary: {
      derivedOpenBarRevenueCents,
      directOpenBarRevenueCents,
      openBarEstimatedRevenueCents,

      /**
       * Alter Alias, damit dein bestehender Code zunächst weiterläuft.
       */
      openBarStockValueCents: openBarEstimatedRevenueCents,

      negativeRowCount: rows.filter((row) => row.hasNegativeOpenBarConsumption)
        .length,

      affectedItemCount: rows.filter(
        (row) =>
          row.openingUnits !== 0 ||
          row.closingUnits !== 0 ||
          row.employeeDrinkUnits !== 0 ||
          row.waiterUnits !== 0 ||
          row.waiterMilliliters !== 0 ||
          row.rawOpenBarEquivalentUnits !== 0,
      ).length,
    },
  };
}

function buildOpenBarValuation({
  item,
  openBarEquivalentUnits,
  openBarMilliliters,
}: {
  item: AnalysisInputItem;
  openBarEquivalentUnits: number;
  openBarMilliliters: number | null;
}): EventAnalysisOpenBarValuation {
  /**
   * Negative Warenflüsse sind Auffälligkeiten und kein sinnvoller Umsatz.
   * Deshalb werden sie mit 0 € bewertet.
   */
  if (openBarEquivalentUnits <= 0) {
    return {
      method: item.priceCents > 0 ? 'DIRECT_ITEM_PRICE' : 'NONE',
      estimatedRevenueCents: 0,
      directUnitPriceCents: item.priceCents > 0 ? item.priceCents : null,
      recipeScenarios: [],
    };
  }

  /**
   * Standardfall:
   * Der physische Artikel hat einen eigenen Verkaufspreis.
   *
   * Beispiel:
   * 10 Flaschen Grauburgunder * 31 €
   */
  if (item.priceCents > 0) {
    return {
      method: 'DIRECT_ITEM_PRICE',
      estimatedRevenueCents: Math.round(
        openBarEquivalentUnits * item.priceCents,
      ),
      directUnitPriceCents: item.priceCents,
      recipeScenarios: [],
    };
  }

  /**
   * Sonderfall:
   * Der physische Artikel wird nicht direkt verkauft.
   * Wir suchen alle verkaufbaren Rezeptartikel, die ihn enthalten.
   */
  const recipeScenarios = item.usedInRecipes
    .filter(({ amount, parentItem }) => {
      return (
        amount > 0 && parentItem.waiterEnabled && parentItem.priceCents > 0
      );
    })
    .flatMap<EventAnalysisRecipeRevenueScenario>((recipe) => {
      const consumedIngredientAmount =
        recipe.unit === 'MILLILITER'
          ? openBarMilliliters
          : openBarEquivalentUnits;

      /**
       * Ein Rezept in Millilitern kann nur ausgewertet werden,
       * wenn der Lagerartikel eine Gebindegröße besitzt.
       */
      if (consumedIngredientAmount === null || consumedIngredientAmount <= 0) {
        return [];
      }

      const theoreticalSalesCount = consumedIngredientAmount / recipe.amount;

      return [
        {
          recipeItem: {
            id: recipe.parentItem.id,
            name: recipe.parentItem.name,
            priceCents: recipe.parentItem.priceCents,
            brand: recipe.parentItem.brand,
          },

          consumedIngredientAmount,
          recipeIngredientAmount: recipe.amount,
          recipeUnit: recipe.unit,

          theoreticalSalesCount,

          estimatedRevenueCents: Math.round(
            theoreticalSalesCount * recipe.parentItem.priceCents,
          ),
        },
      ];
    });

  if (recipeScenarios.length === 0) {
    return {
      method: 'NONE',
      estimatedRevenueCents: 0,
      directUnitPriceCents: null,
      recipeScenarios: [],
    };
  }

  const averageRevenueCents = Math.round(
    recipeScenarios.reduce(
      (sum, scenario) => sum + scenario.estimatedRevenueCents,
      0,
    ) / recipeScenarios.length,
  );

  return {
    method: 'RECIPE_AVERAGE',
    estimatedRevenueCents: averageRevenueCents,
    directUnitPriceCents: null,
    recipeScenarios,
  };
}

function toPublicItem(item: AnalysisInputItem): EventAnalysisItem {
  const { usedInRecipes, ...publicItem } = item;

  return publicItem;
}
