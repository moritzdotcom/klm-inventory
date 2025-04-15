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
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetInvitesResponse = {
  id: string;
  email: string;
}[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const invites = await prisma.invite.findMany();
  return res.json(invites);
}

export type ApiPostInviteResponse = {
  id: string;
  email: string;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.body;
  if (!email) return res.status(401).json('Email required');

  const invite = await prisma.invite.create({ data: { email } });

  return res.json(invite);
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  console.log(req.body);
  const { inviteId } = req.body;
  if (!inviteId) return res.status(404).json('Invite not found');

  const invite = await prisma.invite.delete({ where: { id: inviteId } });

  return res.json(invite);
}
