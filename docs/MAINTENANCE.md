# Maintenance Guide

เอกสารนี้ใช้สำหรับดูแลโปรเจกต์ระยะยาว

## หลักการสำคัญ

1. ใช้หน้า QR หน้าเดียวเท่านั้น

```text
frontend/item.html?id=<asset_code>
```

2. ห้ามใช้ route เก่าเป็น QR หลัก

```text
#/item/<asset_code>
```

3. ใช้ `asset_code` เป็นรหัสที่ติดบนอุปกรณ์

4. role `user` ห้ามเข้า Admin

5. `super_admin` เท่านั้นที่จัดการสิทธิ์คนอื่นได้

## วิธีรันระบบ

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

เปิด frontend ด้วย Live Server

## วิธีแก้ Login ไม่ได้

ถ้า password ใน Prisma Studio เป็น plain text เช่น `000000` จะ login ไม่ได้ เพราะระบบใช้ bcrypt

ให้รัน:

```bash
cd backend
node set-default-passwords.mjs
```

หลังจากนั้น `password_hash` ควรขึ้นต้นด้วย:

```text
$2
```

## วิธีแก้ JWT_SECRET ผิด

ผิด:

```env
JWT_SECRET=<abc123>
JWT_SECRET="abc123"
```

ถูก:

```env
JWT_SECRET=abc123longsecret
```

## วิธีแก้ port 3001 ถูกใช้แล้ว

เช็ก process:

```powershell
netstat -ano | findstr :3001
```

ปิด process:

```powershell
taskkill /PID <PID> /F
```

## วิธีเพิ่มรูปจริงให้อุปกรณ์

1. วางไฟล์ใน:

```text
backend/uploads/
```

2. สร้าง record ใน `ItemFile`:

```text
file_url=/uploads/front.jpg
file_type=IMAGE
is_cover=true
sort_order=1
```

หรือใช้หน้า Admin เพิ่มอุปกรณ์เพื่อ upload

## วิธีแก้ชื่อไฟล์ไทยเพี้ยน

เวอร์ชันนี้ backend มี `decodeOriginalFilename()` แล้ว แต่ไฟล์ที่ upload ก่อนแก้ชื่อจะยังเสียอยู่ ต้องลบแล้ว upload ใหม่

## Git Workflow ที่แนะนำ

เริ่มต้นครั้งแรก:

```bash
git init
git add .
git commit -m "v0.5 maintenance base"
```

ก่อนแก้ feature ใหม่:

```bash
git checkout -b feature/approval-flow
```

หลังแก้เสร็จ:

```bash
git add .
git commit -m "add approval flow"
```

## Roadmap ต่อไป

### Phase 5: Approval + Documents

- สถานะ `รอดำเนินการ`
- Admin approve/reject borrow request
- Generate PDF เอกสารยืม
- Generate PDF เอกสารคืน
- เลข SN เอกสารไม่ซ้ำ

### Phase 6: Reports

- รายงานอุปกรณ์ทั้งหมด
- รายงานอุปกรณ์ที่ถูกยืม
- รายงานอุปกรณ์เสีย/ส่งซ่อม
- Export Excel/PDF

### Phase 7: Code Refactor

แยก `backend/src/index.js` ออกเป็น module:

```text
routes/auth.routes.js
routes/items.routes.js
routes/borrow.routes.js
routes/admin.routes.js
middleware/auth.js
middleware/permissions.js
services/items.service.js
utils/files.js
```

### Phase 8: Production Deploy

- ใช้ HTTPS
- เก็บ uploads บน cloud storage หรือ folder ถาวร
- ใช้ environment จริง
- backup database
- ตั้ง admin password ใหม่
