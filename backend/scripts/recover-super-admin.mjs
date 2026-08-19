import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const emailFlag = process.argv.indexOf('--email');
const email = emailFlag >= 0 ? String(process.argv[emailFlag + 1] || '').trim().toLowerCase() : '';

if (!email || !email.includes('@')) {
  console.error('Usage: npm run recover-admin -- --email your-admin@example.com');
  process.exitCode = 1;
} else {
  try {
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw new Error('ไม่พบบัญชีอีเมลนี้');
    if (target.role !== 'super_admin') throw new Error('คำสั่งนี้กู้คืนได้เฉพาะบัญชี super_admin');
    await prisma.user.update({ where: { id: target.id }, data: { verification_status: 'verified', verified_at: new Date() } });
    console.log(`Recovered super_admin: ${target.email}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
