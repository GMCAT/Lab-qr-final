let qrBatchItems = [];
let qrBatchSelected = new Set();

function qrSafeFilename(value) { return String(value || 'item').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }
function qrBatchDataUrl(assetCode, size = 512) {
  return new Promise((resolve, reject) => {
    if (typeof QRCode !== 'function') return reject(new Error('QR library unavailable'));
    const holder = document.createElement('div');
    new QRCode(holder, { text: publicItemAbsoluteUrl(assetCode), width: size, height: size, correctLevel: QRCode.CorrectLevel.H });
    setTimeout(() => { const canvas = holder.querySelector('canvas'); const image = holder.querySelector('img'); if (canvas) resolve(canvas.toDataURL('image/png')); else if (image?.src) resolve(image.src); else reject(new Error(`สร้าง QR ${assetCode} ไม่สำเร็จ`)); }, 30);
  });
}
function qrDataUrlBlob(dataUrl) { const [meta, payload] = dataUrl.split(','); const bytes = atob(payload); const out = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i); return new Blob([out], { type: meta.match(/data:(.*?);/)?.[1] || 'image/png' }); }

function qrFilteredItems() {
  const search = document.getElementById('qrSearch')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('qrStatus')?.value || '', location = document.getElementById('qrLocation')?.value || '', category = document.getElementById('qrCategory')?.value || '';
  return qrBatchItems.filter(item => (!search || [item.asset_code,item.name,item.serial_no].some(v => String(v || '').toLowerCase().includes(search))) && (!status || item.status?.name === status) && (!location || item.location?.name === location) && (!category || item.category?.name === category));
}
function qrBatchRefresh() {
  const rows = qrFilteredItems(); document.getElementById('qrCount').textContent = `${rows.length} รายการ · เลือก ${qrBatchSelected.size}`;
  document.getElementById('qrRows').innerHTML = rows.length ? rows.map(item => `<tr class="border-t"><td class="px-3 py-2"><input type="checkbox" data-code="${escapeHtml(item.asset_code)}" ${qrBatchSelected.has(item.asset_code) ? 'checked' : ''}></td><td class="px-3 py-2 font-semibold">${escapeHtml(item.asset_code)}</td><td class="px-3 py-2">${escapeHtml(item.name)}</td><td class="px-3 py-2">${escapeHtml(item.location?.name || '-')}</td><td class="px-3 py-2">${escapeHtml(item.status?.name || '-')}</td></tr>`).join('') : '<tr><td colspan="5" class="p-8 text-center text-slate-500">ไม่พบอุปกรณ์</td></tr>';
  document.querySelectorAll('#qrRows input[data-code]').forEach(box => box.onchange = () => { box.checked ? qrBatchSelected.add(box.dataset.code) : qrBatchSelected.delete(box.dataset.code); qrBatchRefresh(); });
  for (const id of ['qrZip','qrPrint']) document.getElementById(id).disabled = !qrBatchSelected.size;
}

async function qrBatchZip() {
  if (typeof JSZip !== 'function') return appAlert('โหลดไลบรารี ZIP ไม่สำเร็จ');
  const codes = [...qrBatchSelected]; if (codes.length > 500) return appAlert('ส่งออกได้สูงสุด 500 รายการต่อครั้ง');
  const button = document.getElementById('qrZip'); button.disabled = true; button.textContent = 'กำลังสร้าง ZIP...';
  try { const zip = new JSZip(); for (let i = 0; i < codes.length; i++) { button.textContent = `กำลังสร้าง ${i + 1}/${codes.length}`; zip.file(`QR-${qrSafeFilename(codes[i])}.png`, qrDataUrlBlob(await qrBatchDataUrl(codes[i], 512))); } const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); await api('/qr-batch/export-event', { method: 'POST', body: JSON.stringify({ format: 'zip', item_codes: codes }) }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `lab-qr-batch-${new Date().toISOString().slice(0,10)}.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); } catch (error) { appAlert(error.message); } finally { button.textContent = 'ดาวน์โหลด ZIP (PNG)'; qrBatchRefresh(); }
}

async function qrBatchPrint() {
  const codes = [...qrBatchSelected]; if (codes.length > 200) return appAlert('พิมพ์ได้สูงสุด 200 ฉลากต่อครั้ง');
  const win = window.open('', '_blank'); if (!win) return appAlert('กรุณาอนุญาต Pop-up สำหรับหน้าพิมพ์');
  win.document.write('<p style="font-family:sans-serif;padding:20px">กำลังสร้าง QR...</p>');
  try { const selected = codes.map(code => qrBatchItems.find(item => item.asset_code === code)); const images = []; for (const item of selected) images.push(await qrBatchDataUrl(item.asset_code, 320)); const cards = selected.map((item, i) => `<article><img src="${images[i]}"><strong>${escapeHtml(item.asset_code)}</strong><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.location?.name || '')}</small></article>`).join(''); win.document.open(); win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>QR Labels</title><style>@page{size:A4;margin:8mm}body{font-family:Arial,'Noto Sans Thai',sans-serif;margin:0}.toolbar{padding:8px;text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}article{height:82mm;border:1px dashed #94a3b8;border-radius:3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3mm;box-sizing:border-box;text-align:center;break-inside:avoid}img{width:48mm;height:48mm}strong{font-size:14pt;margin-top:2mm}span{font-size:10pt;max-height:2.4em;overflow:hidden}small{font-size:8pt;color:#475569}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">พิมพ์ / Save as PDF</button></div><main class="grid">${cards}</main></body></html>`); win.document.close(); await api('/qr-batch/export-event', { method: 'POST', body: JSON.stringify({ format: 'print', item_codes: codes }) }); } catch (error) { win.close(); appAlert(error.message); }
}

function renderQrBatch(app, items) {
  qrBatchItems = Array.isArray(items) ? items : []; qrBatchSelected = new Set();
  const values = key => [...new Set(qrBatchItems.map(item => item[key]?.name).filter(Boolean))].sort(); const options = list => list.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  app.innerHTML = `<div class="min-h-screen bg-slate-50"><header class="border-b bg-white"><div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><h1 class="text-2xl font-bold">QR Batch Export</h1><p class="text-sm text-slate-500">เลือกอุปกรณ์และส่งออก QR สำหรับติดฉลาก</p></div><a href="#/admin" class="rounded-xl border px-4 py-2 font-semibold">กลับ Dashboard</a></div></header><main class="mx-auto max-w-7xl space-y-4 px-4 py-6"><section class="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"><input id="qrSearch" placeholder="ค้นหารหัส ชื่อ Serial" class="rounded-xl border px-3 py-2"><select id="qrStatus" class="rounded-xl border px-3 py-2"><option value="">ทุกสถานะ</option>${options(values('status'))}</select><select id="qrLocation" class="rounded-xl border px-3 py-2"><option value="">ทุกสถานที่</option>${options(values('location'))}</select><select id="qrCategory" class="rounded-xl border px-3 py-2"><option value="">ทุกหมวดหมู่</option>${options(values('category'))}</select><div class="flex flex-wrap gap-2 md:col-span-4"><button id="qrSelectFiltered" class="rounded-xl border px-4 py-2 font-semibold">เลือกผลลัพธ์ทั้งหมด</button><button id="qrClear" class="rounded-xl border px-4 py-2 font-semibold">ล้างการเลือก</button><button id="qrZip" disabled class="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-40">ดาวน์โหลด ZIP (PNG)</button><button id="qrPrint" disabled class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40">พิมพ์ฉลาก A4 / PDF</button><span id="qrCount" class="ml-auto self-center text-sm text-slate-500"></span></div></section><section class="overflow-hidden rounded-2xl border bg-white shadow-sm"><div class="max-h-[65vh] overflow-auto"><table class="min-w-full text-left text-sm"><thead class="sticky top-0 bg-slate-100"><tr><th class="px-3 py-2">เลือก</th><th class="px-3 py-2">รหัส</th><th class="px-3 py-2">ชื่อ</th><th class="px-3 py-2">สถานที่</th><th class="px-3 py-2">สถานะ</th></tr></thead><tbody id="qrRows"></tbody></table></div></section></main></div>`;
  for (const id of ['qrSearch','qrStatus','qrLocation','qrCategory']) document.getElementById(id).addEventListener(id === 'qrSearch' ? 'input' : 'change', qrBatchRefresh);
  document.getElementById('qrSelectFiltered').onclick = () => { qrFilteredItems().slice(0,500).forEach(item => qrBatchSelected.add(item.asset_code)); qrBatchRefresh(); };
  document.getElementById('qrClear').onclick = () => { qrBatchSelected.clear(); qrBatchRefresh(); }; document.getElementById('qrZip').onclick = qrBatchZip; document.getElementById('qrPrint').onclick = qrBatchPrint; qrBatchRefresh();
}
