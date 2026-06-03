import type { NextApiRequest, NextApiResponse } from 'next';
import { ItemCategory } from '@prisma/client';
import prisma from '@/lib/prismadb';
import { getServerSession } from '@/lib/models/session';
import { publishWaiterChange } from '@/lib/realtime/publishWaiterChange';

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

    const itemId =
      typeof req.query.itemId === 'string' ? req.query.itemId : null;

    if (!eventId || !itemId) {
      throw new ApiError(400, 'Ungültige Parameter');
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', ['PATCH']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const action = req.body?.action;

    if (action === 'visibility') {
      const hidden = req.body?.hidden;

      if (typeof hidden !== 'boolean') {
        throw new ApiError(400, 'Ungültiger Sichtbarkeitswert');
      }

      await prisma.$transaction(async (tx) => {
        const [settlement, item] = await Promise.all([
          tx.eventSettlement.upsert({
            where: { eventId },
            create: { eventId },
            update: {},
          }),
          tx.item.findUnique({
            where: { id: itemId },
            select: {
              id: true,
              priceCents: true,
            },
          }),
        ]);

        if (!item) {
          throw new ApiError(404, 'Artikel nicht gefunden');
        }

        await tx.eventWaiterIssue.upsert({
          where: {
            settlementId_itemId: {
              settlementId: settlement.id,
              itemId,
            },
          },
          create: {
            settlementId: settlement.id,
            itemId,
            quantity: 0,
            unitPriceCents: item.priceCents,
            hidden,
          },
          update: {
            hidden,
          },
        });
      });

      await publishWaiterChange(eventId);
      return res.status(200).json({ success: true });
    }

    if (action === 'editPrice') {
      const priceCents = parseInteger(req.body?.priceCents, 'priceCents');

      if (priceCents <= 0) {
        throw new ApiError(400, 'Der Preis muss größer als 0 sein');
      }

      await prisma.$transaction(async (tx) => {
        const settlement = await tx.eventSettlement.upsert({
          where: { eventId },
          create: { eventId },
          update: {},
        });

        await tx.item.update({
          where: { id: itemId },
          data: {
            priceCents,
          },
        });

        /**
         * Die Änderung gilt sofort auch für die laufende Abrechnung.
         * Bereits erfasste Mengen werden dadurch mit dem korrigierten
         * Preis neu berechnet.
         */
        await tx.eventWaiterIssue.upsert({
          where: {
            settlementId_itemId: {
              settlementId: settlement.id,
              itemId,
            },
          },
          create: {
            settlementId: settlement.id,
            itemId,
            quantity: 0,
            unitPriceCents: priceCents,
          },
          update: {
            unitPriceCents: priceCents,
          },
        });
      });
      await publishWaiterChange(eventId);

      return res.status(200).json({
        success: true,
      });
    }

    throw new ApiError(400, 'Ungültige Aktion');
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
