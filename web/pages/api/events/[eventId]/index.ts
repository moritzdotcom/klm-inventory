import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;
  if (typeof eventId !== 'string') return res.status(400).json('Invalid ID');

  if (req.method === 'GET') {
    await handleGET(req, res, eventId);
  } else if (req.method === 'PUT') {
    await handlePUT(req, res, eventId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, eventId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

type ApiGetEvent = Prisma.EventGetPayload<{
  include: {
    inventories: {
      select: {
        id: true;
        done: true;
        countings: { include: { item: { include: { brand: true } } } };
      };
    };
  };
}>;

export type ApiGetEventResponse = {
  event: ApiGetEvent;
  previousEvent: ApiGetEvent;
};

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      inventories: {
        select: {
          id: true,
          done: true,
          countings: { include: { item: { include: { brand: true } } } },
        },
      },
    },
  });
  if (!event) return res.status(404).json('No Event found');

  const previousEvent = await prisma.event.findFirst({
    where: { date: { lt: event.date } },
    include: {
      inventories: {
        select: {
          id: true,
          done: true,
          countings: { include: { item: { include: { brand: true } } } },
        },
      },
    },
    orderBy: { date: 'desc' },
  });
  return res.json({ event, previousEvent });
}

export type ApiPutEventResponse = {
  name: string;
  id: string;
  date: Date;
};

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { name, date } = req.body;

  const event = await prisma.event.update({
    where: { id },
    data: {
      name: name ? name : undefined,
      date: date ? new Date(date) : undefined,
    },
  });

  return res.json(event);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const event = await prisma.event.delete({
    where: { id },
  });

  return res.json(event);
}
