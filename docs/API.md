# API Reference

Base URL:

```text
http://localhost:3001
```

## Auth

### POST `/api/auth/login`

Login และรับ JWT token

Request:

```json
{
  "email": "somchai@lab.com",
  "password": "000000"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "name": "อ.สมชาย",
    "email": "somchai@lab.com",
    "role": "super_admin"
  }
}
```

### GET `/api/auth/me`

ตรวจสอบ token ปัจจุบัน

ต้องส่ง header:

```http
Authorization: Bearer <token>
```

## Public Item

### GET `/api/public/items/:id`

ใช้สำหรับหน้า QR ไม่ต้อง login

ตัวอย่าง:

```text
GET /api/public/items/lab-34599
```

ค้นจาก:

- `asset_code` แบบไม่สนตัวพิมพ์เล็ก/ใหญ่
- `id` ถ้าส่ง UUID

Response มีข้อมูล item พร้อม relation:

- brand
- location
- status
- responsible
- category
- files
- borrow_logs

## Items Admin

### GET `/api/items`

ดึงรายการอุปกรณ์ทั้งหมด ต้อง login และเป็น `admin` หรือ `super_admin`

### GET `/api/items/:id`

ดึงอุปกรณ์ 1 ชิ้น ต้อง login

### POST `/api/items`

สร้างอุปกรณ์ใหม่ ต้องมี permission:

```text
can_manage_items
```

### PUT `/api/items/:id`

แก้ไขอุปกรณ์ ต้องมี permission:

```text
can_manage_items
```

### DELETE `/api/items/:id`

ลบอุปกรณ์ ต้องมี permission:

```text
can_manage_items
```

## Uploads

### POST `/api/items/:id/files`

อัปโหลดไฟล์เข้า item

รองรับ:

- IMAGE
- MANUAL
- DATASHEET
- OTHER

ไฟล์ถูกเก็บที่:

```text
backend/uploads/
```

และเข้าถึงผ่าน:

```text
http://localhost:3001/uploads/<filename>
```

## Borrow

### POST `/api/items/:id/borrow`

ยืมอุปกรณ์

Request:

```json
{
  "borrower_name": "นายทดสอบ",
  "borrower_position": "Engineer",
  "expected_return_date": "2026-07-20",
  "approver_name": "อ.สมชาย",
  "note": "ใช้ทดสอบงาน Lab"
}
```

ระบบจะ:

- สร้าง `BorrowLog`
- ถ้ามี status `ระหว่างยืม` จะอัปเดตสถานะ item

### POST `/api/borrow-logs/:id/return`

บันทึกคืนอุปกรณ์

ระบบจะ:

- ใส่ `return_date`
- ถ้ามี status `ใช้งานได้` จะอัปเดตสถานะ item กลับ

### GET `/api/borrow-logs`

ดูประวัติการยืมทั้งหมด ต้องเป็น admin/super_admin หรือมีสิทธิ์ที่เกี่ยวข้อง

## Admin Users

### GET `/api/admin/users`

ดูรายการ user/admin ต้องเป็น `super_admin` หรือมี permission `can_manage_users`

### POST `/api/admin/users`

เพิ่ม user/admin/responsible

### PUT `/api/admin/users/:id`

แก้ไข role และ permission

## Master Data

จัดการข้อมูลพื้นฐาน:

- Brand
- Location
- Category
- Status

ต้องมี permission ตามแต่ละเมนู เช่น:

```text
can_manage_brands
can_manage_locations
can_manage_categories
can_manage_statuses
```

## Borrow Approval APIs

### Send borrow request

```http
POST /api/items/:id/borrow
Authorization: Bearer <token>
```

Body:

```json
{
  "borrower_name": "นายสมชาย ใจดี",
  "borrower_position": "เจ้าหน้าที่ Lab",
  "expected_return_date": "2026-07-20",
  "approver_name": "อ.สมชาย",
  "note": "ใช้ทดลอง Lab A"
}
```

Result:

- Creates `BorrowLog.approval_status = pending`
- Changes item status to `รอดำเนินการ` if that status exists

### List borrow logs

```http
GET /api/borrow-logs
GET /api/borrow-logs?approval_status=pending
```

Requires `can_approve_borrow`.

### Approve borrow request

```http
POST /api/borrow-logs/:id/approve
```

Requires `can_approve_borrow`.

Result:

- Changes `approval_status` to `approved`
- Records `approved_at` and `approved_by_name`
- Changes item status to `ระหว่างยืม`

### Reject borrow request

```http
POST /api/borrow-logs/:id/reject
```

Body:

```json
{
  "reason": "เหตุผลที่ไม่อนุมัติ"
}
```

Requires `can_approve_borrow`.

### Return borrowed item

```http
POST /api/borrow-logs/:id/return
```

Requires `can_approve_borrow` and the borrow log must be `approved`.
# Audit Log (v1.5.0)

- `GET /api/audit-logs` — Admin/Super Admin only; supports `page`, `page_size` (10–100), `search`, `action`, `entity_type`, `actor_user_id`, `date_from`, and `date_to`.
- Audit records are read-only. The API intentionally exposes no update or delete route.
- Successful mutation routes are recorded automatically; authentication login and unsuccessful requests are excluded.
# Import Excel (v1.6.0)

- `POST /api/import/items/preview` — validates up to 1,000 normalized rows without writing.
- `POST /api/import/items/commit` — repeats validation and commits every valid row in one transaction.
- Both endpoints require `can_manage_items`; master-data names and responsible email must already exist.
# QR Batch Export (v1.7.0)

- `POST /api/qr-batch/export-event` — records a completed ZIP or print export in Audit Log; requires `can_manage_items`, accepts at most 500 item codes.
