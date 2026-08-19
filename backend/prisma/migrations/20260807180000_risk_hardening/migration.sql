-- Preserve historical records by archiving items instead of deleting them.
ALTER TABLE "Item"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "archived_by_id" INTEGER;

CREATE INDEX "Item_archived_at_idx" ON "Item"("archived_at");

-- Invalidate every existing JWT after password reset/change by incrementing this value.
ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
