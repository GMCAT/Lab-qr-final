
## v2.1.4 - Super Admin lockout protection

- Prevented users from suspending or demoting their own active Super Admin account.
- Prevented suspension or demotion of the final verified Super Admin.
- Disabled self-suspension and self-role controls in the Users page.
- Added a bounded `recover-admin` command for an accidentally suspended Super Admin.
- No database migration is required.

## v2.1.3 - Lab feedback round 2

- Replaced native browser alerts, confirmations, and prompts with centered in-app dialogs.
- Borrow pages now return to `#/home` for every signed-in role.
- Embedded Import Excel in the new-item page and removed `responsible_email` from templates and validation.
- Imported assets use the authenticated uploader as responsible; Audit Log results include uploader name and email.
- Limited free-text filter inputs to 100 characters.
- Added a report-type selector for operational reports and Audit Log.
- No database migration is required.

## v2.1.2 - Ngrok QR and upload URL fix

- Fixed public QR API calls under ngrok HTTPS.
- Rewrote legacy localhost upload URLs to the active application origin.
- Updated Admin images and file links to use the shared URL helper.
- Added regression coverage; no database migration is required.

## v2.1.1 - Ngrok UAT single-origin patch

- Express now serves both the frontend and API on port 3001 while preserving `/frontend` URLs.
- Frontend API and upload URLs automatically use the current HTTPS origin under Ngrok.
- QR generation derives the public item URL from the forwarded Ngrok host unless explicitly configured.
- Added a safe Ngrok UAT guide that keeps PostgreSQL private on localhost.

## v2.1.0 - Lab feedback round 1

- Added a shared collapsible Admin sidebar across sub-pages with persisted desktop state and mobile drawer behavior.
- Consolidated borrow/return navigation into one management entry and added server-backed notification counts.
- Added self-registration source tracking, Admin verification, suspension, user filters, and audit-compatible actor fields.
- Added Admin password reset and user password change with a 6-21 character policy and forced change after reset.
- Added a friendlier User home page and updated post-login routing.
- Made workflow-controlled equipment status read-only in the generic edit form and ignored direct status changes in the update API.
- Upgraded Multer to 2.2.0 and resolved the remaining production dependency audit finding.

## v2.0.0 - Production hardening

- Added strict production environment validation for database, strong JWT secret, explicit CORS origins, port, proxy trust, body limit, and rate-limit settings.
- Added CORS allowlist, security headers, API/auth rate limiting, UUID request IDs, and structured JSON access logs without request bodies or authorization headers.
- Added `/health/live` and database-backed `/health/ready` endpoints.
- Added production-safe error responses with request IDs and hidden internal/Prisma details.
- Added fatal process event handling through the existing graceful shutdown path.
- Added 8 production-security regression tests without introducing new runtime dependencies.

## v1.9.0 - Backend route extraction

- Moved all 52 API handler registrations out of `src/index.js` into `src/routes/application.routes.js`.
- Reduced `src/index.js` to Express app creation, global middleware order, route registration, and final error handling.
- Introduced `registerApplicationRoutes(app)` so route registration can be mounted and tested without opening a network port.
- Updated feature tests to inspect the route-owning module rather than the app composition entry.
- Added endpoint parity checks for route count, method/path uniqueness, critical workflow routes, and middleware order.

## v1.8.0 - Backend infrastructure refactor

- Extracted environment validation, upload configuration, Prisma lifecycle, authentication/permissions, audit logging, error handling, and shared item/user selectors from the route composition file.
- Added `src/server.js` as the only process entry point with graceful SIGINT/SIGTERM shutdown and Prisma disconnect.
- Changed `src/index.js` into an import-safe Express app/route composition module without `listen()` or `process.exit()`.
- Preserved all existing API paths, payloads, permission checks, upload limits, audit behavior, and frontend behavior.
- Added architecture regression tests and updated feature tests to inspect their new owning modules.

## v1.7.0 - QR Batch Export

- Added `#/admin/qr-batch` with search and status/location/category filters.
- Added select-all-filtered, persistent selection, safe PNG filenames, and ZIP export up to 500 items.
- Added A4 print/Save-as-PDF labels in a three-column layout for up to 200 items.
- QR values reuse the canonical public `item.html?id=<asset_code>` URL and error correction level H.
- Added permission-gated export-event recording through the existing Audit Log.

## v1.6.0 - Import Excel

- Added `#/admin/import-items` for Excel/CSV asset imports with downloadable template.
- Added server-side preview validation for duplicate codes, required fields, master-data references, responsible account, dates, and non-negative prices.
- Commit revalidates the same data and inserts all rows in one database transaction; partial imports are prevented.
- Limited each batch to 1,000 rows and permission-gated both endpoints with `can_manage_items`.
- Import preview and commit operations flow into the existing Audit Log.

## v1.5.0 - Audit Log

- Added an append-only audit trail for successful API mutations across equipment, borrow/return, issue, maintenance, master-data, and user workflows.
- Records the authenticated account, action, entity, route, HTTP result, IP, user agent, sanitized request/result snapshots, and timestamp.
- Excludes failed requests and login attempts; passwords, hashes, tokens, JWT secrets, and authorization headers are never stored.
- Added Admin/Super Admin read-only endpoint with search, date/action/entity/actor filters, bounded pagination, and newest-first ordering.
- Added `#/admin/audit-logs` with expandable event details and permission-gated navigation.

## v1.4.0 - Report Dashboard and multi-format export

- Added `#/admin/reports` with shared date, location, category, asset-status, and maintenance-type filters.
- Added operational summaries for overdue borrowing, pending issues, open maintenance, calibration due dates, and maintenance cost.
- Added asset-status and maintenance-type charts plus high-priority report tables.
- Added UTF-8 CSV export, a seven-sheet Excel workbook, and Thai print-ready PDF export.
- Dashboard and every export format use the same filtered `/api/reports/dashboard` dataset.

## v1.3.0 - Maintenance and Calibration

- Added unified work orders for repair, preventive maintenance, calibration, and inspection.
- Added scheduled, in-progress, completed, and cancelled state transitions with account-based timelines.
- Added internal assignees, external providers, planned dates, cost, results, next due dates, and multiple documents.
- Added direct work-order creation from confirmed issue reports.
- Completing linked work resolves its issue and releases the item only when no borrow, issue, or other maintenance blocker remains.
- Added completed maintenance history to the public QR item page.

## v1.2.1 - Issue report submit feedback fix

- Fixed malformed inline submit HTML that prevented issue reports from reaching the API.
- Replaced the inline submit handler with a bound event listener.
- Added loading, inline error, and persistent success feedback with the generated issue number.
- Added clear migration guidance for missing issue tables and visible router-level API errors.
- Added a direct link from borrow requests to the separate issue-report inbox.

## v1.2.0 - Equipment issue reporting

- Added QR-linked issue reporting with authenticated reporter identity and optional evidence.
- Issue reports remain pending without changing item status until an authorized Admin reviews them.
- Admin can confirm broken equipment, send it to repair, reject the report, or resolve an accepted issue.
- Added duplicate-open-report protection and active BorrowLog protection when resolving an issue.
- Added issue timelines, reporter history, Admin filtering, file type checks, and a 10 MB attachment limit.

## v1.1.0 - Borrow approval history and timeline

- Added `BorrowStatusHistory` as an append-only timeline for borrow and return state changes.
- Approval and rejection now store the authenticated account id and a name snapshot.
- Borrow rejection now requires a reason in both API and UI.
- State changes, item status updates, and history events commit in the same database transaction.
- Added timeline rendering and status/date/text filters to borrow history.
- Added timeline visibility to the borrower's `#/my-borrows` page.

## v1.0.0 - Return request and Admin verification

- Added borrower page `#/my-borrows` for return requests with optional return form upload.
- Added Admin page `#/admin/return-requests` to accept normal/damaged returns or reject for correction.
- Added independent return lifecycle fields and a PostgreSQL migration.
- Item and BorrowLog updates now commit together when requesting, accepting, or rejecting a return.
- Deprecated the immediate-return endpoint to prevent bypassing Admin verification.

## v0.9.0 - Admin dashboard UI refresh

- ปรับหน้า `#/admin` เป็น layout แบบ sidebar + top header ตามภาพอ้างอิง
- เพิ่ม summary cards 4 รายการ, donut chart, status legend และส่วนงานที่ต้องติดตาม
- ทำ sidebar แบบ responsive drawer บนมือถือ
- คง permission-based navigation สำหรับ admin และ super_admin
- คง search, status filter, bulk QR ZIP, edit/delete และ route เดิม
- เก็บ dashboard renderer เดิมเป็น fallback และเพิ่ม `dashboardLayout.js` เป็น renderer ใหม่
- แก้ `frontend/index.html` ให้ redirect ไปหน้า Login แทน dashboard legacy ที่เรียก API ก่อน authentication
- เก็บหน้า `index.html` เดิมไว้ที่ `docs/legacy-index-v0.8.0.txt`

## v0.8.0 - Refactor verification and runtime compatibility

- แก้ default route ของผู้ใช้ที่ยังไม่ login ไม่ให้เก็บ `#/admin` เป็น redirect โดยไม่ตั้งใจ
- แยก pure routing decisions เพื่อเขียน regression tests สำหรับ QR borrow/login redirect
- เพิ่ม `npm run check`, `npm test` และ `npm run verify`
- ตรวจ syntax ของ JavaScript, inline scripts และ local CSS/script references
- แก้ npm scripts ให้โหลด `backend/.env` ด้วย `node --env-file=.env`
- ใช้ `UPLOAD_DIR` จาก environment จริง และสร้างโฟลเดอร์แบบ recursive
- pin dependency versions ให้ตรงกับ `package-lock.json`
- กำหนด Node.js ขั้นต่ำ 20.6 และแนะนำ Node.js 20 LTS
- เก็บ snapshot `frontend/index1.html` ที่เสียไว้ใน `docs/legacy-index1-corrupted.txt` และแทนหน้าด้วย redirect ที่ parse ได้
- เพิ่ม `docs/VERSIONS.md` และรายงานการตรวจสอบก่อนส่งมอบ

## v0.7 - User Register + Borrow Documents Workflow
- เพิ่มหน้า register สำหรับ user ใหม่ที่มาจาก QR/borrow
- เพิ่มข้อมูล profile ผู้ใช้: ตำแหน่ง, แผนก/Lab, วันเกิด, เบอร์โทร
- เพิ่ม SN.อ้างอิงคำขอยืมแบบไม่ซ้ำ
- เพิ่ม export PDF เอกสารยืมและเอกสารคืน
- เพิ่มหน้า Admin `#/admin/borrow-requests`
- เพิ่ม upload เอกสารยืม/คืน 2 ใบก่อนอนุมัติ
- เพิ่มจุดแจ้งเตือนบนการ์ดรอดำเนินการ

# CHANGELOG

## v0.5-maintenance-base

เพิ่มเอกสารและโครงสร้างเพื่อให้ดูแลโปรเจกต์ง่ายขึ้น:

- เพิ่ม `README.md`
- เพิ่ม `docs/SYSTEM_DESIGN.md`
- เพิ่ม `docs/API.md`
- เพิ่ม `docs/DATABASE.md`
- เพิ่ม `docs/USER_FLOW.md`
- เพิ่ม `docs/MAINTENANCE.md`
- เพิ่ม `.gitignore`
- เพิ่ม `backend/.env.example`
- เตรียมโฟลเดอร์ backend สำหรับ refactor: `routes`, `middleware`, `services`, `utils`
- ปรับข้อความแจ้งเตือน `JWT_SECRET` ไม่ให้ใช้ `< >` เพื่อป้องกันการใส่ค่าผิด
- เพิ่ม npm scripts ช่วยงานดูแลระบบ

## v0.4-super-admin-permissions

- เพิ่ม role `user`, `admin`, `super_admin`
- เพิ่ม permission รายบัญชี
- เพิ่ม Category
- เพิ่มหน้า `#/admin/users`
- เพิ่มหน้า `#/admin/master-data`
- กัน user ธรรมดาไม่ให้เข้า Admin

## v0.3-single-qr-borrow-form

- ใช้หน้า QR เดียว: `frontend/item.html?id=<asset_code>`
- เพิ่ม Borrow form: ชื่อ-นามสกุล, ตำแหน่ง, วันที่คืน, ผู้อนุมัติ, หมายเหตุ
- เพิ่ม field ใน `BorrowLog`

## v0.2-mobile-thai-filename

- ปรับหน้า QR สำหรับมือถือ
- แก้ชื่อไฟล์ภาษาไทยตอน upload
- ปรับชื่อไฟล์แนบไม่ให้ล้นกรอบ

## v0.1-gallery-upload

- เพิ่ม Gallery หลายรูป
- เพิ่ม `ItemFile.is_cover`
- เพิ่ม `ItemFile.sort_order`
- เพิ่ม upload รูป/คู่มือหลายไฟล์
## v0.6 - Borrow Approval Workflow

- เพิ่มระบบคำขอยืมแบบรออนุมัติ
- เพิ่มสถานะ `รอดำเนินการ`
- เพิ่มหน้า `#/admin/borrow-approvals` สำหรับ Admin/Super Admin
- เพิ่มหน้า `#/admin/borrow-history` สำหรับดูประวัติยืม-คืน/คำขอทั้งหมด
- เพิ่ม API approve/reject/return ที่ใช้ permission `can_approve_borrow`
- เพิ่ม fields approval ใน `BorrowLog`
# v2.2.0 — Risk Hardening (2026-08-07)

- จำกัดข้อมูล Public QR ด้วย projection แยกจาก Admin
- จำกัด Upload เป็น PDF/JPG/PNG/WebP สูงสุด 10 MB
- เปลี่ยนการลบอุปกรณ์เป็น Soft Delete เพื่อรักษาประวัติ
- เพิ่ม JWT token version และ revoke หลังเปลี่ยน/reset password
- เพิ่ม PostgreSQL transaction lock สำหรับยืมและอนุมัติ
- จำกัดขนาดข้อความ/array/depth ของ API request
- ลดข้อมูลผู้ใช้ใน `/api/meta` และจำกัด `/api/users` เฉพาะ Admin
# v2.3.0 - Scope Completion (2026-08-13)

- Added self-service profile editing.
- Added secure, expiring one-time forgot/reset password flow.
- Added user-selectable asset sorting and real toast notifications.
- Added Open Graph metadata, static/upload cache policy and client image optimization.
# v2.4.0 - Public Experience and Production Completion (2026-08-13)

- Added a public responsive landing page and searchable, filterable category catalog.
- Added a stable public catalog response envelope with `success`, `data`, and `meta`.
- Added configurable password-reset email delivery through a secure HTTP email gateway.
- Added Content Security Policy and broader toast coverage while preserving confirmation modals.
- Added public catalog, email adapter, CSP, and UI regression coverage.
