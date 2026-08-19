export function registerHealthRoutes(app, prisma) {
  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'lab-qr-api' }));
  app.get('/health/ready', async (req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ready', database: 'ok' }); }
    catch (error) { console.error(JSON.stringify({ level:'error', event:'readiness_failed', request_id:req.id, message:error.message })); res.status(503).json({ status: 'not_ready', database: 'unavailable', request_id: req.id }); }
  });
}
