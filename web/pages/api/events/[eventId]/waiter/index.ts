// pages/api/events/[eventId]/waiter.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { withSerializableRetry } from '@/lib/prisma/withSerializableRetry';
import { getServerSession } from '@/lib/models/session';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseEventId(req: NextApiRequest) {
  const { eventId } = req.query;

  if (typeof eventId !== 'string' || !eventId) {
    throw new ApiError(400, 'Ungültige Event-ID');
  }

  return eventId;
}

function parseInteger(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ApiError(400, `${field} muss eine Ganzzahl sein`);
  }

  return value;
}

async function getWaiterView(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      date: true,
    },
  });

  if (!event) {
    throw new ApiError(404, 'Event nicht gefunden');
  }

  const settlement = await prisma.eventSettlement.upsert({
    where: { eventId },
    create: { eventId },
    update: {},
    include: {
      issues: true,
    },
  });

  const [items, brands] = await Promise.all([
    prisma.item.findMany({
      include: {
        brand: true,
      },
      orderBy: [
        { category: 'asc' },
        { brand: { name: 'asc' } },
        { name: 'asc' },
      ],
    }),
    prisma.brand.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  const issueMap = new Map(
    settlement.issues.map((issue) => [issue.itemId, issue]),
  );

  const rows = items.map((item) => {
    const issue = issueMap.get(item.id);
    const quantity = issue?.quantity ?? 0;
    const unitPriceCents = issue?.unitPriceCents ?? item.priceCents;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      sizeInMl: item.sizeInMl,
      image: item.image,
      brandId: item.brandId,
      brand: item.brand,
      quantity,
      unitPriceCents,
      totalCents: quantity * unitPriceCents,
      hidden: issue?.hidden ?? false,
      priceConfigured: unitPriceCents > 0,
    };
  });

  const issuedTotalCents = rows.reduce((sum, item) => sum + item.totalCents, 0);

  return {
    event,
    settlement: {
      id: settlement.id,
      waiterName: settlement.waiterName,
      prepaidMinimumSpendCents: settlement.prepaidMinimumSpendCents,
      issuedTotalCents,
      differenceCents: issuedTotalCents - settlement.prepaidMinimumSpendCents,
      closedAt: settlement.closedAt,
    },
    brands,
    items: rows,
  };
}

export type ApiGetWaiterTrackingResponse = Awaited<
  ReturnType<typeof getWaiterView>
>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const user = await getServerSession(req);
    if (!user) return res.status(401).json('Not authenticated');

    if (!user?.id) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }

    const eventId = parseEventId(req);

    switch (req.method) {
      case 'GET': {
        return res.status(200).json(await getWaiterView(eventId));
      }

      case 'POST': {
        const itemId =
          typeof req.body?.itemId === 'string' ? req.body.itemId : null;

        const delta = parseInteger(req.body?.delta, 'delta');

        if (!itemId) {
          throw new ApiError(400, 'Artikel fehlt');
        }

        if (delta === 0 || Math.abs(delta) > 100) {
          throw new ApiError(400, 'Ungültige Mengenänderung');
        }

        await withSerializableRetry(async (tx) => {
          const settlement = await tx.eventSettlement.upsert({
            where: { eventId },
            create: { eventId },
            update: {},
          });

          if (settlement.closedAt) {
            throw new ApiError(
              409,
              'Die Abrechnung wurde bereits abgeschlossen',
            );
          }

          const item = await tx.item.findUnique({
            where: { id: itemId },
            select: {
              id: true,
              priceCents: true,
            },
          });

          if (!item) {
            throw new ApiError(404, 'Artikel nicht gefunden');
          }

          if (item.priceCents <= 0) {
            throw new ApiError(
              409,
              'Für diesen Artikel wurde noch kein Preis hinterlegt',
            );
          }

          const existingIssue = await tx.eventWaiterIssue.findUnique({
            where: {
              settlementId_itemId: {
                settlementId: settlement.id,
                itemId,
              },
            },
          });

          const unitPriceCents =
            existingIssue?.unitPriceCents ?? item.priceCents;

          if (delta > 0) {
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
                quantity: delta,
                unitPriceCents,
              },
              update: {
                quantity: {
                  increment: delta,
                },
              },
            });
          } else {
            const updateResult = await tx.eventWaiterIssue.updateMany({
              where: {
                settlementId: settlement.id,
                itemId,
                quantity: {
                  gte: Math.abs(delta),
                },
              },
              data: {
                quantity: {
                  increment: delta,
                },
              },
            });

            if (updateResult.count !== 1) {
              throw new ApiError(
                409,
                'Die Menge kann nicht unter 0 reduziert werden',
              );
            }
          }

          await tx.eventWaiterIssueLog.create({
            data: {
              settlementId: settlement.id,
              itemId,
              creatorId: user.id,
              quantityDelta: delta,
              unitPriceCents,
            },
          });
        });

        return res.status(200).json(await getWaiterView(eventId));
      }

      case 'PATCH': {
        const prepaidMinimumSpendCents =
          req.body?.prepaidMinimumSpendCents === undefined
            ? undefined
            : parseInteger(
                req.body.prepaidMinimumSpendCents,
                'prepaidMinimumSpendCents',
              );

        if (
          prepaidMinimumSpendCents !== undefined &&
          prepaidMinimumSpendCents < 0
        ) {
          throw new ApiError(400, 'Der Mindestverzehr darf nicht negativ sein');
        }

        const waiterName =
          req.body?.waiterName === undefined
            ? undefined
            : String(req.body.waiterName).trim() || null;

        const closed =
          req.body?.closed === undefined ? undefined : Boolean(req.body.closed);

        await prisma.eventSettlement.upsert({
          where: {
            eventId,
          },
          create: {
            eventId,
            waiterName,
            prepaidMinimumSpendCents: prepaidMinimumSpendCents ?? 0,
            closedAt: closed ? new Date() : null,
          },
          update: {
            waiterName,
            prepaidMinimumSpendCents,
            closedAt:
              closed === undefined ? undefined : closed ? new Date() : null,
          },
        });

        return res.status(200).json(await getWaiterView(eventId));
      }

      default: {
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
