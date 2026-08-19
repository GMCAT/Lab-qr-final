// Return request workflow: borrower announces a return, then an authorized Admin verifies it.

function returnRequestCard(log, mode = 'mine') {
  const item = log.item || {};
  const canRequest = log.approval_status === 'approved'
    && !log.return_date
    && ['not_requested', 'rejected'].includes(log.return_status || 'not_requested');
  return `
    <article class="rounded-2xl border bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <img src="${getThumbnail(item)}" class="h-32 w-full rounded-xl bg-slate-100 object-contain lg:w-40" alt="${escapeHtml(item.name || '')}">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-sm font-bold text-blue-600">${escapeHtml(item.asset_code || '-')}</span>
            <span class="rounded-full border px-3 py-1 text-xs font-semibold ${returnStatusClass(log.return_status)}">${returnStatusLabel(log.return_status)}</span>
            ${item.status?.name ? `<span class="rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(item.status.name)}">${escapeHtml(item.status.name)}</span>` : ''}
          </div>
          <h2 class="mt-1 text-lg font-bold">${escapeHtml(item.name || '-')}</h2>
          <div class="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <p><b>รหัสคำขอ:</b> ${escapeHtml(log.request_sn || '-')}</p>
            <p><b>ผู้ยืม:</b> ${escapeHtml(log.borrower_name || '-')}</p>
            <p><b>วันที่ยืม:</b> ${formatDate(log.borrow_date)}</p>
            <p><b>กำหนดคืน:</b> ${formatDate(log.expected_return_date)}</p>
            ${log.return_requested_at ? `<p><b>แจ้งคืนเมื่อ:</b> ${formatDate(log.return_requested_at)}</p>` : ''}
            ${log.return_verified_by_name ? `<p><b>ตรวจโดย:</b> ${escapeHtml(log.return_verified_by_name)} (${formatDate(log.return_verified_at)})</p>` : ''}
          </div>
          ${log.return_note ? `<div class="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><b>หมายเหตุคืน:</b> ${escapeHtml(log.return_note)}</div>` : ''}
          ${log.return_reject_reason ? `<div class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><b>เหตุผลที่ตีกลับ:</b> ${escapeHtml(log.return_reject_reason)}</div>` : ''}
          <div class="mt-3 rounded-xl border p-3 text-sm ${log.return_document_file_url ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}">
            <b>แบบฟอร์มคืน:</b>
            ${log.return_document_file_url
              ? `<a href="${absUrl(log.return_document_file_url)}" target="_blank" rel="noopener" class="text-blue-700 underline">${escapeHtml(log.return_document_file_name || 'เปิดไฟล์')}</a>`
              : 'ไม่ได้แนบ'}
          </div>
          ${mode === 'mine' ? statusHistoryTimeline(log.status_history) : ''}
          ${mode === 'mine' && canRequest ? `
            <form class="mt-4 grid gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4" onsubmit="submitReturnRequest(event, ${log.id})">
              <label class="text-sm font-semibold">สภาพเบื้องต้น
                <select name="condition" class="mt-1 w-full rounded-lg border bg-white p-2">
                  <option value="normal">ปกติ</option>
                  <option value="damaged">พบความเสียหาย</option>
                </select>
              </label>
              <label class="text-sm font-semibold">หมายเหตุ
                <textarea name="note" rows="2" class="mt-1 w-full rounded-lg border bg-white p-2" placeholder="รายละเอียดการคืน (ถ้ามี)"></textarea>
              </label>
              <label class="text-sm font-semibold">แนบแบบฟอร์มคืน (ถ้ามี)
                <input name="return_document" type="file" accept=".pdf,image/*" class="mt-1 w-full rounded-lg border bg-white p-2 text-sm">
              </label>
              <button class="rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white hover:bg-violet-800">แจ้งคืนและส่งให้ Admin ตรวจสอบ</button>
            </form>` : ''}
        </div>
        ${mode === 'admin' ? `
          <div class="flex shrink-0 flex-col gap-2 lg:w-48">
            <button onclick="verifyReturn(${log.id}, 'normal')" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">รับคืน — ปกติ</button>
            <button onclick="verifyReturn(${log.id}, 'damaged')" class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">รับคืน — ชำรุด</button>
            <button onclick="rejectReturn(${log.id})" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">ตีกลับให้แก้ไข</button>
          </div>` : ''}
      </div>
    </article>`;
}

function returnPageShell(title, description, actions, body) {
  return `
    <div class="min-h-screen bg-slate-50">
      <header class="border-b bg-white px-6 py-4">
        <div class="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h1 class="text-2xl font-bold">${title}</h1><p class="text-sm text-slate-500">${description}</p></div>
          <div class="flex flex-wrap gap-2">${actions}</div>
        </div>
      </header>
      <main class="mx-auto max-w-6xl space-y-4 p-6">${body}</main>
    </div>`;
}

function renderMyBorrows(app, logs) {
  app.innerHTML = returnPageShell(
    'รายการยืมของฉัน',
    'แจ้งคืนแล้วรอ Admin ตรวจสอบก่อนปิดรายการ',
    `${isAdmin() ? '<a href="#/admin" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">กลับ Admin</a>' : ''}<button onclick="logout()" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">ออกจากระบบ</button>`,
    logs.length ? logs.map(log => returnRequestCard(log, 'mine')).join('') : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ยังไม่มีรายการยืมที่ผูกกับบัญชีนี้</div>'
  );
}

function renderReturnRequests(app, logs) {
  app.innerHTML = returnPageShell(
    'คำขอคืนอุปกรณ์',
    `รอตรวจรับ ${logs.length} รายการ — การรับคืนจะปิด BorrowLog และอัปเดตสถานะอุปกรณ์`,
    '<a href="#/admin/borrow-history" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">ประวัติทั้งหมด</a><a href="#/admin" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">กลับ Admin</a>',
    logs.length ? logs.map(log => returnRequestCard(log, 'admin')).join('') : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ไม่มีคำขอคืนที่รอตรวจรับ</div>'
  );
}

async function submitReturnRequest(event, logId) {
  event.preventDefault();
  if (!await appConfirm('ยืนยันแจ้งคืนอุปกรณ์และส่งให้ Admin ตรวจสอบ?')) return;
  const button = event.target.querySelector('button');
  button.disabled = true;
  try {
    await apiForm(`/borrow-logs/${logId}/return-request`, new FormData(event.target));
    appAlert('แจ้งคืนสำเร็จ กรุณารอ Admin ตรวจรับ');
    router();
  } catch (error) {
    appAlert(error.message || 'แจ้งคืนไม่สำเร็จ');
    button.disabled = false;
  }
}

async function verifyReturn(logId, condition) {
  const label = condition === 'damaged' ? 'ชำรุด (สถานะอุปกรณ์จะเป็น “เสีย”)' : 'ปกติ (สถานะอุปกรณ์จะเป็น “ใช้งานได้”)';
  if (!await appConfirm(`ยืนยันรับคืนอุปกรณ์สภาพ${label} และปิดรายการยืม?`)) return;
  try {
    await api(`/borrow-logs/${logId}/verify-return`, { method: 'POST', body: JSON.stringify({ condition }) });
    appAlert('ตรวจรับและปิดรายการยืมสำเร็จ');
    router();
  } catch (error) {
    appAlert(error.message || 'ตรวจรับคืนไม่สำเร็จ');
  }
}

async function rejectReturn(logId) {
  const reason = await appPrompt('ระบุเหตุผลที่ตีกลับ (บังคับ)');
  if (!reason?.trim()) return;
  try {
    await api(`/borrow-logs/${logId}/reject-return`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
    appAlert('ตีกลับคำขอคืนแล้ว');
    router();
  } catch (error) {
    appAlert(error.message || 'ตีกลับคำขอคืนไม่สำเร็จ');
  }
}
