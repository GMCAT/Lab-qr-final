import crypto from 'crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requestContext(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '');
  req.id = UUID.test(incoming) ? incoming : crypto.randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-ID', req.id);
  next();
}
export function accessLog(req, res, next) {
  res.once('finish', () => {
    const durationMs = req.startedAt ? Number(process.hrtime.bigint() - req.startedAt) / 1e6 : 0;
    const record = { level: res.statusCode >= 500 ? 'error' : 'info', event: 'http_request', timestamp: new Date().toISOString(), request_id: req.id, method: req.method, path: req.path, status: res.statusCode, duration_ms: Number(durationMs.toFixed(2)), ip: req.ip, user_id: req.user?.id || null };
    console.log(JSON.stringify(record));
  });
  next();
}
