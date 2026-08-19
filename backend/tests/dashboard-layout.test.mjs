import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardSource = await readFile(
  new URL('../../frontend/js/pages/dashboardLayout.js', import.meta.url),
  'utf8'
);
const routerSource = await readFile(
  new URL('../../frontend/js/router.js', import.meta.url),
  'utf8'
);
const entryHtml = await readFile(
  new URL('../../frontend/index.html', import.meta.url),
  'utf8'
);

test('admin route uses the new reversible dashboard renderer', () => {
  assert.match(routerSource, /renderAdminDashboardLayout\(app,\s*items\)/);
  assert.match(dashboardSource, /window\.renderAdminDashboardLayout/);
});

test('dashboard keeps permission-gated admin navigation', () => {
  assert.match(dashboardSource, /can\('can_manage_items'\)/);
  assert.match(dashboardSource, /can\('can_approve_borrow'\)/);
  assert.match(dashboardSource, /can\('can_manage_users'\)/);
});

test('legacy index redirects to the authenticated application entry', () => {
  assert.match(entryHtml, /lab-asset-tracker\.html#\/login/);
  assert.doesNotMatch(entryHtml, /\/api\/items/);
});
