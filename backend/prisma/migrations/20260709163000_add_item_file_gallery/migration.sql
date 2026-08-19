-- Add gallery metadata to ItemFile
ALTER TABLE "ItemFile" ADD COLUMN IF NOT EXISTS "is_cover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ItemFile" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ItemFile_item_id_idx" ON "ItemFile"("item_id");
CREATE INDEX IF NOT EXISTS "ItemFile_file_type_idx" ON "ItemFile"("file_type");
