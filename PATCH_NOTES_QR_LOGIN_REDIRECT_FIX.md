# QR Login Redirect Fix

แก้ปัญหา user กด "สมัคร / Login เพื่อยืมอุปกรณ์" จากหน้า `frontend/item.html?id=...` แล้วหลัง Login เด้งไปหน้า Admin จนขึ้น "ไม่มีสิทธิ์เข้าหน้านี้"

## แก้ไข

- `frontend/item.html`
  - ปุ่มยืมจากหน้า QR จะ set `sessionStorage.redirectAfterLogin = #/borrow/<asset_code>` ก่อนพาไปหน้า Login
  - ถ้า user login อยู่แล้ว จะพาไปหน้า Borrow ทันที
  - ลบปุ่ม "ไปหน้า Admin" ออกจากหน้า QR เพื่อลดความสับสนของ user

- `frontend/js/pages/auth.js`
  - เพิ่ม `redirectAfterAuth(user)` ใช้ร่วมกันหลัง Login/Register
  - ถ้ามี `redirectAfterLogin` จะพากลับไปหน้าที่ตั้งไว้ เช่น `#/borrow/lab-34599`
  - ถ้าไม่มี redirect และเป็น admin/super_admin จะไป `#/admin`
  - ถ้าเป็น user ปกติและ login ตรงจากหน้า Login จะอยู่ที่ `#/login` พร้อมแจ้งให้กลับไปกดจากหน้า QR

- `frontend/js/api.js`
  - แก้ SyntaxError `Unexpected token 'async'`
  - เพิ่ม helper `api()` และ `apiForm()` ให้ใช้งานได้ใน browser script แบบเดิม

- `frontend/js/config.js`
  - เพิ่ม `window.APP_CONFIG`, `window.API_URL`, และ expose helper URL สำหรับไฟล์อื่น

- `frontend/lab-asset-tracker.html`
  - เพิ่ม `js/main.js` หลัง `js/router.js`

## วิธีทดสอบ

1. เปิด `http://127.0.0.1:5500/frontend/item.html?id=<asset_code>`
2. กด `สมัคร / Login เพื่อยืมอุปกรณ์`
3. Login ด้วยบัญชี role `user`
4. ระบบต้องพาไป `#/borrow/<asset_code>` ไม่ใช่ `#/admin`
