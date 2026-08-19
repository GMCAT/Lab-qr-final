# User Flow

## 1. Guest / ผู้ยังไม่ Login

```text
สแกน QR
→ เปิด frontend/item.html?id=<asset_code>
→ ดูข้อมูลอุปกรณ์
→ ดูรูป/คู่มือ/ไฟล์แนบ
→ กด Login เพื่อยืมอุปกรณ์
```

Guest เข้า Admin ไม่ได้

## 2. User ทั่วไป

User ใช้สำหรับยืมอุปกรณ์ ไม่ใช้สำหรับจัดการระบบ

เข้าได้:

```text
frontend/item.html?id=<asset_code>
#/login
#/borrow/<asset_code>
```

ทำได้:

```text
ดูข้อมูลอุปกรณ์
กรอกฟอร์มยืม
Save การยืม
```

เข้าไม่ได้:

```text
#/admin
#/admin/users
#/admin/master-data
#/admin/item/new
```

## 3. Admin

Admin เข้า dashboard ได้เฉพาะเมนูที่ได้รับ permission

ตัวอย่าง:

```text
can_manage_items = true
→ เพิ่ม/แก้ไขอุปกรณ์ได้

can_manage_brands = true
→ จัดการยี่ห้อได้

can_approve_borrow = true
→ อนุมัติ/จัดการการยืมได้
```

## 4. Super Admin

Super Admin เป็นเจ้าของระบบ

ทำได้:

```text
เข้า Admin ได้ทุกเมนู
เพิ่ม/แก้ไข user
เปลี่ยน role
เปิด/ปิด permission
เพิ่มผู้รับผิดชอบ
เพิ่ม/แก้ไข Brand
เพิ่ม/แก้ไข Location
เพิ่ม/แก้ไข Category
เพิ่ม/แก้ไข Status
เพิ่ม/แก้ไขอุปกรณ์
ดู BorrowLog ทั้งหมด
```

## 5. Borrow Flow

```text
เปิดหน้า QR
→ กด Login เพื่อยืม
→ ถ้ายังไม่ login ไปหน้า login
→ login สำเร็จ
→ กลับมาหน้า borrow
→ กรอกข้อมูล:
   - ชื่อ-นามสกุล
   - ตำแหน่ง
   - วันที่คืน
   - ผู้อนุมัติ
   - หมายเหตุ
→ Save
→ สร้าง BorrowLog
→ อัปเดตสถานะเป็น ระหว่างยืม
```

## 6. Return Flow

```text
Admin/User ที่มีสิทธิ์เปิดรายการยืม
→ กดบันทึกคืน
→ ระบบใส่ return_date
→ อัปเดตสถานะกลับเป็น ใช้งานได้
```

## 7. Add Item Flow

```text
Admin/Super Admin เข้า #/admin/item/new
→ กรอกข้อมูลอุปกรณ์
→ เลือก Brand / Location / Category / Status / Responsible
→ อัปโหลดรูปหลายรูป
→ อัปโหลดคู่มือ/ไฟล์แนบ
→ Save
→ ระบบสร้าง Item และ ItemFile
→ QR ชี้ไป frontend/item.html?id=<asset_code>
```

## Borrow Approval Flow

```text
1. User สแกน QR และกด Login เพื่อยืม
2. User กรอกฟอร์มยืมและกดส่งคำขอ
3. ระบบสร้าง BorrowLog เป็น pending
4. อุปกรณ์เปลี่ยนเป็นสถานะ รอดำเนินการ
5. Admin/Super Admin เข้า #/admin/borrow-approvals
6. Admin กด อนุมัติ หรือ ไม่อนุมัติ
7. ถ้าอนุมัติ อุปกรณ์เปลี่ยนเป็น ระหว่างยืม
8. เมื่อคืนแล้ว Admin กดบันทึกคืน อุปกรณ์เปลี่ยนเป็น ใช้งานได้
```
