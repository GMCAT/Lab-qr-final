import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = fs.readFileSync(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const users = fs.readFileSync(new URL('../../frontend/js/pages/users.js', import.meta.url), 'utf8');
const recovery = fs.readFileSync(new URL('../scripts/recover-super-admin.mjs', import.meta.url), 'utf8');
const packageJson = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');

test('backend prevents suspending the current account and final active super admin', () => {
  assert.match(routes, /status === 'suspended' && targetId === req\.user\.id/);
  assert.match(routes, /ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่/);
  assert.match(routes, /otherActiveSuperAdmins/);
  assert.match(routes, /ไม่สามารถระงับ Super Admin คนสุดท้ายได้/);
});

test('backend prevents self-demotion and final super-admin demotion', () => {
  assert.match(routes, /targetId === req\.user\.id && req\.body\.role/);
  assert.match(routes, /ไม่สามารถลด Role ของ Super Admin คนสุดท้ายได้/);
});

test('users page disables self suspension and recovery command is bounded to super admins', () => {
  assert.match(users, /selfSuspendButton\.disabled = true/);
  assert.match(users, /selfRoleSelect\.disabled = true/);
  assert.match(recovery, /target\.role !== 'super_admin'/);
  assert.match(recovery, /verification_status: 'verified'/);
  assert.match(packageJson, /"recover-admin"/);
});
