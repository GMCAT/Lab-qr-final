// pages/borrow.js - extracted from lab-asset-tracker.html

    function renderBorrowView(app, item) {
      const currentUser = getCurrentUser();
      const activeBorrow = (item.borrow_logs || []).find(log => !log.return_date && log.approval_status !== 'rejected');
      const image = getThumbnail(item);
      const publicItemUrl = publicItemHref(item.asset_code);
      const activeStatus = activeBorrow?.approval_status || null;
      const activeBoxClass = activeStatus === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-blue-200 bg-blue-50 text-blue-900';
      const activeTitle = activeStatus === 'pending'
        ? 'คำขอยืมกำลังรออนุมัติ'
        : 'อุปกรณ์นี้กำลังถูกยืมอยู่';

      app.innerHTML = `
        <div class="min-h-screen bg-slate-50 px-4 py-6">
          <div class="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div class="bg-slate-950 p-4">
              <img src="${image}" alt="${escapeHtml(item.name)}" class="mx-auto h-56 w-full rounded-2xl bg-slate-900 object-contain">
            </div>
            <div class="p-5 sm:p-7">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-mono text-sm font-semibold text-blue-600">${escapeHtml(item.asset_code)}</p>
                  <h1 class="mt-1 text-2xl font-bold text-slate-950">${escapeHtml(item.name)}</h1>
                  <p class="mt-1 text-sm text-slate-500">${escapeHtml(item.brand?.name || '-')} · ${escapeHtml(item.model || '-')}</p>
                </div>
                <span class="rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(item.status?.name)}">${escapeHtml(item.status?.name || '-')}</span>
              </div>

              ${activeBorrow ? `
                <div class="mt-5 rounded-2xl border p-4 ${activeBoxClass}">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-bold">${activeTitle}</p>
                    <span class="rounded-full border px-3 py-1 text-xs font-semibold ${approvalStatusClass(activeStatus)}">${approvalStatusLabel(activeStatus)}</span>
                  </div>
                  <div class="mt-3 space-y-1 text-sm leading-6">
                    <p><b>ผู้ยืม:</b> ${escapeHtml(activeBorrow.borrower_name)}</p>
                    ${activeBorrow.borrower_position ? `<p><b>ตำแหน่ง:</b> ${escapeHtml(activeBorrow.borrower_position)}</p>` : ''}
                    <p><b>วันที่ส่งคำขอ:</b> ${formatDate(activeBorrow.borrow_date)}</p>
                    ${activeBorrow.expected_return_date ? `<p><b>กำหนดคืน:</b> ${formatDate(activeBorrow.expected_return_date)}</p>` : ''}
                    ${activeBorrow.approver_name ? `<p><b>ผู้อนุมัติที่ระบุ:</b> ${escapeHtml(activeBorrow.approver_name)}</p>` : ''}
                    ${activeBorrow.approved_by_name ? `<p><b>อนุมัติโดย:</b> ${escapeHtml(activeBorrow.approved_by_name)} (${formatDate(activeBorrow.approved_at)})</p>` : ''}
                    ${activeBorrow.note ? `<p><b>หมายเหตุ:</b> ${escapeHtml(activeBorrow.note)}</p>` : ''}
                  </div>
                  <div class="mt-4 grid gap-2 sm:grid-cols-2">
                    <button onclick='exportBorrowPdf(${JSON.stringify(JSON.stringify(activeBorrow))}, ${JSON.stringify(JSON.stringify(item))}, "borrow")' class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">Export แบบฟอร์มยืม</button>
                    ${activeBorrow.borrow_document_file_url ? `<a href="${absUrl(activeBorrow.borrow_document_file_url)}" target="_blank" class="rounded-xl bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700">เปิดไฟล์ที่นำเข้าแล้ว</a>` : `<span class="rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-800">ยังไม่ import แบบฟอร์ม</span>`}
                  </div>
                  ${activeStatus === 'pending' ? `
                    <form class="mt-4 rounded-xl border bg-white/70 p-3" onsubmit="uploadUserBorrowDocument(event, ${activeBorrow.id})">
                      <label class="block text-sm font-semibold">Import แบบฟอร์มยืมอุปกรณ์ที่ export/ลงชื่อแล้ว
                        <input name="borrow_document" type="file" accept=".pdf,image/*" required class="mt-2 w-full rounded-lg border bg-white p-2 text-sm">
                      </label>
                      <button class="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Upload / Import แบบฟอร์มยืม</button>
                    </form>` : ''}
                  ${activeStatus === 'approved' ? `<a href="#/my-borrows" class="mt-4 block w-full rounded-xl bg-violet-700 px-4 py-3 text-center font-semibold text-white hover:bg-violet-800">ไปหน้าแจ้งคืนอุปกรณ์</a>` : ''}
                  ${activeStatus === 'pending' && can('can_approve_borrow') ? `<a href="#/admin/borrow-approvals" class="mt-4 block w-full rounded-xl bg-amber-600 px-4 py-3 text-center font-semibold text-white hover:bg-amber-700">ไปหน้าอนุมัติ</a>` : ''}
                </div>` : `
                <form id="borrowForm" class="mt-6 space-y-4">
                  <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    หลัง Save ระบบจะสร้าง SN.อ้างอิงที่ไม่ซ้ำ เปลี่ยนสถานะเป็น “รอดำเนินการ” และให้ export PDF เอกสารยืม/คืนได้ทันที
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-slate-700">ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
                    <input name="borrower_name" required value="${escapeHtml(currentUser?.name || '')}" placeholder="เช่น นายสมชาย ใจดี" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-slate-700">ตำแหน่ง / แผนก</label>
                    <input name="borrower_position" value="${escapeHtml(currentUser?.position || '')}" placeholder="เช่น นักศึกษา / เจ้าหน้าที่ Lab / อาจารย์" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-slate-700">วันที่คืน</label>
                    <input name="expected_return_date" type="date" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-slate-700">ผู้อนุมัติที่ต้องการระบุ</label>
                    <input name="approver_name" placeholder="เช่น อ.สมชาย / admin" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-semibold text-slate-700">หมายเหตุ</label>
                    <textarea name="note" rows="3" placeholder="เช่น ใช้ทดลอง Lab A / ยืมเพื่อซ่อม / หมายเหตุเพิ่มเติม" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none"></textarea>
                  </div>
                  <p id="borrowError" class="hidden rounded-xl bg-red-50 p-3 text-sm text-red-700"></p>
                  <button id="borrowSubmitBtn" type="submit" class="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800">Save / ส่งคำขอยืม</button>
                </form>
                <div id="borrowResultBox" class="mt-5 hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"></div>`}

              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                <a href="${publicItemUrl}" class="rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">ดูหน้า QR</a>
                <a href="#/home" class="rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">กลับหน้าหลัก</a>
              </div>
            </div>
          </div>
        </div>
      `;

      const form = document.getElementById('borrowForm');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = document.getElementById('borrowSubmitBtn');
          const errorEl = document.getElementById('borrowError');
          const fd = new FormData(form);
          btn.disabled = true;
          btn.textContent = 'กำลังส่งคำขอ...';
          errorEl.classList.add('hidden');
          try {
            const result = await api(`/items/${encodeURIComponent(item.asset_code)}/borrow`, {
              method: 'POST',
              body: JSON.stringify({
                borrower_name: fd.get('borrower_name'),
                borrower_position: fd.get('borrower_position'),
                expected_return_date: fd.get('expected_return_date'),
                approver_name: fd.get('approver_name'),
                note: fd.get('note')
              })
            });
            const log = result.borrow_log;
            const box = document.getElementById('borrowResultBox');
            box.classList.remove('hidden');
            box.innerHTML = `
              <p class="font-bold">ส่งคำขอยืมสำเร็จ</p>
              <p class="mt-1 text-sm">SN.อ้างอิง: <span class="font-mono font-bold">${escapeHtml(log.request_sn || '-')}</span></p>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <button onclick='exportBorrowPdf(${JSON.stringify(JSON.stringify(log))}, ${JSON.stringify(JSON.stringify(item))}, "borrow")' class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Export PDF เอกสารยืม</button>
                <button onclick='exportBorrowPdf(${JSON.stringify(JSON.stringify(log))}, ${JSON.stringify(JSON.stringify(item))}, "return")' class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Export PDF เอกสารคืน</button>
              </div>
              <form class="mt-4 rounded-xl border border-emerald-200 bg-white/70 p-3" onsubmit="uploadUserBorrowDocument(event, ${log.id})">
                <label class="block text-sm font-semibold">Import แบบฟอร์มยืมอุปกรณ์หลัง export/ลงชื่อแล้ว
                  <input name="borrow_document" type="file" accept=".pdf,image/*" required class="mt-2 w-full rounded-lg border bg-white p-2 text-sm">
                </label>
                <button class="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Upload / Import แบบฟอร์มยืม</button>
              </form>
              <p class="mt-2 text-xs">เมื่อ import แล้ว Admin จะเห็นไฟล์ในเมนูคำขอยืมและสามารถอนุมัติได้</p>`;
            btn.textContent = 'ส่งคำขอแล้ว';
            btn.disabled = true;
          } catch (err) {
            errorEl.textContent = err.message || 'ส่งคำขอยืมไม่สำเร็จ';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Save / ส่งคำขอยืม';
          }
        };
      }
    }
