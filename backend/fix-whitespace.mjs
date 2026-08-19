// fix-whitespace.mjs
// สคริปต์ครั้งเดียว: ลบช่องว่างหน้า/หลังที่แฝงอยู่ใน asset_code ของข้อมูลเก่า
// วิธีรัน: cd เข้าโฟลเดอร์ backend (ที่มี package.json / prisma อยู่) แล้ว: node fix-whitespace.mjs

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const items = await prisma.item.findMany();
let fixedCount = 0;

for (const item of items) {
  const trimmed = item.asset_code.trim();
  if (trimmed !== item.asset_code) {
    // ใช้ id (uuid) เป็นตัวค้นหา ไม่ใช่ asset_code เพราะ asset_code เดิมมันเพี้ยนอยู่แล้ว
    await prisma.item.update({
      where: { id: item.id },
      data: { asset_code: trimmed }
    });
    console.log(`แก้แล้ว: "${item.asset_code}" -> "${trimmed}"`);
    fixedCount++;
  }
}

console.log(`เสร็จสิ้น แก้ไปทั้งหมด ${fixedCount} รายการ`);
await prisma.$disconnect();
