# QR Public Page + Multiple Images Patch

สิ่งที่เพิ่ม/แก้ไข

1. `frontend/item.html`
   - หน้า Public สำหรับเปิดจาก QR: `item.html?id=LAB-OSC-001`
   - รองรับ Gallery หลายรูป, thumbnail, lightbox, ปุ่มดูรายละเอียดเพิ่มเติม
   - แสดงข้อมูลหลัก: รหัสเครื่อง, ชื่อ, รุ่น, ยี่ห้อ, ขนาด, หมายเหตุ, Serial No., สถานะ
   - รายละเอียดเพิ่มเติม: วันที่ซื้อ, ราคา, ที่เก็บ, ผู้รับผิดชอบ, คู่มือ/Datasheet/ไฟล์แนบ
   - ปุ่ม Login เพื่อยืมอุปกรณ์

2. `backend/src/index.js`
   - เพิ่ม public API: `GET /api/public/items/:id`
   - API นี้ไม่ต้อง login เพื่อให้คนสแกน QR ดูข้อมูลได้
   - ปรับ `GET /api/items/:id` ให้ค้นได้ทั้ง `asset_code` และ `id`
   - ปรับ QR generator ให้ชี้ไป `item.html?id=<asset_code>`
   - ปรับ upload เป็นหลายไฟล์: `POST /api/items/:id/files` โดยใช้ field name `files`
   - รองรับ metadata ไฟล์ `is_cover`, `sort_order`, และ normalize `file_type`

3. `backend/prisma/schema.prisma`
   - เพิ่ม `is_cover Boolean @default(false)`
   - เพิ่ม `sort_order Int @default(0)`
   - เพิ่ม index ให้ `item_id` และ `file_type`

4. Migration ใหม่
   - `backend/prisma/migrations/20260709163000_add_item_file_gallery/migration.sql`

วิธีรันหลังแตกไฟล์

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

เปิดหน้า QR ตัวอย่าง:

```text
frontend/item.html?id=LAB-OSC-001
```

ถ้าใช้ Live Server ใน VS Code ปกติ URL จะประมาณ:

```text
http://localhost:5500/frontend/item.html?id=LAB-OSC-001
```

ถ้าต้องการให้ QR จาก backend ใช้ domain จริง ให้เพิ่มใน `backend/.env`:

```env
PUBLIC_ITEM_BASE_URL=https://your-domain.com/item.html
```

แล้ว QR จะพาไป:

```text
https://your-domain.com/item.html?id=LAB-OSC-001
```

หมายเหตุเรื่อง Upload หลายรูป

ใช้ endpoint:

```http
POST /api/items/LAB-OSC-001/files
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

field file ใช้ชื่อ:

```text
files
```

ส่งได้หลายไฟล์พร้อมกัน เช่น `front.jpg`, `back.jpg`, `serial.jpg`, `manual.pdf`
