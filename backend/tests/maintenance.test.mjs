import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backend = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const itemService = await readFile(new URL('../src/services/items.js', import.meta.url), 'utf8');
const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const router = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../../frontend/js/pages/maintenance.js', import.meta.url), 'utf8');
const publicItem = await readFile(new URL('../../frontend/item.html', import.meta.url), 'utf8');

test('unified maintenance model supports four job types and documents', () => {
  assert.match(schema, /model MaintenanceJob/);
  assert.match(schema, /model MaintenanceDocument/);
  assert.match(schema, /model MaintenanceStatusHistory/);
  assert.match(backend, /\['repair', 'preventive', 'calibration', 'inspection'\]/);
});

test('maintenance APIs are permission gated and state transitions are transactional', () => {
  for (const route of ["'/api/maintenance'", "'/api/maintenance/:id/start'", "'/api/maintenance/:id/complete'", "'/api/maintenance/:id/cancel'"]) {
    assert.match(backend, new RegExp(`app\\.(?:get|post)\\(${route}[^\\n]+requirePermission\\('can_manage_items'`));
  }
  assert.match(backend, /maintenance_started[\s\S]*prisma\.\$transaction/);
  assert.match(backend, /maintenance_completed/);
});

test('starting and releasing equipment use safety blockers', () => {
  assert.match(backend, /อุปกรณ์ยังถูกยืมอยู่ ต้องตรวจรับคืนก่อนเริ่มงาน Maintenance/);
  assert.match(backend, /const canReleaseItem = !activeBorrow && !otherIssue && !otherJob/);
  assert.match(backend, /issue_resolved_by_maintenance/);
});

test('maintenance UI routes include list, new work, and detail', () => {
  assert.match(router, /#\/admin\/maintenance\/new\//);
  assert.match(router, /#\/admin\/maintenance/);
  assert.match(page, /renderMaintenanceList/);
  assert.match(page, /renderMaintenanceForm/);
  assert.match(page, /renderMaintenanceDetail/);
});

test('public QR page renders completed maintenance history only', () => {
  assert.match(itemService, /maintenance_jobs:[\s\S]*where:\{status:'completed'\}/);
  assert.match(publicItem, /renderMaintenanceHistory/);
});
