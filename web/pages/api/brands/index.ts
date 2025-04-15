import { getServerSession } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetBrandsResponse = {
  id: string;
  name: string;
}[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  return res.json(brands);
}

export type ApiPostBrandsResponse = {
  id: string;
  name: string;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.body;
  if (!name) return res.status(400).json('Name required');

  const brand = await prisma.brand.create({ data: { name } });

  return res.json(brand);
}
