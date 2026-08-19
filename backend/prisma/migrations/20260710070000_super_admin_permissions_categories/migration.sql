-- Super Admin + permission flags + categories
CREATE TABLE IF NOT EXISTS "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "can_manage_items" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_users" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_brands" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_locations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_categories" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_statuses" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_manage_responsibles" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_approve_borrow" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "category_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Item_category_id_fkey'
  ) THEN
    ALTER TABLE "Item"
    ADD CONSTRAINT "Item_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Item_category_id_idx" ON "Item"("category_id");

-- Existing admins keep full access after migration
UPDATE "User"
SET
  "can_manage_items" = true,
  "can_manage_users" = true,
  "can_manage_brands" = true,
  "can_manage_locations" = true,
  "can_manage_categories" = true,
  "can_manage_statuses" = true,
  "can_manage_responsibles" = true,
  "can_approve_borrow" = true
WHERE "role" IN ('admin', 'super_admin');

-- Promote the first existing admin to super_admin so there is always one owner account.
UPDATE "User"
SET "role" = 'super_admin'
WHERE "id" = (
  SELECT "id" FROM "User"
  WHERE "role" = 'admin'
  ORDER BY "id" ASC
  LIMIT 1
);
