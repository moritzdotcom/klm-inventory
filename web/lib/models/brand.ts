import prisma from '@/lib/prismadb';

export async function findOrCreateBrandByName(brandName: string) {
  const brand = await prisma.brand.findUnique({ where: { name: brandName } });
  if (brand) return brand;
  const newBrand = await prisma.brand.create({ data: { name: brandName } });
  return newBrand;
}
