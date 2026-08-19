ALTER TABLE "User"
  ADD COLUMN "password_reset_token_hash" TEXT,
  ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_password_reset_token_hash_key" ON "User"("password_reset_token_hash");
CREATE INDEX "User_password_reset_expires_at_idx" ON "User"("password_reset_expires_at");
