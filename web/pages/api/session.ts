import { getServerSession, hashPassword } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');
  return res.json(session);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(401).json('Wrong credentials');

  const user = await prisma.user.findFirst({ where: { email } });
  if (user && user.password == hashPassword(password)) {
    const session = await prisma.session.create({
      data: {
        user: { connect: user },
      },
    });
    res.setHeader('Set-Cookie', [
      `sessionId=${session.id}; path=/; HttpOnly`,
      `userId=${user.id}; path=/; HttpOnly`,
    ]);
    return res.json({ id: user.id, name: user.name, email: user.email });
  }
  return res.status(401).json('Wrong credentials');
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId, userId } = req.cookies;
  if (!sessionId || !userId) return res.status(401).json('Not Authenticated');

  try {
    await prisma.session.delete({
      where: { id: sessionId, userId },
    });
  } catch (error) {
    // If session does not exist, do nothing
  }
  res.setHeader('Set-Cookie', [
    `sessionId=deleted; path=/; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `userId=deleted; path=/; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ]);

  return res.status(200).json('Log out successful.');
}
