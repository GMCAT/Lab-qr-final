-- Add user profile fields for self registration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department_lab" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Add borrow request reference and document upload fields
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "request_sn" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "borrow_document_file_name" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "borrow_document_file_url" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "return_document_file_name" TEXT;
ALTER TABLE "BorrowLog" ADD COLUMN IF NOT EXISTS "return_document_file_url" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BorrowLog_request_sn_key" ON "BorrowLog"("request_sn");
CREATE INDEX IF NOT EXISTS "BorrowLog_request_sn_idx" ON "BorrowLog"("request_sn");
