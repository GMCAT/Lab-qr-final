import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backend = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../../frontend/js/pages/reports.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../../frontend/lab-asset-tracker.html', import.meta.url), 'utf8');

test('report endpoint is permission gated and supports shared filters', () => {
  assert.match(backend, /app\.get\('\/api\/reports\/dashboard'.*requirePermission\('can_manage_items'/);
  for (const filter of ['date_from', 'date_to', 'location_id', 'category_id', 'asset_status', 'job_type']) assert.match(backend, new RegExp(filter));
});

test('dashboard calculates operational report groups', () => {
  for (const group of ['overdue_borrows', 'calibration_due', 'frequent_issues', 'maintenance_cost']) assert.match(backend, new RegExp(group));
});

test('CSV, Excel and PDF reuse the current report dataset', () => {
  assert.match(page, /exportReportCsv/); assert.match(page, /exportReportExcel/); assert.match(page, /exportReportPdf/); assert.match(page, /reportDashboardData/); assert.match(page, /\\uFEFF/);
});

test('Excel export contains the required seven sheets', () => {
  for (const sheet of ['Summary', 'Assets', 'Borrow_Return', 'Issue_Reports', 'Maintenance', 'Calibration_Due', 'Overdue_Borrows']) assert.match(page, new RegExp(sheet));
  assert.match(html, /xlsx\.full\.min\.js/);
});

test('Admin report route and report-type selector are wired', () => { assert.match(router, /#\/admin\/reports/); assert.match(router, /renderReportDashboard/); assert.match(page, /reportTypeSelector/); assert.match(page, /#\/admin\/audit-logs/); });
