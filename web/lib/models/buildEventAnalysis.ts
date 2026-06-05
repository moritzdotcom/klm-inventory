// lib/events/buildEventAnalysis.ts

import { ItemCategory, RecipeUnit } from '@prisma/client';

type AnalysisItem = {
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
  item: AnalysisItem;
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
    | 'NEGATIVE_OPEN_BAR_CONSUMPTION';
  itemId: string;
  message: string;
};

export type EventAnalysisRow = {
  item: AnalysisItem;

  openingUnits: number;
  employeeDrinkUnits: number;
  closingUnits: number;

  waiterUnits: number;
  waiterMilliliters: number;

  /**
   * Wird gesetzt, wenn der Artikel eine definierte Flaschengröße besitzt.
   */
  openBarMilliliters: number | null;
  openBarEquivalentUnits: number;

  /**
   * Bewerteter Warenabgang anhand von Item.priceCents.
   * Das ist ausdrücklich kein sicher ermittelter Verkaufsumsatz.
   */
  openBarStockValueCents: number;

  hasNegativeOpenBarConsumption: boolean;
};

export type EventAnalysisResult = {
  rows: EventAnalysisRow[];
  warnings: EventAnalysisWarning[];

  summary: {
    openBarStockValueCents: number;
    negativeRowCount: number;
    affectedItemCount: number;
  };
};

export function buildEventAnalysis(input: {
  items: AnalysisItem[];
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
     * Abstraktes Verkaufsprodukt:
     * Beispielsweise Aperol Boot oder Lillet Wild Berry.
     */
    if (waiterIssue.recipeSnapshot.length === 0) {
      warnings.push({
        code: 'MISSING_RECIPE_SNAPSHOT',
        itemId: waiterIssue.itemId,
        message: `Für "${waiterIssue.item.brand.name} ${waiterIssue.item.name}" fehlt ein Rezeptur-Snapshot. Der Tischkellnerverbrauch konnte nicht vollständig aufgelöst werden.`,
      });

      continue;
    }

    for (const component of waiterIssue.recipeSnapshot) {
      addWaiterUsage(
        component.ingredientItemId,
        component.unit,
        component.amount * waiterIssue.quantity,
      );
    }
  }

  const rows = items.map<EventAnalysisRow>((item) => {
    const openingUnits = openingMap.get(item.id) || 0;
    const closingUnits = closingMap.get(item.id) || 0;
    const employeeDrinkUnits = employeeDrinkMap.get(item.id) || 0;

    const waiterUsage = waiterUsageMap.get(item.id) || {
      units: 0,
      milliliters: 0,
    };

    if (!item.sizeInMl && waiterUsage.milliliters > 0) {
      warnings.push({
        code: 'MILLILITER_USAGE_WITHOUT_ITEM_SIZE',
        itemId: item.id,
        message: `Für "${item.brand.name} ${item.name}" wurde ein Verbrauch in Millilitern erfasst, aber keine Gebindegröße hinterlegt.`,
      });
    }

    let openBarMilliliters: number | null = null;
    let openBarEquivalentUnits: number;

    if (item.sizeInMl) {
      openBarMilliliters =
        openingUnits * item.sizeInMl -
        closingUnits * item.sizeInMl -
        employeeDrinkUnits * item.sizeInMl -
        waiterUsage.units * item.sizeInMl -
        waiterUsage.milliliters;

      openBarEquivalentUnits = openBarMilliliters / item.sizeInMl;
    } else {
      openBarEquivalentUnits =
        openingUnits - closingUnits - employeeDrinkUnits - waiterUsage.units;
    }

    const hasNegativeOpenBarConsumption = openBarEquivalentUnits < 0;

    if (hasNegativeOpenBarConsumption) {
      warnings.push({
        code: 'NEGATIVE_OPEN_BAR_CONSUMPTION',
        itemId: item.id,
        message: `Für "${item.brand.name} ${item.name}" wurde ein negativer offener Thekenverbrauch berechnet. Prüfe Anfangsbestand, Endbestand und Ausgaben.`,
      });
    }

    return {
      item,

      openingUnits,
      employeeDrinkUnits,
      closingUnits,

      waiterUnits: waiterUsage.units,
      waiterMilliliters: waiterUsage.milliliters,

      openBarMilliliters,
      openBarEquivalentUnits,

      openBarStockValueCents: Math.round(
        openBarEquivalentUnits * item.priceCents,
      ),

      hasNegativeOpenBarConsumption,
    };
  });

  return {
    rows,
    warnings,

    summary: {
      openBarStockValueCents: rows.reduce(
        (sum, row) => sum + Math.max(row.openBarStockValueCents, 0),
        0,
      ),

      negativeRowCount: rows.filter((row) => row.hasNegativeOpenBarConsumption)
        .length,

      affectedItemCount: rows.filter(
        (row) =>
          row.openingUnits !== 0 ||
          row.closingUnits !== 0 ||
          row.employeeDrinkUnits !== 0 ||
          row.waiterUnits !== 0 ||
          row.waiterMilliliters !== 0 ||
          row.openBarEquivalentUnits !== 0,
      ).length,
    },
  };
}
