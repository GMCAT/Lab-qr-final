import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const backend = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../../frontend/js/pages/importItems.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../../frontend/lab-asset-tracker.html', import.meta.url), 'utf8');

test('import preview and commit require item-management permission', () => {
  assert.match(backend, /\/api\/import\/items\/preview'.*requirePermission\('can_manage_items'/);
  assert.match(backend, /\/api\/import\/items\/commit'.*requirePermission\('can_manage_items'/);
});
test('import validates duplicates, master data, dates, prices and row limit', () => {
  for (const rule of ['1,000', 'asset_code ซ้ำในไฟล์', 'asset_code มีอยู่ในระบบแล้ว', 'ไม่พบ brand', 'ไม่พบ location', 'ไม่พบ status', 'purchase_date', 'price']) assert.match(backend, new RegExp(rule));
});
test('commit revalidates and creates all rows in one transaction', () => {
  assert.equal((backend.match(/validateImportRows\(req\.body\.rows, req\.user\)/g) || []).length, 2);
  assert.match(backend, /prisma\.\$transaction\(checked\.rows\.map/);
  assert.match(backend, /ข้อมูลทั้งหมดถูกยกเลิก/);
});
test('import removes responsible_email and audits the authenticated uploader', () => {
  assert.doesNotMatch(page, /['"]responsible_email['"]/);
  assert.match(backend, /responsible_id: uploader\.id/);
  assert.match(backend, /imported_by: \{ id: req\.user\.id, name: req\.user\.name, email: req\.user\.email \}/);
});
test('Admin UI reads Excel and CSV, offers template, preview and commit', () => {
  assert.match(html, /xlsx\.full\.min\.js/); assert.match(router, /#\/admin\/import-items/);
  for (const feature of ['downloadImportTemplate', 'sheet_to_json', '.xlsx,.xls,.csv', 'previewImport', 'commitImport']) assert.match(page, new RegExp(feature.replaceAll('.', '\\.')));
  assert.match(page, /renderItemImportPanel/); assert.match(router, /location\.hash = '#\/admin\/item\/new'/);
});
