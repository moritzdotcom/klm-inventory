/*
  Warnings:

  - You are about to drop the column `closedAt` on the `EventInventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventInventory" DROP COLUMN "closedAt",
ADD COLUMN     "closingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "employeeDrinksCompletedAt" TIMESTAMP(3),
ADD COLUMN     "openingCompletedAt" TIMESTAMP(3);
