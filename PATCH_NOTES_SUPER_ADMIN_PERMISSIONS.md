# Patch Notes: Super Admin + Permissions + Category

เพิ่มตามคำขอ:

- แยก role เป็น `user`, `admin`, `super_admin`
- `user` เข้า `#/admin` ไม่ได้ ใช้ได้เฉพาะหน้า QR และหน้ายืม
- `super_admin` จัดการสิทธิ์ account อื่นได้ที่ `#/admin/users`
- เพิ่ม permission ราย account:
  - `can_manage_items`
  - `can_manage_users`
  - `can_manage_brands`
  - `can_manage_locations`
  - `can_manage_categories`
  - `can_manage_statuses`
  - `can_manage_responsibles`
  - `can_approve_borrow`
- เพิ่ม `Category` / หมวดหมู่ใน Prisma
- หน้าเพิ่ม/แก้ไขอุปกรณ์มี dropdown หมวดหมู่
- dropdown ผู้รับผิดชอบแสดงเฉพาะ account ที่เป็น `admin`, `super_admin` หรือมีสิทธิ์จัดการอุปกรณ์/ผู้รับผิดชอบ
- เพิ่มหน้า `#/admin/master-data` สำหรับแก้ ยี่ห้อ / ที่เก็บ / หมวดหมู่ / สถานะ ตามสิทธิ์
- เพิ่มหน้า `#/admin/users` สำหรับ Super Admin ใช้เพิ่มผู้รับผิดชอบและจัดการสิทธิ์

หลังแตกไฟล์ให้รัน:

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

หลัง migrate ระบบจะยกระดับ admin คนแรกในฐานข้อมูลเป็น `super_admin` อัตโนมัติ เพื่อให้มีบัญชีเจ้าของระบบอย่างน้อย 1 บัญชี

หมายเหตุ: หลังเปลี่ยนสิทธิ์ผู้ใช้ ควร logout/login ใหม่ เพื่อให้ token มี permission ล่าสุด
