CREATE TABLE "MaintenanceJob" (
  "id" SERIAL NOT NULL,
  "work_sn" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "issue_report_id" INTEGER,
  "job_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assigned_to_id" INTEGER,
  "assigned_to_name" TEXT,
  "provider_name" TEXT,
  "provider_contact" TEXT,
  "scheduled_start" TIMESTAMP(3),
  "due_date" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cost" DECIMAL(12,2),
  "result" TEXT,
  "next_due_date" TIMESTAMP(3),
  "created_by_id" INTEGER NOT NULL,
  "created_by_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceDocument" (
  "id" SERIAL NOT NULL,
  "maintenance_job_id" INTEGER NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "document_type" TEXT NOT NULL DEFAULT 'other',
  "uploaded_by_id" INTEGER,
  "uploaded_by_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceStatusHistory" (
  "id" SERIAL NOT NULL,
  "maintenance_job_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "note" TEXT,
  "changed_by_id" INTEGER,
  "changed_by_name" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceJob_work_sn_key" ON "MaintenanceJob"("work_sn");
CREATE INDEX "MaintenanceJob_item_id_status_idx" ON "MaintenanceJob"("item_id", "status");
CREATE INDEX "MaintenanceJob_issue_report_id_idx" ON "MaintenanceJob"("issue_report_id");
CREATE INDEX "MaintenanceJob_job_type_status_idx" ON "MaintenanceJob"("job_type", "status");
CREATE INDEX "MaintenanceJob_next_due_date_idx" ON "MaintenanceJob"("next_due_date");
CREATE INDEX "MaintenanceDocument_maintenance_job_id_document_type_idx" ON "MaintenanceDocument"("maintenance_job_id", "document_type");
CREATE INDEX "MaintenanceStatusHistory_maintenance_job_id_changed_at_idx" ON "MaintenanceStatusHistory"("maintenance_job_id", "changed_at");
CREATE INDEX "MaintenanceStatusHistory_event_type_idx" ON "MaintenanceStatusHistory"("event_type");

ALTER TABLE "MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_issue_report_id_fkey"
  FOREIGN KEY ("issue_report_id") REFERENCES "IssueReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceDocument" ADD CONSTRAINT "MaintenanceDocument_maintenance_job_id_fkey"
  FOREIGN KEY ("maintenance_job_id") REFERENCES "MaintenanceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceStatusHistory" ADD CONSTRAINT "MaintenanceStatusHistory_maintenance_job_id_fkey"
  FOREIGN KEY ("maintenance_job_id") REFERENCES "MaintenanceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Status" ("name") VALUES ('อยู่ระหว่างบำรุงรักษา') ON CONFLICT ("name") DO NOTHING;
