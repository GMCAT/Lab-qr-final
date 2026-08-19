ALTER TABLE "BorrowLog"
  ADD COLUMN "return_status" TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN "return_requested_at" TIMESTAMP(3),
  ADD COLUMN "return_requested_by_id" INTEGER,
  ADD COLUMN "return_note" TEXT,
  ADD COLUMN "return_condition" TEXT,
  ADD COLUMN "return_verified_at" TIMESTAMP(3),
  ADD COLUMN "return_verified_by_id" INTEGER,
  ADD COLUMN "return_verified_by_name" TEXT,
  ADD COLUMN "return_reject_reason" TEXT,
  ADD COLUMN "closed_at" TIMESTAMP(3);

UPDATE "BorrowLog"
SET
  "return_status" = 'completed',
  "return_verified_at" = "return_date",
  "closed_at" = "return_date"
WHERE "return_date" IS NOT NULL;

INSERT INTO "Status" ("name")
VALUES ('รอตรวจรับคืน')
ON CONFLICT ("name") DO NOTHING;

CREATE INDEX "BorrowLog_return_status_idx" ON "BorrowLog"("return_status");
CREATE INDEX "BorrowLog_item_id_return_status_idx" ON "BorrowLog"("item_id", "return_status");
