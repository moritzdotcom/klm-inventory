// pages/api/events/[eventId]/analysis.ts
import {
  buildEventAnalysis,
  EventAnalysisResult,
} from '@/lib/models/buildEventAnalysis';
import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export type ApiGetEventAnalysisResponse = {
  event: {
    id: string;
    name: string;
    date: string;
  };

  revenue: {
    waiter: {
      cashRevenueCents: number;
      cardRevenueCents: number;
      totalRevenueCents: number;
      prepaidMinimumSpendCents: number;
    };

    openBar: {
      cashRevenueCents: number;
      cardRevenueCents: number;
      totalRevenueCents: number;
    };

    total: {
      cashRevenueCents: number;
      cardRevenueCents: number;
      totalRevenueCents: number;
    };
  };

  note: string | null;

  analysis: EventAnalysisResult;
};

export type ApiPutEventAnalysisPayload = {
  openBarCashRevenueCents: number;
  openBarCardRevenueCents: number;
  analysisNote?: string | null;
};

export type ApiPutEventAnalysisResponse = {
  openBarCashRevenueCents: number;
  openBarCardRevenueCents: number;
  analysisNote: string | null;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { eventId } = req.query;

  if (typeof eventId !== 'string') {
    return res.status(400).json('Invalid event ID');
  }

  if (req.method === 'GET') {
    return handleGET(req, res, eventId);
  }

  if (req.method === 'PUT') {
    return handlePUT(req, res, eventId);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json(`Method ${req.method} not allowed`);
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetEventAnalysisResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  try {
    const [event, items] = await Promise.all([
      prisma.event.findUnique({
        where: {
          id: eventId,
        },
        select: {
          id: true,
          name: true,
          date: true,

          inventory: {
            select: {
              openingCompletedAt: true,
              employeeDrinksCompletedAt: true,
              closingCompletedAt: true,

              countings: {
                select: {
                  itemId: true,
                  phase: true,
                  amount: true,
                },
              },

              employeeDrinkIssues: {
                select: {
                  itemId: true,
                  quantity: true,
                },
              },
            },
          },

          settlement: {
            select: {
              closedAt: true,
              prepaidMinimumSpendCents: true,

              cashRevenueCents: true,
              cardRevenueCents: true,

              openBarCashRevenueCents: true,
              openBarCardRevenueCents: true,

              analysisNote: true,

              issues: {
                select: {
                  itemId: true,
                  quantity: true,
                  hidden: true,

                  item: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      sizeInMl: true,
                      priceCents: true,
                      inventoryEnabled: true,

                      brand: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },

                  recipeSnapshot: {
                    select: {
                      ingredientItemId: true,
                      amount: true,
                      unit: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.item.findMany({
        where: {
          inventoryEnabled: true,
        },
        select: {
          id: true,
          name: true,
          category: true,
          sizeInMl: true,
          priceCents: true,
          inventoryEnabled: true,

          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    assertAnalysisAvailable(event);

    const settlement = event.settlement;
    const eventInventory = event.inventory;

    if (!settlement || !eventInventory) {
      throw new ApiError(409, 'Event analysis is not available yet');
    }

    const analysis = buildEventAnalysis({
      items,
      countings: eventInventory.countings,
      employeeDrinkIssues: eventInventory.employeeDrinkIssues,
      waiterIssues: settlement.issues,
    });

    const waiterTotalRevenueCents =
      settlement.cashRevenueCents + settlement.cardRevenueCents;

    const openBarTotalRevenueCents =
      settlement.openBarCashRevenueCents + settlement.openBarCardRevenueCents;

    return res.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
      },

      revenue: {
        waiter: {
          cashRevenueCents: settlement.cashRevenueCents,
          cardRevenueCents: settlement.cardRevenueCents,
          totalRevenueCents: waiterTotalRevenueCents,
          prepaidMinimumSpendCents: settlement.prepaidMinimumSpendCents,
        },

        openBar: {
          cashRevenueCents: settlement.openBarCashRevenueCents,
          cardRevenueCents: settlement.openBarCardRevenueCents,
          totalRevenueCents: openBarTotalRevenueCents,
        },

        total: {
          cashRevenueCents:
            settlement.cashRevenueCents + settlement.openBarCashRevenueCents,

          cardRevenueCents:
            settlement.cardRevenueCents + settlement.openBarCardRevenueCents,

          totalRevenueCents: waiterTotalRevenueCents + openBarTotalRevenueCents,
        },
      },

      note: settlement.analysisNote,

      analysis,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse<ApiPutEventAnalysisResponse | string>,
  eventId: string,
) {
  const session = await getServerSession(req);
  if (!session) {
    return res.status(401).json('Not authenticated');
  }

  const { openBarCashRevenueCents, openBarCardRevenueCents, analysisNote } =
    req.body as ApiPutEventAnalysisPayload;

  if (
    !Number.isInteger(openBarCashRevenueCents) ||
    openBarCashRevenueCents < 0
  ) {
    return res.status(400).json('Invalid open bar cash revenue');
  }

  if (
    !Number.isInteger(openBarCardRevenueCents) ||
    openBarCardRevenueCents < 0
  ) {
    return res.status(400).json('Invalid open bar card revenue');
  }

  try {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,

        inventory: {
          select: {
            openingCompletedAt: true,
            employeeDrinksCompletedAt: true,
            closingCompletedAt: true,
          },
        },

        settlement: {
          select: {
            closedAt: true,
          },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    assertAnalysisAvailable(event);

    const settlement = await prisma.eventSettlement.update({
      where: {
        eventId,
      },
      data: {
        openBarCashRevenueCents,
        openBarCardRevenueCents,
        analysisNote:
          typeof analysisNote === 'string' ? analysisNote.trim() || null : null,
      },
      select: {
        openBarCashRevenueCents: true,
        openBarCardRevenueCents: true,
        analysisNote: true,
      },
    });

    return res.json(settlement);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function assertAnalysisAvailable(event: {
  inventory: {
    openingCompletedAt: Date | null;
    employeeDrinksCompletedAt: Date | null;
    closingCompletedAt: Date | null;
  } | null;

  settlement: {
    closedAt: Date | null;
  } | null;
}) {
  if (!event.inventory?.openingCompletedAt) {
    throw new ApiError(409, 'Opening stock has not been completed');
  }

  if (!event.inventory.employeeDrinksCompletedAt) {
    throw new ApiError(409, 'Employee drinks have not been completed');
  }

  if (!event.settlement?.closedAt) {
    throw new ApiError(409, 'Waiter settlement has not been completed');
  }

  if (!event.inventory.closingCompletedAt) {
    throw new ApiError(409, 'Closing stock has not been completed');
  }
}

function handleApiError(res: NextApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.status).json(error.message);
  }

  console.error(error);
  return res.status(500).json('Internal server error');
}
