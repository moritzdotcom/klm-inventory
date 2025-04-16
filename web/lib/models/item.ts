import { ItemCategory } from '@prisma/client';

export const CATEGORIES = ['WATER', 'SOFTDRINK', 'BEER', 'WINE', 'LIQUOR'];

export const SIZESINML = [200, 250, 333, 500, 700, 750, 1000, 1500, 3000, 6000];

export function isValidCategory(c: string): c is ItemCategory {
  return CATEGORIES.includes(c);
}

export function translateCategory(c: string) {
  return {
    WATER: 'Wasser',
    SOFTDRINK: 'Soft Drink',
    BEER: 'Bier',
    WINE: 'Wein',
    LIQUOR: 'Spirituosen',
  }[c];
}

export function translateSize(s: Number) {
  return {
    '200': '0,2 l',
    '250': '0,25 l',
    '333': '0,33 l',
    '500': '0,5 l',
    '700': '0,7 l',
    '750': '0,75 l',
    '1000': '1 l',
    '1500': '1,5 l',
    '3000': '3 l',
    '6000': '6 l',
  }[`${s}`];
}

type ItemCompareFnItem = {
  category: ItemCategory;
  name: string;
  sizeInMl: number;
  brand: { name: string };
};

export function itemCompareFn(a: ItemCompareFnItem, b: ItemCompareFnItem) {
  const categoryComparison = a.category.localeCompare(b.category);
  if (categoryComparison !== 0) return categoryComparison;
  const brandComparison = a.brand.name.localeCompare(b.brand.name);
  if (brandComparison !== 0) return brandComparison;
  const nameComparison = a.name.localeCompare(b.name);
  if (nameComparison !== 0) return nameComparison;
  return a.sizeInMl - b.sizeInMl;
}
