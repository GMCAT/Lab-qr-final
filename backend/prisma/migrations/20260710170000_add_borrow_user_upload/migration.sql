-- Track which registered user created a borrow request so they can upload their signed borrow form later
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "borrower_user_id" INTEGER;
CREATE INDEX IF NOT EXISTS "BorrowLog_borrower_user_id_idx" ON "BorrowLog"("borrower_user_id");
