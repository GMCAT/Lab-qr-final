import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../../frontend/js/config.js', import.meta.url), 'utf8');
const guide = fs.readFileSync(new URL('../../docs/NGROK_UAT.md', import.meta.url), 'utf8');

test('single Express origin serves frontend without changing API routes', () => {
  assert.match(index, /express\.static\(frontendDir/);
  assert.match(index, /app\.use\('\/frontend'/);
  assert.match(index, /index: 'lab-asset-tracker\.html'/);
});

test('frontend selects current origin under Ngrok and keeps port 5500 development', () => {
  assert.match(config, /window\.location\.origin/);
  assert.match(config, /LOCAL_STATIC_PORTS/);
  assert.match(config, /new URL\(value, `\$\{APP_ORIGIN\}\/?`/);
});

test('QR URL honors forwarded host and UAT never exposes PostgreSQL', () => {
  assert.match(routes, /req\.protocol.*req\.get\('host'\).*item\.html/);
  assert.match(guide, /never create an ngrok TCP tunnel for port 5432/i);
  assert.match(guide, /TRUST_PROXY=true/);
});
