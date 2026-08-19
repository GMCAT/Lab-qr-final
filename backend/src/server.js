import { app } from './index.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './lib/prisma.js';

const server = app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close(async error => {
    await disconnectPrisma().catch(dbError => console.error('Prisma disconnect failed', dbError));
    process.exit(error ? 1 : 0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('uncaughtException', error => { console.error(JSON.stringify({ level:'fatal', event:'uncaught_exception', message:error.message, stack:error.stack })); shutdown('uncaughtException'); });
process.once('unhandledRejection', reason => { const error = reason instanceof Error ? reason : new Error(String(reason)); console.error(JSON.stringify({ level:'fatal', event:'unhandled_rejection', message:error.message, stack:error.stack })); shutdown('unhandledRejection'); });
