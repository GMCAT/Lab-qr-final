import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { upload, issueUpload, maintenanceUpload, decodeOriginalFilename, normalizeFileType } from '../config/uploads.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdminLike, requireSuperAdmin, requirePermission, hasPermission } from '../middlewares/auth.js';
import { userSafeSelect, userTokenPayload } from '../services/users.js';
import { itemInclude, findItemByCodeOrId as findItem, findPublicItemByCodeOrId, publicItemCardSelect } from '../services/items.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { safeErrorMessage } from '../middlewares/errors.js';

async function findItemByCodeOrId(codeOrId) {
  return findItem(prisma, codeOrId);
}

// ===== AUTH ROUTES =====

export function registerApplicationRoutes(app) {

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.verification_status === 'pending') {
      return res.status(403).json({ error: 'บัญชีของคุณกำลังรอผู้ดูแลระบบยืนยัน' });
    }
    if (user.verification_status === 'suspended') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const payload = userTokenPayload(user);
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });

    res.json({ token, user: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});


app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const position = String(req.body.position || '').trim() || null;
    const departmentLab = String(req.body.department_lab || '').trim() || null;
    const phone = String(req.body.phone || '').trim() || null;
    const birthDate = parseOptionalDate(req.body.birth_date);

    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
    if (!email) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
    if (password.length < 6 || password.length > 21) return res.status(400).json({ error: 'รหัสผ่านต้องมี 6-21 ตัวอักษร' });
    if (birthDate === undefined) return res.status(400).json({ error: 'วันเดือนปีเกิดไม่ถูกต้อง' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณา Login แทน' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: 'user',
        position,
        department_lab: departmentLab,
        birth_date: birthDate,
        phone,
        registration_source: 'self',
        verification_status: 'pending'
      }
    });
    res.status(201).json({ success: true, pending_verification: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'สมัครสมาชิกไม่สำเร็จ' });
  }
});

// ให้ frontend เรียกตอนเปิดแอปมาเช็คว่า token ที่เก็บไว้ยังใช้ได้อยู่ไหม
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');
    if (newPassword.length < 6 || newPassword.length > 21) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมี 6-21 ตัวอักษร' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    if (await bcrypt.compare(newPassword, user.password_hash)) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน' });
    await prisma.user.update({ where: { id: user.id }, data: { password_hash: await bcrypt.hash(newPassword, 10), must_change_password: false, token_version: { increment: 1 } } });
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ' });
  }
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const position = String(req.body.position || '').trim() || null;
    const departmentLab = String(req.body.department_lab || '').trim() || null;
    const phone = String(req.body.phone || '').trim() || null;
    const birthDate = parseOptionalDate(req.body.birth_date);
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
    if (name.length > 200 || [position, departmentLab, phone].some(value => value && value.length > 200)) return res.status(400).json({ error: 'ข้อมูลโปรไฟล์ยาวเกินกำหนด' });
    if (birthDate === undefined) return res.status(400).json({ error: 'วันเดือนปีเกิดไม่ถูกต้อง' });
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name, position, department_lab: departmentLab, phone, birth_date: birthDate }, select: userSafeSelect() });
    res.json({ success: true, message: 'บันทึกโปรไฟล์เรียบร้อยแล้ว', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'บันทึกโปรไฟล์ไม่สำเร็จ' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const generic = { success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ ระบบได้สร้างคำขอรีเซ็ตรหัสผ่านแล้ว' };
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verification_status === 'suspended') return res.json(generic);
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { password_reset_token_hash: crypto.createHash('sha256').update(token).digest('hex'), password_reset_expires_at: new Date(Date.now() + 30 * 60 * 1000) } });
    const delivery = await sendPasswordResetEmail({ email:user.email, name:user.name, token });
    // Development returns the one-time token so the project works without an email provider.
    // Production must deliver it through the organization's email service and never return it.
    res.json({ ...generic, delivered:delivery.delivered, ...(env.isProduction ? {} : { reset_token: token }) });
  } catch (error) {
    console.error(error);
    res.json(generic);
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (password.length < 6 || password.length > 21) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมี 6-21 ตัวอักษร' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { password_reset_token_hash: tokenHash, password_reset_expires_at: { gt: new Date() } } });
    if (!user) return res.status(400).json({ error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ' });
    await prisma.user.update({ where: { id: user.id }, data: { password_hash: await bcrypt.hash(password, 10), password_reset_token_hash: null, password_reset_expires_at: null, must_change_password: false, token_version: { increment: 1 } } });
    res.json({ success: true, message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'รีเซ็ตรหัสผ่านไม่สำเร็จ' });
  }
});


// GET /api/public/items/:id - หน้า QR ใช้ endpoint นี้ได้โดยไม่ต้อง login
app.get('/api/public/items/:id', async (req, res) => {
  try {
    const item = await findPublicItemByCodeOrId(prisma, req.params.id);
    if (!item) {
      console.warn(`[PUBLIC GET] ไม่พบอุปกรณ์ที่ asset_code/id = "${req.params.id}"`);
      return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/public/catalog', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().slice(0,100);
    const categoryId = Number(req.query.category_id) || null;
    const sort = ['code-asc','code-desc','name-asc','name-desc','updated-desc'].includes(req.query.sort) ? req.query.sort : 'code-asc';
    const orderBy = sort === 'code-desc' ? {asset_code:'desc'} : sort === 'name-asc' ? {name:'asc'} : sort === 'name-desc' ? {name:'desc'} : sort === 'updated-desc' ? {updated_at:'desc'} : {asset_code:'asc'};
    const where = { archived_at:null, ...(categoryId ? {category_id:categoryId} : {}), ...(search ? {OR:[{asset_code:{contains:search,mode:'insensitive'}},{name:{contains:search,mode:'insensitive'}},{model:{contains:search,mode:'insensitive'}}]} : {}) };
    const [items,categories] = await Promise.all([prisma.item.findMany({where,select:publicItemCardSelect(),orderBy,take:200}),prisma.category.findMany({orderBy:{name:'asc'}})]);
    res.json({ success:true, data:{items,categories}, meta:{count:items.length,limit:200,filters:{search,category_id:categoryId,sort}} });
  } catch (error) { console.error(error); res.status(500).json({ success:false, error:{code:'CATALOG_LOAD_FAILED',message:'โหลดรายการอุปกรณ์ไม่สำเร็จ'} }); }
});

// GET /api/items - ดึงทั้งหมด (ต้องล็อกอิน ไม่ว่า role ไหนก็ดูได้)
app.get('/api/items', authenticate, requireAdminLike, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { archived_at: null },
      include: itemInclude()
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/qr-batch/export-event', authenticate, requirePermission('can_manage_items', 'QR Batch Export'), (req, res) => {
  const format = ['zip', 'print'].includes(req.body?.format) ? req.body.format : null;
  const itemCodes = Array.isArray(req.body?.item_codes) ? req.body.item_codes.map(value => String(value).slice(0, 100)).slice(0, 500) : [];
  if (!format || !itemCodes.length) return res.status(400).json({ error: 'ข้อมูลการส่งออก QR ไม่ถูกต้อง' });
  res.json({ success: true, format, count: itemCodes.length });
});

// GET /api/items/:id - ดึง 1 ชิ้น (ค้นด้วย asset_code เพื่อให้ตรงกับ PUT/DELETE
// และตรงกับที่หน้าเว็บส่งมาจาก QR code / ปุ่มแก้ไข ซึ่งใช้ asset_code เสมอ)
app.get('/api/items/:id', authenticate, async (req, res) => {
  try {
    const item = await findItemByCodeOrId(req.params.id);
    if (!item) {
      console.warn(`[GET] ไม่พบอุปกรณ์ที่ asset_code/id = "${req.params.id}"`);
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/items - สร้างใหม่ (admin เท่านั้น)
app.post('/api/items', authenticate, requirePermission('can_manage_items', 'เพิ่มอุปกรณ์'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (typeof data.asset_code === 'string') data.asset_code = data.asset_code.trim();
    const item = await prisma.item.create({ data });
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: safeErrorMessage(e, 'เพิ่มอุปกรณ์ไม่สำเร็จ') });
  }
});

const IMPORT_COLUMNS = ['asset_code', 'name', 'brand', 'location', 'status', 'category', 'model', 'serial_no', 'size', 'purchase_date', 'price', 'note'];

function normalizeImportText(value) { return String(value ?? '').trim(); }
function importDate(value) {
  if (value === '' || value === null || value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function validateImportRows(rows, uploader) {
  if (!Array.isArray(rows) || !rows.length) return { fatal: 'ไม่พบข้อมูลสำหรับ Import', rows: [] };
  if (rows.length > 1000) return { fatal: 'Import ได้สูงสุด 1,000 แถวต่อครั้ง', rows: [] };
  const [brands, locations, statuses, categories, existing] = await Promise.all([
    prisma.brand.findMany(), prisma.location.findMany(), prisma.status.findMany(), prisma.category.findMany(),
    prisma.item.findMany({ select: { asset_code: true, serial_no: true } })
  ]);
  const mapByName = list => new Map(list.map(x => [x.name.trim().toLowerCase(), x]));
  const brandMap = mapByName(brands), locationMap = mapByName(locations), statusMap = mapByName(statuses), categoryMap = mapByName(categories);
  const existingCodes = new Set(existing.map(x => x.asset_code.toLowerCase()));
  const batchCodes = new Set();
  return { rows: rows.map((raw, index) => {
    const row = Object.fromEntries(IMPORT_COLUMNS.map(key => [key, normalizeImportText(raw?.[key])]));
    const errors = [];
    const codeKey = row.asset_code.toLowerCase();
    if (!row.asset_code) errors.push('ต้องมี asset_code');
    else if (existingCodes.has(codeKey)) errors.push('asset_code มีอยู่ในระบบแล้ว');
    else if (batchCodes.has(codeKey)) errors.push('asset_code ซ้ำในไฟล์');
    batchCodes.add(codeKey);
    if (!row.name) errors.push('ต้องมี name');
    const brand = brandMap.get(row.brand.toLowerCase()); if (!brand) errors.push('ไม่พบ brand ในข้อมูลตั้งค่า');
    const location = locationMap.get(row.location.toLowerCase()); if (!location) errors.push('ไม่พบ location ในข้อมูลตั้งค่า');
    const status = statusMap.get(row.status.toLowerCase()); if (!status) errors.push('ไม่พบ status ในข้อมูลตั้งค่า');
    const category = row.category ? categoryMap.get(row.category.toLowerCase()) : null; if (row.category && !category) errors.push('ไม่พบ category ในข้อมูลตั้งค่า');
    const purchaseDate = importDate(row.purchase_date); if (purchaseDate === undefined) errors.push('purchase_date ไม่ถูกต้อง');
    const price = row.price === '' ? null : Number(row.price); if (price !== null && (!Number.isFinite(price) || price < 0)) errors.push('price ต้องเป็นเลขตั้งแต่ 0 ขึ้นไป');
    return { row_number: index + 2, source: row, errors, valid: errors.length === 0, data: errors.length ? null : {
      asset_code: row.asset_code, name: row.name, brand_id: brand.id, location_id: location.id, status_id: status.id,
      responsible_id: uploader.id, category_id: category?.id || null, model: row.model || null, serial_no: row.serial_no || null,
      size: row.size || null, purchase_date: purchaseDate, price, note: row.note || null
    }};
  }) };
}

app.post('/api/import/items/preview', authenticate, requirePermission('can_manage_items', 'Import Excel'), async (req, res) => {
  try {
    const checked = await validateImportRows(req.body.rows, req.user);
    if (checked.fatal) return res.status(400).json({ error: checked.fatal });
    res.json({ total: checked.rows.length, valid: checked.rows.filter(x => x.valid).length, invalid: checked.rows.filter(x => !x.valid).length, rows: checked.rows.map(({ data, ...row }) => row) });
  } catch (error) { console.error(error); res.status(500).json({ error: 'ตรวจสอบไฟล์ Import ไม่สำเร็จ' }); }
});

app.post('/api/import/items/commit', authenticate, requirePermission('can_manage_items', 'Import Excel'), async (req, res) => {
  try {
    const checked = await validateImportRows(req.body.rows, req.user);
    if (checked.fatal) return res.status(400).json({ error: checked.fatal });
    const invalid = checked.rows.filter(x => !x.valid);
    if (invalid.length) return res.status(409).json({ error: 'ข้อมูลเปลี่ยนหรือยังมีแถวไม่ถูกต้อง กรุณา Preview ใหม่', invalid: invalid.map(({ data, ...row }) => row) });
    const created = await prisma.$transaction(checked.rows.map(row => prisma.item.create({ data: row.data, select: { id: true, asset_code: true, name: true } })));
    res.json({ success: true, imported: created.length, items: created, imported_by: { id: req.user.id, name: req.user.name, email: req.user.email } });
  } catch (error) { console.error(error); res.status(400).json({ error: safeErrorMessage(error, 'Import ไม่สำเร็จ ข้อมูลทั้งหมดถูกยกเลิก') }); }
});

// PUT /api/items/:code - แก้ไข (admin เท่านั้น)
app.put('/api/items/:code', authenticate, requirePermission('can_manage_items', 'แก้ไขอุปกรณ์'), async (req, res) => {
  const { code } = req.params;
  try {
    const data = { ...req.body };
    // สถานะอุปกรณ์เป็นผลของ workflow ยืม-คืน/แจ้งเสีย/บำรุงรักษา ห้ามแก้ผ่านฟอร์มทั่วไป
    delete data.status_id;
    if (typeof data.asset_code === 'string') data.asset_code = data.asset_code.trim();
    const updated = await prisma.item.update({
      where: { asset_code: code },
      data
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      console.warn(`[PUT] ไม่พบอุปกรณ์ที่ asset_code = "${code}"`);
      return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// DELETE /api/items/:code (admin เท่านั้น)
app.delete('/api/items/:code', authenticate, requirePermission('can_manage_items', 'ลบอุปกรณ์'), async (req, res) => {
  const { code } = req.params;
  try {
    const deleted = await prisma.item.update({
      where: { asset_code: code, archived_at: null },
      data: { archived_at: new Date(), archived_by_id: req.user.id }
    });
    res.json({ success: true, message: 'เก็บอุปกรณ์เข้าคลังแล้ว ประวัติทั้งหมดถูกเก็บรักษาไว้', data: deleted });
  } catch (error) {
    // ดัก Error P2025 = หา record ไม่เจอ
    if (error.code === 'P2025') {
      console.warn(`[DELETE] ไม่พบอุปกรณ์ที่ asset_code = "${code}"`);
      return res.status(404).json({
        success: false,
        message: `ไม่พบอุปกรณ์รหัส ${code} อาจถูกลบไปแล้ว`
      });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
  }
});

// GET /api/items/:id/qr - เจน QR เป็น PNG
app.get('/api/items/:id/qr', async (req, res) => {
  try {
    const item = await findItemByCodeOrId(req.params.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });

    const publicBaseUrl = process.env.PUBLIC_ITEM_BASE_URL || `${req.protocol}://${req.get('host')}/item.html`;
    const url = `${publicBaseUrl}?id=${encodeURIComponent(item.asset_code)}`;

    res.setHeader('Content-Type', 'image/png');
    QRCode.toFileStream(res, url, { width: 400, margin: 2 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// POST /api/items/:id/files - อัปโหลดไฟล์ (admin เท่านั้น)
app.post('/api/items/:id/files', authenticate, requirePermission('can_manage_items', 'อัปโหลดไฟล์อุปกรณ์'), upload.array('files', 20), async (req, res) => {
  try {
    const uploadedFiles = req.files || [];
    if (!uploadedFiles.length) return res.status(400).json({ error: 'No file uploaded' });

    const item = await findItemByCodeOrId(req.params.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });

    const existingCount = await prisma.itemFile.count({ where: { item_id: item.id } });

    const created = await Promise.all(uploadedFiles.map((file, index) => {
      const fileType = req.body.file_type || normalizeFileType(file);
      const isCover = String(req.body.is_cover || '').toLowerCase() === 'true' && index === 0;

      return prisma.itemFile.create({
        data: {
          item_id: item.id,
          file_name: decodeOriginalFilename(file.originalname),
          file_url: `/uploads/${file.filename}`,
          file_type: fileType,
          is_cover: isCover,
          sort_order: Number(req.body.sort_order || existingCount + index)
        }
      });
    }));

    res.json({ success: true, files: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ลบไฟล์ของอุปกรณ์ (admin เท่านั้น)
app.delete('/api/item-files/:fileId', authenticate, requirePermission('can_manage_items', 'ลบไฟล์อุปกรณ์'), async (req, res) => {
  try {
    const file = await prisma.itemFile.delete({ where: { id: Number(req.params.fileId) } });
    res.json({ success: true, file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete file failed' });
  }
});


// ===== BORROW ROUTES =====

async function getStatusIdByName(name) {
  const status = await prisma.status.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  return status?.id || null;
}

function normalizeApprovalStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['pending', 'approved', 'rejected'].includes(v)) return v;
  return null;
}

function normalizeReturnStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['not_requested', 'pending', 'completed', 'rejected', 'damaged'].includes(v)) return v;
  return null;
}

function normalizeReturnCondition(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['normal', 'damaged'].includes(v)) return v;
  return null;
}

function statusHistoryData(req, eventType, fromStatus, toStatus, reason = null, note = null) {
  return {
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
    reason,
    note,
    changed_by_id: req.user?.id || null,
    changed_by_name: req.user?.name || req.user?.email || 'system'
  };
}

async function generateBorrowRequestSn() {
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');

  for (let i = 0; i < 20; i++) {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const sn = `BR-${ymd}-${random}`;
    const exists = await prisma.borrowLog.findUnique({ where: { request_sn: sn } });
    if (!exists) return sn;
  }
  return `BR-${Date.now()}`;
}

function parseOptionalDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

async function setItemStatusIfExists(itemId, statusName) {
  const statusId = await getStatusIdByName(statusName);
  if (!statusId) return null;
  return prisma.item.update({ where: { id: itemId }, data: { status_id: statusId } });
}

// POST /api/items/:id/borrow - ส่งคำขอยืมอุปกรณ์ (user/staff/admin ใช้ได้)
app.post('/api/items/:id/borrow', authenticate, async (req, res) => {
  try {
    const item = await findItemByCodeOrId(req.params.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });

    // กันยืมซ้ำ ถ้ามีคำขอรออนุมัติ หรือมีรายการที่อนุมัติแล้วแต่ยังไม่คืน
    const activeBorrow = await prisma.borrowLog.findFirst({
      where: {
        item_id: item.id,
        return_date: null,
        approval_status: { in: ['pending', 'approved'] }
      },
      orderBy: { borrow_date: 'desc' }
    });
    if (activeBorrow) {
      const msg = activeBorrow.approval_status === 'pending'
        ? 'อุปกรณ์นี้มีคำขอยืมรออนุมัติอยู่แล้ว'
        : 'อุปกรณ์นี้กำลังถูกยืมอยู่ ยังไม่สามารถยืมซ้ำได้';
      return res.status(400).json({ error: msg });
    }

    const borrowerName = String(req.body.borrower_name || req.user?.name || '').trim();
    if (!borrowerName) return res.status(400).json({ error: 'ไม่พบชื่อผู้ยืม' });

    const note = String(req.body.note || '').trim() || null;
    const borrowerPosition = String(req.body.borrower_position || req.user?.position || '').trim() || null;
    const approverName = String(req.body.approver_name || '').trim() || null;
    let expectedReturnDate = null;
    if (req.body.expected_return_date) {
      const parsed = new Date(String(req.body.expected_return_date));
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'วันที่คืนไม่ถูกต้อง' });
      }
      expectedReturnDate = parsed;
    }

    const pendingStatusId = await getStatusIdByName('รอดำเนินการ');
    if (!pendingStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “รอดำเนินการ” ในระบบ' });
    const requestSn = await generateBorrowRequestSn();
    const borrowLog = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${item.id}))`;
      const concurrentBorrow = await tx.borrowLog.findFirst({ where: { item_id:item.id, return_date:null, approval_status:{in:['pending','approved']} } });
      if (concurrentBorrow) {
        const conflict = new Error('อุปกรณ์นี้มีคำขอยืมหรือกำลังถูกยืมอยู่แล้ว');
        conflict.code = 'BORROW_CONFLICT';
        throw conflict;
      }
      const created = await tx.borrowLog.create({
        data: {
          request_sn: requestSn,
          borrower_user_id: req.user?.id || null,
          item_id: item.id,
          borrower_name: borrowerName,
          borrower_position: borrowerPosition,
          expected_return_date: expectedReturnDate,
          approver_name: approverName,
          approval_status: 'pending',
          note,
          status_history: {
            create: statusHistoryData(req, 'borrow_requested', null, 'approval:pending', null, note)
          }
        }
      });
      await tx.item.update({ where: { id: item.id }, data: { status_id: pendingStatusId } });
      return created;
    });

    const updatedItem = await findItemByCodeOrId(item.asset_code);
    res.json({ success: true, message: 'ส่งคำขอยืมสำเร็จ รอผู้มีสิทธิ์อนุมัติ', borrow_log: borrowLog, item: updatedItem });
  } catch (error) {
    console.error(error);
    if (error.code === 'BORROW_CONFLICT') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: 'ส่งคำขอยืมไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/user-borrow-document - User upload แบบฟอร์มยืมที่ export/ลงชื่อแล้ว
app.post('/api/borrow-logs/:id/user-borrow-document', authenticate, upload.single('borrow_document'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสคำขอยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบคำขอยืม' });
    if (current.approval_status !== 'pending') return res.status(400).json({ error: 'อัปโหลดได้เฉพาะคำขอที่รอดำเนินการ' });

    const isOwner = current.borrower_user_id && current.borrower_user_id === req.user.id;
    const sameNameFallback = !current.borrower_user_id && current.borrower_name === req.user.name;
    if (!isOwner && !sameNameFallback && !hasPermission(req.user, 'can_approve_borrow')) {
      return res.status(403).json({ error: 'อัปโหลดได้เฉพาะเจ้าของคำขอ หรือ Admin ที่มีสิทธิ์อนุมัติ' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'กรุณาเลือกแบบฟอร์มยืมอุปกรณ์' });

    const borrowLog = await prisma.borrowLog.update({
      where: { id },
      data: {
        borrow_document_file_name: decodeOriginalFilename(file.originalname),
        borrow_document_file_url: `/uploads/${file.filename}`
      },
      include: {
        item: {
          include: {
            brand: true,
            status: true,
            location: true,
            files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] }
          }
        }
      }
    });

    res.json({ success: true, borrow_log: borrowLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'อัปโหลดแบบฟอร์มยืมไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/documents - Admin upload เอกสารคำขอยืม/คืนก่อนอนุมัติ
app.post('/api/borrow-logs/:id/documents', authenticate, requirePermission('can_approve_borrow', 'อัปโหลดเอกสารคำขอยืม'), upload.fields([
  { name: 'borrow_document', maxCount: 1 },
  { name: 'return_document', maxCount: 1 }
]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสคำขอยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'ไม่พบคำขอยืม' });
    if (current.approval_status !== 'pending') return res.status(400).json({ error: 'อัปโหลดเอกสารได้เฉพาะรายการรออนุมัติ' });

    const borrowDoc = req.files?.borrow_document?.[0];
    const returnDoc = req.files?.return_document?.[0];
    if (!borrowDoc && !returnDoc) return res.status(400).json({ error: 'กรุณาเลือกเอกสารอย่างน้อย 1 ไฟล์' });

    const data = {};
    if (borrowDoc) {
      data.borrow_document_file_name = decodeOriginalFilename(borrowDoc.originalname);
      data.borrow_document_file_url = `/uploads/${borrowDoc.filename}`;
    }
    if (returnDoc) {
      data.return_document_file_name = decodeOriginalFilename(returnDoc.originalname);
      data.return_document_file_url = `/uploads/${returnDoc.filename}`;
    }

    const borrowLog = await prisma.borrowLog.update({
      where: { id },
      data,
      include: {
        item: { include: { brand: true, status: true, location: true, files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] } } }
      }
    });
    res.json({ success: true, borrow_log: borrowLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'อัปโหลดเอกสารคำขอยืมไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/approve - อนุมัติคำขอยืม
app.post('/api/borrow-logs/:id/approve', authenticate, requirePermission('can_approve_borrow', 'อนุมัติการยืม'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสคำขอยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบคำขอยืม' });
    if (current.approval_status !== 'pending') return res.status(400).json({ error: 'คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ' });
    if (!current.borrow_document_file_url) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดแบบฟอร์มยืมอุปกรณ์ก่อนอนุมัติ' });
    }

    const activeApproved = await prisma.borrowLog.findFirst({
      where: {
        item_id: current.item_id,
        id: { not: id },
        approval_status: 'approved',
        return_date: null
      }
    });
    if (activeApproved) return res.status(400).json({ error: 'อุปกรณ์นี้มีรายการยืมที่อนุมัติแล้วและยังไม่คืน' });

    const borrowedStatusId = await getStatusIdByName('ระหว่างยืม');
    if (!borrowedStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “ระหว่างยืม” ในระบบ' });
    const approver = req.user?.name || req.user?.email || 'admin';
    const now = new Date();
    const borrowLog = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.item_id}))`;
      const latest = await tx.borrowLog.findUnique({ where:{id} });
      if (!latest || latest.approval_status !== 'pending') {
        const conflict = new Error('คำขอนี้ถูกดำเนินการไปแล้ว'); conflict.code = 'WORKFLOW_CONFLICT'; throw conflict;
      }
      const conflicting = await tx.borrowLog.findFirst({ where:{item_id:current.item_id,id:{not:id},approval_status:'approved',return_date:null} });
      if (conflicting) { const conflict = new Error('อุปกรณ์นี้มีรายการยืมที่อนุมัติแล้วและยังไม่คืน'); conflict.code = 'WORKFLOW_CONFLICT'; throw conflict; }
      const updated = await tx.borrowLog.update({
        where: { id },
        data: {
          approval_status: 'approved',
          approved_at: now,
          approved_by_id: req.user.id,
          approved_by_name: approver,
          approver_name: current.approver_name || approver
        }
      });
      await tx.item.update({ where: { id: current.item_id }, data: { status_id: borrowedStatusId } });
      await tx.borrowStatusHistory.create({
        data: { borrow_log_id: id, ...statusHistoryData(req, 'borrow_approved', 'approval:pending', 'approval:approved') }
      });
      return updated;
    });
    const item = await findItemByCodeOrId(current.item.asset_code);
    res.json({ success: true, message: 'อนุมัติคำขอยืมสำเร็จ', borrow_log: borrowLog, item });
  } catch (error) {
    console.error(error);
    if (error.code === 'WORKFLOW_CONFLICT') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: 'อนุมัติคำขอยืมไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/reject - ปฏิเสธคำขอยืม
app.post('/api/borrow-logs/:id/reject', authenticate, requirePermission('can_approve_borrow', 'ปฏิเสธคำขอยืม'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสคำขอยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบคำขอยืม' });
    if (current.approval_status !== 'pending') return res.status(400).json({ error: 'คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ' });

    const rejecter = req.user?.name || req.user?.email || 'admin';
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' });

    const stillActive = await prisma.borrowLog.findFirst({
      where: {
        item_id: current.item_id,
        id: { not: id },
        return_date: null,
        approval_status: { in: ['pending', 'approved'] }
      }
    });
    const operations = [
      prisma.borrowLog.update({
        where: { id },
        data: {
          approval_status: 'rejected',
          rejected_at: new Date(),
          rejected_by_id: req.user.id,
          rejected_by_name: rejecter,
          reject_reason: reason
        }
      }),
      prisma.borrowStatusHistory.create({
        data: { borrow_log_id: id, ...statusHistoryData(req, 'borrow_rejected', 'approval:pending', 'approval:rejected', reason) }
      })
    ];
    if (!stillActive) {
      const availableStatusId = await getStatusIdByName('ใช้งานได้');
      if (!availableStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “ใช้งานได้” ในระบบ' });
      operations.push(prisma.item.update({ where: { id: current.item_id }, data: { status_id: availableStatusId } }));
    }
    const [borrowLog] = await prisma.$transaction(operations);

    const item = await findItemByCodeOrId(current.item.asset_code);
    res.json({ success: true, message: 'ปฏิเสธคำขอยืมสำเร็จ', borrow_log: borrowLog, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ปฏิเสธคำขอยืมไม่สำเร็จ' });
  }
});

// GET /api/my-borrows - User ดูรายการยืมของตนเอง (ยึด user id เท่านั้นเพื่อป้องกันข้อมูลรั่วจากชื่อซ้ำ)
app.get('/api/my-borrows', authenticate, async (req, res) => {
  try {
    const logs = await prisma.borrowLog.findMany({
      where: { borrower_user_id: req.user.id },
      orderBy: { borrow_date: 'desc' },
      take: 100,
      include: {
        status_history: { orderBy: { changed_at: 'asc' } },
        item: {
          include: {
            brand: true,
            status: true,
            location: true,
            files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] }
          }
        }
      }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลดรายการยืมของฉันไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/return-request - User/Admin แจ้งคืนและรอ Admin ตรวจรับ
app.post('/api/borrow-logs/:id/return-request', authenticate, upload.single('return_document'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสประวัติการยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบประวัติการยืม' });
    if (current.return_date) return res.status(400).json({ error: 'รายการนี้คืนแล้ว' });
    if (current.approval_status !== 'approved') return res.status(400).json({ error: 'แจ้งคืนได้เฉพาะรายการที่อนุมัติแล้วเท่านั้น' });
    if (current.return_status === 'pending') return res.status(409).json({ error: 'รายการนี้แจ้งคืนและกำลังรอตรวจรับอยู่แล้ว' });
    if (['completed', 'damaged'].includes(current.return_status)) return res.status(409).json({ error: 'รายการนี้ปิดการคืนแล้ว' });

    const isOwner = current.borrower_user_id === req.user.id;
    if (!isOwner && !hasPermission(req.user, 'can_approve_borrow')) {
      return res.status(403).json({ error: 'แจ้งคืนได้เฉพาะเจ้าของรายการ หรือ Admin ที่มีสิทธิ์อนุมัติ' });
    }

    const waitingStatusId = await getStatusIdByName('รอตรวจรับคืน');
    if (!waitingStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “รอตรวจรับคืน” กรุณารัน database migration ก่อน' });

    const condition = normalizeReturnCondition(req.body?.condition) || 'normal';
    const note = String(req.body?.note || '').trim() || null;
    const file = req.file;
    const data = {
      return_status: 'pending',
      return_requested_at: new Date(),
      return_requested_by_id: req.user.id,
      return_note: note,
      return_condition: condition,
      return_reject_reason: null
    };
    if (file) {
      data.return_document_file_name = decodeOriginalFilename(file.originalname);
      data.return_document_file_url = `/uploads/${file.filename}`;
    }

    const [borrowLog] = await prisma.$transaction([
      prisma.borrowLog.update({ where: { id }, data }),
      prisma.item.update({ where: { id: current.item_id }, data: { status_id: waitingStatusId } }),
      prisma.borrowStatusHistory.create({
        data: {
          borrow_log_id: id,
          ...statusHistoryData(
            req,
            'return_requested',
            `return:${current.return_status || 'not_requested'}`,
            'return:pending',
            null,
            note
          )
        }
      })
    ]);
    const item = await findItemByCodeOrId(current.item.asset_code);
    res.json({ success: true, message: 'แจ้งคืนสำเร็จ รอ Admin ตรวจรับ', borrow_log: borrowLog, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'แจ้งคืนอุปกรณ์ไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/verify-return - Admin ตรวจรับและปิด BorrowLog
app.post('/api/borrow-logs/:id/verify-return', authenticate, requirePermission('can_approve_borrow', 'ตรวจรับคืนอุปกรณ์'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสประวัติการยืมไม่ถูกต้อง' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบประวัติการยืม' });
    if (current.return_status !== 'pending' || current.return_date) {
      return res.status(409).json({ error: 'ตรวจรับได้เฉพาะรายการที่รอตรวจรับคืน' });
    }

    const condition = normalizeReturnCondition(req.body?.condition);
    if (!condition) return res.status(400).json({ error: 'สภาพอุปกรณ์ต้องเป็น normal หรือ damaged' });
    const targetStatusName = condition === 'damaged' ? 'เสีย' : 'ใช้งานได้';
    const targetStatusId = await getStatusIdByName(targetStatusName);
    if (!targetStatusId) return res.status(409).json({ error: `ไม่พบสถานะ “${targetStatusName}” ในระบบ` });

    const now = new Date();
    const verifier = req.user?.name || req.user?.email || 'admin';
    const note = String(req.body?.note || '').trim() || current.return_note;
    const [borrowLog] = await prisma.$transaction([
      prisma.borrowLog.update({
        where: { id },
        data: {
          return_status: condition === 'damaged' ? 'damaged' : 'completed',
          return_condition: condition,
          return_note: note,
          return_date: now,
          return_verified_at: now,
          return_verified_by_id: req.user.id,
          return_verified_by_name: verifier,
          closed_at: now
        }
      }),
      prisma.item.update({ where: { id: current.item_id }, data: { status_id: targetStatusId } }),
      prisma.borrowStatusHistory.create({
        data: {
          borrow_log_id: id,
          ...statusHistoryData(
            req,
            condition === 'damaged' ? 'return_verified_damaged' : 'return_verified',
            'return:pending',
            `return:${condition === 'damaged' ? 'damaged' : 'completed'}`,
            null,
            note
          )
        }
      })
    ]);

    const item = await findItemByCodeOrId(current.item.asset_code);
    res.json({ success: true, message: 'ตรวจรับและปิดรายการยืมสำเร็จ', borrow_log: borrowLog, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ตรวจรับคืนอุปกรณ์ไม่สำเร็จ' });
  }
});

// POST /api/borrow-logs/:id/reject-return - Admin ตีกลับคำขอคืนให้แก้ไข
app.post('/api/borrow-logs/:id/reject-return', authenticate, requirePermission('can_approve_borrow', 'ตีกลับคำขอคืน'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสประวัติการยืมไม่ถูกต้อง' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ตีกลับ' });

    const current = await prisma.borrowLog.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบประวัติการยืม' });
    if (current.return_status !== 'pending' || current.return_date) {
      return res.status(409).json({ error: 'ตีกลับได้เฉพาะรายการที่รอตรวจรับคืน' });
    }

    const borrowedStatusId = await getStatusIdByName('ระหว่างยืม');
    if (!borrowedStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “ระหว่างยืม” ในระบบ' });
    const verifier = req.user?.name || req.user?.email || 'admin';
    const [borrowLog] = await prisma.$transaction([
      prisma.borrowLog.update({
        where: { id },
        data: {
          return_status: 'rejected',
          return_reject_reason: reason,
          return_verified_at: new Date(),
          return_verified_by_id: req.user.id,
          return_verified_by_name: verifier
        }
      }),
      prisma.item.update({ where: { id: current.item_id }, data: { status_id: borrowedStatusId } }),
      prisma.borrowStatusHistory.create({
        data: {
          borrow_log_id: id,
          ...statusHistoryData(req, 'return_request_rejected', 'return:pending', 'return:rejected', reason)
        }
      })
    ]);

    const item = await findItemByCodeOrId(current.item.asset_code);
    res.json({ success: true, message: 'ตีกลับคำขอคืนแล้ว', borrow_log: borrowLog, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ตีกลับคำขอคืนไม่สำเร็จ' });
  }
});

// Legacy route: ห้ามปิด BorrowLog ทันที เพื่อคง workflow ตรวจรับแบบสองขั้น
app.post('/api/borrow-logs/:id/return', authenticate, (_req, res) => {
  res.status(410).json({ error: 'Endpoint นี้ยกเลิกแล้ว กรุณาใช้ return-request และ verify-return' });
});

// GET /api/borrow-logs - ดูรายการยืม/คำขออนุมัติ
app.get('/api/borrow-logs', authenticate, requirePermission('can_approve_borrow', 'ดูรายการยืม'), async (req, res) => {
  try {
    const status = normalizeApprovalStatus(req.query.approval_status);
    const returnStatus = normalizeReturnStatus(req.query.return_status);
    const where = {};
    if (status) where.approval_status = status;
    if (returnStatus) where.return_status = returnStatus;
    const logs = await prisma.borrowLog.findMany({
      where,
      orderBy: { borrow_date: 'desc' },
      take: 300,
      include: {
        status_history: { orderBy: { changed_at: 'asc' } },
        item: {
          include: {
            brand: true,
            status: true,
            location: true,
            files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] }
          }
        }
      }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลดรายการยืมไม่สำเร็จ' });
  }
});

// ===== ISSUE REPORT ROUTES =====

function issueInclude() {
  return {
    item: {
      include: {
        brand: true,
        status: true,
        location: true,
        files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] }
      }
    },
    status_history: { orderBy: { changed_at: 'asc' } }
  };
}

function issueHistoryData(req, eventType, fromStatus, toStatus, reason = null, note = null) {
  return {
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
    reason,
    note,
    changed_by_id: req.user?.id || null,
    changed_by_name: req.user?.name || req.user?.email || 'system'
  };
}

async function generateIssueSn() {
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');
  for (let i = 0; i < 20; i += 1) {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const issueSn = `IR-${ymd}-${random}`;
    if (!await prisma.issueReport.findUnique({ where: { issue_sn: issueSn } })) return issueSn;
  }
  return `IR-${Date.now()}`;
}

function normalizeIssueStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['pending', 'confirmed', 'repair', 'rejected', 'resolved'].includes(status) ? status : null;
}

// POST /api/items/:id/issues - User/Admin แจ้งปัญหา โดยยังไม่เปลี่ยนสถานะอุปกรณ์
app.post('/api/items/:id/issues', authenticate, issueUpload.single('attachment'), async (req, res) => {
  try {
    const item = await findItemByCodeOrId(req.params.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });

    const issueType = String(req.body?.issue_type || '').trim();
    const severity = String(req.body?.severity || '').trim().toLowerCase();
    const description = String(req.body?.description || '').trim();
    if (!issueType) return res.status(400).json({ error: 'กรุณาเลือกประเภทปัญหา' });
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ error: 'ระดับความรุนแรงไม่ถูกต้อง' });
    }
    if (description.length < 5) return res.status(400).json({ error: 'กรุณาระบุอาการอย่างน้อย 5 ตัวอักษร' });

    const openIssue = await prisma.issueReport.findFirst({
      where: { item_id: item.id, status: { in: ['pending', 'confirmed', 'repair'] } },
      orderBy: { created_at: 'desc' }
    });
    if (openIssue) {
      return res.status(409).json({ error: `อุปกรณ์นี้มีรายการปัญหาที่ยังไม่ปิด (${openIssue.issue_sn})` });
    }

    const file = req.file;
    const issueSn = await generateIssueSn();
    const issue = await prisma.issueReport.create({
      data: {
        issue_sn: issueSn,
        item_id: item.id,
        reporter_user_id: req.user.id,
        reporter_name: req.user?.name || req.user?.email || 'user',
        issue_type: issueType,
        severity,
        description,
        attachment_file_name: file ? decodeOriginalFilename(file.originalname) : null,
        attachment_file_url: file ? `/uploads/${file.filename}` : null,
        status_history: {
          create: issueHistoryData(req, 'issue_reported', null, 'pending', null, description)
        }
      },
      include: issueInclude()
    });
    res.json({ success: true, message: 'แจ้งปัญหาสำเร็จ รอ Admin ตรวจสอบ', issue });
  } catch (error) {
    console.error(error);
    if (['P2021', 'P2022'].includes(error?.code)) {
      return res.status(503).json({ error: 'ยังไม่ได้ติดตั้งตารางระบบแจ้งปัญหา กรุณารัน npx prisma migrate deploy และ npx prisma generate แล้ว restart backend' });
    }
    res.status(500).json({ error: 'แจ้งปัญหาไม่สำเร็จ' });
  }
});

app.get('/api/my-issue-reports', authenticate, async (req, res) => {
  try {
    const issues = await prisma.issueReport.findMany({
      where: { reporter_user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 100,
      include: issueInclude()
    });
    res.json(issues);
  } catch (error) {
    console.error(error);
    if (['P2021', 'P2022'].includes(error?.code)) {
      return res.status(503).json({ error: 'ยังไม่ได้ติดตั้งตารางระบบแจ้งปัญหา กรุณารัน npx prisma migrate deploy และ npx prisma generate แล้ว restart backend' });
    }
    res.status(500).json({ error: 'โหลดรายการแจ้งปัญหาของฉันไม่สำเร็จ' });
  }
});

app.get('/api/issue-reports', authenticate, requirePermission('can_manage_items', 'ตรวจสอบรายการแจ้งปัญหา'), async (req, res) => {
  try {
    const status = normalizeIssueStatus(req.query.status);
    const issues = await prisma.issueReport.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 300,
      include: issueInclude()
    });
    res.json(issues);
  } catch (error) {
    console.error(error);
    if (['P2021', 'P2022'].includes(error?.code)) {
      return res.status(503).json({ error: 'ยังไม่ได้ติดตั้งตารางระบบแจ้งปัญหา กรุณารัน npx prisma migrate deploy และ npx prisma generate แล้ว restart backend' });
    }
    res.status(500).json({ error: 'โหลดรายการแจ้งปัญหาไม่สำเร็จ' });
  }
});

// confirmed = เสีย, repair = ส่งซ่อม, rejected = ไม่เปลี่ยนสถานะอุปกรณ์
app.post('/api/issue-reports/:id/review', authenticate, requirePermission('can_manage_items', 'ตรวจสอบรายการแจ้งปัญหา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสรายการไม่ถูกต้อง' });
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    if (!['confirmed', 'repair', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'ผลการตรวจสอบไม่ถูกต้อง' });
    }
    const reason = String(req.body?.reason || '').trim();
    const note = String(req.body?.note || '').trim() || null;
    if (decision === 'rejected' && !reason) return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ปฏิเสธ' });

    const current = await prisma.issueReport.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบรายการแจ้งปัญหา' });
    if (current.status !== 'pending') return res.status(409).json({ error: 'ตรวจสอบได้เฉพาะรายการที่รอ Admin' });

    const now = new Date();
    const reviewer = req.user?.name || req.user?.email || 'admin';
    const operations = [
      prisma.issueReport.update({
        where: { id },
        data: {
          status: decision,
          reviewed_by_id: req.user.id,
          reviewed_by_name: reviewer,
          reviewed_at: now,
          review_note: note,
          reject_reason: decision === 'rejected' ? reason : null
        }
      }),
      prisma.issueStatusHistory.create({
        data: {
          issue_report_id: id,
          ...issueHistoryData(
            req,
            decision === 'rejected' ? 'issue_rejected' : decision === 'repair' ? 'issue_sent_to_repair' : 'issue_confirmed',
            'pending',
            decision,
            decision === 'rejected' ? reason : null,
            note
          )
        }
      })
    ];
    if (decision !== 'rejected') {
      const itemStatusName = decision === 'repair' ? 'ส่งซ่อม' : 'เสีย';
      const itemStatusId = await getStatusIdByName(itemStatusName);
      if (!itemStatusId) return res.status(409).json({ error: `ไม่พบสถานะ “${itemStatusName}” ในระบบ` });
      operations.push(prisma.item.update({ where: { id: current.item_id }, data: { status_id: itemStatusId } }));
    }
    await prisma.$transaction(operations);
    const issue = await prisma.issueReport.findUnique({ where: { id }, include: issueInclude() });
    res.json({ success: true, message: 'บันทึกผลการตรวจสอบสำเร็จ', issue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ตรวจสอบรายการแจ้งปัญหาไม่สำเร็จ' });
  }
});

app.post('/api/issue-reports/:id/resolve', authenticate, requirePermission('can_manage_items', 'ปิดรายการแจ้งปัญหา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสรายการไม่ถูกต้อง' });
    const current = await prisma.issueReport.findUnique({ where: { id }, include: { item: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบรายการแจ้งปัญหา' });
    if (!['confirmed', 'repair'].includes(current.status)) {
      return res.status(409).json({ error: 'ปิดได้เฉพาะรายการที่ยืนยันปัญหาหรือส่งซ่อม' });
    }
    const openMaintenance = await prisma.maintenanceJob.findFirst({
      where: { issue_report_id: id, status: { in: ['scheduled', 'in_progress'] } }
    });
    if (openMaintenance) return res.status(409).json({ error: `รายการนี้มีงาน Maintenance ที่ยังเปิดอยู่ (${openMaintenance.work_sn})` });
    const activeBorrow = await prisma.borrowLog.findFirst({
      where: { item_id: current.item_id, approval_status: 'approved', return_date: null }
    });
    if (activeBorrow) return res.status(409).json({ error: 'อุปกรณ์ยังมี BorrowLog ที่ไม่ปิด จึงยังเปลี่ยนเป็นใช้งานได้ไม่ได้' });

    const availableStatusId = await getStatusIdByName('ใช้งานได้');
    if (!availableStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “ใช้งานได้” ในระบบ' });
    const note = String(req.body?.note || '').trim() || null;
    const now = new Date();
    await prisma.$transaction([
      prisma.issueReport.update({ where: { id }, data: { status: 'resolved', resolved_at: now, review_note: note || current.review_note } }),
      prisma.issueStatusHistory.create({
        data: { issue_report_id: id, ...issueHistoryData(req, 'issue_resolved', current.status, 'resolved', null, note) }
      }),
      prisma.item.update({ where: { id: current.item_id }, data: { status_id: availableStatusId } })
    ]);
    const issue = await prisma.issueReport.findUnique({ where: { id }, include: issueInclude() });
    res.json({ success: true, message: 'ปิดรายการและเปลี่ยนอุปกรณ์เป็นใช้งานได้แล้ว', issue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ปิดรายการแจ้งปัญหาไม่สำเร็จ' });
  }
});

// ===== MAINTENANCE / CALIBRATION ROUTES =====

function maintenanceInclude() {
  return {
    item: { include: { brand: true, status: true, location: true, files: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }] } } },
    issue_report: true,
    documents: { orderBy: { created_at: 'desc' } },
    status_history: { orderBy: { changed_at: 'asc' } }
  };
}

function normalizeMaintenanceType(value) {
  const type = String(value || '').trim().toLowerCase();
  return ['repair', 'preventive', 'calibration', 'inspection'].includes(type) ? type : null;
}

function normalizeMaintenanceStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status) ? status : null;
}

function maintenanceHistoryData(req, eventType, fromStatus, toStatus, note = null) {
  return {
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
    note,
    changed_by_id: req.user?.id || null,
    changed_by_name: req.user?.name || req.user?.email || 'system'
  };
}

async function generateMaintenanceSn() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 20; i += 1) {
    const workSn = `MT-${ymd}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (!await prisma.maintenanceJob.findUnique({ where: { work_sn: workSn } })) return workSn;
  }
  return `MT-${Date.now()}`;
}

app.get('/api/maintenance', authenticate, requirePermission('can_manage_items', 'ดูแลงานบำรุงรักษา'), async (req, res) => {
  try {
    const status = normalizeMaintenanceStatus(req.query.status);
    const type = normalizeMaintenanceType(req.query.type);
    const where = {};
    if (status) where.status = status;
    if (type) where.job_type = type;
    const jobs = await prisma.maintenanceJob.findMany({ where, orderBy: { created_at: 'desc' }, take: 300, include: maintenanceInclude() });
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลดงานบำรุงรักษาไม่สำเร็จ' });
  }
});

app.get('/api/maintenance/:id', authenticate, requirePermission('can_manage_items', 'ดูแลงานบำรุงรักษา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'รหัสงานไม่ถูกต้อง' });
    const job = await prisma.maintenanceJob.findUnique({ where: { id }, include: maintenanceInclude() });
    if (!job) return res.status(404).json({ error: 'ไม่พบงานบำรุงรักษา' });
    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลดงานบำรุงรักษาไม่สำเร็จ' });
  }
});

app.post('/api/maintenance', authenticate, requirePermission('can_manage_items', 'สร้างงานบำรุงรักษา'), maintenanceUpload.single('document'), async (req, res) => {
  try {
    const item = await findItemByCodeOrId(String(req.body?.asset_code || '').trim());
    if (!item) return res.status(404).json({ error: 'ไม่พบอุปกรณ์' });
    const jobType = normalizeMaintenanceType(req.body?.job_type);
    const title = String(req.body?.title || '').trim();
    if (!jobType) return res.status(400).json({ error: 'ประเภทงานไม่ถูกต้อง' });
    if (!title) return res.status(400).json({ error: 'กรุณาระบุชื่องาน' });

    const issueReportId = req.body?.issue_report_id ? Number(req.body.issue_report_id) : null;
    let issue = null;
    if (issueReportId) {
      issue = await prisma.issueReport.findUnique({ where: { id: issueReportId } });
      if (!issue || issue.item_id !== item.id) return res.status(400).json({ error: 'รายการแจ้งเสียไม่ตรงกับอุปกรณ์' });
      if (!['confirmed', 'repair'].includes(issue.status)) return res.status(409).json({ error: 'สร้างงานได้เฉพาะรายการแจ้งเสียที่ Admin ยืนยันแล้ว' });
    }
    const duplicate = await prisma.maintenanceJob.findFirst({ where: { item_id: item.id, job_type: jobType, status: { in: ['scheduled', 'in_progress'] } } });
    if (duplicate) return res.status(409).json({ error: `มีงานประเภทเดียวกันที่ยังเปิดอยู่ (${duplicate.work_sn})` });

    const scheduledStart = parseOptionalDate(req.body?.scheduled_start);
    const dueDate = parseOptionalDate(req.body?.due_date);
    const nextDueDate = parseOptionalDate(req.body?.next_due_date);
    if ([scheduledStart, dueDate, nextDueDate].includes(undefined)) return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' });
    const costText = String(req.body?.cost || '').trim();
    const cost = costText ? Number(costText) : null;
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return res.status(400).json({ error: 'ค่าใช้จ่ายไม่ถูกต้อง' });

    const file = req.file;
    const workSn = await generateMaintenanceSn();
    const creator = req.user?.name || req.user?.email || 'admin';
    const job = await prisma.maintenanceJob.create({
      data: {
        work_sn: workSn,
        item_id: item.id,
        issue_report_id: issueReportId,
        job_type: jobType,
        title,
        description: String(req.body?.description || '').trim() || null,
        assigned_to_id: req.body?.assigned_to_id ? Number(req.body.assigned_to_id) : null,
        assigned_to_name: String(req.body?.assigned_to_name || '').trim() || null,
        provider_name: String(req.body?.provider_name || '').trim() || null,
        provider_contact: String(req.body?.provider_contact || '').trim() || null,
        scheduled_start: scheduledStart,
        due_date: dueDate,
        cost,
        next_due_date: nextDueDate,
        created_by_id: req.user.id,
        created_by_name: creator,
        documents: file ? { create: {
          file_name: decodeOriginalFilename(file.originalname), file_url: `/uploads/${file.filename}`,
          document_type: String(req.body?.document_type || 'work_order'), uploaded_by_id: req.user.id, uploaded_by_name: creator
        } } : undefined,
        status_history: { create: maintenanceHistoryData(req, 'maintenance_created', null, 'scheduled', title) }
      },
      include: maintenanceInclude()
    });
    res.json({ success: true, message: 'สร้างงานบำรุงรักษาสำเร็จ', job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'สร้างงานบำรุงรักษาไม่สำเร็จ' });
  }
});

app.post('/api/maintenance/:id/start', authenticate, requirePermission('can_manage_items', 'เริ่มงานบำรุงรักษา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.maintenanceJob.findUnique({ where: { id }, include: { item: true, issue_report: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบงานบำรุงรักษา' });
    if (current.status !== 'scheduled') return res.status(409).json({ error: 'เริ่มได้เฉพาะงานที่วางแผนไว้' });
    const activeBorrow = await prisma.borrowLog.findFirst({ where: { item_id: current.item_id, approval_status: 'approved', return_date: null } });
    if (activeBorrow) return res.status(409).json({ error: 'อุปกรณ์ยังถูกยืมอยู่ ต้องตรวจรับคืนก่อนเริ่มงาน Maintenance' });
    const itemStatusName = current.job_type === 'repair' ? 'ส่งซ่อม' : 'อยู่ระหว่างบำรุงรักษา';
    const itemStatusId = await getStatusIdByName(itemStatusName);
    if (!itemStatusId) return res.status(409).json({ error: `ไม่พบสถานะ “${itemStatusName}” กรุณารัน migration` });
    const note = String(req.body?.note || '').trim() || null;
    await prisma.$transaction([
      prisma.maintenanceJob.update({ where: { id }, data: { status: 'in_progress', started_at: new Date() } }),
      prisma.maintenanceStatusHistory.create({ data: { maintenance_job_id: id, ...maintenanceHistoryData(req, 'maintenance_started', 'scheduled', 'in_progress', note) } }),
      prisma.item.update({ where: { id: current.item_id }, data: { status_id: itemStatusId } })
    ]);
    res.json({ success: true, job: await prisma.maintenanceJob.findUnique({ where: { id }, include: maintenanceInclude() }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เริ่มงานไม่สำเร็จ' });
  }
});

app.post('/api/maintenance/:id/complete', authenticate, requirePermission('can_manage_items', 'ปิดงานบำรุงรักษา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.maintenanceJob.findUnique({ where: { id }, include: { item: true, issue_report: true } });
    if (!current) return res.status(404).json({ error: 'ไม่พบงานบำรุงรักษา' });
    if (current.status !== 'in_progress') return res.status(409).json({ error: 'ปิดได้เฉพาะงานที่กำลังดำเนินการ' });
    if (current.issue_report_id && !['confirmed', 'repair'].includes(current.issue_report?.status)) {
      return res.status(409).json({ error: 'รายการแจ้งเสียต้นทางถูกปิดหรือเปลี่ยนสถานะแล้ว' });
    }
    const result = String(req.body?.result || '').trim();
    if (result.length < 5) return res.status(400).json({ error: 'กรุณาระบุผลการดำเนินงานอย่างน้อย 5 ตัวอักษร' });
    const nextDueDate = parseOptionalDate(req.body?.next_due_date);
    if (nextDueDate === undefined) return res.status(400).json({ error: 'วันที่ครั้งถัดไปไม่ถูกต้อง' });

    const [activeBorrow, otherIssue, otherJob] = await Promise.all([
      prisma.borrowLog.findFirst({ where: { item_id: current.item_id, approval_status: 'approved', return_date: null } }),
      prisma.issueReport.findFirst({ where: { item_id: current.item_id, id: current.issue_report_id ? { not: current.issue_report_id } : undefined, status: { in: ['pending', 'confirmed', 'repair'] } } }),
      prisma.maintenanceJob.findFirst({ where: { item_id: current.item_id, id: { not: id }, status: { in: ['scheduled', 'in_progress'] } } })
    ]);
    const canReleaseItem = !activeBorrow && !otherIssue && !otherJob;
    const operations = [
      prisma.maintenanceJob.update({ where: { id }, data: { status: 'completed', completed_at: new Date(), result, next_due_date: nextDueDate } }),
      prisma.maintenanceStatusHistory.create({ data: { maintenance_job_id: id, ...maintenanceHistoryData(req, 'maintenance_completed', 'in_progress', 'completed', result) } })
    ];
    if (current.issue_report_id) {
      operations.push(
        prisma.issueReport.update({ where: { id: current.issue_report_id }, data: { status: 'resolved', resolved_at: new Date(), review_note: result } }),
        prisma.issueStatusHistory.create({ data: { issue_report_id: current.issue_report_id, ...issueHistoryData(req, 'issue_resolved_by_maintenance', current.issue_report?.status || 'repair', 'resolved', null, result) } })
      );
    }
    if (canReleaseItem) {
      const availableStatusId = await getStatusIdByName('ใช้งานได้');
      if (!availableStatusId) return res.status(409).json({ error: 'ไม่พบสถานะ “ใช้งานได้”' });
      operations.push(prisma.item.update({ where: { id: current.item_id }, data: { status_id: availableStatusId } }));
    }
    await prisma.$transaction(operations);
    res.json({ success: true, item_released: canReleaseItem, blockers: { active_borrow: !!activeBorrow, other_issue: !!otherIssue, other_job: !!otherJob }, job: await prisma.maintenanceJob.findUnique({ where: { id }, include: maintenanceInclude() }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ปิดงานบำรุงรักษาไม่สำเร็จ' });
  }
});

app.post('/api/maintenance/:id/cancel', authenticate, requirePermission('can_manage_items', 'ยกเลิกงานบำรุงรักษา'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.maintenanceJob.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'ไม่พบงานบำรุงรักษา' });
    if (current.status !== 'scheduled') return res.status(409).json({ error: 'ยกเลิกได้เฉพาะงานที่ยังไม่เริ่ม' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ยกเลิก' });
    await prisma.$transaction([
      prisma.maintenanceJob.update({ where: { id }, data: { status: 'cancelled', cancelled_at: new Date(), result: reason } }),
      prisma.maintenanceStatusHistory.create({ data: { maintenance_job_id: id, ...maintenanceHistoryData(req, 'maintenance_cancelled', 'scheduled', 'cancelled', reason) } })
    ]);
    res.json({ success: true, job: await prisma.maintenanceJob.findUnique({ where: { id }, include: maintenanceInclude() }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ยกเลิกงานไม่สำเร็จ' });
  }
});

app.post('/api/maintenance/:id/documents', authenticate, requirePermission('can_manage_items', 'แนบเอกสารงานบำรุงรักษา'), maintenanceUpload.single('document'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกเอกสาร' });
    const job = await prisma.maintenanceJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'ไม่พบงานบำรุงรักษา' });
    const uploader = req.user?.name || req.user?.email || 'admin';
    const document = await prisma.maintenanceDocument.create({ data: {
      maintenance_job_id: id, file_name: decodeOriginalFilename(req.file.originalname), file_url: `/uploads/${req.file.filename}`,
      document_type: String(req.body?.document_type || 'other'), uploaded_by_id: req.user.id, uploaded_by_name: uploader
    } });
    res.json({ success: true, document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'แนบเอกสารไม่สำเร็จ' });
  }
});

// ===== REPORT DASHBOARD =====

app.get('/api/reports/dashboard', authenticate, requirePermission('can_manage_items', 'ดูรายงาน'), async (req, res) => {
  try {
    const dateFrom = parseOptionalDate(req.query.date_from);
    const dateToRaw = parseOptionalDate(req.query.date_to);
    if (dateFrom === undefined || dateToRaw === undefined) return res.status(400).json({ error: 'ช่วงวันที่ไม่ถูกต้อง' });
    const dateTo = dateToRaw ? new Date(dateToRaw.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
    if (dateFrom && dateTo && dateFrom > dateTo) return res.status(400).json({ error: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' });

    const locationId = req.query.location_id ? Number(req.query.location_id) : null;
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const assetStatus = String(req.query.asset_status || '').trim();
    const jobType = normalizeMaintenanceType(req.query.job_type);
    const itemWhere = {};
    if (Number.isFinite(locationId)) itemWhere.location_id = locationId;
    if (Number.isFinite(categoryId)) itemWhere.category_id = categoryId;
    if (assetStatus) itemWhere.status = { name: assetStatus };
    const eventRange = dateFrom || dateTo ? { gte: dateFrom || undefined, lte: dateTo || undefined } : undefined;
    const itemFilter = Object.keys(itemWhere).length ? itemWhere : undefined;

    const [assets, borrows, issues, maintenance, locations, categories, statuses] = await Promise.all([
      prisma.item.findMany({
        where: itemWhere,
        orderBy: { asset_code: 'asc' },
        include: { brand: true, location: true, status: true, category: true, responsible: { select: { id: true, name: true } } }
      }),
      prisma.borrowLog.findMany({
        where: { ...(eventRange ? { borrow_date: eventRange } : {}), ...(itemFilter ? { item: itemFilter } : {}) },
        orderBy: { borrow_date: 'desc' }, take: 1000,
        include: { item: { include: { location: true, status: true, category: true } } }
      }),
      prisma.issueReport.findMany({
        where: { ...(eventRange ? { created_at: eventRange } : {}), ...(itemFilter ? { item: itemFilter } : {}) },
        orderBy: { created_at: 'desc' }, take: 1000,
        include: { item: { include: { location: true, status: true, category: true } } }
      }),
      prisma.maintenanceJob.findMany({
        where: { ...(eventRange ? { created_at: eventRange } : {}), ...(jobType ? { job_type: jobType } : {}), ...(itemFilter ? { item: itemFilter } : {}) },
        orderBy: { created_at: 'desc' }, take: 1000,
        include: { item: { include: { location: true, status: true, category: true } }, documents: true }
      }),
      prisma.location.findMany({ orderBy: { name: 'asc' } }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.status.findMany({ orderBy: { name: 'asc' } })
    ]);

    const now = new Date();
    const dueLimit = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const overdueBorrows = borrows.filter(log => log.approval_status === 'approved' && !log.return_date && log.expected_return_date && new Date(log.expected_return_date) < now);
    const calibrationDue = maintenance.filter(job => job.job_type === 'calibration' && job.status === 'completed' && job.next_due_date && new Date(job.next_due_date) <= dueLimit);
    const maintenanceCost = maintenance.filter(job => job.status === 'completed').reduce((sum, job) => sum + Number(job.cost || 0), 0);
    const issueCounts = issues.reduce((map, issue) => map.set(issue.item_id, (map.get(issue.item_id) || 0) + 1), new Map());
    const frequentIssues = [...issueCounts.entries()].map(([itemId, count]) => {
      const issue = issues.find(row => row.item_id === itemId);
      return { item_id: itemId, asset_code: issue?.item?.asset_code || '-', item_name: issue?.item?.name || '-', count };
    }).sort((a, b) => b.count - a.count).slice(0, 10);
    const byStatus = assets.reduce((result, item) => { const key = item.status?.name || 'ไม่ระบุ'; result[key] = (result[key] || 0) + 1; return result; }, {});
    const byJobType = maintenance.reduce((result, job) => { result[job.job_type] = (result[job.job_type] || 0) + 1; return result; }, {});

    res.json({
      generated_at: now,
      filters: { date_from: req.query.date_from || null, date_to: req.query.date_to || null, location_id: locationId, category_id: categoryId, asset_status: assetStatus || null, job_type: jobType },
      dimensions: { locations, categories, statuses },
      summary: {
        assets_total: assets.length,
        assets_available: assets.filter(item => item.status?.name === 'ใช้งานได้').length,
        borrow_pending: borrows.filter(log => log.approval_status === 'pending').length,
        return_pending: borrows.filter(log => log.return_status === 'pending').length,
        overdue_borrows: overdueBorrows.length,
        issue_pending: issues.filter(issue => issue.status === 'pending').length,
        maintenance_open: maintenance.filter(job => ['scheduled', 'in_progress'].includes(job.status)).length,
        calibration_due: calibrationDue.length,
        maintenance_cost: maintenanceCost
      },
      charts: { assets_by_status: byStatus, maintenance_by_type: byJobType },
      assets, borrows, issues, maintenance, overdue_borrows: overdueBorrows, calibration_due: calibrationDue, frequent_issues: frequentIssues
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลด Report Dashboard ไม่สำเร็จ' });
  }
});

// GET /api/audit-logs - append-only operational history for Admin/Super Admin
app.get('/api/audit-logs', authenticate, requireAdminLike, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(req.query.page_size, 10) || 25));
    const from = parseOptionalDate(req.query.date_from);
    const to = parseOptionalDate(req.query.date_to);
    if (from === undefined || to === undefined) return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' });
    if (to) to.setHours(23, 59, 59, 999);
    const search = String(req.query.search || '').trim().slice(0, 100);
    const where = {
      ...(req.query.action ? { action: String(req.query.action).slice(0, 100) } : {}),
      ...(req.query.entity_type ? { entity_type: String(req.query.entity_type).slice(0, 100) } : {}),
      ...(req.query.actor_user_id && Number.isInteger(Number(req.query.actor_user_id)) ? { actor_user_id: Number(req.query.actor_user_id) } : {}),
      ...(from || to ? { created_at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(search ? { OR: [
        { actor_name: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity_id: { contains: search, mode: 'insensitive' } },
        { route: { contains: search, mode: 'insensitive' } }
      ] } : {})
    };
    const [total, rows, facets] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.findMany({ select: { action: true, entity_type: true }, distinct: ['action', 'entity_type'], take: 500 })
    ]);
    res.json({
      page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)),
      filters: {
        actions: [...new Set(facets.map(row => row.action))].sort(),
        entity_types: [...new Set(facets.map(row => row.entity_type))].sort()
      },
      data: rows.map(row => ({ ...row, id: row.id.toString() }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลด Audit Log ไม่สำเร็จ' });
  }
});

// GET /api/meta - ดึง brands, locations, statuses, users สำหรับ dropdown
// หมายเหตุ: ใช้ select เลือกเฉพาะ field ที่จำเป็นสำหรับ users เพื่อไม่ให้ password_hash หลุดออกไปกับ response
app.get('/api/meta', authenticate, async (req, res) => {
  try {
    const [brands, locations, statuses, categories, users] = await Promise.all([
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      prisma.location.findMany({ orderBy: { name: 'asc' } }),
      prisma.status.findMany({ orderBy: { name: 'asc' } }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ select: { id:true, name:true, role:true, can_manage_items:true, can_manage_responsibles:true }, where:{verification_status:'verified'}, orderBy: { name: 'asc' } })
    ]);
    const responsible_users = users.filter(u => u.role === 'super_admin' || u.role === 'admin' || u.can_manage_items || u.can_manage_responsibles);
    res.json({ brands, locations, statuses, categories, users, responsible_users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// เผื่อกรณีต้องการดึงทีละประเภทแยกจาก /api/meta
app.get('/api/brands', authenticate, async (req, res) => {
  try {
    res.json(await prisma.brand.findMany());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/locations', authenticate, async (req, res) => {
  try {
    res.json(await prisma.location.findMany());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/statuses', authenticate, async (req, res) => {
  try {
    res.json(await prisma.status.findMany());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// หมายเหตุ: select เฉพาะ field ที่จำเป็น เพื่อไม่ให้ password_hash หลุดออกไปกับ response
app.get('/api/users', authenticate, requireAdminLike, async (req, res) => {
  try {
    res.json(await prisma.user.findMany({ select: { id:true, name:true, role:true, verification_status:true }, orderBy: { name: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});


// ===== ADMIN / SUPER ADMIN MANAGEMENT ROUTES =====

function modelForMaster(type) {
  const map = {
    brands: prisma.brand,
    locations: prisma.location,
    statuses: prisma.status,
    categories: prisma.category
  };
  return map[type];
}

function permissionForMaster(type) {
  return {
    brands: 'can_manage_brands',
    locations: 'can_manage_locations',
    statuses: 'can_manage_statuses',
    categories: 'can_manage_categories'
  }[type];
}

app.get('/api/categories', authenticate, async (req, res) => {
  try {
    res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/master/:type', authenticate, requireAdminLike, async (req, res) => {
  try {
    const { type } = req.params;
    const model = modelForMaster(type);
    const permission = permissionForMaster(type);
    if (!model || !permission) return res.status(404).json({ error: 'ไม่พบประเภทข้อมูล' });
    if (!hasPermission(req.user, permission)) return res.status(403).json({ error: 'สิทธิ์ไม่พอ' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
    const data = await model.create({ data: { name } });
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: safeErrorMessage(error, 'บันทึกไม่สำเร็จ') });
  }
});

app.put('/api/master/:type/:id', authenticate, requireAdminLike, async (req, res) => {
  try {
    const { type } = req.params;
    const model = modelForMaster(type);
    const permission = permissionForMaster(type);
    if (!model || !permission) return res.status(404).json({ error: 'ไม่พบประเภทข้อมูล' });
    if (!hasPermission(req.user, permission)) return res.status(403).json({ error: 'สิทธิ์ไม่พอ' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
    const data = await model.update({ where: { id: Number(req.params.id) }, data: { name } });
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: safeErrorMessage(error, 'แก้ไขไม่สำเร็จ') });
  }
});

app.delete('/api/master/:type/:id', authenticate, requireAdminLike, async (req, res) => {
  try {
    const { type } = req.params;
    const model = modelForMaster(type);
    const permission = permissionForMaster(type);
    if (!model || !permission) return res.status(404).json({ error: 'ไม่พบประเภทข้อมูล' });
    if (!hasPermission(req.user, permission)) return res.status(403).json({ error: 'สิทธิ์ไม่พอ' });
    const data = await model.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'ลบไม่สำเร็จ อาจมีอุปกรณ์ที่ใช้งานข้อมูลนี้อยู่' });
  }
});

app.get('/api/admin/users', authenticate, requirePermission('can_manage_users', 'จัดการผู้ใช้'), async (req, res) => {
  try {
    res.json(await prisma.user.findMany({ select: userSafeSelect(), orderBy: { id: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'โหลดผู้ใช้ไม่สำเร็จ' });
  }
});

app.get('/api/admin/navigation-counts', authenticate, requireAdminLike, async (req, res) => {
  try {
    const now = new Date();
    const [borrowPending, returnPending, issuePending, maintenanceDue, userPending] = await Promise.all([
      prisma.borrowLog.count({ where: { approval_status: 'pending' } }),
      prisma.borrowLog.count({ where: { return_status: 'pending' } }),
      prisma.issueReport.count({ where: { status: 'pending' } }),
      prisma.maintenanceJob.count({ where: { status: { in: ['scheduled', 'in_progress'] }, due_date: { lt: now } } }),
      prisma.user.count({ where: { verification_status: 'pending' } })
    ]);
    res.json({ borrow_pending: borrowPending, return_pending: returnPending, issue_pending: issuePending, maintenance_due: maintenanceDue, user_pending: userPending });
  } catch (error) { console.error(error); res.status(500).json({ error: 'โหลดจำนวนแจ้งเตือนไม่สำเร็จ' }); }
});

app.post('/api/admin/users', authenticate, requirePermission('can_manage_users', 'เพิ่มผู้ใช้'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
    const requestedRole = ['user', 'admin', 'super_admin'].includes(req.body.role) ? req.body.role : 'user';
    const role = req.user.role === 'super_admin' ? requestedRole : 'user';
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
    const birthDate = parseOptionalDate(req.body.birth_date);
    if (birthDate === undefined) return res.status(400).json({ error: 'วันเดือนปีเกิดไม่ถูกต้อง' });
    const data = {
      name,
      email,
      role,
      position: String(req.body.position || '').trim() || null,
      department_lab: String(req.body.department_lab || '').trim() || null,
      birth_date: birthDate,
      phone: String(req.body.phone || '').trim() || null,
      registration_source: req.user.role === 'super_admin' ? 'super_admin' : 'admin',
      verification_status: 'verified',
      verified_at: new Date(),
      verified_by_id: req.user.id,
      created_by_id: req.user.id,
      must_change_password: true
    };
    const initialPassword = String(req.body.password || '000000');
    if (initialPassword.length < 6 || initialPassword.length > 21) return res.status(400).json({ error: 'รหัสผ่านต้องมี 6-21 ตัวอักษร' });
    data.password_hash = await bcrypt.hash(initialPassword, 10);
    if (role === 'admin' || role === 'super_admin') {
      data.can_manage_items = true;
      data.can_manage_responsibles = true;
    }
    const user = await prisma.user.create({ data, select: userSafeSelect() });
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: safeErrorMessage(error, 'เพิ่มผู้รับผิดชอบไม่สำเร็จ') });
  }
});

app.put('/api/admin/users/:id/permissions', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const allowedRoles = ['user', 'admin', 'super_admin'];
    const targetId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (targetId === req.user.id && req.body.role && req.body.role !== 'super_admin') {
      return res.status(409).json({ error: 'ไม่สามารถลด Role ของบัญชี Super Admin ที่กำลังใช้งานอยู่' });
    }
    if (target.role === 'super_admin' && req.body.role && req.body.role !== 'super_admin') {
      const otherActiveSuperAdmins = await prisma.user.count({ where: { id: { not: targetId }, role: 'super_admin', verification_status: 'verified' } });
      if (!otherActiveSuperAdmins) return res.status(409).json({ error: 'ไม่สามารถลด Role ของ Super Admin คนสุดท้ายได้' });
    }
    const data = {};
    if (allowedRoles.includes(req.body.role)) data.role = req.body.role;
    for (const key of ['can_manage_items','can_manage_users','can_manage_brands','can_manage_locations','can_manage_categories','can_manage_statuses','can_manage_responsibles','can_approve_borrow']) {
      if (key in req.body) data[key] = !!req.body[key];
    }
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data, select: userSafeSelect() });
    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: safeErrorMessage(error, 'แก้ไขสิทธิ์ไม่สำเร็จ') });
  }
});

app.put('/api/admin/users/:id/verification', authenticate, requirePermission('can_manage_users', 'ยืนยันผู้ใช้'), async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (req.user.role !== 'super_admin' && target.role !== 'user') return res.status(403).json({ error: 'Admin ยืนยันหรือระงับได้เฉพาะบัญชี User' });
    const status = String(req.body.status || '');
    if (!['verified', 'suspended'].includes(status)) return res.status(400).json({ error: 'สถานะการยืนยันไม่ถูกต้อง' });
    if (status === 'suspended' && targetId === req.user.id) return res.status(409).json({ error: 'ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่' });
    if (status === 'suspended' && target.role === 'super_admin') {
      const otherActiveSuperAdmins = await prisma.user.count({ where: { id: { not: targetId }, role: 'super_admin', verification_status: 'verified' } });
      if (!otherActiveSuperAdmins) return res.status(409).json({ error: 'ไม่สามารถระงับ Super Admin คนสุดท้ายได้' });
    }
    const user = await prisma.user.update({ where: { id: target.id }, data: { verification_status: status, verified_at: status === 'verified' ? new Date() : target.verified_at, verified_by_id: req.user.id }, select: userSafeSelect() });
    res.json({ success: true, user });
  } catch (error) { console.error(error); res.status(400).json({ error: safeErrorMessage(error, 'เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ') }); }
});

app.post('/api/admin/users/:id/reset-password', authenticate, requirePermission('can_manage_users', 'รีเซ็ตรหัสผ่าน'), async (req, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (req.user.role !== 'super_admin' && target.role !== 'user') return res.status(403).json({ error: 'Admin รีเซ็ตรหัสผ่านได้เฉพาะบัญชี User' });
    const password = String(req.body.password || '000000');
    if (password.length < 6 || password.length > 21) return res.status(400).json({ error: 'รหัสผ่านต้องมี 6-21 ตัวอักษร' });
    await prisma.user.update({ where: { id: target.id }, data: { password_hash: await bcrypt.hash(password, 10), must_change_password: true, token_version: { increment: 1 } } });
    res.json({ success: true, message: 'รีเซ็ตรหัสผ่านแล้ว ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ' });
  } catch (error) { console.error(error); res.status(400).json({ error: safeErrorMessage(error, 'รีเซ็ตรหัสผ่านไม่สำเร็จ') }); }
});

}
