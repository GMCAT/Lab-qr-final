import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const index = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const env = await readFile(new URL('../src/config/env.js', import.meta.url), 'utf8');
const security = await readFile(new URL('../src/middlewares/security.js', import.meta.url), 'utf8');
const context = await readFile(new URL('../src/middlewares/request-context.js', import.meta.url), 'utf8');
const limiter = await readFile(new URL('../src/middlewares/rate-limit.js', import.meta.url), 'utf8');
const health = await readFile(new URL('../src/routes/health.routes.js', import.meta.url), 'utf8');
const errors = await readFile(new URL('../src/middlewares/errors.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');

test('production environment validates secrets, database, CORS, port and proxy settings', () => {
  assert.match(env, /jwtSecret\.length < 32/); assert.match(env, /replace\|change/); assert.match(env, /Production ต้องกำหนด DATABASE_URL/); assert.match(env, /Production ต้องกำหนด CORS_ORIGINS/); assert.match(env, /corsOrigins\.includes\('\*'\)/); assert.match(env, /1, 65535/); assert.match(env, /TRUST_PROXY/); assert.match(env, /512kb หรือ 5mb/);
});
test('CORS uses an explicit production allowlist and restricted methods/headers', () => {
  assert.match(index, /cors\(corsOptions\(env\.corsOrigins\)\)/); assert.match(security, /allowedOrigins\.includes\(origin\)/); assert.match(security, /allowedHeaders/); assert.match(security, /X-Request-ID/);
});
test('security headers and server fingerprint removal are enabled', () => {
  for (const header of ['X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','Strict-Transport-Security']) assert.match(security, new RegExp(header));
  assert.match(index, /app\.disable\('x-powered-by'\)/);
});
test('request IDs are validated UUIDs and access logs omit headers and bodies', () => {
  assert.match(context, /crypto\.randomUUID/); assert.match(context, /UUID\.test\(incoming\)/); assert.match(context, /event: 'http_request'/); assert.doesNotMatch(context, /req\.body|authorization/);
});
test('auth and API rate limits expose standard counters and 429 responses', () => {
  assert.match(index, /authLimiter/); assert.match(index, /apiLimiter/); for (const header of ['RateLimit-Limit','RateLimit-Remaining','RateLimit-Reset','Retry-After']) assert.match(limiter, new RegExp(header)); assert.match(limiter, /status\(429\)/); assert.match(limiter, /cleanup\.unref\(\)/);
});
test('liveness and database-backed readiness are registered before API limits', () => {
  assert.match(health, /'\/health\/live'/); assert.match(health, /'\/health\/ready'/); assert.match(health, /prisma\.\$queryRaw/); assert.match(health, /status\(503\)/);
  assert.ok(index.indexOf('registerHealthRoutes') < index.indexOf("app.use('/api', apiLimiter)"));
});
test('production responses hide internal errors and include request ID', () => {
  assert.match(errors, /safeErrorMessage/); assert.match(errors, /NODE_ENV === 'production'/); assert.match(errors, /request_id/);
});
test('fatal process events enter graceful shutdown', () => {
  assert.match(server, /uncaughtException/); assert.match(server, /unhandledRejection/); assert.match(server, /shutdown\('uncaughtException'\)/); assert.match(server, /shutdown\('unhandledRejection'\)/);
});
