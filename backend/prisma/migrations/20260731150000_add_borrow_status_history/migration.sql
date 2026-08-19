ALTER TABLE "BorrowLog"
  ADD COLUMN "approved_by_id" INTEGER,
  ADD COLUMN "rejected_by_id" INTEGER;

CREATE TABLE "BorrowStatusHistory" (
  "id" SERIAL NOT NULL,
  "borrow_log_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "changed_by_id" INTEGER,
  "changed_by_name" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BorrowStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BorrowStatusHistory_borrow_log_id_changed_at_idx"
  ON "BorrowStatusHistory"("borrow_log_id", "changed_at");
CREATE INDEX "BorrowStatusHistory_event_type_idx"
  ON "BorrowStatusHistory"("event_type");

ALTER TABLE "BorrowStatusHistory"
  ADD CONSTRAINT "BorrowStatusHistory_borrow_log_id_fkey"
  FOREIGN KEY ("borrow_log_id") REFERENCES "BorrowLog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BorrowStatusHistory"
  ("borrow_log_id", "event_type", "from_status", "to_status", "changed_by_id", "changed_by_name", "changed_at")
SELECT
  "id", 'borrow_requested', NULL, 'approval:pending', "borrower_user_id", "borrower_name", "borrow_date"
FROM "BorrowLog";

INSERT INTO "BorrowStatusHistory"
  ("borrow_log_id", "event_type", "from_status", "to_status", "changed_by_id", "changed_by_name", "changed_at")
SELECT
  "id", 'borrow_approved', 'approval:pending', 'approval:approved', NULL,
  COALESCE("approved_by_name", 'ผู้ดูแลระบบเดิม'), "approved_at"
FROM "BorrowLog"
WHERE "approval_status" = 'approved' AND "approved_at" IS NOT NULL;

INSERT INTO "BorrowStatusHistory"
  ("borrow_log_id", "event_type", "from_status", "to_status", "reason", "changed_by_id", "changed_by_name", "changed_at")
SELECT
  "id", 'borrow_rejected', 'approval:pending', 'approval:rejected', "reject_reason", NULL,
  COALESCE("rejected_by_name", 'ผู้ดูแลระบบเดิม'), "rejected_at"
FROM "BorrowLog"
WHERE "approval_status" = 'rejected' AND "rejected_at" IS NOT NULL;

INSERT INTO "BorrowStatusHistory"
  ("borrow_log_id", "event_type", "from_status", "to_status", "changed_by_id", "changed_by_name", "changed_at")
SELECT
  "id", 'return_requested', 'return:not_requested', 'return:pending', "return_requested_by_id",
  "borrower_name", "return_requested_at"
FROM "BorrowLog"
WHERE "return_requested_at" IS NOT NULL;

INSERT INTO "BorrowStatusHistory"
  ("borrow_log_id", "event_type", "from_status", "to_status", "reason", "changed_by_id", "changed_by_name", "changed_at")
SELECT
  "id",
  CASE
    WHEN "return_status" = 'damaged' THEN 'return_verified_damaged'
    WHEN "return_status" = 'rejected' THEN 'return_request_rejected'
    ELSE 'return_verified'
  END,
  'return:pending', 'return:' || "return_status", "return_reject_reason", "return_verified_by_id",
  COALESCE("return_verified_by_name", 'ผู้ดูแลระบบเดิม'), "return_verified_at"
FROM "BorrowLog"
WHERE "return_verified_at" IS NOT NULL;
