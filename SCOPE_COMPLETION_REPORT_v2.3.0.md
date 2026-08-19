# Scope Completion Report v2.3.0

วันที่: 2026-08-13

## รายการที่เพิ่ม

- Profile: ผู้ใช้ดูและแก้ไขชื่อ ตำแหน่ง แผนก เบอร์โทร และวันเกิด
- Forgot/Reset Password: โทเคนสุ่ม 256 บิต เก็บเฉพาะ SHA-256 hash หมดอายุใน 30 นาที และยกเลิก JWT เก่าหลังรีเซ็ต
- Sorting: เรียงอุปกรณ์ตามรหัส ชื่อ และเวลาที่แก้ไขล่าสุด
- Toast: แจ้งผลสำเร็จ/ผิดพลาดแบบ accessible live region
- SEO: description, theme color และ Open Graph พร้อมภาพ share
- Performance: cache policy สำหรับ static files/uploads และบีบอัดรูปใหญ่ฝั่ง browser ก่อนอัปโหลด
- Tests: เพิ่ม regression tests สำหรับความสามารถใหม่

## การตั้งค่า Production เพิ่มเติม

ระบบ Forgot Password จะไม่ส่ง reset token กลับทาง API เมื่อ `NODE_ENV=production` ต้องเชื่อมฟังก์ชันส่งอีเมลของหน่วยงานใน route `/api/auth/forgot-password` แล้วส่ง URL รูปแบบ:

`https://YOUR_DOMAIN/#/reset-password?token=ONE_TIME_TOKEN`

Social Login ไม่ได้เปิดใช้งาน เนื่องจากข้อกำหนดรองรับ Email **หรือ** Social Login และระบบใช้ Email Authentication ครบแล้ว หากต้องการ Google/Microsoft Login ต้องลงทะเบียน OAuth application และเก็บ Client Secret ใน environment เท่านั้น

## ผลตรวจ

- Project verification: ผ่าน 77 JavaScript blocks/files และ 5 HTML files
- Automated tests: 79 ผ่าน, 0 ไม่ผ่าน
- Prisma CLI validation ไม่ได้รันในสภาพแวดล้อมตรวจนี้ เนื่องจาก npm cache ของ runtime ถูกจำกัด แต่ schema และ migration ผ่าน structural tests
