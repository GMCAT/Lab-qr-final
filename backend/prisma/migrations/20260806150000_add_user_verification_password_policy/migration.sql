ALTER TABLE "User"
  ADD COLUMN "registration_source" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "verification_status" TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN "verified_at" TIMESTAMP(3),
  ADD COLUMN "verified_by_id" INTEGER,
  ADD COLUMN "created_by_id" INTEGER,
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "User_registration_source_idx" ON "User"("registration_source");
CREATE INDEX "User_verification_status_idx" ON "User"("verification_status");

-- New self registrations are marked pending by the application. Existing accounts
-- remain verified so this migration does not lock current Lab users out.
