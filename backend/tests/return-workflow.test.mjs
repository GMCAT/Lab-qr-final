import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backendSource = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const routerSource = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const returnPageSource = await readFile(new URL('../../frontend/js/pages/returns.js', import.meta.url), 'utf8');

test('return state is independent from borrow approval state', () => {
  assert.match(schemaSource, /return_status String @default\("not_requested"\)/);
  assert.match(schemaSource, /return_requested_at DateTime\?/);
  assert.match(schemaSource, /closed_at DateTime\?/);
});

test('borrower return request requires ownership or approval permission', () => {
  assert.match(backendSource, /current\.borrower_user_id === req\.user\.id/);
  assert.match(backendSource, /!isOwner && !hasPermission\(req\.user, 'can_approve_borrow'\)/);
  assert.match(backendSource, /return_status === 'pending'/);
});

test('Admin verification atomically closes log and updates item status', () => {
  const verifyRoute = backendSource.slice(
    backendSource.indexOf("app.post('/api/borrow-logs/:id/verify-return'"),
    backendSource.indexOf("app.post('/api/borrow-logs/:id/reject-return'")
  );
  assert.match(verifyRoute, /prisma\.\$transaction/);
  assert.match(verifyRoute, /closed_at: now/);
  assert.match(verifyRoute, /condition === 'damaged' \? 'เสีย' : 'ใช้งานได้'/);
});

test('required return routes and UI actions are wired', () => {
  assert.match(routerSource, /#\/my-borrows/);
  assert.match(routerSource, /#\/admin\/return-requests/);
  assert.match(returnPageSource, /\/return-request/);
  assert.match(returnPageSource, /\/verify-return/);
  assert.match(returnPageSource, /\/reject-return/);
});
