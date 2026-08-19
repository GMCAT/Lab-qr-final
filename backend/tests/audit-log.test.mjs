import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const migration = await readFile(new URL('../prisma/migrations/20260803120000_add_audit_log/migration.sql', import.meta.url), 'utf8');
const backend = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const auditMiddleware = await readFile(new URL('../src/middlewares/audit.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../../frontend/js/pages/auditLogs.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../../frontend/js/pages/dashboardLayout.js', import.meta.url), 'utf8');

test('append-only AuditLog schema stores actor, entity, request context and timestamp', () => {
  assert.match(schema, /model AuditLog/);
  for (const field of ['actor_user_id', 'actor_name', 'actor_role', 'action', 'entity_type', 'entity_id', 'route', 'http_method', 'http_status', 'ip_address', 'user_agent', 'request_data', 'result_data', 'created_at']) assert.match(schema, new RegExp(field));
  assert.match(migration, /CREATE TABLE "AuditLog"/);
  assert.doesNotMatch(backend, /app\.(put|patch|delete)\('\/api\/audit-logs/);
});

test('successful mutations are logged while secrets and failed requests are excluded', () => {
  assert.match(auditMiddleware, /\['POST','PUT','PATCH','DELETE'\]/);
  assert.match(auditMiddleware, /res\.statusCode >= 400/);
  for (const secret of ['password', 'password_hash', 'token', 'jwt_secret', 'authorization']) assert.match(auditMiddleware, new RegExp(`['\"]${secret}['\"]`));
  assert.match(auditMiddleware, /AUDIT_LOG_WRITE_FAILED/);
});

test('audit endpoint is Admin-only, paginated and filterable', () => {
  assert.match(backend, /app\.get\('\/api\/audit-logs', authenticate, requireAdminLike/);
  for (const filter of ['page_size', 'date_from', 'date_to', 'action', 'entity_type', 'actor_user_id', 'search']) assert.match(backend, new RegExp(filter));
  assert.match(backend, /Math\.min\(100/);
});

test('Admin audit page is wired with filters, details and pagination', () => {
  assert.match(router, /#\/admin\/audit-logs/);
  assert.match(router, /isAdmin\(\)/);
  assert.match(page, /Audit Log/);
  assert.match(page, /auditReportType/);
  for (const feature of ['auditFilters', 'auditJsonPreview', 'auditPrev', 'auditNext']) assert.match(page, new RegExp(feature));
});
