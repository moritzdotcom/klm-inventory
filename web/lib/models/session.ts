import sha256 from 'crypto-js/sha256';
import { NextApiRequest } from 'next';
import prisma from '@/lib/prismadb';

export function hashPassword(password: string = '') {
  return sha256(password).toString();
}

export async function getServerSession(req: NextApiRequest) {
  const { sessionId, userId } = req.cookies;
  if (!sessionId || !userId) return undefined;
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!session) return undefined;
  return session.user;
}
