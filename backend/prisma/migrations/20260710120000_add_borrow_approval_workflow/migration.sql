-- Add borrow approval workflow fields
ALTER TABLE "BorrowLog" ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "BorrowLog" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "BorrowLog" ADD COLUMN "approved_by_name" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN "rejected_at" TIMESTAMP(3);
ALTER TABLE "BorrowLog" ADD COLUMN "rejected_by_name" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN "reject_reason" TEXT;

-- Old rows were created before approval workflow, so keep them as already approved.
UPDATE "BorrowLog" SET "approval_status" = 'approved';

CREATE INDEX "BorrowLog_approval_status_idx" ON "BorrowLog"("approval_status");
CREATE INDEX "BorrowLog_item_id_approval_status_idx" ON "BorrowLog"("item_id", "approval_status");
