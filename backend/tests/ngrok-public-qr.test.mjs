import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const publicItem = fs.readFileSync(new URL('../../frontend/item.html', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../../frontend/js/config.js', import.meta.url), 'utf8');
const utils = fs.readFileSync(new URL('../../frontend/js/utils.js', import.meta.url), 'utf8');
const itemPage = fs.readFileSync(new URL('../../frontend/js/pages/item.js', import.meta.url), 'utf8');

test('public QR page uses the current HTTPS origin outside local static development', () => {
  assert.match(publicItem, /IS_LOCAL_STATIC \? 'http:\/\/localhost:3001' : window\.location\.origin/);
  assert.match(publicItem, /const API_BASE = `\$\{BACKEND_ORIGIN\}\/api`/);
  assert.doesNotMatch(publicItem, /localStorage\.getItem\('API_BASE'\)/);
});

test('legacy loopback upload URLs are rewritten to the public origin', () => {
  for (const source of [publicItem, config]) {
    assert.match(source, /\['localhost', '127\.0\.0\.1', '::1'\]/);
    assert.match(source, /parsed\.pathname.*parsed\.search.*parsed\.hash/);
  }
});

test('admin file and item views use the shared public-safe URL helper', () => {
  assert.match(utils, /absUrl\(file\.file_url\)/);
  assert.match(itemPage, /getFileUrl\(f\)/);
  assert.doesNotMatch(itemPage, /http:\/\/localhost:3001\$\{/);
});
