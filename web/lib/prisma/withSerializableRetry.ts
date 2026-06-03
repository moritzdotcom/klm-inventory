// lib/prisma/withSerializableRetry.ts
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prismadb';

export async function withSerializableRetry<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034';

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error('Transaction failed unexpectedly');
}
