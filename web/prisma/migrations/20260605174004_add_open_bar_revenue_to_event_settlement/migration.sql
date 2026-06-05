-- AlterTable
ALTER TABLE "EventSettlement" ADD COLUMN     "analysisNote" TEXT,
ADD COLUMN     "openBarCardRevenueCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openBarCashRevenueCents" INTEGER NOT NULL DEFAULT 0;
