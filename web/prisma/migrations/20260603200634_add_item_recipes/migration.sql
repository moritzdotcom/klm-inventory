-- CreateEnum
CREATE TYPE "RecipeUnit" AS ENUM ('UNIT', 'MILLILITER');

-- AlterEnum
ALTER TYPE "ItemCategory" ADD VALUE 'SPECIALS';

-- DropForeignKey
ALTER TABLE "EventWaiterIssue" DROP CONSTRAINT "EventWaiterIssue_itemId_fkey";

-- AlterTable
ALTER TABLE "EventWaiterIssue" ADD COLUMN     "recipeSnapshotCreatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "sizeInMl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ItemRecipeComponent" (
    "id" TEXT NOT NULL,
    "parentItemId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit" "RecipeUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventWaiterIssueRecipeComponent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit" "RecipeUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWaiterIssueRecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemRecipeComponent_ingredientItemId_idx" ON "ItemRecipeComponent"("ingredientItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRecipeComponent_parentItemId_ingredientItemId_key" ON "ItemRecipeComponent"("parentItemId", "ingredientItemId");

-- CreateIndex
CREATE INDEX "EventWaiterIssueRecipeComponent_ingredientItemId_idx" ON "EventWaiterIssueRecipeComponent"("ingredientItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EventWaiterIssueRecipeComponent_issueId_ingredientItemId_un_key" ON "EventWaiterIssueRecipeComponent"("issueId", "ingredientItemId", "unit");

-- AddForeignKey
ALTER TABLE "ItemRecipeComponent" ADD CONSTRAINT "ItemRecipeComponent_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRecipeComponent" ADD CONSTRAINT "ItemRecipeComponent_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssue" ADD CONSTRAINT "EventWaiterIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssueRecipeComponent" ADD CONSTRAINT "EventWaiterIssueRecipeComponent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "EventWaiterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWaiterIssueRecipeComponent" ADD CONSTRAINT "EventWaiterIssueRecipeComponent_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
