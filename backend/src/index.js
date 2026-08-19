import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createAuditMiddleware } from './middlewares/audit.js';
import { errorHandler } from './middlewares/errors.js';
import { registerApplicationRoutes } from './routes/application.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { securityHeaders, corsOptions } from './middlewares/security.js';
import { requestContext, accessLog } from './middlewares/request-context.js';
import { createRateLimiter } from './middlewares/rate-limit.js';
import { validateRequestShape } from './middlewares/validation.js';

export const app = express();
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.resolve(backendDir, '..', 'frontend');
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(requestContext);
app.use(securityHeaders({ production: env.isProduction }));
app.use(accessLog);
app.use(cors(corsOptions(env.corsOrigins)));
app.use(express.json({ limit: env.requestBodyLimit }));
app.use('/api', validateRequestShape);
app.use('/uploads', express.static(env.uploadDir, { maxAge: env.isProduction ? '1d' : 0, immutable: false }));
// Single-origin UAT/production: the same Express process serves the frontend and API.
// /frontend remains available so existing bookmarks and QR links keep working.
const staticOptions = { index: 'lab-asset-tracker.html', maxAge: env.isProduction ? '1h' : 0, setHeaders(res, filePath) { if (/\.html$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache'); } };
app.use('/frontend', express.static(frontendDir, staticOptions));
app.use(express.static(frontendDir, staticOptions));
registerHealthRoutes(app, prisma);
const authLimiter = createRateLimiter({ limit: env.authRateLimit, windowMs: env.rateWindowMs, name: 'auth' });
const apiLimiter = createRateLimiter({ limit: env.apiRateLimit, windowMs: env.rateWindowMs, name: 'api' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api', apiLimiter);
app.use(createAuditMiddleware(prisma));

registerApplicationRoutes(app);

app.use(errorHandler);
