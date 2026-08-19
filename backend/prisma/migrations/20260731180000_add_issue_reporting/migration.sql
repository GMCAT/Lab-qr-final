CREATE TABLE "IssueReport" (
  "id" SERIAL NOT NULL,
  "issue_sn" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "reporter_user_id" INTEGER NOT NULL,
  "reporter_name" TEXT NOT NULL,
  "issue_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attachment_file_name" TEXT,
  "attachment_file_url" TEXT,
  "reviewed_by_id" INTEGER,
  "reviewed_by_name" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_note" TEXT,
  "reject_reason" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssueStatusHistory" (
  "id" SERIAL NOT NULL,
  "issue_report_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "changed_by_id" INTEGER,
  "changed_by_name" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IssueReport_issue_sn_key" ON "IssueReport"("issue_sn");
CREATE INDEX "IssueReport_item_id_status_idx" ON "IssueReport"("item_id", "status");
CREATE INDEX "IssueReport_reporter_user_id_idx" ON "IssueReport"("reporter_user_id");
CREATE INDEX "IssueReport_status_created_at_idx" ON "IssueReport"("status", "created_at");
CREATE INDEX "IssueStatusHistory_issue_report_id_changed_at_idx"
  ON "IssueStatusHistory"("issue_report_id", "changed_at");
CREATE INDEX "IssueStatusHistory_event_type_idx" ON "IssueStatusHistory"("event_type");

ALTER TABLE "IssueReport"
  ADD CONSTRAINT "IssueReport_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "Item"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IssueStatusHistory"
  ADD CONSTRAINT "IssueStatusHistory_issue_report_id_fkey"
  FOREIGN KEY ("issue_report_id") REFERENCES "IssueReport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
