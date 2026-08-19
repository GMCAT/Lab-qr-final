# Supported and verified versions

Project release: **v2.1.4 (Super Admin lockout protection)**

## Recommended local setup

- Node.js 20 LTS (recommended and recorded in `.nvmrc`)
- npm 10 or newer
- PostgreSQL 15 or 16
- Prisma CLI and Prisma Client 5.22.0 (resolved by `package-lock.json`)
- Multer 2.2.0

The backend declares Node.js `>=20.6.0` and npm `>=9.0.0`. Node.js 20 LTS is the conservative target for this Prisma 5 project. Node 20.6 or newer is required because the npm scripts use Node's built-in `--env-file=.env` support. Do not upgrade Prisma across major versions as part of a structural refactor; treat that as a separate migration with database tests.

## Codex verification environment

- Node.js 24.14.0
- npm 11.9.0

Static JavaScript/HTML verification and routing tests pass in this environment. A full dependency install was not verified here because package tarball extraction repeatedly failed in the restricted registry/cache environment. This is an environment limitation, not evidence that production installation succeeds or fails.

## Commands

```bash
cd backend
npm ci
npm run verify
npx prisma validate
```

`npm run verify` does not require a running database. `prisma validate`, migrations, seed, and API smoke tests require installed dependencies; migrations and runtime flows also require a reachable PostgreSQL database and a configured `.env`.

## v2.1.4 - Super Admin lockout protection

- Blocks self-suspension, self-demotion, and removal of the final active Super Admin.
- Includes `npm run recover-admin -- --email <email>` for controlled account recovery.
- No database migration is required.

## v2.1.3 - Lab feedback round 2

- Centered application dialogs replace native browser dialogs.
- Import Excel is integrated into the new-item page without `responsible_email`.
- Uploader identity is retained in the Audit Log result and filter text is bounded to 100 characters.
- Report Dashboard can switch between operational reports and Audit Log.
- No database migration is required.

## v2.1.2 - Ngrok QR and upload URL fix

- Public QR requests use the active ngrok HTTPS origin instead of a stored localhost URL.
- Legacy upload URLs pointing to localhost/127.0.0.1 are rewritten to the public origin.
- Admin images and document links use the shared URL resolver.
- Local ports 5500/5501 still target localhost:3001.
- No database migration is required.
