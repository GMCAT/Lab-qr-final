# Patch Notes: User Register + Borrow Documents Workflow

เพิ่ม workflow ตามที่ร้องขอ:

## User Registration
- เพิ่มหน้า `#/register`
- ผู้ใช้ใหม่กรอก:
  - ชื่อ-นามสกุล
  - อีเมล
  - รหัสผ่าน
  - ตำแหน่ง
  - แผนก / ห้อง Lab
  - วันเดือนปีเกิด
  - เบอร์โทร
- หลังสมัครสำเร็จ ระบบ login ให้อัตโนมัติ และกลับไปหน้า borrow เดิมถ้ามาจาก QR

## Borrow Request Workflow
- เมื่อ user ส่งฟอร์มยืม ระบบสร้าง `request_sn` อ้างอิงไม่ซ้ำ เช่น `BR-20260713-ABC123`
- สถานะอุปกรณ์เปลี่ยนเป็น `รอดำเนินการ`
- User export เอกสารได้ 2 ใบ:
  1. เอกสารยืมอุปกรณ์
  2. เอกสารคืนอุปกรณ์

## Admin Approval
- เพิ่ม route `#/admin/borrow-requests`
- เพิ่มปุ่มเมนู `คำขอยืม` สำหรับผู้มีสิทธิ์ `can_approve_borrow`
- เพิ่มจุดแจ้งเตือนบนการ์ด `รอดำเนินการ`
- Admin อัปโหลดเอกสาร 2 ใบก่อนอนุมัติ:
  - `borrow_document`
  - `return_document`
- ระบบไม่อนุญาตให้อนุมัติถ้ายังอัปโหลดเอกสารไม่ครบ 2 ใบ

## Database
เพิ่ม field:
- `User.position`
- `User.department_lab`
- `User.birth_date`
- `User.phone`
- `BorrowLog.request_sn`
- `BorrowLog.borrow_document_file_name`
- `BorrowLog.borrow_document_file_url`
- `BorrowLog.return_document_file_name`
- `BorrowLog.return_document_file_url`
