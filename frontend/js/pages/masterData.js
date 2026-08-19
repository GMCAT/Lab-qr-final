// pages/masterData.js - extracted from lab-asset-tracker.html


    function renderMasterData(app, meta) {
      const sections = [
        ['brands', 'ยี่ห้อ', meta.brands || [], 'can_manage_brands'],
        ['locations', 'ที่เก็บ', meta.locations || [], 'can_manage_locations'],
        ['categories', 'หมวดหมู่', meta.categories || [], 'can_manage_categories'],
        ['statuses', 'สถานะ', meta.statuses || [], 'can_manage_statuses']
      ];
      app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
          <header class="bg-white border-b px-6 py-4 flex justify-between items-center">
            <div>
              <h1 class="text-2xl font-bold">ตั้งค่าข้อมูลหลัก</h1>
              <p class="text-sm text-gray-500">แก้ไข ที่เก็บ / ยี่ห้อ / หมวดหมู่ / สถานะ ตามสิทธิ์ของ account</p>
            </div>
            <a href="#/admin" class="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">กลับ Admin</a>
          </header>
          <main class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${sections.map(([type, label, rows, permission]) => `
              <section class="bg-white rounded-xl border p-5 ${can(permission) ? '' : 'opacity-60'}">
                <div class="flex items-center justify-between gap-3 mb-4">
                  <h2 class="text-xl font-bold">${label}</h2>
                  ${can(permission) ? `<form data-master-add="${type}" class="flex gap-2"><input name="name" placeholder="เพิ่ม${label}" class="px-3 py-2 border rounded-lg"><button class="px-3 py-2 bg-blue-600 text-white rounded-lg">เพิ่ม</button></form>` : `<span class="text-xs text-red-500">ไม่มีสิทธิ์แก้ไข</span>`}
                </div>
                <div class="space-y-2">
                  ${rows.map(r => `
                    <div class="flex items-center gap-2 border rounded-lg p-2" data-master-row="${type}-${r.id}">
                      <input value="${escapeHtml(r.name)}" class="flex-1 px-3 py-2 border rounded-lg" ${can(permission) ? '' : 'disabled'}>
                      ${can(permission) ? `<button data-master-save="${type}:${r.id}" class="px-3 py-2 bg-gray-900 text-white rounded-lg">Save</button><button data-master-delete="${type}:${r.id}" class="px-3 py-2 bg-red-50 text-red-700 rounded-lg">ลบ</button>` : ''}
                    </div>
                  `).join('') || `<p class="text-sm text-gray-400">ยังไม่มีข้อมูล</p>`}
                </div>
              </section>
            `).join('')}
          </main>
        </div>`;

      document.querySelectorAll('[data-master-add]').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const type = form.dataset.masterAdd;
          const name = new FormData(form).get('name');
          try {
            await api(`/master/${type}`, { method: 'POST', body: JSON.stringify({ name }) });
            router();
          } catch (err) { appAlert('เพิ่มข้อมูลไม่สำเร็จ: ' + err.message); }
        });
      });

      document.querySelectorAll('[data-master-save]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const [type, id] = btn.dataset.masterSave.split(':');
          const row = document.querySelector(`[data-master-row="${type}-${id}"]`);
          const name = row.querySelector('input').value;
          try {
            await api(`/master/${type}/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
            btn.textContent = 'Saved';
            setTimeout(() => btn.textContent = 'Save', 1000);
          } catch (err) { appAlert('แก้ไขไม่สำเร็จ: ' + err.message); }
        });
      });

      document.querySelectorAll('[data-master-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const [type, id] = btn.dataset.masterDelete.split(':');
          if (!await appConfirm('ลบข้อมูลนี้ใช่ไหม?')) return;
          try {
            await api(`/master/${type}/${id}`, { method: 'DELETE' });
            router();
          } catch (err) { appAlert('ลบไม่สำเร็จ: ' + err.message); }
        });
      });
    }
