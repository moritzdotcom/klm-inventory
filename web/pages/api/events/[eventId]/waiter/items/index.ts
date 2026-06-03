import type { NextApiRequest, NextApiResponse } from 'next';
import { ItemCategory } from '@prisma/client';
import prisma from '@/lib/prismadb';
import { getServerSession } from '@/lib/models/session';
import { findOrCreateBrandByName } from '@/lib/models/brand';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseInteger(value: unknown, field: string) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed)) {
    throw new ApiError(400, `${field} muss eine Ganzzahl sein`);
  }

  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const user = await getServerSession(req);

    if (!user?.id) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }

    const eventId =
      typeof req.query.eventId === 'string' ? req.query.eventId : null;

    if (!eventId) {
      throw new ApiError(400, 'Ungültige Event-ID');
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const name = String(req.body?.name ?? '').trim();
    const brandName = String(req.body?.brandName ?? '').trim();
    const category = req.body?.category as ItemCategory;
    const sizeInMl = parseInteger(req.body?.sizeInMl, 'sizeInMl');
    const priceCents = parseInteger(req.body?.priceCents, 'priceCents');

    if (!name) {
      throw new ApiError(400, 'Artikelname fehlt');
    }

    if (!brandName) {
      throw new ApiError(400, 'Marke fehlt');
    }

    const brand = await findOrCreateBrandByName(brandName);

    if (!Object.values(ItemCategory).includes(category)) {
      throw new ApiError(400, 'Ungültige Kategorie');
    }

    if (sizeInMl <= 0) {
      throw new ApiError(400, 'Die Größe muss größer als 0 sein');
    }

    if (priceCents <= 0) {
      throw new ApiError(400, 'Der Preis muss größer als 0 sein');
    }

    const createdItem = await prisma.$transaction(async (tx) => {
      const settlement = await tx.eventSettlement.upsert({
        where: { eventId },
        create: { eventId },
        update: {},
      });

      const item = await tx.item.create({
        data: {
          name,
          brandId: brand.id,
          category,
          sizeInMl,
          priceCents,
          amountInStock: 0,
          amountPerCrate: 1,
          image: '',
        },
        include: {
          brand: true,
        },
      });

      await tx.eventWaiterIssue.create({
        data: {
          settlementId: settlement.id,
          itemId: item.id,
          quantity: 0,
          unitPriceCents: item.priceCents,
          hidden: false,
        },
      });

      return item;
    });

    return res.status(201).json({
      item: {
        id: createdItem.id,
        name: createdItem.name,
        category: createdItem.category,
        sizeInMl: createdItem.sizeInMl,
        image: createdItem.image,
        brandId: createdItem.brandId,
        brand: createdItem.brand,
        quantity: 0,
        unitPriceCents: createdItem.priceCents,
        totalCents: 0,
        hidden: false,
        priceConfigured: createdItem.priceCents > 0,
      },
    });
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
