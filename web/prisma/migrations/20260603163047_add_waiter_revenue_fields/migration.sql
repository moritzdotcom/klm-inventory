-- AlterTable
ALTER TABLE "EventSettlement" ADD COLUMN     "cardRevenueCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cashRevenueCents" INTEGER NOT NULL DEFAULT 0;
