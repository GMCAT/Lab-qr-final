import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const backend = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../../frontend/js/pages/qrBatch.js', import.meta.url), 'utf8');
const config = await readFile(new URL('../../frontend/js/config.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');

test('QR batch route is permission gated and uses the existing public item URL', () => {
  assert.match(router, /#\/admin\/qr-batch/); assert.match(router, /can_manage_items/);
  assert.match(page, /publicItemAbsoluteUrl\(assetCode\)/); assert.match(config, /item\.html\?id=/);
});
test('QR batch supports filters and selecting all filtered results', () => {
  for (const feature of ['qrSearch','qrStatus','qrLocation','qrCategory','qrFilteredItems','qrSelectFiltered']) assert.match(page, new RegExp(feature));
});
test('QR batch exports safe PNG ZIP and A4 print labels with limits', () => {
  assert.match(page, /new JSZip/); assert.match(page, /qrSafeFilename/); assert.match(page, /QRCode\.CorrectLevel\.H/);
  assert.match(page, /codes\.length > 500/); assert.match(page, /codes\.length > 200/); assert.match(page, /@page\{size:A4/);
});
test('successful export events are permission gated and enter Audit Log', () => {
  assert.match(backend, /app\.post\('\/api\/qr-batch\/export-event', authenticate, requirePermission\('can_manage_items'/);
  assert.match(page, /format: 'zip'/); assert.match(page, /format: 'print'/);
});
