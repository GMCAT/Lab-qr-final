export function securityHeaders({ production = false } = {}) {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

export function corsOptions(allowedOrigins) {
  const allowAll = allowedOrigins.includes('*');
  return {
    origin(origin, callback) {
      if (!origin || allowAll || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error('Origin ไม่ได้รับอนุญาตจาก CORS'); error.statusCode = 403; callback(error);
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Authorization','Content-Type','X-Request-ID'],
    exposedHeaders: ['X-Request-ID','RateLimit-Limit','RateLimit-Remaining','RateLimit-Reset'],
    maxAge: 600
  };
}
