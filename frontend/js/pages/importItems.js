let importItemRows = [];

const IMPORT_HEADERS = ['asset_code','name','brand','location','status','category','model','serial_no','size','purchase_date','price','note'];
const IMPORT_ALIASES = { 'รหัสอุปกรณ์':'asset_code', 'ชื่ออุปกรณ์':'name', 'ยี่ห้อ':'brand', 'สถานที่':'location', 'สถานะ':'status', 'หมวดหมู่':'category', 'รุ่น':'model', 'หมายเลขเครื่อง':'serial_no', 'ขนาด':'size', 'วันที่ซื้อ':'purchase_date', 'ราคา':'price', 'หมายเหตุ':'note' };

function normalizeImportWorkbookRows(rows) {
  return rows.map(raw => Object.fromEntries(Object.entries(raw).map(([key, value]) => [IMPORT_ALIASES[String(key).trim()] || String(key).trim().toLowerCase(), value]))).map(raw => Object.fromEntries(IMPORT_HEADERS.map(key => [key, raw[key] ?? ''])));
}

function downloadImportTemplate() {
  if (typeof XLSX === 'undefined') return appAlert('โหลดไลบรารี Excel ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต');
  const example = [['LAB-OSC-001','Oscilloscope','Keysight','ห้อง Lab A','ใช้งานได้','เครื่องมือวัด','DSOX1204G','MY123456','','2026-01-31',45000,'ตัวอย่าง — ลบแถวนี้ก่อน Import']];
  const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ...example]);
  ws['!cols'] = IMPORT_HEADERS.map(header => ({ wch: Math.max(14, header.length + 3) }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Items'); XLSX.writeFile(wb, 'lab-asset-import-template.xlsx');
}

function renderImportPreview(app, result) {
  const rows = result.rows || [];
  const body = rows.slice(0, 100).map(row => `<tr class="border-t ${row.valid ? '' : 'bg-red-50'}"><td class="px-3 py-2">${row.row_number}</td><td class="px-3 py-2 font-semibold">${escapeHtml(row.source.asset_code || '-')}</td><td class="px-3 py-2">${escapeHtml(row.source.name || '-')}</td><td class="px-3 py-2">${row.valid ? '<span class="text-emerald-700">พร้อม Import</span>' : `<ul class="list-disc pl-4 text-red-700">${row.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`}</td></tr>`).join('');
  document.getElementById('importResult').innerHTML = `<div class="grid gap-3 sm:grid-cols-3"><div class="rounded-xl bg-slate-100 p-3">ทั้งหมด <b>${result.total}</b></div><div class="rounded-xl bg-emerald-50 p-3 text-emerald-800">ผ่าน <b>${result.valid}</b></div><div class="rounded-xl bg-red-50 p-3 text-red-800">ผิดพลาด <b>${result.invalid}</b></div></div><div class="mt-4 overflow-x-auto rounded-xl border"><table class="min-w-full text-sm"><thead class="bg-slate-100"><tr><th class="px-3 py-2">แถว</th><th class="px-3 py-2">รหัส</th><th class="px-3 py-2">ชื่อ</th><th class="px-3 py-2">ผลตรวจ</th></tr></thead><tbody>${body}</tbody></table></div>${result.total > 100 ? '<p class="mt-2 text-sm text-slate-500">แสดง 100 แถวแรก</p>' : ''}`;
  const commit = document.getElementById('commitImport'); commit.disabled = result.invalid > 0; commit.classList.toggle('opacity-40', result.invalid > 0);
}

function renderItemImportPanel() {
  return `<section id="itemImportPanel" class="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm"><div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-xl font-bold">Import Excel</h2><p class="text-sm text-slate-600">เพิ่มอุปกรณ์หลายรายการจากหน้าเดียวกัน ผู้รับผิดชอบและประวัติผู้นำเข้าจะใช้บัญชีที่ล็อกอิน</p></div><button type="button" onclick="downloadImportTemplate()" class="rounded-xl border bg-white px-4 py-2 font-semibold">ดาวน์โหลด Template</button></div><div class="mt-4 flex flex-wrap gap-3"><label class="cursor-pointer rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white">เลือก Excel / CSV<input id="importFile" type="file" accept=".xlsx,.xls,.csv" class="hidden"></label><button type="button" id="previewImport" disabled class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40">Preview</button><button type="button" id="commitImport" disabled class="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40">ยืนยัน Import</button></div><p id="importFileName" class="mt-3 text-sm text-slate-500">รองรับ .xlsx, .xls, .csv สูงสุด 1,000 แถว · ระบบบันทึกบัญชีผู้นำเข้าอัตโนมัติ</p><div id="importResult" class="mt-4 rounded-2xl border bg-white p-5"><p class="text-slate-500">เลือกไฟล์แล้วกด Preview</p></div></section>`;
}

function bindItemImport(app) {
  importItemRows = [];
  if (!document.getElementById('itemImportPanel')) return;
  document.getElementById('importFile').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; importItemRows = normalizeImportWorkbookRows(XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' })); if (!importItemRows.length) throw new Error('ไม่พบแถวข้อมูล'); if (importItemRows.length > 1000) throw new Error('ไฟล์มีเกิน 1,000 แถว'); document.getElementById('importFileName').textContent = `${file.name} · ${importItemRows.length} แถว`; document.getElementById('previewImport').disabled = false; document.getElementById('commitImport').disabled = true; } catch (error) { appAlert(`อ่านไฟล์ไม่สำเร็จ: ${error.message}`); }
  };
  document.getElementById('previewImport').onclick = async () => { try { renderImportPreview(app, await api('/import/items/preview', { method: 'POST', body: JSON.stringify({ rows: importItemRows }) })); } catch (e) { appAlert(e.message); } };
  document.getElementById('commitImport').onclick = async () => { if (!await appConfirm(`ยืนยัน Import ${importItemRows.length} รายการ?`)) return; try { const result = await api('/import/items/commit', { method: 'POST', body: JSON.stringify({ rows: importItemRows }) }); await appAlert(`Import สำเร็จ ${result.imported} รายการ\nบันทึกโดย ${result.imported_by?.name || '-'} (${result.imported_by?.email || '-'})`); location.hash = '#/admin'; } catch (e) { appAlert(e.message); } };
}

function renderItemImport() { location.hash = '#/admin/item/new'; }
