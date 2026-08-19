let reportDashboardData = null;
let reportCharts = [];

function reportDate(value) { return value ? new Date(value).toLocaleDateString('th-TH') : '-'; }
function reportNumber(value) { return new Intl.NumberFormat('th-TH').format(Number(value || 0)); }
function reportMoney(value) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(value || 0)); }
function reportJobType(type) { return { repair: 'ซ่อม', preventive: 'PM', calibration: 'สอบเทียบ', inspection: 'ตรวจสภาพ' }[type] || type || '-'; }

function reportSheets(data) {
  const s = data.summary;
  return {
    Summary: [
      ['Generated At', data.generated_at], ['Assets Total', s.assets_total], ['Available', s.assets_available],
      ['Borrow Pending', s.borrow_pending], ['Return Pending', s.return_pending], ['Overdue Borrows', s.overdue_borrows],
      ['Issue Pending', s.issue_pending], ['Maintenance Open', s.maintenance_open], ['Calibration Due', s.calibration_due],
      ['Maintenance Cost', Number(s.maintenance_cost || 0)]
    ],
    Assets: [['Asset Code', 'Name', 'Brand', 'Category', 'Location', 'Status', 'Responsible'], ...data.assets.map(item => [item.asset_code, item.name, item.brand?.name, item.category?.name, item.location?.name, item.status?.name, item.responsible?.name])],
    Borrow_Return: [['Request SN', 'Asset Code', 'Borrower', 'Borrow Date', 'Expected Return', 'Return Date', 'Approval', 'Return Status'], ...data.borrows.map(log => [log.request_sn, log.item?.asset_code, log.borrower_name, reportDate(log.borrow_date), reportDate(log.expected_return_date), reportDate(log.return_date), log.approval_status, log.return_status])],
    Issue_Reports: [['Issue SN', 'Asset Code', 'Reporter', 'Type', 'Severity', 'Status', 'Created', 'Description'], ...data.issues.map(issue => [issue.issue_sn, issue.item?.asset_code, issue.reporter_name, issue.issue_type, issue.severity, issue.status, reportDate(issue.created_at), issue.description])],
    Maintenance: [['Work SN', 'Asset Code', 'Type', 'Title', 'Status', 'Scheduled', 'Due', 'Completed', 'Provider', 'Cost', 'Result'], ...data.maintenance.map(job => [job.work_sn, job.item?.asset_code, reportJobType(job.job_type), job.title, job.status, reportDate(job.scheduled_start), reportDate(job.due_date), reportDate(job.completed_at), job.provider_name, Number(job.cost || 0), job.result])],
    Calibration_Due: [['Work SN', 'Asset Code', 'Item', 'Next Due', 'Certificate'], ...data.calibration_due.map(job => [job.work_sn, job.item?.asset_code, job.item?.name, reportDate(job.next_due_date), job.documents?.find(doc => doc.document_type === 'certificate')?.file_name || '-'])],
    Overdue_Borrows: [['Request SN', 'Asset Code', 'Borrower', 'Expected Return', 'Days Overdue'], ...data.overdue_borrows.map(log => [log.request_sn, log.item?.asset_code, log.borrower_name, reportDate(log.expected_return_date), Math.max(0, Math.floor((Date.now() - new Date(log.expected_return_date).getTime()) / 86400000))])]
  };
}

function reportDownload(blob, filename) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function exportReportCsv() {
  const rows = [['Section', 'Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5', 'Column 6', 'Column 7', 'Column 8', 'Column 9', 'Column 10', 'Column 11']];
  Object.entries(reportSheets(reportDashboardData)).forEach(([section, sheet]) => sheet.forEach(row => rows.push([section, ...row])));
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  reportDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `lab-asset-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportReportExcel() {
  if (typeof XLSX === 'undefined') return appAlert('โหลดไลบรารี Excel ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
  const workbook = XLSX.utils.book_new();
  Object.entries(reportSheets(reportDashboardData)).forEach(([name, rows]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const widthCount = Math.max(...rows.map(row => row.length), 1);
    sheet['!cols'] = Array.from({ length: widthCount }, (_, index) => ({ wch: Math.min(45, Math.max(12, ...rows.map(row => String(row[index] ?? '').length + 2))) }));
    if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  });
  XLSX.writeFile(workbook, `lab-asset-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function reportPrintTable(title, rows, limit = 100) {
  if (!rows.length) return `<h2>${escapeHtml(title)}</h2><p>ไม่มีข้อมูล</p>`;
  const displayRows = rows.slice(0, limit);
  return `<h2>${escapeHtml(title)}</h2><table><thead><tr>${displayRows[0].map(cell => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${displayRows.slice(1).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length > limit ? `<p>แสดง ${limit} จาก ${rows.length - 1} รายการ</p>` : ''}`;
}

function exportReportPdf() {
  const data = reportDashboardData; const sheets = reportSheets(data); const s = data.summary;
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Lab Asset Report</title><style>body{font-family:Arial,'Noto Sans Thai',sans-serif;margin:24px;color:#0f172a}h1{margin-bottom:4px}h2{margin-top:24px;font-size:16px}.meta{color:#64748b}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0}.card{border:1px solid #cbd5e1;border-radius:8px;padding:10px}.card b{display:block;font-size:20px}table{width:100%;border-collapse:collapse;font-size:9px;page-break-inside:auto}th,td{border:1px solid #cbd5e1;padding:5px;text-align:left;vertical-align:top}th{background:#f1f5f9}tr{page-break-inside:avoid}@media print{button{display:none}@page{size:A4 landscape;margin:10mm}}</style></head><body><button onclick="window.print()">พิมพ์ / Save as PDF</button><h1>รายงานระบบ Lab QR Asset</h1><p class="meta">สร้างเมื่อ ${formatDate(data.generated_at)}</p><div class="cards"><div class="card">อุปกรณ์ทั้งหมด<b>${s.assets_total}</b></div><div class="card">ยืมเกินกำหนด<b>${s.overdue_borrows}</b></div><div class="card">แจ้งเสียรอตรวจ<b>${s.issue_pending}</b></div><div class="card">งาน Maintenance เปิด<b>${s.maintenance_open}</b></div><div class="card">ค่าใช้จ่าย<b>${reportMoney(s.maintenance_cost)}</b></div></div>${reportPrintTable('อุปกรณ์', sheets.Assets)}${reportPrintTable('ยืมเกินกำหนด', sheets.Overdue_Borrows)}${reportPrintTable('รายการแจ้งเสีย', sheets.Issue_Reports)}${reportPrintTable('Maintenance / Calibration', sheets.Maintenance)}${reportPrintTable('สอบเทียบใกล้ครบกำหนด', sheets.Calibration_Due)}</body></html>`;
  const win = window.open('', '_blank'); if (!win) return appAlert('Browser บล็อกหน้าต่าง PDF กรุณาอนุญาต Pop-up'); win.document.write(html); win.document.close();
}

function reportStat(label, value, tone = 'slate') { return `<div class="rounded-2xl border bg-white p-4 shadow-sm"><p class="text-sm text-slate-500">${label}</p><strong class="mt-1 block text-2xl text-${tone}-700">${value}</strong></div>`; }

function renderReportCharts(data) {
  reportCharts.forEach(chart => chart.destroy()); reportCharts = [];
  if (typeof Chart !== 'function') return;
  const statusEntries = Object.entries(data.charts.assets_by_status);
  reportCharts.push(new Chart(document.getElementById('reportAssetChart'), { type: 'doughnut', data: { labels: statusEntries.map(x => x[0]), datasets: [{ data: statusEntries.map(x => x[1]), backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#f97316'] }] }, options: { responsive: true, maintainAspectRatio: false } }));
  const jobEntries = Object.entries(data.charts.maintenance_by_type);
  reportCharts.push(new Chart(document.getElementById('reportMaintenanceChart'), { type: 'bar', data: { labels: jobEntries.map(x => reportJobType(x[0])), datasets: [{ label: 'จำนวนงาน', data: jobEntries.map(x => x[1]), backgroundColor: '#0f766e' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
}

function reportTableRows(rows, columns) {
  return rows.length ? rows.slice(0, 10).map(row => `<tr>${columns.map(column => `<td class="border-b px-3 py-2 text-sm">${escapeHtml(column(row) ?? '-')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}" class="p-6 text-center text-slate-500">ไม่มีข้อมูล</td></tr>`;
}

function reportTypeSelector(selected = 'operations') {
  return `<label class="text-sm font-semibold text-slate-700">ประเภทรายงาน<select id="reportTypeSelector" class="ml-2 rounded-xl border bg-white px-3 py-2"><option value="operations" ${selected === 'operations' ? 'selected' : ''}>ภาพรวมระบบ</option><option value="audit">Audit Log</option></select></label>`;
}

function renderReportDashboard(app, data) {
  reportDashboardData = data; const s = data.summary; const d = data.dimensions;
  app.innerHTML = `<div class="min-h-screen bg-slate-50"><header class="border-b bg-white px-6 py-4"><div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div><h1 class="text-2xl font-bold">Report Dashboard</h1><p class="text-sm text-slate-500">เลือกประเภทรายงาน แล้วใช้ตัวกรองและ Export ตามข้อมูลชุดนั้น</p></div><div class="flex flex-wrap items-center gap-2">${reportTypeSelector()}<button onclick="exportReportCsv()" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Export CSV</button><button onclick="exportReportExcel()" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Export Excel</button><button onclick="exportReportPdf()" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Export PDF</button><a href="#/admin" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">กลับ Admin</a></div></div></header><main class="mx-auto max-w-7xl space-y-5 p-6">
    <form id="reportFilterForm" class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-6"><label class="text-xs font-semibold">จากวันที่<input name="date_from" type="date" value="${escapeHtml(data.filters.date_from || '')}" class="mt-1 w-full rounded-lg border p-2 text-sm"></label><label class="text-xs font-semibold">ถึงวันที่<input name="date_to" type="date" value="${escapeHtml(data.filters.date_to || '')}" class="mt-1 w-full rounded-lg border p-2 text-sm"></label><label class="text-xs font-semibold">สถานที่<select name="location_id" class="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">ทั้งหมด</option>${d.locations.map(x => `<option value="${x.id}" ${Number(data.filters.location_id) === x.id ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('')}</select></label><label class="text-xs font-semibold">หมวดหมู่<select name="category_id" class="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">ทั้งหมด</option>${d.categories.map(x => `<option value="${x.id}" ${Number(data.filters.category_id) === x.id ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('')}</select></label><label class="text-xs font-semibold">สถานะอุปกรณ์<select name="asset_status" class="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">ทั้งหมด</option>${d.statuses.map(x => `<option ${data.filters.asset_status === x.name ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('')}</select></label><label class="text-xs font-semibold">ประเภทงาน<select name="job_type" class="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">ทั้งหมด</option>${['repair','preventive','calibration','inspection'].map(x => `<option value="${x}" ${data.filters.job_type === x ? 'selected' : ''}>${reportJobType(x)}</option>`).join('')}</select></label><button class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white md:col-span-3 xl:col-span-6">ใช้ตัวกรอง</button></form>
    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">${reportStat('อุปกรณ์ทั้งหมด', reportNumber(s.assets_total))}${reportStat('ยืมเกินกำหนด', reportNumber(s.overdue_borrows), 'red')}${reportStat('แจ้งเสียรอตรวจ', reportNumber(s.issue_pending), 'amber')}${reportStat('งาน Maintenance เปิด', reportNumber(s.maintenance_open), 'blue')}${reportStat('ค่าใช้จ่าย', reportMoney(s.maintenance_cost), 'emerald')}</section>
    <section class="grid gap-4 lg:grid-cols-2"><article class="rounded-2xl border bg-white p-5"><h2 class="font-bold">สถานะอุปกรณ์</h2><div class="h-72"><canvas id="reportAssetChart"></canvas></div></article><article class="rounded-2xl border bg-white p-5"><h2 class="font-bold">งานแยกตามประเภท</h2><div class="h-72"><canvas id="reportMaintenanceChart"></canvas></div></article></section>
    <section class="grid gap-4 lg:grid-cols-2"><article class="overflow-hidden rounded-2xl border bg-white"><h2 class="p-4 font-bold">ยืมเกินกำหนด (${s.overdue_borrows})</h2><table class="w-full"><thead class="bg-slate-50 text-left text-xs"><tr><th class="p-3">อุปกรณ์</th><th>ผู้ยืม</th><th>กำหนดคืน</th></tr></thead><tbody>${reportTableRows(data.overdue_borrows, [x => x.item?.asset_code, x => x.borrower_name, x => reportDate(x.expected_return_date)])}</tbody></table></article><article class="overflow-hidden rounded-2xl border bg-white"><h2 class="p-4 font-bold">สอบเทียบใกล้ครบกำหนด (${s.calibration_due})</h2><table class="w-full"><thead class="bg-slate-50 text-left text-xs"><tr><th class="p-3">อุปกรณ์</th><th>งาน</th><th>ครบกำหนด</th></tr></thead><tbody>${reportTableRows(data.calibration_due, [x => x.item?.asset_code, x => x.work_sn, x => reportDate(x.next_due_date)])}</tbody></table></article></section>
    <article class="overflow-hidden rounded-2xl border bg-white"><h2 class="p-4 font-bold">อุปกรณ์ที่ถูกรายงานปัญหาบ่อย</h2><table class="w-full"><thead class="bg-slate-50 text-left text-xs"><tr><th class="p-3">รหัส</th><th>ชื่อ</th><th>จำนวนครั้ง</th></tr></thead><tbody>${reportTableRows(data.frequent_issues, [x => x.asset_code, x => x.item_name, x => x.count])}</tbody></table></article>
  </main></div>`;
  document.getElementById('reportFilterForm').addEventListener('submit', async event => { event.preventDefault(); const query = new URLSearchParams(new FormData(event.target)); [...query.entries()].forEach(([key, value]) => { if (!value) query.delete(key); }); try { renderReportDashboard(app, await api(`/reports/dashboard?${query}`)); } catch (error) { appAlert(error.message || 'โหลดรายงานไม่สำเร็จ'); } });
  document.getElementById('reportTypeSelector').addEventListener('change', event => { if (event.target.value === 'audit') location.hash = '#/admin/audit-logs'; });
  renderReportCharts(data);
}
