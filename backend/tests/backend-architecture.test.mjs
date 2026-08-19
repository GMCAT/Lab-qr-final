import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const index = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../src/middlewares/auth.js', import.meta.url), 'utf8');
const uploads = await readFile(new URL('../src/config/uploads.js', import.meta.url), 'utf8');
const audit = await readFile(new URL('../src/middlewares/audit.js', import.meta.url), 'utf8');
const errors = await readFile(new URL('../src/middlewares/errors.js', import.meta.url), 'utf8');
const routes = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');

test('route composition no longer owns environment, Prisma, upload or server lifecycle', () => {
  assert.doesNotMatch(index, /new PrismaClient/); assert.doesNotMatch(index, /multer\.diskStorage/); assert.doesNotMatch(index, /app\.listen/); assert.doesNotMatch(index, /process\.exit/);
  assert.match(index, /export const app = express\(\)/);
});
test('server entry owns listen and graceful shutdown', () => {
  assert.match(server, /app\.listen\(env\.port/); assert.match(server, /SIGINT/); assert.match(server, /SIGTERM/); assert.match(server, /disconnectPrisma/);
});
test('security and upload responsibilities live in dedicated modules', () => {
  assert.match(auth, /jwt\.verify/); assert.match(auth, /requirePermission/); assert.match(uploads, /multer\.diskStorage/); assert.match(audit, /SENSITIVE_KEYS/); assert.match(errors, /MulterError/);
});
test('middleware order keeps JSON and uploads before audit and routes', () => {
  const auditRegistration = index.indexOf('app.use(createAuditMiddleware');
  const routeRegistration = index.indexOf('registerApplicationRoutes(app)');
  assert.ok(index.indexOf("app.use(express.json") < auditRegistration); assert.ok(auditRegistration < routeRegistration); assert.ok(routeRegistration < index.indexOf('app.use(errorHandler)'));
});
test('all route handlers live outside the app composition entry', () => {
  assert.doesNotMatch(index, /app\.(get|post|put|delete)\('/);
  assert.match(routes, /export function registerApplicationRoutes\(app\)/);
  const endpoints = [...routes.matchAll(/app\.(get|post|put|delete)\('([^']+)'/g)].map(match => `${match[1].toUpperCase()} ${match[2]}`);
  assert.equal(endpoints.length, 60);
  assert.equal(new Set(endpoints).size, 60);
  for (const endpoint of ['POST /api/auth/login','GET /api/public/items/:id','POST /api/items/:id/borrow','POST /api/borrow-logs/:id/verify-return','POST /api/items/:id/issues','POST /api/maintenance/:id/complete','GET /api/reports/dashboard','GET /api/audit-logs']) assert.ok(endpoints.includes(endpoint), endpoint);
});
