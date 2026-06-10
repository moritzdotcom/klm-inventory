-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "deriveFromOpenBarStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openBarInferenceIngredientId" TEXT,
ADD COLUMN     "openBarInferencePriority" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Item_openBarInferenceIngredientId_idx" ON "Item"("openBarInferenceIngredientId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_openBarInferenceIngredientId_fkey" FOREIGN KEY ("openBarInferenceIngredientId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
