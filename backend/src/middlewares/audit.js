const SENSITIVE_KEYS = new Set(['password','password_hash','token','jwt','jwt_secret','authorization']);
function sanitize(value, depth = 0) {
  if (depth > 4 || value === undefined) return undefined;
  if (value === null || ['boolean','number'].includes(typeof value)) return value;
  if (typeof value === 'string') return value.length > 1000 ? `${value.slice(0,1000)}…` : value;
  if (Array.isArray(value)) return value.slice(0,50).map(entry => sanitize(entry, depth + 1));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) return [];
    const safe = sanitize(entry, depth + 1);
    return safe === undefined ? [] : [[key, safe]];
  }));
  return String(value);
}
function routeInfo(req, body) {
  const parts = req.path.replace(/^\/api\//,'').split('/').filter(Boolean); let entity = parts[0] || 'system';
  if (entity === 'admin' && parts[1] === 'users') entity = 'user'; if (entity === 'master') entity = parts[1] || 'master_data';
  const tail = parts.at(-1); const known = ['approve','reject','return-request','verify-return','reject-return','review','resolve','start','complete','cancel','documents','permissions'].includes(tail);
  const verb = known ? tail.replaceAll('-','_') : ({POST:'create',PUT:'update',PATCH:'update',DELETE:'delete'}[req.method] || req.method.toLowerCase());
  return { action: `${entity}.${verb}`, entity, id: String(body?.data?.id ?? body?.user?.id ?? body?.id ?? req.params?.id ?? req.params?.code ?? req.params?.fileId ?? '') || null };
}
export function createAuditMiddleware(prisma) {
  return (req, res, next) => {
    if (!['POST','PUT','PATCH','DELETE'].includes(req.method) || !req.path.startsWith('/api/') || req.path === '/api/auth/login') return next();
    let body; const json = res.json.bind(res); res.json = value => { body = value; return json(value); };
    res.once('finish', () => { if (res.statusCode >= 400) return; const info = routeInfo(req, body); const actor = req.user || (req.path === '/api/auth/register' ? body?.user : null); const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); prisma.auditLog.create({ data: { actor_user_id: Number(actor?.id) || null, actor_name: String(actor?.name || 'Public/Unauthenticated'), actor_role: actor?.role || null, action: info.action, entity_type: info.entity, entity_id: info.id, route: req.route?.path ? `/api${req.route.path}` : req.path, http_method: req.method, http_status: res.statusCode, ip_address: forwarded || req.ip || null, user_agent: String(req.headers['user-agent'] || '').slice(0,500) || null, request_data: sanitize(req.body || {}), result_data: sanitize(body || {}) } }).catch(error => console.error('AUDIT_LOG_WRITE_FAILED', error.message)); }); next();
  };
}
