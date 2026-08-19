import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = fs.readFileSync(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const items = fs.readFileSync(new URL('../src/services/items.js', import.meta.url), 'utf8');
const uploads = fs.readFileSync(new URL('../src/config/uploads.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/middlewares/auth.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

test('public QR projection excludes private user and borrow history fields', () => {
  const publicProjection = items.slice(items.indexOf('export function publicItemSelect'), items.indexOf('export function findItemByCodeOrId'));
  assert.match(publicProjection, /responsible:\{ select:\{ id:true, name:true \} \}/);
  assert.doesNotMatch(publicProjection, /borrow_logs|email|phone|birth_date/);
  assert.match(routes, /findPublicItemByCodeOrId\(prisma, req\.params\.id\)/);
});

test('all generic uploads enforce safe MIME, extension and size limits', () => {
  assert.match(uploads, /SAFE_MIME_TYPES/);
  assert.match(uploads, /SAFE_EXTENSIONS/);
  assert.match(uploads, /10 \* 1024 \* 1024/);
  assert.doesNotMatch(uploads, /export const upload = multer\(\{ storage \}\)/);
});

test('item deletion archives records and preserves workflow history', () => {
  assert.match(schema, /archived_at DateTime\?/);
  assert.match(routes, /archived_at: new Date\(\), archived_by_id: req\.user\.id/);
  assert.doesNotMatch(routes, /const deleted = await prisma\.item\.delete/);
});

test('password changes revoke old JWTs and borrow transitions use database locks', () => {
  assert.match(schema, /token_version Int @default\(0\)/);
  assert.match(auth, /tokenUser\.token_version/);
  assert.match(routes, /token_version: \{ increment: 1 \}/);
  assert.match(routes, /pg_advisory_xact_lock/);
});
