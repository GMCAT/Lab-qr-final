# Database Design

Database: PostgreSQL
ORM: Prisma
Schema file: `backend/prisma/schema.prisma`

## Main Models

## User

ใช้เก็บบัญชีผู้ใช้งาน ผู้ดูแล และผู้รับผิดชอบ

Field สำคัญ:

```text
id
name
email
role
password_hash
can_manage_items
can_manage_users
can_manage_brands
can_manage_locations
can_manage_categories
can_manage_statuses
can_manage_responsibles
can_approve_borrow
```

Role:

```text
user
admin
super_admin
```

## Item

เก็บข้อมูลอุปกรณ์ 1 ชิ้น

Field สำคัญ:

```text
id                  UUID ภายในระบบ
asset_code          รหัสเครื่อง เช่น LAB-00128
name                ชื่ออุปกรณ์
model               รุ่น
serial_no           Serial Number
size                ขนาด
note                หมายเหตุ
purchase_date       วันที่ซื้อ
price               ราคา
brand_id            ยี่ห้อ
location_id         ที่เก็บ
status_id           สถานะ
responsible_id      ผู้รับผิดชอบ
category_id         หมวดหมู่
created_at
updated_at
```

ควรใช้ `asset_code` เป็นค่าที่ QR ส่งมา ไม่ควรใช้ UUID ใน QR

## ItemFile

เก็บไฟล์ของอุปกรณ์ เช่น รูปและคู่มือ

Field สำคัญ:

```text
item_id
file_name
file_url
file_type
is_cover
sort_order
created_at
```

ค่า `file_type` ที่ใช้:

```text
IMAGE
MANUAL
DATASHEET
OTHER
```

## BorrowLog

เก็บประวัติการยืม/คืน

Field สำคัญ:

```text
item_id
borrower_name
borrower_position
borrow_date
expected_return_date
return_date
approver_name
note
```

ถ้า `return_date = null` แปลว่ายังไม่คืน

## Brand

เก็บยี่ห้อ เช่น:

```text
Keysight
Cisco
Rohde&Schwarz
```

## Location

เก็บที่เก็บ เช่น:

```text
ตู้ A ชั้น 3
ห้องเก็บของ
```

## Status

เก็บสถานะ เช่น:

```text
ใช้งานได้
ส่งซ่อม
เสีย
ระหว่างยืม
```

## Category

เก็บหมวดหมู่ เช่น:

```text
เครื่องมือวัด
Network
Computer
Other
```

## ความสัมพันธ์หลัก

```text
Brand 1 ── * Item
Location 1 ── * Item
Status 1 ── * Item
Category 1 ── * Item
User 1 ── * Item        ผู้รับผิดชอบ
Item 1 ── * ItemFile
Item 1 ── * BorrowLog
```

## Migration

คำสั่งหลัก:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

ถ้าเจอ drift ในช่วง dev และยอมล้างข้อมูลได้:

```bash
npx prisma migrate reset
```

คำเตือน: `migrate reset` จะลบข้อมูลทั้งหมดใน database

## BorrowLog Approval Fields

`BorrowLog` now includes approval workflow fields:

```text
approval_status: pending | approved | rejected
approved_at
approved_by_name
rejected_at
rejected_by_name
reject_reason
```

Recommended item statuses:

```text
ใช้งานได้
รอดำเนินการ
ระหว่างยืม
ส่งซ่อม
เสีย
```
