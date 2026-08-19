ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "borrower_position" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "expected_return_date" TIMESTAMP(3);
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "approver_name" TEXT;
