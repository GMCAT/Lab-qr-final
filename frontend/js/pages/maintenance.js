// Unified repair, preventive maintenance, calibration, and inspection work orders.

function maintenanceTypeLabel(type) {
  return { repair: 'ซ่อม', preventive: 'บำรุงเชิงป้องกัน', calibration: 'Calibration', inspection: 'ตรวจสอบ' }[type] || type || '-';
}

function maintenanceStatusLabel(status) {
  return { scheduled: 'วางแผนแล้ว', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก' }[status] || status || '-';
}

function maintenanceStatusClass(status) {
  return {
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200', in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200', cancelled: 'bg-slate-100 text-slate-700 border-slate-200'
  }[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function maintenanceTimeline(history = []) {
  if (!history.length) return '';
  return `<details class="mt-4 rounded-xl border bg-slate-50 p-3"><summary class="cursor-pointer text-sm font-bold">Timeline (${history.length})</summary>
    <ol class="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">${history.map(event => `<li class="relative text-sm">
      <span class="absolute -left-[1.33rem] top-1 h-3 w-3 rounded-full bg-cyan-600 ring-4 ring-slate-50"></span>
      <p class="font-semibold">${escapeHtml(maintenanceStatusLabel(event.to_status))}</p>
      <p class="text-xs text-slate-500">${formatDate(event.changed_at)} · ${escapeHtml(event.changed_by_name)}</p>
      ${event.note ? `<p class="mt-1 text-xs text-slate-600">${escapeHtml(event.note)}</p>` : ''}</li>`).join('')}</ol></details>`;
}

function maintenanceCard(job) {
  const item = job.item || {};
  return `<article class="rounded-2xl border bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2"><span class="font-mono text-sm font-bold text-cyan-700">${escapeHtml(job.work_sn)}</span>
          <span class="rounded-full border px-3 py-1 text-xs font-semibold ${maintenanceStatusClass(job.status)}">${maintenanceStatusLabel(job.status)}</span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">${escapeHtml(maintenanceTypeLabel(job.job_type))}</span></div>
        <h2 class="mt-2 text-lg font-bold">${escapeHtml(job.title)}</h2>
        <p class="text-sm text-slate-500">${escapeHtml(item.asset_code || '-')} · ${escapeHtml(item.name || '-')}</p>
        <div class="mt-3 grid gap-2 text-sm md:grid-cols-3"><p><b>ผู้รับผิดชอบ:</b> ${escapeHtml(job.assigned_to_name || '-')}</p>
          <p><b>ผู้ให้บริการ:</b> ${escapeHtml(job.provider_name || '-')}</p><p><b>กำหนดเสร็จ:</b> ${formatDate(job.due_date)}</p>
          <p><b>ค่าใช้จ่าย:</b> ${job.cost == null ? '-' : formatPrice(job.cost)}</p><p><b>ครั้งถัดไป:</b> ${formatDate(job.next_due_date)}</p>
          <p><b>เอกสาร:</b> ${(job.documents || []).length} ไฟล์</p></div>
      </div><a href="#/admin/maintenance/${job.id}" class="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white">เปิดงาน</a>
    </div></article>`;
}

function renderMaintenanceList(app, jobs) {
  app.innerHTML = `<div class="min-h-screen bg-slate-50"><header class="border-b bg-white px-6 py-4"><div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
    <div><h1 class="text-2xl font-bold">Maintenance / Calibration</h1><p class="text-sm text-slate-500">งานซ่อม บำรุง Calibration และตรวจสอบ</p></div>
    <a href="#/admin" class="rounded-xl border px-4 py-2 text-sm font-semibold">กลับ Admin</a></div></header>
    <main class="mx-auto max-w-6xl space-y-4 p-6"><div class="flex flex-wrap gap-3 rounded-2xl border bg-white p-4">
      <input id="maintenanceSearch" type="search" placeholder="ค้นหาเลขงานหรืออุปกรณ์" class="min-w-64 flex-1 rounded-xl border px-3 py-2 text-sm">
      <select id="maintenanceStatusFilter" class="rounded-xl border px-3 py-2 text-sm"><option value="all">ทุกสถานะ</option><option value="scheduled">วางแผนแล้ว</option><option value="in_progress">กำลังดำเนินการ</option><option value="completed">เสร็จแล้ว</option><option value="cancelled">ยกเลิก</option></select>
      <select id="maintenanceTypeFilter" class="rounded-xl border px-3 py-2 text-sm"><option value="all">ทุกประเภท</option><option value="repair">ซ่อม</option><option value="preventive">บำรุงเชิงป้องกัน</option><option value="calibration">Calibration</option><option value="inspection">ตรวจสอบ</option></select>
    </div><p id="maintenanceCount" class="text-sm text-slate-500"></p><div id="maintenanceList" class="space-y-4"></div></main></div>`;
  const render = () => {
    const q = document.getElementById('maintenanceSearch').value.trim().toLowerCase();
    const status = document.getElementById('maintenanceStatusFilter').value;
    const type = document.getElementById('maintenanceTypeFilter').value;
    const filtered = jobs.filter(job => {
      const haystack = [job.work_sn, job.title, job.item?.asset_code, job.item?.name].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (status === 'all' || job.status === status) && (type === 'all' || job.job_type === type);
    });
    document.getElementById('maintenanceCount').textContent = `แสดง ${filtered.length} จาก ${jobs.length} งาน`;
    document.getElementById('maintenanceList').innerHTML = filtered.length ? filtered.map(maintenanceCard).join('') : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ไม่พบงาน</div>';
  };
  document.getElementById('maintenanceSearch').addEventListener('input', render);
  document.getElementById('maintenanceStatusFilter').addEventListener('change', render);
  document.getElementById('maintenanceTypeFilter').addEventListener('change', render);
  render();
}

function renderMaintenanceForm(app, item, meta, issue = null) {
  const suggestedType = issue ? 'repair' : 'preventive';
  app.innerHTML = `<div class="min-h-screen bg-slate-50 p-6"><main class="mx-auto max-w-4xl"><div class="mb-4 flex items-center justify-between"><div><h1 class="text-2xl font-bold">สร้างงาน Maintenance</h1><p class="text-sm text-slate-500">${escapeHtml(item.asset_code)} · ${escapeHtml(item.name)}</p></div><a href="#/admin/maintenance" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">รายการงาน</a></div>
    <form id="maintenanceForm" class="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-2">
      <input type="hidden" name="asset_code" value="${escapeHtml(item.asset_code)}"><input type="hidden" name="issue_report_id" value="${issue?.id || ''}">
      ${issue ? `<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2"><b>จากรายการ:</b> ${escapeHtml(issue.issue_sn)} — ${escapeHtml(issue.description)}</div>` : ''}
      <label class="text-sm font-semibold">ประเภทงาน<select name="job_type" class="mt-1 w-full rounded-xl border p-3"><option value="repair" ${suggestedType === 'repair' ? 'selected' : ''}>ซ่อม</option><option value="preventive">บำรุงเชิงป้องกัน</option><option value="calibration">Calibration</option><option value="inspection">ตรวจสอบ</option></select></label>
      <label class="text-sm font-semibold">ชื่องาน<input name="title" required value="${issue ? `ซ่อม: ${escapeHtml(issue.issue_type)}` : ''}" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold md:col-span-2">รายละเอียด<textarea name="description" rows="3" class="mt-1 w-full rounded-xl border p-3">${escapeHtml(issue?.description || '')}</textarea></label>
      <label class="text-sm font-semibold">ผู้รับผิดชอบ<select name="assigned_to_id" id="maintenanceAssignee" class="mt-1 w-full rounded-xl border p-3"><option value="">ไม่ระบุ</option>${(meta.responsible_users || []).map(user => `<option value="${user.id}" data-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</option>`).join('')}</select><input type="hidden" name="assigned_to_name" id="maintenanceAssigneeName"></label>
      <label class="text-sm font-semibold">ผู้ให้บริการภายนอก<input name="provider_name" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">ติดต่อผู้ให้บริการ<input name="provider_contact" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">วันที่เริ่มตามแผน<input name="scheduled_start" type="date" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">กำหนดเสร็จ<input name="due_date" type="date" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">ค่าใช้จ่ายประมาณการ<input name="cost" type="number" min="0" step="0.01" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">กำหนดครั้งถัดไป<input name="next_due_date" type="date" class="mt-1 w-full rounded-xl border p-3"></label>
      <label class="text-sm font-semibold">เอกสารเริ่มต้น<input name="document" type="file" accept="image/*,.pdf" class="mt-1 w-full rounded-xl border p-3 text-sm"></label>
      <label class="text-sm font-semibold">ประเภทเอกสาร<select name="document_type" class="mt-1 w-full rounded-xl border p-3"><option value="work_order">ใบงาน</option><option value="quotation">ใบเสนอราคา</option><option value="certificate">Certificate</option><option value="other">อื่น ๆ</option></select></label>
      <p id="maintenanceFormMessage" class="hidden md:col-span-2"></p><button id="maintenanceSubmitButton" class="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white md:col-span-2">สร้างงาน</button>
    </form></main></div>`;
  document.getElementById('maintenanceAssignee').addEventListener('change', event => {
    document.getElementById('maintenanceAssigneeName').value = event.target.selectedOptions[0]?.dataset.name || '';
  });
  document.getElementById('maintenanceForm').addEventListener('submit', submitMaintenanceForm);
}

async function submitMaintenanceForm(event) {
  event.preventDefault();
  const button = document.getElementById('maintenanceSubmitButton');
  const message = document.getElementById('maintenanceFormMessage');
  button.disabled = true; button.textContent = 'กำลังสร้างงาน...';
  try {
    const result = await apiForm('/maintenance', new FormData(event.target));
    location.hash = `#/admin/maintenance/${result.job.id}`;
  } catch (error) {
    message.className = 'rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2'; message.textContent = error.message;
    button.disabled = false; button.textContent = 'สร้างงาน';
  }
}

function renderMaintenanceDetail(app, job) {
  const item = job.item || {};
  app.innerHTML = `<div class="min-h-screen bg-slate-50"><header class="border-b bg-white px-6 py-4"><div class="mx-auto flex max-w-6xl items-center justify-between"><div><p class="font-mono text-sm font-bold text-cyan-700">${escapeHtml(job.work_sn)}</p><h1 class="text-2xl font-bold">${escapeHtml(job.title)}</h1></div><a href="#/admin/maintenance" class="rounded-xl border px-4 py-2 text-sm font-semibold">รายการงาน</a></div></header>
    <main class="mx-auto max-w-6xl space-y-4 p-6"><section class="rounded-2xl border bg-white p-5"><div class="flex flex-wrap gap-2"><span class="rounded-full border px-3 py-1 text-xs font-semibold ${maintenanceStatusClass(job.status)}">${maintenanceStatusLabel(job.status)}</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">${maintenanceTypeLabel(job.job_type)}</span></div>
      <h2 class="mt-3 text-lg font-bold">${escapeHtml(item.asset_code)} · ${escapeHtml(item.name)}</h2><div class="mt-3 grid gap-2 text-sm md:grid-cols-3"><p><b>ผู้รับผิดชอบ:</b> ${escapeHtml(job.assigned_to_name || '-')}</p><p><b>ผู้ให้บริการ:</b> ${escapeHtml(job.provider_name || '-')}</p><p><b>กำหนดเสร็จ:</b> ${formatDate(job.due_date)}</p><p><b>ค่าใช้จ่าย:</b> ${job.cost == null ? '-' : formatPrice(job.cost)}</p><p><b>เสร็จจริง:</b> ${formatDate(job.completed_at)}</p><p><b>ครั้งถัดไป:</b> ${formatDate(job.next_due_date)}</p></div>
      ${job.description ? `<p class="mt-3 rounded-xl bg-slate-50 p-3 text-sm">${escapeHtml(job.description)}</p>` : ''}${job.result ? `<p class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><b>ผล:</b> ${escapeHtml(job.result)}</p>` : ''}${maintenanceTimeline(job.status_history)}
      <div class="mt-4 flex flex-wrap gap-2">${job.status === 'scheduled' ? `<button onclick="startMaintenance(${job.id})" class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">เริ่มงาน</button><button onclick="cancelMaintenance(${job.id})" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white">ยกเลิก</button>` : ''}${job.status === 'in_progress' ? `<button onclick="completeMaintenance(${job.id})" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">บันทึกเสร็จงาน</button>` : ''}</div></section>
      <section class="rounded-2xl border bg-white p-5"><h2 class="font-bold">เอกสาร</h2><div class="mt-3 space-y-2">${(job.documents || []).map(doc => `<a href="${absUrl(doc.file_url)}" target="_blank" class="block rounded-xl border p-3 text-sm text-blue-700">${escapeHtml(doc.file_name)} · ${escapeHtml(doc.document_type)}</a>`).join('') || '<p class="text-sm text-slate-500">ยังไม่มีเอกสาร</p>'}</div>
        ${!['completed', 'cancelled'].includes(job.status) ? `<form class="mt-4 grid gap-3 md:grid-cols-3" onsubmit="uploadMaintenanceDocument(event, ${job.id})"><input name="document" type="file" accept="image/*,.pdf" required class="rounded-xl border p-2 text-sm"><select name="document_type" class="rounded-xl border p-2"><option value="work_order">ใบงาน</option><option value="quotation">ใบเสนอราคา</option><option value="invoice">ใบแจ้งหนี้</option><option value="certificate">Certificate</option><option value="photo">รูปภาพ</option><option value="other">อื่น ๆ</option></select><button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">แนบเอกสาร</button></form>` : ''}</section></main></div>`;
}

async function startMaintenance(id) { const note = await appPrompt('หมายเหตุเริ่มงาน (ถ้ามี)') || ''; if (!await appConfirm('ยืนยันเริ่มงาน?')) return; try { await api(`/maintenance/${id}/start`, { method: 'POST', body: JSON.stringify({ note }) }); router(); } catch (e) { appAlert(e.message); } }
async function cancelMaintenance(id) { const reason = await appPrompt('เหตุผลที่ยกเลิก (บังคับ)'); if (!reason?.trim()) return; try { await api(`/maintenance/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }); router(); } catch (e) { appAlert(e.message); } }
async function completeMaintenance(id) { const result = await appPrompt('ผลการดำเนินงาน (อย่างน้อย 5 ตัวอักษร)'); if (!result?.trim() || result.trim().length < 5) return; const nextDueDate = await appPrompt('วันที่ครั้งถัดไป YYYY-MM-DD (เว้นว่างได้)') || ''; try { const response = await api(`/maintenance/${id}/complete`, { method: 'POST', body: JSON.stringify({ result: result.trim(), next_due_date: nextDueDate }) }); appAlert(response.item_released ? 'ปิดงานแล้ว อุปกรณ์กลับเป็นใช้งานได้' : 'ปิดงานแล้ว แต่อุปกรณ์ยังไม่ถูกปล่อยเนื่องจากมีรายการอื่นเปิดอยู่'); router(); } catch (e) { appAlert(e.message); } }
async function uploadMaintenanceDocument(event, id) { event.preventDefault(); try { await apiForm(`/maintenance/${id}/documents`, new FormData(event.target)); router(); } catch (e) { appAlert(e.message); } }
