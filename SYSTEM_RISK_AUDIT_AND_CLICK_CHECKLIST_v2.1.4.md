# System Risk Audit & Click Checklist — Lab QR Asset Tracker v2.1.4

วันที่ตรวจ: 7 สิงหาคม 2026  
ขอบเขต: Frontend, API, Authentication, Roles/Permissions, Upload, Asset, Borrow/Return, Issue, Maintenance, Import, Report, Audit Log, Ngrok/Production configuration

> ห้ามทดสอบรายการที่มีคำว่า **ทำลายข้อมูล** บน Production ให้ใช้ฐานข้อมูล UAT สำเนาและสำรอง `database + uploads` ก่อนเสมอ

## 1. ผลสรุป

สถานะโดยรวม: **ยังไม่ควรประกาศ Production-ready 100%**

| ระดับ | จำนวน | ความหมาย |
|---|---:|---|
| Critical | 3 | อาจทำให้ข้อมูลส่วนบุคคลรั่ว, token ถูกขโมย หรือประวัติระบบสูญหาย |
| High | 8 | อาจยึดบัญชี, ข้ามข้อจำกัด, เกิดข้อมูลซ้ำ/สถานะผิด หรือระบบล่มจาก input |
| Medium | 9 | กระทบความถูกต้อง การติดตาม การจัดเก็บ และการดูแลระบบ |
| Low | 5 | UX/operational warning ที่ควรปรับก่อน Production |
| Fixed/Protected | 8 | มีมาตรการใน v2.1.4 และมี regression test แล้ว |

## 2. ความเสี่ยงที่พบจากโค้ด

### Critical

#### C-01 — Public QR API เปิดเผยข้อมูลมากเกินจำเป็น — พบจริง

- `GET /api/public/items/:id` ใช้ `itemInclude()` ชุดเดียวกับหน้า Admin
- Response มี `responsible` จาก `userSafeSelect()` ซึ่งรวม email, phone, birth_date, role และ permission
- Response มี `borrow_logs` และ `status_history` ซึ่งอาจมีชื่อผู้ยืม ตำแหน่ง หมายเหตุ และประวัติ
- ผลกระทบ: ผู้ที่รู้/เดารหัสอุปกรณ์สามารถอ่านข้อมูลบุคคลโดยไม่ Login
- แนวทางแก้: สร้าง `publicItemSelect()` แยก ให้ส่งเฉพาะข้อมูลอุปกรณ์ ไฟล์ public และประวัติ Maintenance ที่อนุญาต ห้ามส่ง User PII และ BorrowLog เต็มชุด

#### C-02 — Upload แบบฟอร์มยืม/ไฟล์อุปกรณ์ไม่จำกัดชนิดและขนาด — พบจริง

- `upload = multer({ storage })` ไม่มี `fileSize` และ `fileFilter`
- User ทั่วไปเข้าถึง upload แบบฟอร์มยืมได้
- `/uploads` ถูกเสิร์ฟเป็น static จาก origin เดียวกับหน้าเว็บ
- ผลกระทบ: disk exhaustion, อัปโหลด HTML/SVG/script-like content และเสี่ยงขโมย token ที่อยู่ใน localStorage เมื่อ Admin เปิดไฟล์
- แนวทางแก้: allowlist PDF/JPEG/PNG/WEBP, ตรวจ magic bytes, จำกัด 10–15 MB, บังคับ `Content-Disposition: attachment`, แยก upload origin หรือปิด script execution

#### C-03 — ลบอุปกรณ์แบบถาวรพร้อม Cascade — พบจริง

- `DELETE /api/items/:code` เรียก `prisma.item.delete()` โดยไม่มี business blocker
- BorrowLog, IssueReport, MaintenanceJob และ ItemFile หลาย relation ใช้ `onDelete: Cascade`
- ผลกระทบ: ลบอุปกรณ์หนึ่งรายการอาจลบประวัติสำคัญทั้งหมด และกู้คืนไม่ได้จาก UI
- แนวทางแก้: Soft delete (`archived_at`, `archived_by`), ห้ามลบเมื่อมี workflow/history, ใช้ confirmation phrase และ restore flow

### High

#### H-01 — JWT เก็บใน localStorage และไม่มี CSP ที่เข้มงวด — พบจริง

- XSS หรือไฟล์อัปโหลดที่รัน script ได้สามารถอ่าน token
- หน้าเว็บโหลดหลาย library จาก CDN และไม่มี Subresource Integrity
- แนวทางแก้: HttpOnly Secure SameSite cookie หรือ short-lived access token + refresh rotation, CSP nonce/hash, self-host production assets

#### H-02 — Token เก่ายังใช้ได้หลังผู้ใช้เปลี่ยนรหัสผ่าน — พบจริง

- JWT อายุ 7 วันและไม่มี `token_version`/session table
- การเปลี่ยนรหัสผ่านไม่ได้ revoke token ที่เคยถูกขโมย
- แนวทางแก้: เพิ่ม `token_version` หรือ session table แล้ว revoke ทุก session หลังเปลี่ยน/reset password

#### H-03 — `/api/meta` และ `/api/users` เปิด User PII ให้ผู้ใช้ที่ Login ทุกคน — พบจริง

- `userSafeSelect()` มี email, phone, birth_date, role และ permission
- Endpoint ต้อง authenticate แต่ไม่จำกัด Admin
- แนวทางแก้: แยก `userPublicSelect`, `responsibleSelect`, `adminUserSelect`; ให้ User ทั่วไปเห็นเฉพาะ id/name ที่จำเป็น

#### H-04 — Borrow request มี race condition — ต้องทดสอบ concurrency

- ตรวจ active borrow ก่อน transaction แต่ไม่มี database constraint ที่รับประกัน active record เดียว
- การกดพร้อมกันสอง request อาจผ่าน check ทั้งคู่
- แนวทางแก้: transaction isolation/row lock หรือ active-loan unique invariant ในฐานข้อมูล

#### H-05 — Workflow transition อาจถูกกดซ้ำพร้อมกัน — ต้องทดสอบ concurrency

- Approve, return verify, issue resolve และ maintenance complete อ่านสถานะก่อน update
- Update ไม่ใช้เงื่อนไขสถานะ/เวอร์ชันใน `where`
- แนวทางแก้: optimistic concurrency (`version`) หรือ conditional update + transaction

#### H-06 — ข้อมูลข้อความส่วนใหญ่ไม่มี Backend maxlength — พบจริง

- Frontend จำกัดช่องค้นหา 100 ตัวอักษร แต่ API field เช่น name, note, description, title ยังไม่มี schema validation กลาง
- ผลกระทบ: API direct call ส่งข้อมูลขนาดใหญ่, UI แตก, Audit Log โต และเกิด storage abuse
- แนวทางแก้: validation schema ต่อ endpoint พร้อม limits เช่น code 100, name 150, email 254, note/description 1,000

#### H-07 — Reset password เป็นค่าที่รู้ล่วงหน้า `000000` — พบจริง

- แม้บังคับเปลี่ยนเมื่อ Login แต่มีช่วงเวลาที่ credential คาดเดาได้
- แนวทางแก้: random one-time password หรือ password-reset token อายุสั้น ส่งผ่านช่องทางที่ยืนยันแล้ว

#### H-08 — Stored/DOM XSS surface จาก HTML template และ inline handlers — ต้องทำ payload test

- ระบบใช้ `innerHTML` และ inline `onclick` หลายจุด
- บางข้อมูลถูกฝังใน attribute/JSON string ซึ่งต้อง escape ตาม context ไม่ใช่ HTML text อย่างเดียว
- แนวทางแก้: ใช้ DOM API/event listeners, ห้าม inline handler, sanitize URL และเพิ่ม automated XSS cases

### Medium

| ID | ความเสี่ยง | สถานะ/แนวทาง |
|---|---|---|
| M-01 | ลบ ItemFile เฉพาะ record แต่ไฟล์จริงอาจค้างใน disk | พบจริง; ลบไฟล์แบบ safe path หลัง transaction หรือทำ garbage collector |
| M-02 | เปลี่ยน/แทนไฟล์เอกสารอาจทิ้งไฟล์เดิม | ตรวจพบ pattern; เพิ่ม cleanup job และ retention policy |
| M-03 | Audit Log เขียนหลัง response แบบ async | หากเขียนล้มเหลว operation ยังสำเร็จ; ใช้ outbox/transaction สำหรับเหตุการณ์สำคัญ |
| M-04 | Audit Log ไม่เก็บ failed login/failed mutation | เพิ่ม security event log แยกและไม่เก็บ password |
| M-05 | วันที่คืนอาจอยู่ในอดีตหรือก่อนวันยืม | เพิ่ม business validation และ timezone policy |
| M-06 | Report/Items โหลดข้อมูลจำนวนมากโดยไม่มี pagination | เพิ่ม server pagination และ export streaming เมื่อข้อมูลโต |
| M-07 | Rate limiter เป็น process-local | ถ้ารันหลาย container ให้ใช้ Redis/shared store |
| M-08 | File validation พึ่ง MIME จาก client ในบาง uploader | ตรวจ magic bytes และ scan malware |
| M-09 | ไม่มี workflow สำหรับ archive/restore | เพิ่ม recycle bin และ retention period |

### Low

| ID | ความเสี่ยง | แนวทาง |
|---|---|---|
| L-01 | Tailwind CDN แสดง production warning | Build Tailwind CSS เป็น static asset |
| L-02 | CDN outage ทำให้ Chart/QR/Excel/ZIP ใช้งานไม่ได้ | Self-host และ pin version/hash |
| L-03 | Ngrok free domain/tunnel หยุดเมื่อ process ปิด | ใช้ reserved domain/service manager ก่อน Production |
| L-04 | API error บางหน้ากว้างเกินไป | แสดง status, request_id และ action ที่ผู้ใช้ทำได้ |
| L-05 | Login email ไม่ normalize แบบเดียวกับ Register ทุกจุด | trim/lowercase ก่อน query |

## 3. มาตรการที่มีแล้วใน v2.1.4

- [x] ป้องกัน Super Admin ระงับบัญชีตัวเอง
- [x] ป้องกัน Super Admin ลด Role ตัวเอง
- [x] ป้องกันการระงับ/ลด Role ของ Super Admin คนสุดท้าย
- [x] มีคำสั่ง recovery จำกัดเฉพาะ Role `super_admin`
- [x] Backend ตรวจ Role/Permission ใน mutation สำคัญส่วนใหญ่
- [x] Password hash ด้วย bcrypt และ policy 6–21 ตัวอักษร
- [x] Production บังคับ JWT secret, explicit CORS, rate limit และ security headers
- [x] มี Audit Log สำหรับ successful mutation และ request ID

## 4. Click Checklist

คอลัมน์ผลทดสอบให้กรอก `PASS / FAIL / BLOCKED / NOT RUN` พร้อมหลักฐาน screenshot และ request_id

### A. บัญชีและสิทธิ์

- [ ] **A-01 [Critical regression]** Login เป็น Super Admin → Users → หาบัญชีตัวเอง → ตรวจว่าปุ่มระงับแสดง “บัญชีที่กำลังใช้งาน” และกดไม่ได้  
  คาดหวัง: ปุ่ม disabled, Role selector disabled
- [ ] **A-02 [Critical regression]** ส่ง API ระงับบัญชีตัวเองโดยตรงใน UAT  
  คาดหวัง: HTTP 409 “ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่”
- [ ] **A-03 [Critical regression]** มี Super Admin คนเดียว → พยายามระงับ/ลด Role ผ่าน API  
  คาดหวัง: HTTP 409 และบัญชียัง verified/super_admin
- [ ] **A-04 [High]** Super Admin A ระงับ Super Admin B เมื่อยังมี A active  
  คาดหวัง: สำเร็จ, B Login/ใช้ token ต่อไม่ได้, Audit Log มี actor A
- [ ] **A-05 [High]** Admin ที่ไม่มี `can_manage_users` เปิด `#/admin/users` และเรียก API  
  คาดหวัง: เมนูไม่แสดงและ API ตอบ 403
- [ ] **A-06 [High]** Admin พยายามแก้ Role/ระงับ Admin หรือ Super Admin  
  คาดหวัง: 403; ทำได้เฉพาะ User
- [ ] **A-07 [High]** Reset password → ใช้ token เก่าจากอีก browser  
  คาดหวังที่ควรเป็น: token เก่าถูก revoke; **ระบบปัจจุบันต้องตรวจเพิ่มเติม**
- [ ] **A-08 [Medium]** เปลี่ยนรหัสผ่าน → Logout → ทดลอง token เก่า  
  คาดหวังที่ควรเป็น: 401; **มีความเสี่ยงว่ายังใช้ได้จน JWT หมดอายุ**

### B. Public QR และความเป็นส่วนตัว

- [ ] **B-01 [Critical]** เปิด `/api/public/items/<code>` ใน Incognito โดยไม่ Login → Inspect JSON  
  คาดหวังที่ควรเป็น: ไม่มี email, phone, birth_date, permission, borrower_name, note และ status_history  
  สถานะจาก code review: **มีโอกาส FAIL สูง/พบข้อมูลเกินจำเป็น**
- [ ] **B-02 [High]** เปิด QR ของอุปกรณ์ที่มีประวัติยืมและผู้รับผิดชอบจริง  
  คาดหวัง: หน้า public แสดงเฉพาะข้อมูลที่องค์กรอนุมัติ
- [ ] **B-03 [Medium]** เดารหัสอุปกรณ์ใกล้เคียงหลายค่า  
  คาดหวัง: ไม่เปิดเผยข้อมูลที่ไม่จำเป็น และมี rate limit เหมาะสม

### C. Upload

- [ ] **C-01 [Critical — UAT เท่านั้น]** User อัปโหลด `.html` เป็นแบบฟอร์มยืม  
  คาดหวังที่ควรเป็น: 400 Unsupported file type  
  สถานะจาก code review: **ปัจจุบันมีโอกาสรับไฟล์**
- [ ] **C-02 [Critical — UAT เท่านั้น]** อัปโหลดไฟล์เกิน 15 MB ในแบบฟอร์มยืม  
  คาดหวังที่ควรเป็น: 413/400 โดยไม่เขียนไฟล์ค้าง  
  สถานะจาก code review: **ไม่มี limit ใน uploader กลาง**
- [ ] **C-03 [High]** เปลี่ยนนามสกุลไฟล์ executable เป็น `.pdf` แต่ content ไม่ใช่ PDF  
  คาดหวัง: magic-byte validation ปฏิเสธ
- [ ] **C-04 [Medium]** Upload แล้วแทนที่เอกสารหลายครั้ง  
  คาดหวัง: ไม่มี orphan file หรือมี retention/cleanup ชัดเจน
- [ ] **C-05 [Medium]** ลบ ItemFile แล้วตรวจโฟลเดอร์ uploads  
  คาดหวัง: physical file ถูกลบอย่างปลอดภัย

### D. อุปกรณ์และข้อมูลกลาง

- [ ] **D-01 [Critical — ทำลายข้อมูล, UAT สำเนาเท่านั้น]** ลบอุปกรณ์ที่มี Borrow/Issue/Maintenance history  
  คาดหวังที่ควรเป็น: ระบบบล็อกและแนะนำ Archive  
  สถานะจาก code review: **มีโอกาส Cascade delete**
- [ ] **D-02 [High]** กดลบอุปกรณ์ซ้ำ/เปิดสอง tab แล้วลบพร้อมกัน  
  คาดหวัง: หนึ่งรายการสำเร็จ อีกคำขอ 404 และ UI ไม่ค้าง
- [ ] **D-03 [High]** Admin ไม่มี permission ของ Brand/Location/Status/Category เรียก API master โดยตรง  
  คาดหวัง: 403 ทุก operation
- [ ] **D-04 [Medium]** ลบ Master Data ที่มีอุปกรณ์ใช้งาน  
  คาดหวัง: บล็อกด้วยข้อความชัดเจนและไม่เปลี่ยนข้อมูล
- [ ] **D-05 [High]** ส่ง name/note ยาว 10,000 ตัวอักษรผ่าน API  
  คาดหวังที่ควรเป็น: 400 พร้อม field error

### E. Borrow / Return

- [ ] **E-01 [High concurrency]** กดส่งคำขอยืมอุปกรณ์เดียวกันพร้อมกันจากสองบัญชี  
  คาดหวัง: สำเร็จเพียงหนึ่งคำขอ
- [ ] **E-02 [High concurrency]** Admin สองคนกด Approve คำขอเดียวกันพร้อมกัน  
  คาดหวัง: สำเร็จครั้งเดียวและมี history หนึ่ง event
- [ ] **E-03 [High]** User A พยายาม upload เอกสาร/แจ้งคืนของ User B  
  คาดหวัง: 403
- [ ] **E-04 [Medium]** ระบุ expected return date ย้อนหลัง  
  คาดหวังที่ควรเป็น: Validation ปฏิเสธ
- [ ] **E-05 [High concurrency]** Admin สองคนตรวจรับคืนพร้อมกัน  
  คาดหวัง: ปิดรายการครั้งเดียว สถานะอุปกรณ์ถูกต้อง History ไม่ซ้ำ
- [ ] **E-06 [Medium]** คืนแบบ damaged ขณะมี Maintenance/Issue เปิดอยู่  
  คาดหวัง: สถานะสุดท้ายไม่ถูกปล่อยเป็น “ใช้งานได้” ผิด workflow

### F. Issue / Maintenance

- [ ] **F-01 [High]** แจ้งเสียซ้ำอุปกรณ์เดียวกันขณะมี Issue เปิด  
  คาดหวัง: บล็อกรายการซ้ำ
- [ ] **F-02 [High concurrency]** Review/Resolve Issue เดียวกันพร้อมกันสอง tab  
  คาดหวัง: Transition ครั้งเดียวและ History ไม่ซ้ำ
- [ ] **F-03 [High]** ปิด Maintenance ขณะยังมี Issue/Maintenance อื่นเปิด  
  คาดหวัง: ไม่เปลี่ยนอุปกรณ์เป็น “ใช้งานได้”
- [ ] **F-04 [Medium]** ใส่ cost ติดลบ/วันที่ due ก่อน scheduled  
  คาดหวัง: 400 พร้อมคำอธิบาย
- [ ] **F-05 [Medium]** Complete/Cancel งานที่ completed แล้ว  
  คาดหวัง: 409/400 และไม่มี History เพิ่ม

### G. Import / Report / Audit

- [ ] **G-01 [High]** Import Excel 1,001 แถว  
  คาดหวัง: ปฏิเสธทั้งหมด ไม่มี partial insert
- [ ] **G-02 [High]** Preview ผ่านแล้วแก้ master data ก่อน Commit  
  คาดหวัง: Commit revalidate และ rollback ทั้งชุด
- [ ] **G-03 [High]** Import text field ยาวมาก/สูตร Excel/CSV injection (`=`, `+`, `-`, `@`)  
  คาดหวัง: จำกัดความยาวและ sanitize ตอน export
- [ ] **G-04 [Medium]** ทำ mutation แล้วปิด DB เฉพาะ Audit Log write  
  คาดหวังที่ควรเป็น: มี retry/outbox; ระบบปัจจุบันอาจ log ไม่ครบ
- [ ] **G-05 [High privacy]** Login เป็น User ธรรมดาแล้วเรียก `/api/meta` และ `/api/users`  
  คาดหวังที่ควรเป็น: ไม่เห็น phone, birth_date และ permission ของทุกบัญชี
- [ ] **G-06 [Medium]** Export CSV/Excel ด้วยค่าที่ขึ้นต้น `=HYPERLINK(...)`  
  คาดหวัง: เซลล์ถูก escape ป้องกัน spreadsheet formula injection

### H. Production / Recovery

- [ ] **H-01 [Critical operational]** Backup PostgreSQL + uploads แล้ว restore ลงเครื่องใหม่  
  คาดหวัง: Login, QR, รูป, Borrow และ Audit ใช้งานได้ครบ
- [ ] **H-02 [High]** ปิด PostgreSQL ระหว่างใช้งาน → `/health/ready`  
  คาดหวัง: 503; `/health/live` ยังตอบได้
- [ ] **H-03 [High]** ปิด ngrok/backend แล้วเปิดใหม่  
  คาดหวัง: service manager restart และ domain เดิมกลับมา
- [ ] **H-04 [High]** ตั้ง CORS origin ผิด/ไม่มี `https://`  
  คาดหวัง: startup validation หรือเอกสารเตือนชัดเจน
- [ ] **H-05 [High]** หมุน JWT_SECRET  
  คาดหวัง: token เดิมหมดสิทธิ์ ผู้ใช้ Login ใหม่ และมี runbook
- [ ] **H-06 [Medium]** Disk ใกล้เต็มจาก uploads/logs  
  คาดหวัง: monitoring alert ก่อนระบบเขียนไฟล์ไม่ได้

## 5. ลำดับแก้ไขที่แนะนำ

1. **Phase R1 — Privacy boundary:** แยก public DTO และลด `/api/meta`/`/api/users` PII
2. **Phase R2 — Upload hardening:** allowlist + size + magic bytes + attachment delivery + cleanup
3. **Phase R3 — Data preservation:** soft delete, archive/restore และ backup/restore drill
4. **Phase R4 — Session security:** token revocation, CSP และ self-host dependencies
5. **Phase R5 — Concurrency/invariants:** active borrow uniqueness และ conditional workflow transitions
6. **Phase R6 — Validation:** field-length/date/cost/formula-injection rules ทั้ง Frontend และ Backend

## 6. หลักฐานการตรวจ

- ตรวจ 58 routes และ middleware ที่เกี่ยวข้อง
- ตรวจ Prisma relations และ `onDelete`
- ตรวจ authentication, role/permission และ Super Admin protection
- ตรวจ uploader, static `/uploads`, public item response และ user selectors
- ตรวจ Audit Log, rate limit, CORS, security headers และ production env validation
- Regression suite ของ v2.1.4 ผ่าน 73/73, static verification ผ่าน JavaScript 72 รายการและ HTML 5 ไฟล์, dependency audit 0 vulnerabilities

## 7. ข้อจำกัดของรายงาน

- เป็น code/config review และ static/runtime smoke evidence ไม่ใช่ penetration test เต็มรูปแบบ
- ไม่ได้กด destructive cases กับฐานข้อมูลจริงของผู้ใช้
- Concurrency, restore, malware scanning, disk-full และ multi-instance rate limit ต้องทดสอบใน UAT environment จริง
