import { getServerSession, hashPassword } from '@/lib/models/session';
import prisma from '@/lib/prismadb';
import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else if (req.method === 'PUT') {
    await handlePUT(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetUsersResponse = {
  id: string;
  name: string;
  email: string;
}[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  return res.json(users);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { name, email, password } = req.body;
  if (!email || !password)
    return res.status(401).json('Bitte gib deine Email und ein Passwort ein');

  const invite = await prisma.invite.findUnique({ where: { email } });
  if (!invite)
    return res
      .status(401)
      .json('Zu dieser Email konnte keine Einladung gefunden werden.');

  const user = await prisma.user.create({
    data: { name, email, password: hashPassword(password) },
  });
  const session = await prisma.session.create({
    data: {
      user: { connect: user },
    },
  });
  await prisma.invite.delete({ where: { email } });

  res.setHeader('Set-Cookie', [
    `sessionId=${session.id}; path=/; HttpOnly`,
    `userId=${user.id}; path=/; HttpOnly`,
  ]);
  return res.json({ id: user.id, name: user.name, email: user.email });
}

async function handlePUT(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req);
  if (!session) return res.status(401).json('Not authenticated');

  const { name, email, password, newPassword } = req.body;
  console.log({ name, email, password, newPassword });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!user) return res.status(404).json('User Not Found');

  if (password && newPassword && user.password !== hashPassword(password))
    return res.status(401).json('Invalid Password');

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || undefined,
        email: email || undefined,
        password: newPassword ? hashPassword(newPassword) : undefined,
      },
    });
    return res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code == 'P2002')
        return res.status(500).json('Email bereits vergeben');
      return res.status(500).json(error.message);
    } else {
      res.status(500).json('Unbekannter Fehler');
    }
  }
}
