import { ItemCategory } from '@prisma/client';

export const CATEGORIES = Object.values(ItemCategory);

export const SIZESINML = [
  200, 250, 333, 500, 700, 750, 1000, 1500, 1750, 3000, 6000, 10000,
];

export function isValidCategory(c: string): c is ItemCategory {
  return c in CATEGORIES;
}

export function translateCategory(c: string) {
  return {
    WATER: 'Wasser',
    SOFTDRINK: 'Soft Drink',
    BEER: 'Bier',
    WINE: 'Wein',
    CHAMPAGNE: 'Champagner',
    LIQUOR: 'Spirituosen',
    SPECIALS: 'Specials',
  }[c];
}

const ITEM_CATEGORY_ORDER: ItemCategory[] = [
  ItemCategory.WATER,
  ItemCategory.SOFTDRINK,
  ItemCategory.BEER,
  ItemCategory.WINE,
  ItemCategory.CHAMPAGNE,
  ItemCategory.LIQUOR,
  ItemCategory.SPECIALS,
];

export function categoryCompareFn(a: ItemCategory, b: ItemCategory) {
  const aIndex = ITEM_CATEGORY_ORDER.indexOf(a);
  const bIndex = ITEM_CATEGORY_ORDER.indexOf(b);

  /**
   * Falls später eine neue Kategorie ergänzt wird, die noch nicht
   * im Array steht, landet sie automatisch am Ende.
   */
  const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;

  const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

  return safeAIndex - safeBIndex;
}

export function translateSize(s: Number | null) {
  if (!s) return '-';
  return {
    '200': '0,2 l',
    '250': '0,25 l',
    '333': '0,33 l',
    '500': '0,5 l',
    '700': '0,7 l',
    '750': '0,75 l',
    '1000': '1 l',
    '1500': '1,5 l',
    '1750': '1,75 l',
    '3000': '3 l',
    '6000': '6 l',
    '10000': '10 l',
  }[`${s}`];
}

type ItemCompareFnItem = {
  category: ItemCategory;
  name: string;
  sizeInMl: number | null;
  brand: { name: string };
};

export function itemCompareFn(a: ItemCompareFnItem, b: ItemCompareFnItem) {
  const categoryComparison = categoryCompareFn(a.category, b.category);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const brandComparison = a.brand.name.localeCompare(b.brand.name, 'de');

  if (brandComparison !== 0) {
    return brandComparison;
  }

  const nameComparison = a.name.localeCompare(b.name, 'de');

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return Number(a.sizeInMl ?? 0) - Number(b.sizeInMl ?? 0);
}
