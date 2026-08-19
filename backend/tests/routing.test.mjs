import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadBrowserScript(relativePath) {
  const source = await readFile(new URL(`../../frontend/${relativePath}`, import.meta.url), 'utf8');
  const context = vm.createContext({
    window: { addEventListener() {} },
    location: { hash: '' },
    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    alert() {},
    router() {},
    console
  });
  vm.runInContext(source, context, { filename: relativePath });
  return context;
}

test('an unauthenticated empty URL starts at the public landing page', async () => {
  const context = await loadBrowserScript('js/router.js');
  assert.equal(context.resolveRouteHash('', false), '#/');
  assert.equal(context.resolveRouteHash('', true), '#/admin');
});

test('post-login routing preserves QR borrow redirect', async () => {
  const context = await loadBrowserScript('js/pages/auth.js');
  assert.equal(context.resolvePostAuthHash({ role: 'user' }, '#/borrow/LAB-OSC-001'), '#/borrow/LAB-OSC-001');
  assert.equal(context.resolvePostAuthHash({ role: 'admin' }, ''), '#/admin');
  assert.equal(context.resolvePostAuthHash({ role: 'user' }, ''), '#/home');
  assert.equal(context.resolvePostAuthHash({ role: 'user', must_change_password: true }, ''), '#/change-password');
});
