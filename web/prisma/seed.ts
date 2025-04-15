import { ItemCategory, PrismaClient } from '@prisma/client';
import sha256 from 'crypto-js/sha256';
const prisma = new PrismaClient();

function hashPassword(password: string = '') {
  return sha256(password).toString();
}

async function main() {
  const usr = await prisma.user.create({
    data: {
      name: 'Moritz',
      email: 'ml@km-entertainment.de',
      password: hashPassword('Password123'),
    },
  });

  const event = await prisma.event.create({
    data: {
      name: 'Weindampfer Apres Ski Edition 2025',
      date: new Date('02/15/2025'),
    },
  });

  const items: {
    category: ItemCategory;
    brand: string;
    name: string;
    sizeInMl: number;
    amountInStock: number;
    amountPerCrate: number;
  }[] = [
    {
      category: 'WATER',
      brand: 'Gerolsteiner',
      name: 'Wasser Still',
      sizeInMl: 250,
      amountInStock: 135,
      amountPerCrate: 24,
    },
    {
      category: 'WATER',
      brand: 'Gerolsteiner',
      name: 'Wasser Still',
      sizeInMl: 750,
      amountInStock: 0,
      amountPerCrate: 12,
    },
    {
      category: 'WATER',
      brand: 'Gerolsteiner',
      name: 'Wasser Medium',
      sizeInMl: 250,
      amountInStock: 123,
      amountPerCrate: 24,
    },
    {
      category: 'WATER',
      brand: 'Gerolsteiner',
      name: 'Wasser Medium',
      sizeInMl: 750,
      amountInStock: 35,
      amountPerCrate: 12,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Cola',
      sizeInMl: 200,
      amountInStock: 90,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Cola',
      sizeInMl: 1000,
      amountInStock: 0,
      amountPerCrate: 12,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Cola zero',
      sizeInMl: 200,
      amountInStock: 96,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Cola zero',
      sizeInMl: 1000,
      amountInStock: 0,
      amountPerCrate: 12,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Fanta',
      sizeInMl: 200,
      amountInStock: 25,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Fanta',
      sizeInMl: 1000,
      amountInStock: 0,
      amountPerCrate: 12,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Sprite',
      sizeInMl: 200,
      amountInStock: 54,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Coca Cola',
      name: 'Sprite',
      sizeInMl: 1000,
      amountInStock: 0,
      amountPerCrate: 12,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Schweppes',
      name: 'Wild Berry',
      sizeInMl: 200,
      amountInStock: 6,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Schweppes',
      name: 'Peach',
      sizeInMl: 200,
      amountInStock: 6,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Schweppes',
      name: 'Dry Tonic',
      sizeInMl: 200,
      amountInStock: 6,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Schweppes',
      name: 'Bitter Lemon',
      sizeInMl: 200,
      amountInStock: 0,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Thomas Henry',
      name: 'Pink Grapefruit',
      sizeInMl: 200,
      amountInStock: 50,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Red Bull',
      name: 'Classic',
      sizeInMl: 250,
      amountInStock: 60,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Red Bull',
      name: 'Sugarfree',
      sizeInMl: 250,
      amountInStock: 32,
      amountPerCrate: 24,
    },
    {
      category: 'SOFTDRINK',
      brand: 'Red Bull',
      name: 'Summer Edition',
      sizeInMl: 250,
      amountInStock: 25,
      amountPerCrate: 24,
    },
    {
      category: 'BEER',
      brand: 'Estrella Galicia',
      name: 'Bier',
      sizeInMl: 200,
      amountInStock: 341,
      amountPerCrate: 30,
    },
    {
      category: 'BEER',
      brand: 'Warsteiner',
      name: 'Pils',
      sizeInMl: 333,
      amountInStock: 58,
      amountPerCrate: 24,
    },
    {
      category: 'BEER',
      brand: 'Warsteiner',
      name: 'Radler Zitrone',
      sizeInMl: 333,
      amountInStock: 42,
      amountPerCrate: 24,
    },
    {
      category: 'BEER',
      brand: 'Warsteiner',
      name: 'Radler Grapefruit',
      sizeInMl: 333,
      amountInStock: 5,
      amountPerCrate: 24,
    },
    {
      category: 'BEER',
      brand: 'Warsteiner',
      name: 'Radler Zitrone Alkoholfrei',
      sizeInMl: 333,
      amountInStock: 8,
      amountPerCrate: 24,
    },
    {
      category: 'WINE',
      brand: 'Eppelmann',
      name: 'Firstcrush',
      sizeInMl: 750,
      amountInStock: 15,
      amountPerCrate: 6,
    },
    {
      category: 'WINE',
      brand: 'Eppelmann',
      name: 'Secco',
      sizeInMl: 750,
      amountInStock: 8,
      amountPerCrate: 6,
    },
    {
      category: 'WINE',
      brand: 'Heiligenblut',
      name: 'Grauburgunder',
      sizeInMl: 750,
      amountInStock: 0,
      amountPerCrate: 6,
    },
    {
      category: 'WINE',
      brand: 'Heiligenblut',
      name: 'Grauburgunder',
      sizeInMl: 1500,
      amountInStock: 35,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Aperol',
      name: 'Aperol',
      sizeInMl: 1000,
      amountInStock: 14,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Aperol',
      name: 'Aperol',
      sizeInMl: 700,
      amountInStock: 16,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Three Sixty',
      name: 'Vodka',
      sizeInMl: 500,
      amountInStock: 18,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Three Sixty',
      name: 'Vodka',
      sizeInMl: 1000,
      amountInStock: 10,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Three Sixty',
      name: 'Vodka',
      sizeInMl: 3000,
      amountInStock: 2,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Lillet',
      name: 'Lillet',
      sizeInMl: 700,
      amountInStock: 5,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Havanna Club',
      name: 'Havanna Club',
      sizeInMl: 700,
      amountInStock: 5,
      amountPerCrate: 6,
    },
    {
      category: 'LIQUOR',
      brand: 'Friedrichs Gin',
      name: 'Friedrichs Gin',
      sizeInMl: 700,
      amountInStock: 10,
      amountPerCrate: 6,
    },
  ];

  const brandNames = items.map(({ brand }) => ({ name: brand }));

  const brands = await prisma.brand.createManyAndReturn({
    data: brandNames,
    skipDuplicates: true,
  });

  const itms = await prisma.item.createManyAndReturn({
    data: items.map((i) => ({
      category: i.category,
      name: i.name,
      amountInStock: i.amountInStock,
      amountPerCrate: i.amountPerCrate,
      sizeInMl: i.sizeInMl,
      image: '',
      brandId: brands.filter((b) => b.name == i.brand)[0].id,
    })),
  });

  const inventory = await prisma.inventory.create({
    data: {
      lastEvent: { connect: event },
      creator: { connect: usr },
      countings: {
        createMany: {
          data: itms.map((i) => ({ itemId: i.id, amount: i.amountInStock })),
        },
      },
    },
  });

  console.log('Done');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
