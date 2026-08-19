import path from 'path';

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่พบ ${name} ใน environment`);
  return value;
}

function integer(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} ต้องเป็นจำนวนเต็มระหว่าง ${min}-${max}`);
  return value;
}
function trustProxy(value) {
  if (!value || value === 'false') return false;
  if (value === 'true') return 1;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) throw new Error('TRUST_PROXY ต้องเป็น false, true หรือจำนวน hop 0-10');
  return hops;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = requireSecret('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร');
if (nodeEnv === 'production' && /replace|change.?me|example|secret/i.test(jwtSecret)) throw new Error('Production ต้องใช้ JWT_SECRET แบบสุ่มจริง');
if (nodeEnv === 'production' && !process.env.DATABASE_URL) throw new Error('Production ต้องกำหนด DATABASE_URL');
if (nodeEnv === 'production' && !process.env.CORS_ORIGINS) throw new Error('Production ต้องกำหนด CORS_ORIGINS');
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean) : ['*'];
if (nodeEnv === 'production' && (!corsOrigins.length || corsOrigins.includes('*'))) throw new Error('Production CORS_ORIGINS ต้องเป็น origin ที่ระบุชัดเจน');
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '5mb';
if (!/^\d+(kb|mb)$/i.test(requestBodyLimit)) throw new Error('REQUEST_BODY_LIMIT ต้องอยู่ในรูปแบบ เช่น 512kb หรือ 5mb');

export const env = Object.freeze({
  port: integer('PORT', 3001, 1, 65535),
  jwtSecret,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  corsOrigins,
  trustProxy: trustProxy(process.env.TRUST_PROXY),
  apiRateLimit: integer('API_RATE_LIMIT', 300, 10, 100000),
  authRateLimit: integer('AUTH_RATE_LIMIT', 10, 3, 10000),
  rateWindowMs: integer('RATE_LIMIT_WINDOW_MS', 60000, 1000, 3600000),
  requestBodyLimit,
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${integer('PORT', 3001, 1, 65535)}`,
  resetEmailWebhookUrl: process.env.RESET_EMAIL_WEBHOOK_URL || '',
  resetEmailWebhookToken: process.env.RESET_EMAIL_WEBHOOK_TOKEN || ''
});
