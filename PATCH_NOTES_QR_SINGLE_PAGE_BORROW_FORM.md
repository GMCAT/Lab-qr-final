# Patch: QR single page + borrow form fields

ปรับปรุงล่าสุด:

1. หน้า QR ใช้ `frontend/item.html?id=<asset_code>` เป็นหน้าหลักหน้าเดียว
   - ลิงก์ QR generator เปลี่ยนจาก `#/item/...` เป็น `item.html?id=...`
   - route เก่า `#/item/...` จะ redirect ไปหน้า `item.html?id=...`

2. ปรับหน้า `item.html` สำหรับมือถือ
   - จำกัดความสูงรูปภาพบนจอเล็ก
   - จัด layout เป็น card แบบใช้งานง่ายบนมือถือ
   - thumbnail เลื่อนแนวนอนได้

3. ปรับหน้า `#/borrow/<asset_code>`
   - เพิ่มฟอร์ม: ชื่อ-นามสกุล, ตำแหน่ง/แผนก, วันที่คืน, ผู้อนุมัติ, หมายเหตุ
   - ปุ่ม Save / บันทึกการยืม
   - หลังบันทึกจะกลับไปหน้า QR `item.html?id=<asset_code>`

4. Database
   - เพิ่ม field ใน `BorrowLog`: `borrower_position`, `expected_return_date`, `approver_name`
   - migration: `20260710103000_add_borrow_form_fields`
