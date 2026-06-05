/*
  Warnings:

  - You are about to drop the column `eventId` on the `Inventory` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EventInventoryCountingPhase" AS ENUM ('OPENING', 'CLOSING');

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_eventId_fkey";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "eventId",
ADD COLUMN     "label" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "EventInventory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInventoryCounting" (
    "id" TEXT NOT NULL,
    "eventInventoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "phase" "EventInventoryCountingPhase" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInventoryCounting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEmployeeDrinkIssue" (
    "id" TEXT NOT NULL,
    "eventInventoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEmployeeDrinkIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEmployeeDrinkLog" (
    "id" TEXT NOT NULL,
    "eventInventoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEmployeeDrinkLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventInventory_eventId_key" ON "EventInventory"("eventId");

-- CreateIndex
CREATE INDEX "EventInventoryCounting_itemId_idx" ON "EventInventoryCounting"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInventoryCounting_eventInventoryId_itemId_phase_key" ON "EventInventoryCounting"("eventInventoryId", "itemId", "phase");

-- CreateIndex
CREATE INDEX "EventEmployeeDrinkIssue_itemId_idx" ON "EventEmployeeDrinkIssue"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EventEmployeeDrinkIssue_eventInventoryId_itemId_key" ON "EventEmployeeDrinkIssue"("eventInventoryId", "itemId");

-- CreateIndex
CREATE INDEX "EventEmployeeDrinkLog_eventInventoryId_createdAt_idx" ON "EventEmployeeDrinkLog"("eventInventoryId", "createdAt");

-- CreateIndex
CREATE INDEX "EventEmployeeDrinkLog_itemId_idx" ON "EventEmployeeDrinkLog"("itemId");

-- CreateIndex
CREATE INDEX "Counting_inventoryId_idx" ON "Counting"("inventoryId");

-- AddForeignKey
ALTER TABLE "EventInventory" ADD CONSTRAINT "EventInventory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInventoryCounting" ADD CONSTRAINT "EventInventoryCounting_eventInventoryId_fkey" FOREIGN KEY ("eventInventoryId") REFERENCES "EventInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInventoryCounting" ADD CONSTRAINT "EventInventoryCounting_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmployeeDrinkIssue" ADD CONSTRAINT "EventEmployeeDrinkIssue_eventInventoryId_fkey" FOREIGN KEY ("eventInventoryId") REFERENCES "EventInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmployeeDrinkIssue" ADD CONSTRAINT "EventEmployeeDrinkIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmployeeDrinkLog" ADD CONSTRAINT "EventEmployeeDrinkLog_eventInventoryId_fkey" FOREIGN KEY ("eventInventoryId") REFERENCES "EventInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmployeeDrinkLog" ADD CONSTRAINT "EventEmployeeDrinkLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmployeeDrinkLog" ADD CONSTRAINT "EventEmployeeDrinkLog_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
