# Patch Notes: Borrow Approval Workflow

เพิ่มระบบอนุมัติการยืมอุปกรณ์ตาม flow ล่าสุด

## เพิ่ม

- สมัคร User ใหม่ก่อนยืมอุปกรณ์
  - ชื่อ-นามสกุล
  - อีเมล
  - รหัสผ่าน
  - ตำแหน่ง
  - แผนก / ห้อง Lab
  - วันเดือนปีเกิด
  - เบอร์โทร
- เมื่อ user กด Login เพื่อยืมจากหน้า QR และยังไม่มีบัญชี ระบบพาไป `#/register`
- เมื่อ user ส่งคำขอยืม ระบบสร้าง `request_sn` แบบไม่ซ้ำ
- สถานะอุปกรณ์เปลี่ยนเป็น `รอดำเนินการ`
- User export แบบฟอร์มยืมอุปกรณ์เป็น Print / Save as PDF
- User import แบบฟอร์มยืมที่ลงชื่อแล้วกลับเข้าคำขอของตัวเอง
- Admin เข้าเมนู `#/admin/borrow-requests` เพื่อดูคำขอรอดำเนินการ
- Admin เห็นไฟล์แบบฟอร์มที่ user import มา
- Admin สามารถ upload แบบฟอร์มยืมเองได้ถ้ามี
- Admin กดอนุมัติ แล้วสถานะอุปกรณ์เปลี่ยนเป็น `ระหว่างยืม`
- เพิ่มประวัติ `#/admin/borrow-history`

## Database

เพิ่ม field ใน `User`:

- `position`
- `department_lab`
- `birth_date`
- `phone`

เพิ่ม field ใน `BorrowLog`:

- `request_sn`
- `borrower_user_id`
- `approval_status`
- `approved_at`
- `approved_by_name`
- `borrow_document_file_name`
- `borrow_document_file_url`
- `return_document_file_name`
- `return_document_file_url`
- `rejected_at`
- `rejected_by_name`
- `reject_reason`

## API ใหม่

- `POST /api/auth/register`
- `POST /api/items/:id/borrow`
- `POST /api/borrow-logs/:id/user-borrow-document`
- `POST /api/borrow-logs/:id/documents`
- `POST /api/borrow-logs/:id/approve`
- `POST /api/borrow-logs/:id/reject`
- `POST /api/borrow-logs/:id/return`
- `GET /api/borrow-logs`

## วิธีทดสอบ

1. เปิดหน้า QR `frontend/item.html?id=<asset_code>`
2. กด Login เพื่อยืม
3. ถ้ายังไม่มี account ให้สมัคร User ใหม่
4. กรอกฟอร์มยืมแล้ว Save
5. Export แบบฟอร์มยืมเป็น PDF
6. Import แบบฟอร์มยืมกลับเข้าคำขอ
7. Login ด้วย admin/super_admin
8. เข้า `#/admin/borrow-requests`
9. ตรวจไฟล์และกดอนุมัติ
10. หน้า QR ควรเปลี่ยนสถานะเป็น `ระหว่างยืม`
