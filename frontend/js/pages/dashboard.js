// pages/dashboard.js - extracted from lab-asset-tracker.html



    function renderAccessDenied(app) {
      app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div class="max-w-md w-full bg-white rounded-2xl border p-6 text-center shadow-sm">
            <div class="text-5xl mb-3">🔒</div>
            <h1 class="text-2xl font-bold mb-2">ไม่มีสิทธิ์เข้าหน้านี้</h1>
            <p class="text-gray-500 mb-5">บัญชี user ใช้สำหรับดูหน้า QR และยืมอุปกรณ์เท่านั้น หากต้องการจัดการระบบให้ติดต่อ Super Admin</p>
            <a href="#/login" class="inline-block px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold">กลับหน้า Login</a>
          </div>
        </div>`;
    }

    function renderAdminDashboard(app, items) {
      const stats = {
        total: items.length,
        ok: items.filter(i => i.status.name === 'ใช้งานได้').length,
        pending: items.filter(i => i.status.name === 'รอดำเนินการ').length,
        borrow: items.filter(i => i.status.name === 'ระหว่างยืม').length,
        repair: items.filter(i => i.status.name === 'ส่งซ่อม').length,
        broken: items.filter(i => i.status.name === 'เสีย').length
      };

      let currentFilter = 'all';

      app.innerHTML = `
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b px-6 py-4 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Admin - Lab Asset</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500 hidden sm:inline">${escapeHtml(getCurrentUser()?.name || '')} <span class="text-xs px-2 py-0.5 rounded-full ${isSuperAdmin() ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${roleLabel()}</span></span>
        ${can('can_manage_items') ? `<a href="#/admin/item/new" class="px-6 py-3 rounded-lg font-semibold text-base bg-[#2563EB] text-white hover:bg-blue-700">+ เพิ่มอุปกรณ์ใหม่</a>` : ''}
        ${can('can_approve_borrow') ? `<a href="#/admin/borrow-requests" class="relative px-4 py-2 rounded-lg text-sm border border-amber-200 text-amber-700 hover:bg-amber-50">คำขอยืม${stats.pending ? `<span class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">${stats.pending}</span>` : ''}</a><a href="#/admin/return-requests" class="px-4 py-2 rounded-lg text-sm border border-violet-200 text-violet-700 hover:bg-violet-50">คำขอคืน</a>` : ''}
        ${can('can_approve_borrow') ? `<a href="#/admin/borrow-history" class="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">ประวัติยืม-คืน</a>` : ''}
        ${isAdmin() ? `<a href="#/admin/master-data" class="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">ตั้งค่าข้อมูล</a>` : ''}
        ${isSuperAdmin() ? `<a href="#/admin/users" class="px-4 py-2 rounded-lg text-sm border border-purple-200 text-purple-700 hover:bg-purple-50">Super Admin</a>` : ''}
        <button onclick="logout()" class="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">ออกจากระบบ</button>
      </div>
    </header>

    <div class="p-6">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="col-span-2 lg:col-span-1 bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="all">
          <p class="text-gray-500 text-sm mb-3">Total Assets</p>
          <div class="flex items-center gap-4">
            <div class="relative w-24 h-24 flex-shrink-0">
              <canvas id="statusChart"></canvas>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <p class="text-2xl font-bold text-gray-900">${stats.total}</p>
                <p class="text-[10px] text-gray-500">อุปกรณ์ทั้งหมด</p>
              </div>
            </div>
            <div class="flex-1 space-y-1 text-xs">
              ${legendItem('#16A34A', 'ใช้งานได้', stats.ok, stats.total)}
              ${legendItem('#F59E0B', 'รอดำเนินการ', stats.pending, stats.total)}
              ${legendItem('#3B82F6', 'ระหว่างยืม', stats.borrow, stats.total)}
              ${legendItem('#F59E0B', 'ส่งซ่อม', stats.repair, stats.total)}
              ${legendItem('#DC2626', 'เสีย', stats.broken, stats.total)}
            </div>
          </div>
        </div>
        <div class="bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="ใช้งานได้"><p class="text-gray-500">ใช้งานได้</p><p class="text-3xl font-bold text-[#16A34A]">${stats.ok} <span class="text-sm text-gray-400">(${((stats.ok / stats.total) * 100).toFixed(1)}%)</span></p></div>
        <div class="relative bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="รอดำเนินการ">${stats.pending ? `<span class="absolute right-3 top-3 h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100"></span>` : ''}<p class="text-gray-500">รอดำเนินการ</p><p class="text-3xl font-bold text-amber-500">${stats.pending} <span class="text-sm text-gray-400">(${((stats.pending / stats.total) * 100).toFixed(1)}%)</span></p></div>
        <div class="bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="ระหว่างยืม"><p class="text-gray-500">ระหว่างยืม</p><p class="text-3xl font-bold text-blue-500">${stats.borrow} <span class="text-sm text-gray-400">(${((stats.borrow / stats.total) * 100).toFixed(1)}%)</span></p></div>
        <div class="bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="ส่งซ่อม"><p class="text-gray-500">ส่งซ่อม</p><p class="text-3xl font-bold text-[#F59E0B]">${stats.repair} <span class="text-sm text-gray-400">(${((stats.repair / stats.total) * 100).toFixed(1)}%)</span></p></div>
        <div class="bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition" data-filter="เสีย"><p class="text-gray-500">เสีย</p><p class="text-3xl font-bold text-[#DC2626]">${stats.broken} <span class="text-sm text-gray-400">(${((stats.broken / stats.total) * 100).toFixed(1)}%)</span></p></div>
      </div>

      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="p-4 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div class="flex items-center gap-3 w-full md:w-auto">
            <button id="bulkDownloadBtn" class="hidden px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              ดาวน์โหลด QR (<span id="selectedCount">0</span>)
            </button>
            <input id="search" type="text" placeholder="ค้นหา รหัส/SN/ชื่อ..."
                   class="flex-1 md:w-80 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          </div>

          <span id="filterLabel" class="text-sm text-gray-500 whitespace-nowrap">แสดง: <span class="font-semibold text-gray-900">ทั้งหมด</span></span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-50 text-sm">
              <tr>
                <th class="px-4 py-3 w-12"><input type="checkbox" id="selectAllCheckbox" class="w-4 h-4"></th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">รูป</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">รหัสเครื่อง</th>
                <th class="p-4 text-left text-sm font-semibold text-gray-600">ชื่ออุปกรณ์</th>
                <th class="p-4 text-left text-sm font-semibold text-gray-600">สถานะ</th>
                <th class="p-4 text-center text-sm font-semibold text-gray-600">QR</th>
                <th class="p-4 text-right text-sm font-semibold text-gray-600">Action</th>
                <th class="p-4 text-right text-sm font-semibold text-gray-600">วันที่อัปโหลด</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              ${renderTableRows(items)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Popup Bulk Download -->
      <div id="bulkModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div class="p-5 border-b flex justify-between items-center">
            <h3 class="text-lg font-bold">เลือก QR ที่ต้องการดาวน์โหลด</h3>
            <button onclick="closeBulkModal()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div class="p-4 flex-1 overflow-y-auto">
            <div class="flex items-center justify-between mb-3">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" id="modalSelectAll" class="w-4 h-4" checked>
                เลือกทั้งหมด
              </label>
              <span class="text-sm text-gray-500">จะดาวน์โหลด: <span id="modalCount" class="font-semibold text-blue-600">0</span> รายการ</span>
            </div>
            <div id="modalList" class="space-y-2">
              <!-- รายการจะถูกเติมด้วย JS -->
            </div>
          </div>

          <div class="p-4 border-t flex justify-end gap-3">
            <button onclick="closeBulkModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">ยกเลิก</button>
            <button id="confirmDownloadBtn" onclick="confirmBulkDownload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              ดาวน์โหลด ZIP
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
`;

      // ===== Bulk Download QR Logic (scoped per render) =====
      let selectedCodes = new Set();
      let allItems = items;

      function bindBulkEvents() {
        document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
          const checked = e.target.checked;
          document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = checked;
            const code = cb.dataset.code;
            if (checked) selectedCodes.add(code);
            else selectedCodes.delete(code);
          });
          updateBulkButton();
        });

        // เลือกทีละแถว - ใช้ event delegation
        document.getElementById('tableBody')?.addEventListener('change', (e) => {
          if (e.target.classList.contains('row-checkbox')) {
            const code = e.target.dataset.code;
            if (e.target.checked) selectedCodes.add(code);
            else selectedCodes.delete(code);

            const allCheckboxes = document.querySelectorAll('.row-checkbox');
            const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
            document.getElementById('selectAllCheckbox').checked = allChecked;

            updateBulkButton();
          }
        });

        document.getElementById('bulkDownloadBtn')?.addEventListener('click', openBulkModal);

        document.getElementById('modalSelectAll')?.addEventListener('change', (e) => {
          document.querySelectorAll('.modal-checkbox').forEach(cb => cb.checked = e.target.checked);
          updateModalCount();
        });

        document.getElementById('modalList')?.addEventListener('change', (e) => {
          if (e.target.classList.contains('modal-checkbox')) {
            updateModalCount();
            const all = document.querySelectorAll('.modal-checkbox');
            const allChecked = Array.from(all).every(cb => cb.checked);
            document.getElementById('modalSelectAll').checked = allChecked;
          }
        });
      }

      function updateBulkButton() {
        const btn = document.getElementById('bulkDownloadBtn');
        if (!btn) return;
        const count = selectedCodes.size;
        document.getElementById('selectedCount').textContent = count;
        btn.classList.toggle('hidden', count === 0);
      }

      function openBulkModal() {
        const modal = document.getElementById('bulkModal');
        const list = document.getElementById('modalList');

        list.innerHTML = Array.from(selectedCodes).map(code => {
          const item = allItems.find(i => i.asset_code === code);
          return `
      <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <input type="checkbox" class="modal-checkbox w-4 h-4" data-code="${code}" checked>
        <div class="flex-1">
          <p class="font-mono text-sm font-semibold">${code}</p>
          <p class="text-xs text-gray-500">${item?.name || '-'}</p>
        </div>
      </label>
    `;
        }).join('');

        updateModalCount();
        modal.classList.remove('hidden');
      }

      bindBulkEvents();
      updateBulkButton();

      setTimeout(() => {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['ใช้งานได้', 'รอดำเนินการ', 'ระหว่างยืม', 'ส่งซ่อม', 'เสีย'],
            datasets: [{
              data: [stats.ok, stats.pending, stats.borrow, stats.repair, stats.broken],
              backgroundColor: ['#16A34A', '#F59E0B', '#3B82F6', '#EAB308', '#DC2626'],
              borderWidth: 0,
              cutout: '70%'
            }]
          },
          options: {
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: function (context) {
                    const value = context.raw;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return `${context.label}: ${value} (${percent}%)`;
                  }
                }
              }
            },
            maintainAspectRatio: false
          }
        });
      }, 0);

      function applyFilter() {
        const keyword = document.getElementById('search').value.toLowerCase();
        let filtered = items;
        if (currentFilter !== 'all') {
          filtered = filtered.filter(i => i.status.name === currentFilter);
        }
        if (keyword) {
          filtered = filtered.filter(i =>
            i.asset_code.toLowerCase().includes(keyword) ||
            i.name.toLowerCase().includes(keyword) ||
            (i.serial_no && i.serial_no.toLowerCase().includes(keyword))
          );
        }
        document.getElementById('tableBody').innerHTML = renderTableRows(filtered);
        document.getElementById('filterLabel').textContent = `แสดง: ${currentFilter === 'all' ? 'ทั้งหมด' : currentFilter}`;
      }

      document.querySelectorAll('[data-filter]').forEach(card => {
        card.onclick = () => {
          currentFilter = card.dataset.filter;
          document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('ring-2', 'ring-[#2563EB]'));
          card.classList.add('ring-2', 'ring-[#2563EB]');
          applyFilter();
        };
      });

      document.getElementById('search').oninput = applyFilter;
      document.querySelector('[data-filter="all"]').classList.add('ring-2', 'ring-[#2563EB]');
    }


      function bindBulkEvents() {
        document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
          const checked = e.target.checked;
          document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = checked;
            const code = cb.dataset.code;
            if (checked) selectedCodes.add(code);
            else selectedCodes.delete(code);
          });
          updateBulkButton();
        });

        // เลือกทีละแถว - ใช้ event delegation
        document.getElementById('tableBody')?.addEventListener('change', (e) => {
          if (e.target.classList.contains('row-checkbox')) {
            const code = e.target.dataset.code;
            if (e.target.checked) selectedCodes.add(code);
            else selectedCodes.delete(code);

            const allCheckboxes = document.querySelectorAll('.row-checkbox');
            const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
            document.getElementById('selectAllCheckbox').checked = allChecked;

            updateBulkButton();
          }
        });

        document.getElementById('bulkDownloadBtn')?.addEventListener('click', openBulkModal);

        document.getElementById('modalSelectAll')?.addEventListener('change', (e) => {
          document.querySelectorAll('.modal-checkbox').forEach(cb => cb.checked = e.target.checked);
          updateModalCount();
        });

        document.getElementById('modalList')?.addEventListener('change', (e) => {
          if (e.target.classList.contains('modal-checkbox')) {
            updateModalCount();
            const all = document.querySelectorAll('.modal-checkbox');
            const allChecked = Array.from(all).every(cb => cb.checked);
            document.getElementById('modalSelectAll').checked = allChecked;
          }
        });
      }


      function updateBulkButton() {
        const btn = document.getElementById('bulkDownloadBtn');
        if (!btn) return;
        const count = selectedCodes.size;
        document.getElementById('selectedCount').textContent = count;
        btn.classList.toggle('hidden', count === 0);
      }


      function openBulkModal() {
        const modal = document.getElementById('bulkModal');
        const list = document.getElementById('modalList');

        list.innerHTML = Array.from(selectedCodes).map(code => {
          const item = allItems.find(i => i.asset_code === code);
          return `
      <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <input type="checkbox" class="modal-checkbox w-4 h-4" data-code="${code}" checked>
        <div class="flex-1">
          <p class="font-mono text-sm font-semibold">${code}</p>
          <p class="text-xs text-gray-500">${item?.name || '-'}</p>
        </div>
      </label>
    `;
        }).join('');

        updateModalCount();
        modal.classList.remove('hidden');
      }


      function applyFilter() {
        const keyword = document.getElementById('search').value.toLowerCase();
        let filtered = items;
        if (currentFilter !== 'all') {
          filtered = filtered.filter(i => i.status.name === currentFilter);
        }
        if (keyword) {
          filtered = filtered.filter(i =>
            i.asset_code.toLowerCase().includes(keyword) ||
            i.name.toLowerCase().includes(keyword) ||
            (i.serial_no && i.serial_no.toLowerCase().includes(keyword))
          );
        }
        document.getElementById('tableBody').innerHTML = renderTableRows(filtered);
        document.getElementById('filterLabel').textContent = `แสดง: ${currentFilter === 'all' ? 'ทั้งหมด' : currentFilter}`;
      }


    function legendItem(color, label, value, total) {
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      return `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:${color}"></span>
        <span class="text-gray-600 truncate">${label}</span>
      </div>
      <span class="font-semibold text-gray-900 whitespace-nowrap">${value} (${percentage}%)</span>
    </div>
  `;
    }


    function fileCard(file) {
      return `
        <div class="relative border rounded-xl overflow-hidden bg-gray-50 group">
          <img src="${getFileUrl(file)}" class="w-full h-28 object-cover" alt="${file.file_name || 'image'}">
          <div class="p-2 text-xs break-words leading-4">${file.file_name || '-'}${file.is_cover ? ' · Cover' : ''}</div>
          <button type="button" data-file-id="${file.id}" class="delete-file absolute top-2 right-2 hidden group-hover:block bg-red-600 text-white rounded-full w-7 h-7" title="ลบรูป">×</button>
        </div>
      `;
    }


    function docRow(file) {
      return `
        <div class="flex items-center justify-between gap-3 border rounded-lg p-3">
          <a href="${getFileUrl(file)}" target="_blank" class="min-w-0 text-blue-700 hover:underline break-words">📄 ${file.file_name || file.file_url}</a>
          <button type="button" data-file-id="${file.id}" class="delete-file px-3 py-1 rounded bg-red-50 text-red-700 text-sm font-semibold">ลบ</button>
        </div>
      `;
    }


    function bindFilePreviewEvents() {
      const imageInput = document.getElementById('imageFiles');
      const imagePreview = document.getElementById('newImagePreview');
      const docInput = document.getElementById('docFiles');
      const docPreview = document.getElementById('newDocPreview');

      imageInput?.addEventListener('change', () => {
        const files = Array.from(imageInput.files || []);
        imagePreview.innerHTML = files.map((file, index) => `
          <div class="border rounded-xl overflow-hidden bg-gray-50">
            <img src="${URL.createObjectURL(file)}" class="w-full h-28 object-cover" alt="preview">
            <div class="p-2 text-xs break-words leading-4">${index === 0 ? 'Cover · ' : ''}${file.name}</div>
          </div>
        `).join('');
      });

      docInput?.addEventListener('change', () => {
        const files = Array.from(docInput.files || []);
        docPreview.innerHTML = files.map(file => `<div class="break-words">📄 ${file.name}</div>`).join('');
      });
    }


    function bindDeleteFileButtons() {
      document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!await appConfirm('ลบไฟล์นี้ใช่ไหม?')) return;
          try {
            await api(`/item-files/${btn.dataset.fileId}`, { method: 'DELETE' });
            router();
          } catch (err) {
            appAlert('ลบไฟล์ไม่สำเร็จ: ' + err.message);
          }
        });
      });
    }


    function renderTableRows(items) {
      const admin = can('can_manage_items');
      return items.map(item => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-3">
        <input type="checkbox" class="row-checkbox w-4 h-4" data-code="${item.asset_code}">
      </td>
      <td class="px-4 py-3">
        <img src="${getThumbnail(item)}"
             class="w-10 h-10 object-cover rounded" alt="">
      </td>
      <td class="px-4 py-3 font-mono text-sm">${item.asset_code}</td>
      <td class="p-4 text-sm">${item.name}</td>
      <td class="p-4">
        <span class="px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(item.status.name)}">${item.status.name}</span>
      </td>
      <td class="p-4 text-center">
        <button onclick="downloadQr('${item.asset_code}')" class="text-blue-600 hover:text-blue-800" title="ดาวน์โหลด QR">
          <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
      </td>
      <td class="p-4 text-right text-sm">
  ${admin ? `
  <div class="flex items-center justify-end gap-2">
    <button onclick="editItem('${item.asset_code}')"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      แก้ไข
    </button>
    <button onclick="deleteItem('${item.asset_code}')"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      ลบ
    </button>
  </div>` : `<span class="text-gray-300 text-xs">-</span>`}
</td>
      <td class="p-4 text-right text-sm text-gray-500 whitespace-nowrap">${formatDate(item.created_at)}</td>
    </tr>
  `).join('');
    }

    function editItem(code) {
      if (!can('can_manage_items')) { appAlert('คุณไม่มีสิทธิ์แก้ไขอุปกรณ์'); return; }
      window.location.hash = `#/admin/item/${code}`;
    }


    async function deleteItem(code) {
      if (!can('can_manage_items')) { appAlert('คุณไม่มีสิทธิ์ลบอุปกรณ์'); return; }
      if (!await appConfirm(`ต้องการลบ ${code} ใช่ไหม?`)) return;

      try {
        const res = await fetch(`${API_URL}/items/${code}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          location.hash = '#/login';
          router();
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          appAlert(data.message || 'ลบไม่สำเร็จ');
          if (res.status === 404) router(); // ถ้าหาไม่เจอ แปลว่าหายไปแล้ว รีโหลดตารางใหม่
          return;
        }

        appAlert('ลบสำเร็จ');
        router(); // รีโหลดตารางหลังลบ
      } catch (err) {
        console.error(err);
        appAlert('ต่อ API ไม่ได้ เช็คว่า backend รันอยู่มั้ย');
      }
    }

    function closeBulkModal() {
      document.getElementById('bulkModal').classList.add('hidden');
    }


    function updateModalCount() {
      const checked = document.querySelectorAll('.modal-checkbox:checked').length;
      document.getElementById('modalCount').textContent = checked;
      document.getElementById('confirmDownloadBtn').disabled = checked === 0;
    }


    function generateQrBlob(assetCode) {
      return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        const qrUrl = publicItemAbsoluteUrl(assetCode);
        const qrcode = new QRCode(tempDiv, {
          text: qrUrl,
          width: 400,
          height: 400,
          correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
          const canvas = tempDiv.querySelector('canvas');
          const padding = 40;
          const finalCanvas = document.createElement('canvas');
          const ctx = finalCanvas.getContext('2d');

          finalCanvas.width = 400 + (padding * 2);
          finalCanvas.height = 400 + (padding * 2) + 60;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          ctx.drawImage(canvas, padding, padding);

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(assetCode, finalCanvas.width / 2, finalCanvas.height - 20);

          finalCanvas.toBlob(blob => {
            document.body.removeChild(tempDiv);
            resolve(blob);
          }, 'image/png');
        }, 100);
      });
    }


    async function confirmBulkDownload() {
      const btn = document.getElementById('confirmDownloadBtn');
      const codes = Array.from(document.querySelectorAll('.modal-checkbox:checked')).map(cb => cb.dataset.code);

      if (codes.length === 0) return;

      btn.disabled = true;
      btn.innerHTML = 'กำลังสร้าง ZIP...';

      const zip = new JSZip();

      for (let i = 0; i < codes.length; i++) {
        btn.innerHTML = `กำลังสร้าง... ${i + 1}/${codes.length}`;
        const blob = await generateQrBlob(codes[i]);
        zip.file(`QR-${codes[i]}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `QR-Codes-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();

      btn.innerHTML = 'ดาวน์โหลด ZIP';
      btn.disabled = false;
      closeBulkModal();
    }
