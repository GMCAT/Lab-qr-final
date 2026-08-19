# PATCH NOTES: Maintenance / Documentation Base

เวอร์ชันนี้ไม่ได้เพิ่มฟีเจอร์ใหญ่ใหม่ แต่จัดระบบให้ดูแลต่อได้ง่ายขึ้น

## เพิ่มไฟล์เอกสาร

- `README.md`
- `CHANGELOG.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/API.md`
- `docs/DATABASE.md`
- `docs/USER_FLOW.md`
- `docs/MAINTENANCE.md`

## เพิ่มไฟล์สำหรับดูแลระบบ

- `.gitignore`
- `backend/.env.example`
- `backend/uploads/.gitkeep`

## เตรียมโครงสร้าง refactor

เพิ่มโฟลเดอร์ว่างสำหรับแยกโค้ดในอนาคต:

- `backend/src/routes/`
- `backend/src/middleware/`
- `backend/src/services/`
- `backend/src/utils/`

## ปรับ scripts

เพิ่มใน `backend/package.json`:

```json
{
  "seed": "node prisma/seed.js",
  "studio": "prisma studio",
  "set-passwords": "node set-default-passwords.mjs",
  "db:reset": "prisma migrate reset"
}
```

## แก้ข้อความ JWT_SECRET

ปรับข้อความ error ไม่ให้ใช้ `< >` เพื่อป้องกันการ copy ไปใส่ `.env` ผิด

## ขั้นตอนแนะนำหลังแตกไฟล์

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
node set-default-passwords.mjs
npm run dev
```
