# Lab QR Asset Tracker v2.4.0

ระบบจัดการอุปกรณ์ในห้อง Lab ด้วย QR Code สำหรับดูข้อมูลอุปกรณ์ ยืม-คืนอุปกรณ์ อัปโหลดรูป/คู่มือ และจัดการสิทธิ์ผู้ใช้งาน

## สถานะโปรเจกต์

เวอร์ชันนี้เป็นฐานระบบที่ใช้งานได้แล้วสำหรับ:

- หน้า QR แบบ public: `frontend/item.html?id=<asset_code>`
- Admin Dashboard: `frontend/lab-asset-tracker.html#/admin`
- เพิ่ม/แก้ไขอุปกรณ์ พร้อมอัปโหลดรูปหลายรูปและไฟล์แนบ
- ระบบ Login ด้วย JWT
- ระบบยืมอุปกรณ์ผ่านฟอร์ม Borrow
- Role: `user`, `admin`, `super_admin`
- Permission รายบัญชีสำหรับ admin
- Master Data: Brand, Location, Category, Status, Responsible

## โครงสร้างโปรเจกต์

```text
lab-qr-asset/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/       # เตรียมไว้สำหรับแยก route ในรอบ refactor ถัดไป
│   │   ├── middleware/   # เตรียมไว้สำหรับ auth/permission middleware
│   │   ├── services/     # เตรียมไว้สำหรับ business logic
│   │   └── utils/        # เตรียมไว้สำหรับ helper functions
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── item.html
│   └── lab-asset-tracker.html
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   ├── MAINTENANCE.md
│   ├── SYSTEM_DESIGN.md
│   └── USER_FLOW.md
├── CHANGELOG.md
└── README.md
```

## การติดตั้ง

เวอร์ชันแนะนำ: Node.js 20 LTS, npm 10+, PostgreSQL 15/16 และ Prisma 5.22.0
ดูรายละเอียดและขอบเขตที่ตรวจแล้วใน `docs/VERSIONS.md`

### 1. ติดตั้ง backend dependencies

```bash
cd backend
npm ci
```

ตรวจ syntax, local asset references และ routing regression tests:

```bash
npm run verify
```

### 2. ตั้งค่า `.env`

คัดลอกไฟล์ตัวอย่าง:

```bash
copy .env.example .env
```

แล้วแก้ค่าฐานข้อมูลให้ตรงกับเครื่องคุณ เช่น:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lab_qr?schema=public
PORT=3001
UPLOAD_DIR=./uploads
JWT_SECRET=ใส่ค่าสุ่มยาวๆโดยไม่ต้องใส่เครื่องหมาย <> หรือ quote
```

สร้าง JWT_SECRET แบบสุ่มด้วย Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

นำค่าที่ได้ไปใส่ `JWT_SECRET=` ใน `.env` และห้าม commit ไฟล์ `.env`

### 3. รัน migration และ seed

```bash
npx prisma migrate dev
npx prisma generate
npm run set-passwords
```

### 4. เปิด backend

```bash
npm run dev
```

Backend จะอยู่ที่:

```text
http://localhost:3001
```

### 5. เปิด frontend

ใช้ VS Code Live Server เปิดไฟล์:

```text
frontend/lab-asset-tracker.html
```

หรือหน้า QR:

```text
frontend/item.html?id=<asset_code>
```

ตัวอย่าง:

```text
http://127.0.0.1:5500/frontend/item.html?id=lab-34599
```

## บัญชีเริ่มต้น

หลังรัน seed จะมีบัญชีเริ่มต้น:

```text
email: somchai@lab.com
password: 000000 (บัญชีพัฒนาเท่านั้น—เปลี่ยนทันทีเมื่อใช้งานจริง)
role: super_admin
```

ถ้า login ไม่ได้ ให้รัน:

```bash
cd backend
node set-default-passwords.mjs
```

## Role และสิทธิ์

### user

- ดูหน้า QR ได้
- Login เพื่อยืมอุปกรณ์ได้
- เข้า Admin ไม่ได้

### admin

- เข้า Admin ได้เฉพาะเมนูที่ได้รับ permission
- เพิ่ม/แก้ไขอุปกรณ์ได้ถ้า `can_manage_items = true`
- จัดการ master data ได้ตาม permission ที่ได้รับ

### super_admin

- เข้าได้ทุกเมนู
- จัดการ user/admin คนอื่น
- เปิด/ปิด permission
- จัดการ Brand, Location, Category, Status, Responsible

## URL สำคัญ

```text
Public landing and catalog:
http://127.0.0.1:5500/frontend/lab-asset-tracker.html#/

Public QR page:
http://127.0.0.1:5500/frontend/item.html?id=<asset_code>

Admin dashboard:
http://127.0.0.1:5500/frontend/lab-asset-tracker.html#/admin

Borrow page:
http://127.0.0.1:5500/frontend/lab-asset-tracker.html#/borrow/<asset_code>

Super Admin users:
http://127.0.0.1:5500/frontend/lab-asset-tracker.html#/admin/users

Master data:
http://127.0.0.1:5500/frontend/lab-asset-tracker.html#/admin/master-data
```

## Flow หลัก

```text
สแกน QR
→ เปิด item.html?id=<asset_code>
→ ดูข้อมูลอุปกรณ์/รูป/คู่มือ
→ Login เพื่อยืม
→ กรอกฟอร์มยืม
→ Save
→ บันทึก BorrowLog
```

## เอกสารเพิ่มเติม

## ความสามารถ UX/Security เพิ่มเติมใน v2.3.0

- ผู้ใช้แก้ไขโปรไฟล์และเปลี่ยนรหัสผ่านได้
- Forgot/Reset Password ใช้โทเคนครั้งเดียว อายุ 30 นาที (Development แสดงลิงก์ในหน้าเว็บ; Production ต้องส่งโทเคนผ่านระบบอีเมลของหน่วยงาน)
- ตารางอุปกรณ์ค้นหา กรอง และเรียงลำดับได้
- Toast notifications, Open Graph metadata และ browser caching สำหรับ static assets
- รูปภาพขนาดตั้งแต่ 700 KB จะถูกย่อด้านยาวไม่เกิน 1920 px และบีบอัดก่อนอัปโหลดเมื่อ Browser รองรับ
- Social Login เป็นตัวเลือก ไม่จำเป็นต่อ Email Authentication และยังไม่เปิดใช้จนกว่าจะกำหนด OAuth Client ID/Secret

อ่านต่อในโฟลเดอร์ `docs/`:

- `SYSTEM_DESIGN.md` ภาพรวมระบบ
- `API.md` รายการ API สำคัญ
- `DATABASE.md` โครงสร้างฐานข้อมูล
- `USER_FLOW.md` Flow การใช้งาน
- `MAINTENANCE.md` วิธีดูแลระบบและแนวทางพัฒนาต่อ

### Borrow Approval Workflow

ระบบยืมอุปกรณ์ทำงานแบบรออนุมัติ:

```text
User ส่งคำขอยืม → รอดำเนินการ → Admin/Super Admin อนุมัติ → ระหว่างยืม → คืนอุปกรณ์ → ใช้งานได้
```

เมนูสำหรับผู้มีสิทธิ์อนุมัติ:

```text
#/admin/borrow-approvals
#/admin/borrow-history
```

บัญชีที่จะเห็นเมนูนี้ต้องเป็น `super_admin` หรือ `admin` ที่มี `can_approve_borrow = true`
