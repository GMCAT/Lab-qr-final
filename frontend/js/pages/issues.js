// Equipment issue reporting: User reports first; Admin decides whether item becomes broken or sent to repair.

function issueStatusLabel(status) {
  return {
    pending: 'รอ Admin ตรวจสอบ',
    confirmed: 'ยืนยันว่าเสีย',
    repair: 'ส่งซ่อม',
    rejected: 'ไม่พบปัญหา',
    resolved: 'แก้ไขแล้ว'
  }[status] || status || '-';
}

function issueStatusClass(status) {
  return {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-red-100 text-red-800 border-red-200',
    repair: 'bg-orange-100 text-orange-800 border-orange-200',
    rejected: 'bg-slate-100 text-slate-700 border-slate-200',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function issueSeverityLabel(severity) {
  return { low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง', critical: 'วิกฤต' }[severity] || severity || '-';
}

function issueEventLabel(type) {
  return {
    issue_reported: 'แจ้งปัญหา',
    issue_confirmed: 'Admin ยืนยันว่าอุปกรณ์เสีย',
    issue_sent_to_repair: 'Admin ส่งอุปกรณ์เข้าซ่อม',
    issue_rejected: 'Admin ปฏิเสธรายการ',
    issue_resolved: 'ปิดรายการปัญหา'
  }[type] || type || 'เปลี่ยนสถานะ';
}

function issueTimeline(history = []) {
  if (!history.length) return '';
  return `
    <details class="mt-4 rounded-xl border bg-slate-50 p-3">
      <summary class="cursor-pointer text-sm font-bold">ประวัติการเปลี่ยนสถานะ (${history.length})</summary>
      <ol class="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
        ${history.map(event => `
          <li class="relative text-sm">
            <span class="absolute -left-[1.33rem] top-1 h-3 w-3 rounded-full bg-red-600 ring-4 ring-slate-50"></span>
            <p class="font-semibold">${escapeHtml(issueEventLabel(event.event_type))}</p>
            <p class="text-xs text-slate-500">${formatDate(event.changed_at)} · ${escapeHtml(event.changed_by_name || 'system')}</p>
            ${event.reason ? `<p class="mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-700"><b>เหตุผล:</b> ${escapeHtml(event.reason)}</p>` : ''}
            ${event.note ? `<p class="mt-1 text-xs text-slate-600"><b>หมายเหตุ:</b> ${escapeHtml(event.note)}</p>` : ''}
          </li>`).join('')}
      </ol>
    </details>`;
}

function issueCard(issue, adminMode = false) {
  const item = issue.item || {};
  return `
    <article class="rounded-2xl border bg-white p-5 shadow-sm" data-issue-status="${escapeHtml(issue.status)}">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <img src="${getThumbnail(item)}" class="h-32 w-full rounded-xl bg-slate-100 object-contain lg:w-40" alt="${escapeHtml(item.name || '')}">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-sm font-bold text-blue-600">${escapeHtml(issue.issue_sn)}</span>
            <span class="rounded-full border px-3 py-1 text-xs font-semibold ${issueStatusClass(issue.status)}">${issueStatusLabel(issue.status)}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">ความรุนแรง: ${escapeHtml(issueSeverityLabel(issue.severity))}</span>
          </div>
          <h2 class="mt-2 text-lg font-bold">${escapeHtml(item.asset_code || '-')} · ${escapeHtml(item.name || '-')}</h2>
          <div class="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <p><b>ประเภท:</b> ${escapeHtml(issue.issue_type)}</p>
            <p><b>ผู้แจ้ง:</b> ${escapeHtml(issue.reporter_name)}</p>
            <p><b>วันที่แจ้ง:</b> ${formatDate(issue.created_at)}</p>
            <p><b>สถานะอุปกรณ์:</b> ${escapeHtml(item.status?.name || '-')}</p>
            ${issue.reviewed_by_name ? `<p><b>ตรวจโดย:</b> ${escapeHtml(issue.reviewed_by_name)}</p>` : ''}
            ${issue.reviewed_at ? `<p><b>วันที่ตรวจ:</b> ${formatDate(issue.reviewed_at)}</p>` : ''}
          </div>
          <div class="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><b>อาการ:</b> ${escapeHtml(issue.description)}</div>
          ${issue.review_note ? `<div class="mt-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><b>ผลตรวจ:</b> ${escapeHtml(issue.review_note)}</div>` : ''}
          ${issue.reject_reason ? `<div class="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><b>เหตุผลปฏิเสธ:</b> ${escapeHtml(issue.reject_reason)}</div>` : ''}
          ${issue.attachment_file_url ? `<a href="${absUrl(issue.attachment_file_url)}" target="_blank" rel="noopener" class="mt-3 inline-flex rounded-xl border px-3 py-2 text-sm font-semibold text-blue-700">เปิดไฟล์แนบ: ${escapeHtml(issue.attachment_file_name || 'ไฟล์')}</a>` : ''}
          ${issueTimeline(issue.status_history)}
        </div>
        ${adminMode && issue.status === 'pending' ? `
          <div class="flex shrink-0 flex-col gap-2 lg:w-48">
            <button onclick="reviewIssue(${issue.id}, 'confirmed')" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">ยืนยันว่าเสีย</button>
            <button onclick="reviewIssue(${issue.id}, 'repair')" class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">ส่งซ่อม</button>
            <button onclick="reviewIssue(${issue.id}, 'rejected')" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white">ไม่พบปัญหา</button>
          </div>` : ''}
        ${adminMode && ['confirmed', 'repair'].includes(issue.status) ? `
          <div class="flex shrink-0 flex-col gap-2"><a href="#/admin/maintenance/new/${encodeURIComponent(item.asset_code)}?issue=${issue.id}" class="rounded-xl bg-cyan-700 px-4 py-2 text-center text-sm font-semibold text-white">สร้างงานซ่อม</a><button onclick="resolveIssue(${issue.id})" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">ปิดโดยไม่สร้างงาน</button></div>` : ''}
      </div>
    </article>`;
}

function renderIssueReportForm(app, item) {
  app.innerHTML = `
    <div class="min-h-screen bg-slate-50 p-5">
      <main class="mx-auto max-w-3xl">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div><h1 class="text-2xl font-bold">แจ้งปัญหาอุปกรณ์</h1><p class="text-sm text-slate-500">รายการจะรอ Admin ตรวจสอบก่อนเปลี่ยนสถานะอุปกรณ์</p></div>
          <a href="#/my-issue-reports" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">รายการของฉัน</a>
        </div>
        <section class="rounded-2xl border bg-white p-5 shadow-sm">
          <div class="rounded-xl bg-slate-50 p-4">
            <p class="font-mono text-sm font-bold text-blue-600">${escapeHtml(item.asset_code)}</p>
            <h2 class="text-lg font-bold">${escapeHtml(item.name)}</h2>
            <p class="text-sm text-slate-500">สถานะปัจจุบัน: ${escapeHtml(item.status?.name || '-')}</p>
          </div>
          <form id="issueReportForm" class="mt-5 space-y-4">
            <label class="block text-sm font-semibold">ประเภทปัญหา
              <select name="issue_type" required class="mt-1 w-full rounded-xl border px-3 py-3">
                <option value="">เลือกประเภท</option>
                <option>เปิดไม่ติด</option><option>ทำงานผิดปกติ</option><option>ชำรุดทางกายภาพ</option>
                <option>อุปกรณ์เสริมหาย</option><option>ความปลอดภัย</option><option>อื่น ๆ</option>
              </select>
            </label>
            <label class="block text-sm font-semibold">ระดับความรุนแรง
              <select name="severity" required class="mt-1 w-full rounded-xl border px-3 py-3">
                <option value="low">ต่ำ</option><option value="medium" selected>ปานกลาง</option>
                <option value="high">สูง</option><option value="critical">วิกฤต / เสี่ยงอันตราย</option>
              </select>
            </label>
            <label class="block text-sm font-semibold">รายละเอียดอาการ
              <textarea name="description" required minlength="5" rows="4" class="mt-1 w-full rounded-xl border px-3 py-3" placeholder="ระบุอาการ วิธีที่พบ และเงื่อนไขที่เกิดปัญหา"></textarea>
            </label>
            <label class="block text-sm font-semibold">แนบรูปหรือเอกสาร (ถ้ามี)
              <input name="attachment" type="file" accept="image/*,.pdf" class="mt-1 w-full rounded-xl border p-3 text-sm">
            </label>
            <p id="issueSubmitMessage" class="hidden rounded-xl p-3 text-sm"></p>
            <button id="issueSubmitButton" class="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">ส่งรายการให้ Admin ตรวจสอบ</button>
          </form>
        </section>
      </main>
    </div>`;
  document.getElementById('issueReportForm').addEventListener('submit', event => {
    submitIssueReport(event, item.asset_code);
  });
}

function renderMyIssueReports(app, issues) {
  const successMessage = sessionStorage.getItem('issueReportSuccess');
  sessionStorage.removeItem('issueReportSuccess');
  app.innerHTML = `
    <div class="min-h-screen bg-slate-50">
      <header class="border-b bg-white px-6 py-4"><div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><h1 class="text-2xl font-bold">รายการแจ้งปัญหาของฉัน</h1><p class="text-sm text-slate-500">ติดตามผลตรวจสอบและประวัติสถานะ</p></div>
        ${isAdmin() ? '<a href="#/admin" class="rounded-xl border px-4 py-2 text-sm font-semibold">กลับ Admin</a>' : '<button onclick="logout()" class="rounded-xl border px-4 py-2 text-sm font-semibold">ออกจากระบบ</button>'}
      </div></header>
      <main class="mx-auto max-w-6xl space-y-4 p-6">
        ${successMessage ? `<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">${escapeHtml(successMessage)}</div>` : ''}
        ${issues.length ? issues.map(issue => issueCard(issue)).join('') : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ยังไม่มีรายการแจ้งปัญหา</div>'}
      </main>
    </div>`;
}

function renderAdminIssueReports(app, issues) {
  app.innerHTML = `
    <div class="min-h-screen bg-slate-50">
      <header class="border-b bg-white px-6 py-4"><div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><h1 class="text-2xl font-bold">ตรวจสอบรายการแจ้งปัญหา</h1><p class="text-sm text-slate-500">ยืนยันก่อนเปลี่ยนสถานะอุปกรณ์</p></div>
        <a href="#/admin" class="rounded-xl border px-4 py-2 text-sm font-semibold">กลับ Admin</a>
      </div></header>
      <main class="mx-auto max-w-6xl space-y-4 p-6">
        <select id="issueStatusFilter" class="rounded-xl border bg-white px-4 py-2 text-sm">
          <option value="all">ทุกสถานะ</option><option value="pending">รอตรวจสอบ</option>
          <option value="confirmed">ยืนยันว่าเสีย</option><option value="repair">ส่งซ่อม</option>
          <option value="rejected">ไม่พบปัญหา</option><option value="resolved">แก้ไขแล้ว</option>
        </select>
        <p id="issueCount" class="text-sm text-slate-500"></p><div id="issueList" class="space-y-4"></div>
      </main>
    </div>`;
  const render = () => {
    const status = document.getElementById('issueStatusFilter').value;
    const filtered = status === 'all' ? issues : issues.filter(issue => issue.status === status);
    document.getElementById('issueCount').textContent = `แสดง ${filtered.length} จาก ${issues.length} รายการ`;
    document.getElementById('issueList').innerHTML = filtered.length ? filtered.map(issue => issueCard(issue, true)).join('') : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ไม่พบรายการ</div>';
  };
  document.getElementById('issueStatusFilter').addEventListener('change', render);
  render();
}

async function submitIssueReport(event, assetCode) {
  event.preventDefault();
  if (!await appConfirm('ยืนยันส่งรายการแจ้งปัญหาให้ Admin ตรวจสอบ?')) return;
  const button = document.getElementById('issueSubmitButton');
  const message = document.getElementById('issueSubmitMessage');
  button.disabled = true;
  button.textContent = 'กำลังส่งรายการ...';
  message.className = 'rounded-xl bg-blue-50 p-3 text-sm text-blue-700';
  message.textContent = 'กำลังบันทึกรายการ กรุณารอสักครู่';
  try {
    const result = await apiForm(`/items/${encodeURIComponent(assetCode)}/issues`, new FormData(event.target));
    sessionStorage.setItem('issueReportSuccess', `แจ้งปัญหาสำเร็จ เลขที่ ${result.issue?.issue_sn || '-'} — รอ Admin ตรวจสอบ`);
    location.hash = '#/my-issue-reports';
  } catch (error) {
    message.className = 'rounded-xl bg-red-50 p-3 text-sm text-red-700';
    message.textContent = error.message || 'แจ้งปัญหาไม่สำเร็จ';
    button.disabled = false;
    button.textContent = 'ส่งรายการให้ Admin ตรวจสอบ';
  }
}

async function reviewIssue(id, decision) {
  const rejected = decision === 'rejected';
  const reason = rejected ? await appPrompt('เหตุผลที่ไม่รับรายการ (บังคับ)') : '';
  if (rejected && !reason?.trim()) return;
  const note = rejected ? '' : (await appPrompt('หมายเหตุผลการตรวจ (ถ้ามี)') || '');
  if (!await appConfirm('ยืนยันผลการตรวจสอบรายการนี้?')) return;
  try {
    await api(`/issue-reports/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, reason: reason?.trim(), note }) });
    appAlert('บันทึกผลตรวจสอบสำเร็จ'); router();
  } catch (error) { appAlert(error.message || 'บันทึกผลไม่สำเร็จ'); }
}

async function resolveIssue(id) {
  const note = await appPrompt('รายละเอียดการแก้ไขก่อนปิดงาน (ถ้ามี)') || '';
  if (!await appConfirm('ยืนยันปิดรายการและเปลี่ยนอุปกรณ์เป็น “ใช้งานได้”?')) return;
  try {
    await api(`/issue-reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) });
    appAlert('ปิดรายการสำเร็จ'); router();
  } catch (error) { appAlert(error.message || 'ปิดรายการไม่สำเร็จ'); }
}
