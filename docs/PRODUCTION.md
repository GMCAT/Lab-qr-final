# Production deployment

## Required environment

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/lab_qr?schema=public
JWT_SECRET=GENERATE_A_RANDOM_VALUE_WITH_AT_LEAST_32_CHARACTERS
CORS_ORIGINS=https://assets.example.go.th
PORT=3001
UPLOAD_DIR=./uploads
TRUST_PROXY=1
API_RATE_LIMIT=300
AUTH_RATE_LIMIT=10
RATE_LIMIT_WINDOW_MS=60000
REQUEST_BODY_LIMIT=5mb
```

Use `TRUST_PROXY=false` when Node receives traffic directly. Use the exact trusted proxy hop count only when deployed behind a controlled reverse proxy. Never set a broad proxy trust value without confirming the network path.

## Start

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run verify
npm start
```

Terminate with SIGTERM during deployment. The server stops accepting new connections and disconnects Prisma before exiting.

## Health checks

- `GET /health/live`: process is running. Do not use this to decide whether database traffic is safe.
- `GET /health/ready`: returns 200 only when PostgreSQL responds; returns 503 otherwise.

## Reverse proxy

- Terminate HTTPS at the reverse proxy and redirect HTTP to HTTPS.
- Preserve or generate `X-Request-ID` as a valid UUID.
- Forward the client IP only through trusted infrastructure and set `TRUST_PROXY` to the verified hop count.
- Set request-size and timeout limits at the proxy as well as in Node.

## Scaling note

The included rate limiter stores counters in process memory. It is suitable for one Node instance. For multiple instances, replace it with a shared Redis-backed limiter so limits apply across the whole deployment.

## Files and backup

The database and `UPLOAD_DIR` must be backed up together. Use persistent storage for uploads; container-local ephemeral storage will lose files during replacement.

