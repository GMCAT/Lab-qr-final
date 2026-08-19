import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = fs.readFileSync(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/middlewares/auth.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const users = fs.readFileSync(new URL('../../frontend/js/pages/users.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../../frontend/js/pages/adminShell.js', import.meta.url), 'utf8');
const itemForm = fs.readFileSync(new URL('../../frontend/js/pages/itemForm.js', import.meta.url), 'utf8');

test('self registration requires Admin verification', () => {
  assert.match(schema, /registration_source String/);
  assert.match(routes, /registration_source: 'self'/);
  assert.match(routes, /verification_status: 'pending'/);
  assert.match(routes, /pending_verification: true/);
  assert.match(auth, /บัญชีกำลังรอผู้ดูแลระบบยืนยัน/);
});

test('password policy and forced reset are enforced server-side', () => {
  assert.match(routes, /password\.length < 6 \|\| password\.length > 21/);
  assert.match(routes, /\/api\/auth\/change-password/);
  assert.match(routes, /\/reset-password/);
  assert.match(auth, /PASSWORD_CHANGE_REQUIRED/);
});

test('Admin shell is shared and sidebar collapse persists', () => {
  assert.match(router, /renderAdminPageShell/);
  assert.match(shell, /adminSidebarCollapsed/);
  assert.match(shell, /currentUser\?\.email|user\?\.email/);
  assert.match(shell, /จัดการยืม-คืน/);
});

test('user page filters registration source and verification', () => {
  assert.match(users, /userSourceFilter/);
  assert.match(users, /userVerificationFilter/);
  assert.match(users, /data-reset-user/);
  assert.match(users, /data-verify-user/);
});

test('workflow-controlled item status is read-only on edit', () => {
  assert.match(routes, /delete data\.status_id/);
  assert.match(itemForm, /สถานะถูกควบคุมโดยระบบยืม-คืน/);
  assert.match(itemForm, /else delete data\.status_id/);
});
