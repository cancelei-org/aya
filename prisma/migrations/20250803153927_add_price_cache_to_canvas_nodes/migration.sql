-- AlterTable
ALTER TABLE "canvas_nodes" ADD COLUMN     "cached_pricing" JSONB,
ADD COLUMN     "pricing_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_canvas_nodes_pricing_updated" ON "canvas_nodes"("pricing_updated_at");