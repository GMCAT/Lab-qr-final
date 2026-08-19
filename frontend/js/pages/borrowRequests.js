// pages/borrowRequests.js - extracted from lab-asset-tracker.html

    function borrowHistoryEventLabel(eventType) {
      const labels = {
        borrow_requested: 'ส่งคำขอยืม',
        borrow_approved: 'อนุมัติคำขอยืม',
        borrow_rejected: 'ปฏิเสธคำขอยืม',
        return_requested: 'แจ้งคืนอุปกรณ์',
        return_request_rejected: 'ตีกลับคำขอคืน',
        return_verified: 'ตรวจรับคืนเรียบร้อย',
        return_verified_damaged: 'ตรวจรับคืนแบบชำรุด'
      };
      return labels[eventType] || eventType || 'เปลี่ยนสถานะ';
    }

    function statusHistoryTimeline(history = []) {
      if (!history.length) {
        return '<p class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">รายการเดิมยังไม่มีข้อมูล timeline</p>';
      }
      return `
        <details class="mt-4 rounded-xl border bg-slate-50 p-3">
          <summary class="cursor-pointer text-sm font-bold text-slate-800">ประวัติการเปลี่ยนสถานะ (${history.length})</summary>
          <ol class="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
            ${history.map(event => `
              <li class="relative text-sm">
                <span class="absolute -left-[1.33rem] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-slate-50"></span>
                <p class="font-semibold text-slate-900">${escapeHtml(borrowHistoryEventLabel(event.event_type))}</p>
                <p class="text-xs text-slate-500">${formatDate(event.changed_at)} · ${escapeHtml(event.changed_by_name || 'system')}</p>
                ${event.from_status ? `<p class="mt-1 text-xs text-slate-600">${escapeHtml(event.from_status)} → ${escapeHtml(event.to_status)}</p>` : ''}
                ${event.reason ? `<p class="mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-700"><b>เหตุผล:</b> ${escapeHtml(event.reason)}</p>` : ''}
                ${event.note ? `<p class="mt-1 text-xs text-slate-600"><b>หมายเหตุ:</b> ${escapeHtml(event.note)}</p>` : ''}
              </li>`).join('')}
          </ol>
        </details>`;
    }

    function borrowOverallStatus(log) {
      if (['completed', 'damaged'].includes(log.return_status)) return 'returned';
      if (log.return_status === 'pending') return 'return_pending';
      return log.approval_status || 'pending';
    }

    function borrowLogCard(log, mode = 'approval') {
      const item = log.item || {};
      const img = getThumbnail(item);
      return `
        <div class="rounded-2xl border bg-white p-4 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-start">
            <img src="${img}" class="h-32 w-full rounded-xl bg-slate-100 object-contain md:w-40" alt="${escapeHtml(item.name || '')}">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-sm font-bold text-blue-600">${escapeHtml(item.asset_code || '-')}</span>
                ${log.request_sn ? `<span class="font-mono rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">${escapeHtml(log.request_sn)}</span>` : ''}
                <span class="rounded-full border px-3 py-1 text-xs font-semibold ${approvalStatusClass(log.approval_status)}">${approvalStatusLabel(log.approval_status)}</span>
                ${log.approval_status === 'approved' ? `<span class="rounded-full border px-3 py-1 text-xs font-semibold ${returnStatusClass(log.return_status)}">${returnStatusLabel(log.return_status)}</span>` : ''}
                ${item.status?.name ? `<span class="rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(item.status.name)}">${escapeHtml(item.status.name)}</span>` : ''}
              </div>
              <h3 class="mt-1 text-lg font-bold text-slate-950">${escapeHtml(item.name || '-')}</h3>
              <p class="text-sm text-slate-500">${escapeHtml(item.brand?.name || '-')} · ${escapeHtml(item.model || '-')} · SN: ${escapeHtml(item.serial_no || '-')}</p>
              <div class="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <p><b>ผู้ยืม:</b> ${escapeHtml(log.borrower_name)}</p>
                <p><b>ตำแหน่ง:</b> ${escapeHtml(log.borrower_position || '-')}</p>
                <p><b>วันที่ส่งคำขอ:</b> ${formatDate(log.borrow_date)}</p>
                <p><b>กำหนดคืน:</b> ${formatDate(log.expected_return_date)}</p>
                <p><b>ผู้อนุมัติที่ระบุ:</b> ${escapeHtml(log.approver_name || '-')}</p>
                <p><b>ที่เก็บ:</b> ${escapeHtml(item.location?.name || '-')}</p>
                ${log.approved_by_name ? `<p><b>อนุมัติโดย:</b> ${escapeHtml(log.approved_by_name)} (${formatDate(log.approved_at)})</p>` : ''}
                ${log.rejected_by_name ? `<p><b>ไม่อนุมัติโดย:</b> ${escapeHtml(log.rejected_by_name)} (${formatDate(log.rejected_at)})</p>` : ''}
                ${log.return_date ? `<p><b>คืนแล้ว:</b> ${formatDate(log.return_date)}</p>` : ''}
                ${log.return_requested_at ? `<p><b>แจ้งคืน:</b> ${formatDate(log.return_requested_at)}</p>` : ''}
                ${log.return_verified_by_name ? `<p><b>ตรวจรับโดย:</b> ${escapeHtml(log.return_verified_by_name)}</p>` : ''}
              </div>
              ${mode === 'history' ? statusHistoryTimeline(log.status_history) : ''}
              ${log.note ? `<div class="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><b>หมายเหตุ:</b> ${escapeHtml(log.note)}</div>` : ''}
              ${log.reject_reason ? `<div class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><b>เหตุผลไม่อนุมัติ:</b> ${escapeHtml(log.reject_reason)}</div>` : ''}
              ${log.return_reject_reason ? `<div class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><b>เหตุผลตีกลับการคืน:</b> ${escapeHtml(log.return_reject_reason)}</div>` : ''}
              <div class="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <div class="rounded-xl border p-3 ${log.borrow_document_file_url ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}">
                  <b>เอกสารยืม:</b> ${log.borrow_document_file_url ? `<a href="${absUrl(log.borrow_document_file_url)}" target="_blank" class="text-blue-700 underline">${escapeHtml(log.borrow_document_file_name || 'เปิดไฟล์')}</a>` : 'ยังไม่อัปโหลด'}
                </div>
                <div class="rounded-xl border p-3 ${log.return_document_file_url ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}">
                  <b>เอกสารคืน:</b> ${log.return_document_file_url ? `<a href="${absUrl(log.return_document_file_url)}" target="_blank" class="text-blue-700 underline">${escapeHtml(log.return_document_file_name || 'เปิดไฟล์')}</a>` : 'ยังไม่อัปโหลด'}
                </div>
              </div>
              ${mode === 'approval' && log.approval_status === 'pending' ? `
                <form class="mt-3 grid gap-3 rounded-xl border bg-slate-50 p-3 md:grid-cols-2" onsubmit="uploadBorrowDocuments(event, ${log.id})">
                  <label class="text-sm font-semibold">อัปโหลดเอกสารยืม
                    <input name="borrow_document" type="file" accept=".pdf,image/*" class="mt-1 w-full rounded-lg border bg-white p-2 text-sm">
                  </label>
                  <label class="text-sm font-semibold">อัปโหลดเอกสารคืน
                    <input name="return_document" type="file" accept=".pdf,image/*" class="mt-1 w-full rounded-lg border bg-white p-2 text-sm">
                  </label>
                  <button class="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white md:col-span-2">บันทึกเอกสาร</button>
                </form>` : ''}
            </div>
            <div class="flex shrink-0 flex-col gap-2 md:w-44">
              <a href="${publicItemHref(item.asset_code || '')}" class="rounded-xl border px-4 py-2 text-center text-sm font-semibold hover:bg-slate-50">หน้า QR</a>
              ${mode === 'approval' && log.approval_status === 'pending' ? `
                <button onclick="approveBorrow(${log.id})" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">อนุมัติ</button>
                ${(!log.borrow_document_file_url || !log.return_document_file_url) ? `<p class="text-xs text-amber-700">ต้องมีแบบฟอร์มยืมก่อนอนุมัติ</p>` : ''}
                <button onclick="rejectBorrow(${log.id})" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">ไม่อนุมัติ</button>
              ` : ''}
              ${mode !== 'approval' && log.return_status === 'pending' ? '<a href="#/admin/return-requests" class="rounded-xl bg-violet-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-violet-700">ไปหน้าตรวจรับคืน</a>' : ''}
            </div>
          </div>
        </div>`;
    }


    function renderBorrowApprovals(app, logs) {
      app.innerHTML = `
        <div class="min-h-screen bg-slate-50">
          <header class="border-b bg-white px-6 py-4">
            <div class="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 class="text-2xl font-bold">คำขอยืมอุปกรณ์</h1>
                <p class="text-sm text-slate-500">Admin ตรวจแบบฟอร์มยืมที่ user import มา หรืออัปโหลดเอง แล้วกดอนุมัติ</p>
              </div>
              <div class="flex gap-2">
                ${can('can_manage_items') ? '<a href="#/admin/issue-reports" class="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">รายการแจ้งเสีย</a>' : ''}
                <a href="#/admin/borrow-history" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">ประวัติทั้งหมด</a>
                <a href="#/admin" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับ Admin</a>
              </div>
            </div>
          </header>
          <main class="mx-auto max-w-6xl space-y-4 p-6">
            ${logs.length ? logs.map(log => borrowLogCard(log, 'approval')).join('') : `
              <div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ยังไม่มีคำขอยืมที่รออนุมัติ</div>
            `}
          </main>
        </div>`;
    }


    function renderBorrowHistory(app, logs) {
      const counts = logs.reduce((acc, log) => {
        const key = log.approval_status || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      app.innerHTML = `
        <div class="min-h-screen bg-slate-50">
          <header class="border-b bg-white px-6 py-4">
            <div class="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 class="text-2xl font-bold">ประวัติยืม-คืน / คำขอทั้งหมด</h1>
                <p class="text-sm text-slate-500">Pending: ${counts.pending || 0} · Approved: ${counts.approved || 0} · Rejected: ${counts.rejected || 0}</p>
              </div>
              <div class="flex gap-2">
                <a href="#/admin/borrow-requests" class="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">คำขอยืม</a>
                <a href="#/admin/return-requests" class="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">คำขอคืน</a>
                <a href="#/admin" class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">กลับ Admin</a>
              </div>
            </div>
          </header>
          <main class="mx-auto max-w-6xl space-y-4 p-6">
            <section class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
              <input id="borrowHistorySearch" type="search" placeholder="ค้นหารหัส ผู้ยืม อุปกรณ์" class="rounded-xl border px-3 py-2 text-sm md:col-span-2">
              <select id="borrowHistoryStatus" class="rounded-xl border px-3 py-2 text-sm">
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
                <option value="return_pending">รอตรวจรับคืน</option>
                <option value="returned">คืนแล้ว</option>
              </select>
              <input id="borrowHistoryDate" type="date" class="rounded-xl border px-3 py-2 text-sm" aria-label="วันที่ส่งคำขอ">
            </section>
            <p id="borrowHistoryResultCount" class="text-sm text-slate-500"></p>
            <div id="borrowHistoryList" class="space-y-4"></div>
          </main>
        </div>`;

      const renderFilteredHistory = () => {
        const keyword = document.getElementById('borrowHistorySearch').value.trim().toLowerCase();
        const status = document.getElementById('borrowHistoryStatus').value;
        const date = document.getElementById('borrowHistoryDate').value;
        const filtered = logs.filter(log => {
          const item = log.item || {};
          const haystack = [log.request_sn, log.borrower_name, item.asset_code, item.name, item.serial_no]
            .map(value => String(value || '').toLowerCase()).join(' ');
          const matchesKeyword = !keyword || haystack.includes(keyword);
          const matchesStatus = status === 'all' || borrowOverallStatus(log) === status;
          const matchesDate = !date || String(log.borrow_date || '').slice(0, 10) === date;
          return matchesKeyword && matchesStatus && matchesDate;
        });
        document.getElementById('borrowHistoryResultCount').textContent = `แสดง ${filtered.length} จาก ${logs.length} รายการ`;
        document.getElementById('borrowHistoryList').innerHTML = filtered.length
          ? filtered.map(log => borrowLogCard(log, 'history')).join('')
          : '<div class="rounded-2xl border bg-white p-10 text-center text-slate-500">ไม่พบประวัติที่ตรงกับตัวกรอง</div>';
      };
      ['borrowHistorySearch', 'borrowHistoryStatus', 'borrowHistoryDate'].forEach(id => {
        document.getElementById(id).addEventListener(id === 'borrowHistorySearch' ? 'input' : 'change', renderFilteredHistory);
      });
      renderFilteredHistory();
    }


    function exportBorrowPdf(logJson, itemJson, type) {
      const log = JSON.parse(logJson);
      const item = JSON.parse(itemJson);
      const title = type === 'return' ? 'เอกสารคืนอุปกรณ์' : 'เอกสารยืมอุปกรณ์';
      const docNo = `${log.request_sn || '-'}-${type === 'return' ? 'RETURN' : 'BORROW'}`;
      const html = `
        <!doctype html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>
        <style>
          body{font-family:Arial,'Noto Sans Thai',sans-serif;margin:32px;color:#111827}.box{border:1px solid #111;padding:18px;margin-top:16px}h1{text-align:center;margin:0 0 6px}.muted{color:#64748b}.grid{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:70px}.line{border-top:1px solid #111;text-align:center;padding-top:8px}.sn{font-family:monospace;font-size:18px;font-weight:bold}@media print{button{display:none}}
        </style></head><body>
          <button onclick="window.print()">พิมพ์ / Save as PDF</button>
          <h1>${title}</h1>
          <p style="text-align:center" class="muted">Lab QR Asset Tracker</p>
          <div class="box"><div class="grid">
            <b>SN.อ้างอิง</b><span class="sn">${escapeHtml(docNo)}</span>
            <b>รหัสคำขอ</b><span>${escapeHtml(log.request_sn || '-')}</span>
            <b>รหัสอุปกรณ์</b><span>${escapeHtml(item.asset_code || '-')}</span>
            <b>ชื่ออุปกรณ์</b><span>${escapeHtml(item.name || '-')}</span>
            <b>รุ่น / Serial</b><span>${escapeHtml(item.model || '-')} / ${escapeHtml(item.serial_no || '-')}</span>
            <b>ผู้ยืม</b><span>${escapeHtml(log.borrower_name || '-')}</span>
            <b>ตำแหน่ง</b><span>${escapeHtml(log.borrower_position || '-')}</span>
            <b>วันที่ยืม/ส่งคำขอ</b><span>${formatDateOnly(log.borrow_date)}</span>
            <b>กำหนดคืน</b><span>${formatDateOnly(log.expected_return_date)}</span>
            <b>ผู้อนุมัติที่ระบุ</b><span>${escapeHtml(log.approver_name || '-')}</span>
            <b>หมายเหตุ</b><span>${escapeHtml(log.note || '-')}</span>
          </div></div>
          <div class="sign"><div class="line">ผู้ยืม</div><div class="line">ผู้อนุมัติ / ผู้รับคืน</div></div>
        </body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 300);
    }


    async function uploadUserBorrowDocument(event, logId) {
      event.preventDefault();
      const fd = new FormData(event.target);
      try {
        await apiForm(`/borrow-logs/${logId}/user-borrow-document`, fd);
        appAlert('Import แบบฟอร์มยืมสำเร็จ');
        router();
      } catch (err) {
        appAlert(err.message || 'Import แบบฟอร์มยืมไม่สำเร็จ');
      }
    }


    async function uploadBorrowDocuments(event, logId) {
      event.preventDefault();
      const fd = new FormData(event.target);
      try {
        await apiForm(`/borrow-logs/${logId}/documents`, fd);
        appAlert('อัปโหลดเอกสารสำเร็จ');
        router();
      } catch (err) {
        appAlert(err.message || 'อัปโหลดเอกสารไม่สำเร็จ');
      }
    }


    async function approveBorrow(logId) {
      if (!await appConfirm('ยืนยันอนุมัติคำขอยืมนี้?')) return;
      try {
        await api(`/borrow-logs/${logId}/approve`, { method: 'POST', body: JSON.stringify({}) });
        appAlert('อนุมัติสำเร็จ');
        router();
      } catch (err) {
        appAlert(err.message || 'อนุมัติไม่สำเร็จ');
      }
    }


    async function rejectBorrow(logId) {
      const reason = await appPrompt('เหตุผลที่ไม่อนุมัติ (บังคับ)');
      if (!reason?.trim()) return;
      try {
        await api(`/borrow-logs/${logId}/reject`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
        appAlert('ปฏิเสธคำขอสำเร็จ');
        router();
      } catch (err) {
        appAlert(err.message || 'ปฏิเสธไม่สำเร็จ');
      }
    }
