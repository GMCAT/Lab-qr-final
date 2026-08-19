import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backendSource = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const historyPageSource = await readFile(new URL('../../frontend/js/pages/borrowRequests.js', import.meta.url), 'utf8');

test('approval actors are captured from authenticated accounts', () => {
  assert.match(schemaSource, /approved_by_id Int\?/);
  assert.match(schemaSource, /rejected_by_id Int\?/);
  assert.match(backendSource, /approved_by_id: req\.user\.id/);
  assert.match(backendSource, /rejected_by_id: req\.user\.id/);
});

test('borrow rejection reason is mandatory in API and UI', () => {
  assert.match(backendSource, /if \(!reason\) return res\.status\(400\).*กรุณาระบุเหตุผลที่ไม่อนุมัติ/);
  assert.match(historyPageSource, /if \(!reason\?\.trim\(\)\) return/);
});

test('status history records all core borrow and return transitions', () => {
  for (const event of [
    'borrow_requested',
    'borrow_approved',
    'borrow_rejected',
    'return_requested',
    'return_request_rejected',
    'return_verified',
    'return_verified_damaged'
  ]) {
    assert.match(backendSource, new RegExp(`['"]${event}['"]`));
  }
  assert.match(schemaSource, /model BorrowStatusHistory/);
});

test('history page provides timeline and filters', () => {
  assert.match(historyPageSource, /statusHistoryTimeline/);
  assert.match(historyPageSource, /borrowHistorySearch/);
  assert.match(historyPageSource, /borrowHistoryStatus/);
  assert.match(historyPageSource, /borrowHistoryDate/);
});
