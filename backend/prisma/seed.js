// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 กำลังเริ่มสร้างข้อมูลตั้งต้น (Seeding)...');

//   // 1. สร้าง Status
//   const statuses = ['ใช้งานได้', 'ส่งซ่อม', 'เสีย', 'ระหว่างยืม'];
//   for (const name of statuses) {
//     await prisma.status.upsert({
//       where: { name: name },
//       update: {},
//       create: { name: name }
//     });
//   }

//   // 2. สร้าง Brand
//   const brands = ['Keysight', 'Cisco', 'Rohde&Schwarz'];
//   for (const name of brands) {
//     await prisma.brand.upsert({
//       where: { name: name },
//       update: {},
//       create: { name: name }
//     });
//   }

//   // 3. สร้าง Location
//   const locations = ['ตู้ A ชั้น 3', 'ตู้ B ชั้น 2'];
//   for (const name of locations) {
//     await prisma.location.upsert({
//       where: { name: name },
//       update: {},
//       create: { name: name }
//     });
//   }

//   // 4. สร้าง User (อ.สมชาย)
//   await prisma.user.upsert({
//     where: { email: 'somchai@lab.com' },
//     update: {}, 
//     create: { 
//       name: 'อ.สมชาย', 
//       email: 'somchai@lab.com', 
//       role: 'admin' 
//     }
//   });

//   console.log('✅ Seeding เสร็จสมบูรณ์ ข้อมูลพร้อมใช้งาน!');
// }

// main()
//   .catch((e) => {
//     console.error('❌ เกิดข้อผิดพลาด:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.status.createMany({
    data: [
      { name: 'ใช้งานได้' },
      { name: 'ส่งซ่อม' },
      { name: 'เสีย' },
      { name: 'ระหว่างยืม' },
      { name: 'รอดำเนินการ' },
      { name: 'รอตรวจรับคืน' },
      { name: 'อยู่ระหว่างบำรุงรักษา' }
    ], 
    skipDuplicates: true // เพิ่มบรรทัดนี้
  });

  await prisma.brand.createMany({
    data: [{ name: 'Keysight' }, { name: 'Cisco' }, { name: 'Rohde&Schwarz' }],
    skipDuplicates: true // เพิ่มบรรทัดนี้
  });

  await prisma.location.createMany({
    data: [{ name: 'ตู้ A ชั้น 3' }, { name: 'ตู้ B ชั้น 2' }, { name: 'ห้องเก็บของ' }],
    skipDuplicates: true // เพิ่มบรรทัดนี้
  });

  await prisma.category.createMany({
    data: [{ name: 'เครื่องมือวัด' }, { name: 'Network' }, { name: 'Computer' }, { name: 'Other' }],
    skipDuplicates: true
  });

  // เปลี่ยนจาก create เป็น upsert กัน email ซ้ำ และให้บัญชีตั้งต้นเป็น Super Admin
  await prisma.user.upsert({
    where: { email: 'somchai@lab.com' },
    update: {
      role: 'super_admin',
      can_manage_items: true,
      can_manage_users: true,
      can_manage_brands: true,
      can_manage_locations: true,
      can_manage_categories: true,
      can_manage_statuses: true,
      can_manage_responsibles: true,
      can_approve_borrow: true
    },
    create: {
      name: 'อ.สมชาย',
      email: 'somchai@lab.com',
      role: 'super_admin',
      can_manage_items: true,
      can_manage_users: true,
      can_manage_brands: true,
      can_manage_locations: true,
      can_manage_categories: true,
      can_manage_statuses: true,
      can_manage_responsibles: true,
      can_approve_borrow: true
    }
  });

  console.log('Seed done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
