// set-default-passwords.mjs
// สคริปต์ครั้งเดียว: ตั้งรหัสผ่านเริ่มต้น "000000" ให้ user เก่าทุกคนที่ยังไม่มีรหัสผ่าน
// วิธีรัน: cd เข้าโฟลเดอร์ backend (ที่มี package.json / prisma อยู่) แล้ว: node set-default-passwords.mjs
//
// สำคัญ: ทำ 2 อย่างนี้ก่อนรันสคริปต์นี้
//   1. เพิ่ม password_hash String? เข้า model User ใน schema.prisma แล้วรัน
//      npx prisma migrate dev --name add_auth
//   2. ติดตั้ง bcryptjs: npm install bcryptjs jsonwebtoken

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '000000';

const users = await prisma.user.findMany({ where: { password_hash: null } });

if (users.length === 0) {
  console.log('ทุกคนมีรหัสผ่านแล้ว ไม่มีอะไรต้องทำ');
} else {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash }
    });
    console.log(`ตั้งรหัสผ่านเริ่มต้นให้ "${user.name}" (${user.email || 'ไม่มีอีเมล!'}) แล้ว`);
  }

  console.log(`\nเสร็จสิ้น ตั้งรหัสผ่านเริ่มต้น "${DEFAULT_PASSWORD}" ให้ ${users.length} คน`);

  const missingEmail = users.filter(u => !u.email);
  if (missingEmail.length) {
    console.log(`\n⚠️  ผู้ใช้ต่อไปนี้ไม่มีอีเมล จะยัง "ล็อกอินไม่ได้" จนกว่าจะเพิ่มอีเมลให้ก่อน (ผ่าน Prisma Studio หรือฟอร์มแก้ไข user):`);
    missingEmail.forEach(u => console.log(`   - ${u.name} (id: ${u.id})`));
  }
}

console.log(`\nหมายเหตุ: บัญชี seed เริ่มต้น somchai@lab.com ควรเป็น role = 'super_admin'`);
console.log(`ตัวอย่างการตั้งผ่าน Prisma Studio: npx prisma studio -> เปิดตาราง User -> แก้ role เป็น admin หรือ super_admin`);

await prisma.$disconnect();
