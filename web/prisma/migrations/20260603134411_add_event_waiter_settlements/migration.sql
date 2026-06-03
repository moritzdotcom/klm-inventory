-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "priceCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EventSettlement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "waiterName" TEXT,
    "prepaidMinimumSpendCents" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventWaiterIssue" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventWaiterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventWaiterIssueLog" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWaiterIssueLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSettlement_eventId_key" ON "EventSettlement"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventWaiterIssue_settlementId_itemId_key" ON "EventWaiterIssue"("settlementId", "itemId");

-- CreateIndex
CREATE INDEX "EventWaiterIssueLog_settlementId_createdAt_idx" ON "EventWaiterIssueLog"("settlementId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventSettlement" ADD CONSTRAINT "EventSettlement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssue" ADD CONSTRAINT "EventWaiterIssue_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "EventSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssue" ADD CONSTRAINT "EventWaiterIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssueLog" ADD CONSTRAINT "EventWaiterIssueLog_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "EventSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssueLog" ADD CONSTRAINT "EventWaiterIssueLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssueLog" ADD CONSTRAINT "EventWaiterIssueLog_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
