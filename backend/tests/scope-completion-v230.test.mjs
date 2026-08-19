import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const routes = read('../src/routes/application.routes.js');
const schema = read('../prisma/schema.prisma');
const router = read('../../frontend/js/router.js');
const html = read('../../frontend/lab-asset-tracker.html');
const api = read('../../frontend/js/api.js');
const dashboard = read('../../frontend/js/pages/dashboardLayout.js');

test('profile and one-time password reset are implemented', () => {
  assert.match(routes, /put\('\/api\/auth\/profile'/);
  assert.match(routes, /post\('\/api\/auth\/forgot-password'/);
  assert.match(routes, /post\('\/api\/auth\/reset-password'/);
  assert.match(schema, /password_reset_token_hash String\? @unique/);
  assert.match(router, /#\/profile/);
});
test('sorting, toast, SEO, caching and image optimization are wired', () => {
  assert.match(dashboard, /id="assetSort"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /js\/components\/toast\.js/);
  assert.match(api, /optimizeImageFormData/);
  assert.match(api, /1920/);
});
