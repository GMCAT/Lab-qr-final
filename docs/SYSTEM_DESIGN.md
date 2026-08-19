# System Design

## เป้าหมายระบบ

Lab QR Asset Tracker ใช้สำหรับติด QR Code บนอุปกรณ์แต่ละชิ้นใน Lab เมื่่อสแกนแล้วจะแสดงหน้าเว็บรายละเอียดอุปกรณ์ และสามารถ Login เพื่อยืมอุปกรณ์ได้

## Architecture

```text
Browser / Mobile
  ├─ Public QR Page: frontend/item.html?id=<asset_code>
  └─ Admin SPA: frontend/lab-asset-tracker.html
        │
        ▼
Express API: backend/src/index.js
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL database: lab_qr

Static uploads:
backend/uploads/* served as /uploads/*
```

## Frontend

### `frontend/item.html`

หน้า public สำหรับ QR Code ใช้เพียงหน้านี้หน้าเดียว ไม่ต้อง login เพื่อดูข้อมูล

แสดงข้อมูล:

- รหัสอุปกรณ์
- ชื่ออุปกรณ์
- รุ่น
- ยี่ห้อ
- Serial No.
- ขนาด
- หมายเหตุ
- สถานะ
- รูปภาพหลายรูป
- คู่มือ / Datasheet / ไฟล์แนบ
- วันที่ซื้อ
- ราคา
- ที่เก็บ
- ผู้รับผิดชอบ
- ปุ่ม Login เพื่อยืม

### `frontend/lab-asset-tracker.html`

เป็น Admin/Staff/User SPA แบบ hash route เช่น:

```text
#/login
#/admin
#/admin/item/new
#/admin/users
#/admin/master-data
#/borrow/<asset_code>
```

## Backend

ใช้ Node.js + Express + Prisma

ไฟล์หลักตอนนี้คือ:

```text
backend/src/index.js
```

ในอนาคตควรแยกเป็น:

```text
backend/src/routes/auth.routes.js
backend/src/routes/items.routes.js
backend/src/routes/borrow.routes.js
backend/src/routes/admin.routes.js
backend/src/middleware/auth.js
backend/src/middleware/permissions.js
backend/src/services/items.service.js
backend/src/utils/files.js
```

## Authentication

ระบบใช้ JWT โดย frontend เก็บ token และส่งผ่าน header:

```http
Authorization: Bearer <token>
```

ค่าลับอยู่ใน `.env`:

```env
JWT_SECRET=your-long-secret
```

## Authorization

ระบบใช้ role + permission

### Role

```text
user
admin
super_admin
```

### Permission

```text
can_manage_items
can_manage_users
can_manage_brands
can_manage_locations
can_manage_categories
can_manage_statuses
can_manage_responsibles
can_approve_borrow
```

`super_admin` ได้สิทธิ์ทั้งหมดโดยอัตโนมัติ

## Upload Flow

```text
Admin เลือกรูป/ไฟล์
→ frontend ส่ง multipart/form-data
→ multer บันทึกลง backend/uploads
→ backend สร้าง record ใน ItemFile
→ หน้า QR ดึง files มาแสดง Gallery / Attachments
```

## Borrow Flow

```text
User สแกน QR
→ กด Login เพื่อยืม
→ Login
→ กรอกฟอร์มยืม
→ POST /api/items/:id/borrow
→ สร้าง BorrowLog
→ เปลี่ยนสถานะเป็น "ระหว่างยืม" ถ้ามี status นี้
```

## QR Flow

QR Code ควรชี้ไปที่หน้าเดียวเท่านั้น:

```text
/frontend/item.html?id=<asset_code>
```

ไม่ใช้ route เก่า:

```text
#/item/<asset_code>
```
# Backend structure (v1.9.0)

```text
backend/src/
├── config/
│   ├── env.js          environment validation
│   └── uploads.js      storage, file filters, filename decoding
├── lib/
│   └── prisma.js       one Prisma client and disconnect lifecycle
├── middlewares/
│   ├── auth.js         JWT, roles and permissions
│   ├── audit.js        sanitized append-only activity capture
│   └── errors.js       upload and final Express error handler
├── services/
│   ├── items.js        reusable item include/query policy
│   └── users.js        safe user selects and token payloads
├── index.js            Express app and route composition
└── server.js           listen and graceful process shutdown
```

`server.js` is the runtime entry. Tests and future integration tools can import `app` from `index.js` without opening a network port. Route extraction remains the next structural phase after this verified infrastructure boundary.

## Route extraction (v1.9.0)

`index.js` now contains no route handlers. It applies global middleware in this order: CORS → JSON → static uploads → Audit Log → application routes → error handler. All 52 API registrations are owned by `routes/application.routes.js` through `registerApplicationRoutes(app)`.

Keeping one registrar in this phase preserves exact method/path order and shared workflow helpers. The next optional architecture phase can split this registrar by domain after integration tests with a real database are available.
