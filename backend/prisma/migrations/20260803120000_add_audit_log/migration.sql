CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "route" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "http_status" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_data" JSONB,
    "result_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");
CREATE INDEX "AuditLog_actor_user_id_created_at_idx" ON "AuditLog"("actor_user_id", "created_at");
CREATE INDEX "AuditLog_action_created_at_idx" ON "AuditLog"("action", "created_at");
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
