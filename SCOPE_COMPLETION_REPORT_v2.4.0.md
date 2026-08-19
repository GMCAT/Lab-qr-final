# Scope Completion Report v2.4.0

## สิ่งที่เพิ่มจาก v2.3.0

- Public Landing Page ที่เปิดได้โดยไม่ต้องเข้าสู่ระบบ
- Public Catalog พร้อม Search, Category Filter, Sorting และ Detail View
- API `/api/public/catalog` ใช้รูปแบบ `{ success, data, meta }`
- Password Reset Email Adapter ผ่าน HTTP gateway ที่กำหนดด้วย environment variables
- Content Security Policy และ Toast สำหรับข้อความสำเร็จทั่วไป โดยยังคง Modal สำหรับยืนยัน/Prompt/Error
- Regression tests สำหรับความสามารถ v2.4.0

## Email gateway contract

กำหนด `RESET_EMAIL_WEBHOOK_URL`, `RESET_EMAIL_WEBHOOK_TOKEN` และ `APP_BASE_URL` ระบบจะ POST JSON ดังนี้:

```json
{"template":"password-reset","to":"user@example.com","name":"User","reset_url":"https://example/#/reset-password?token=...","expires_minutes":30}
```

Gateway สามารถเชื่อม Resend, SendGrid, Amazon SES, SMTP relay หรือระบบอีเมลของมหาวิทยาลัยได้ โดย Secret อยู่ใน environment เท่านั้น
