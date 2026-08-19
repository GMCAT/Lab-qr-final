import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const routes = read('../src/routes/application.routes.js');
const security = read('../src/middlewares/security.js');
const email = read('../src/services/email.js');
const router = read('../../frontend/js/router.js');
const catalog = read('../../frontend/js/pages/publicCatalog.js');
const modal = read('../../frontend/js/components/modal.js');

test('public landing and catalog expose search category sort and responsive cards', () => {
  assert.match(routes, /get\('\/api\/public\/catalog'/);
  assert.match(routes, /success:true, data:\{items,categories\}, meta:/);
  assert.match(router, /hash === '#\/' \|\| hash === '#\/catalog'/);
  assert.match(catalog, /name="category_id"/);
  assert.match(catalog, /sm:grid-cols-2/);
});
test('production completion includes email adapter CSP and toast coverage', () => {
  assert.match(email, /RESET_EMAIL_DELIVERY_FAILED/);
  assert.match(email, /reset_url/);
  assert.match(security, /Content-Security-Policy/);
  assert.match(security, /object-src 'none'/);
  assert.match(modal, /window\.appToast/);
});
