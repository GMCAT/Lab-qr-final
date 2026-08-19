let auditLogState = { page: 1, page_size: 25, search: '', action: '', entity_type: '', date_from: '', date_to: '' };

function auditDateTime(value) {
  return value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }) : '-';
}

function auditJsonPreview(value) {
  if (!value || !Object.keys(value).length) return '<span class="text-slate-400">ไม่มีรายละเอียด</span>';
  return `<pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function auditQuery() {
  const query = new URLSearchParams();
  Object.entries(auditLogState).forEach(([key, value]) => { if (value !== '') query.set(key, value); });
  return query.toString();
}

async function loadAuditLogs(app) {
  const data = await api(`/audit-logs?${auditQuery()}`);
  renderAuditLogs(app, data);
}

function renderAuditLogs(app, payload) {
  const rows = Array.isArray(payload.data) ? payload.data : [];
  app.innerHTML = `
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <header class="border-b bg-white"><div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div><h1 class="text-2xl font-bold">Audit Log</h1><p class="text-sm text-slate-500">ประวัติการเปลี่ยนแปลงระบบแบบอ่านอย่างเดียว</p></div>
        <div class="flex items-center gap-2"><label class="text-sm font-semibold">ประเภทรายงาน<select id="auditReportType" class="ml-2 rounded-xl border bg-white px-3 py-2"><option value="operations">ภาพรวมระบบ</option><option value="audit" selected>Audit Log</option></select></label><a href="#/admin" class="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับ Dashboard</a></div>
      </div></header>
      <main class="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <form id="auditFilters" class="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-6">
          <input name="search" value="${escapeHtml(auditLogState.search)}" placeholder="ค้นหาผู้ใช้ / action / ID" class="rounded-xl border px-3 py-2 md:col-span-2">
          <select name="action" class="rounded-xl border px-3 py-2"><option value="">ทุก Action</option>${payload.filters.actions.map(value => `<option value="${escapeHtml(value)}" ${auditLogState.action === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select>
          <select name="entity_type" class="rounded-xl border px-3 py-2"><option value="">ทุกประเภทข้อมูล</option>${payload.filters.entity_types.map(value => `<option value="${escapeHtml(value)}" ${auditLogState.entity_type === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select>
          <input type="date" name="date_from" value="${escapeHtml(auditLogState.date_from)}" class="rounded-xl border px-3 py-2" title="ตั้งแต่วันที่">
          <input type="date" name="date_to" value="${escapeHtml(auditLogState.date_to)}" class="rounded-xl border px-3 py-2" title="ถึงวันที่">
          <div class="flex gap-2 md:col-span-6"><button class="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white">กรองข้อมูล</button><button id="auditReset" type="button" class="rounded-xl border px-4 py-2 font-semibold">ล้างตัวกรอง</button><span class="ml-auto self-center text-sm text-slate-500">ทั้งหมด ${payload.total.toLocaleString('th-TH')} รายการ</span></div>
        </form>
        <div class="overflow-hidden rounded-2xl border bg-white shadow-sm"><div class="overflow-x-auto"><table class="min-w-full text-left text-sm">
          <thead class="bg-slate-100 text-slate-600"><tr><th class="px-4 py-3">วันเวลา</th><th class="px-4 py-3">ผู้ดำเนินการ</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">ข้อมูล</th><th class="px-4 py-3">HTTP</th><th class="px-4 py-3">รายละเอียด</th></tr></thead>
          <tbody>${rows.length ? rows.map(row => `<tr class="border-t align-top"><td class="whitespace-nowrap px-4 py-3">${auditDateTime(row.created_at)}</td><td class="px-4 py-3"><strong>${escapeHtml(row.actor_name)}</strong><div class="text-xs text-slate-500">${escapeHtml(row.actor_role || '-')}</div></td><td class="px-4 py-3"><span class="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">${escapeHtml(row.action)}</span></td><td class="px-4 py-3">${escapeHtml(row.entity_type)}<div class="max-w-44 truncate text-xs text-slate-500" title="${escapeHtml(row.entity_id || '')}">${escapeHtml(row.entity_id || '-')}</div></td><td class="px-4 py-3"><code>${escapeHtml(row.http_method)} ${row.http_status}</code><div class="max-w-48 truncate text-xs text-slate-500" title="${escapeHtml(row.route)}">${escapeHtml(row.route)}</div></td><td class="px-4 py-3"><details><summary class="cursor-pointer font-semibold text-teal-700">ดูข้อมูล</summary><p class="mt-2 text-xs text-slate-500">IP: ${escapeHtml(row.ip_address || '-')}</p>${auditJsonPreview(row.request_data)}${auditJsonPreview(row.result_data)}</details></td></tr>`).join('') : '<tr><td colspan="6" class="p-10 text-center text-slate-500">ไม่พบ Audit Log ตามตัวกรอง</td></tr>'}</tbody>
        </table></div></div>
        <div class="flex items-center justify-center gap-3"><button id="auditPrev" ${payload.page <= 1 ? 'disabled' : ''} class="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">ก่อนหน้า</button><span class="text-sm">หน้า ${payload.page} / ${payload.total_pages}</span><button id="auditNext" ${payload.page >= payload.total_pages ? 'disabled' : ''} class="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">ถัดไป</button></div>
      </main>
    </div>`;

  document.getElementById('auditFilters').addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    for (const key of ['search', 'action', 'entity_type', 'date_from', 'date_to']) auditLogState[key] = String(form.get(key) || '').trim();
    auditLogState.page = 1; await loadAuditLogs(app);
  });
  document.getElementById('auditReportType').onchange = event => { if (event.target.value === 'operations') location.hash = '#/admin/reports'; };
  document.getElementById('auditReset').onclick = async () => { auditLogState = { page: 1, page_size: 25, search: '', action: '', entity_type: '', date_from: '', date_to: '' }; await loadAuditLogs(app); };
  document.getElementById('auditPrev').onclick = async () => { if (auditLogState.page > 1) { auditLogState.page--; await loadAuditLogs(app); } };
  document.getElementById('auditNext').onclick = async () => { if (auditLogState.page < payload.total_pages) { auditLogState.page++; await loadAuditLogs(app); } };
}
