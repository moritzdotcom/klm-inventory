/*
  Warnings:

  - A unique constraint covering the columns `[itemId,inventoryId]` on the table `Counting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Counting_itemId_inventoryId_key" ON "Counting"("itemId", "inventoryId");
