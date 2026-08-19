// pages/itemForm.js - extracted from lab-asset-tracker.html

    function renderAdminForm(app, item, meta, isNew) {
      const existingImages = (item?.files || []).filter(isImageFile);
      const existingDocs = (item?.files || []).filter(f => !isImageFile(f));

      app.innerHTML = `
    <div class="min-h-screen">
      <header class="bg-white border-b px-6 py-4">
        <h1 class="text-2xl font-bold">${isNew ? 'เพิ่มอุปกรณ์ใหม่' : 'แก้ไขอุปกรณ์'}</h1>
        <p class="text-sm text-gray-500 mt-1">เพิ่มข้อมูลอุปกรณ์พร้อมรูปหลายรูปได้ในหน้าเดียว</p>
      </header>
      <form id="itemForm" class="p-6 max-w-6xl mx-auto space-y-6">
        <div class="bg-white rounded-xl border p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          ${input('รหัสเครื่อง*', 'asset_code', item && item.asset_code, true)}
          ${input('ชื่ออุปกรณ์*', 'name', item && item.name, true)}
          ${input('รุ่น', 'model', item && item.model)}
          ${input('SN', 'serial_no', item && item.serial_no)}
          ${select('ยี่ห้อ', 'brand_id', item && item.brand_id, meta.brands)}
          ${selectOptional('หมวดหมู่', 'category_id', item && item.category_id, meta.categories || [])}
          ${input('ขนาด', 'size', item && item.size)}
          ${input('ราคา', 'price', item && item.price, false, 'number')}
          ${input('วันที่ซื้อ', 'purchase_date', item && item.purchase_date ? item.purchase_date.split('T')[0] : '', false, 'date')}
          ${isNew ? select('สถานะเริ่มต้น', 'status_id', item && item.status_id, (meta.statuses || []).filter(status => ['ใช้งานได้', 'เสีย'].includes(status.name))) : `<div><label class="block text-sm font-semibold mb-1">สถานะ</label><div class="rounded-lg border bg-slate-100 px-4 py-2"><b>${escapeHtml(item?.status?.name || '-')}</b><p class="mt-1 text-xs text-slate-500">สถานะถูกควบคุมโดยระบบยืม-คืน แจ้งเสีย และ Maintenance จึงแก้จากหน้านี้ไม่ได้</p></div></div>`}
          ${select('ที่เก็บ', 'location_id', item && item.location_id, meta.locations)}
          ${select('ผู้รับผิดชอบ', 'responsible_id', item && item.responsible_id, meta.responsible_users || meta.users)}
          <div class="md:col-span-2">${textarea('หมายเหตุ', 'note', item && item.note)}</div>
        </div>

        <div class="bg-white rounded-xl border p-6 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold">รูปภาพอุปกรณ์</h2>
              <p class="text-sm text-gray-500">เลือกได้หลายรูป เช่น ด้านหน้า ด้านหลัง ป้าย Serial Number</p>
            </div>
            <span class="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">รองรับ JPG / PNG / WEBP / GIF / SVG</span>
          </div>

          <label class="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50">
            <input id="imageFiles" name="images" type="file" accept="image/*" multiple class="hidden">
            <div class="text-4xl mb-2">📷</div>
            <div class="font-semibold">คลิกเพื่อเลือกรูปหลายรูป</div>
            <div class="text-sm text-gray-500">รูปแรกที่เลือกจะถูกตั้งเป็น Cover อัตโนมัติ</div>
          </label>

          <div id="newImagePreview" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"></div>

          ${existingImages.length ? `
            <div class="pt-4 border-t">
              <h3 class="font-bold mb-3">รูปที่มีอยู่แล้ว</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                ${existingImages.map(fileCard).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <h2 class="text-xl font-bold">คู่มือ / เอกสาร</h2>
            <p class="text-sm text-gray-500">อัปโหลด PDF หรือเอกสารอื่น ๆ ได้หลายไฟล์</p>
          </div>
          <input id="docFiles" name="docs" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" class="block w-full text-sm border rounded-lg p-3">
          <div id="newDocPreview" class="text-sm text-gray-600 space-y-1"></div>
          ${existingDocs.length ? `
            <div class="pt-4 border-t">
              <h3 class="font-bold mb-3">เอกสารที่มีอยู่แล้ว</h3>
              <div class="space-y-2">${existingDocs.map(docRow).join('')}</div>
            </div>
          ` : ''}
        </div>

        ${isNew && typeof renderItemImportPanel === 'function' ? renderItemImportPanel() : ''}

        <div class="flex gap-3 mt-6">
          <button id="saveItemBtn" type="submit" class="px-6 py-3 rounded-lg font-semibold text-base bg-[#2563EB] text-white hover:bg-blue-700">บันทึก</button>
          <a href="#/admin" class="px-6 py-3 rounded-lg font-semibold text-base bg-gray-200 text-gray-800 hover:bg-gray-300">ยกเลิก</a>
        </div>
      </form>
    </div>
  `;

      bindFilePreviewEvents();
      bindDeleteFileButtons();
      if (isNew && typeof bindItemImport === 'function') bindItemImport(app);

      document.getElementById('itemForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveItemBtn');
        btn.disabled = true;
        btn.textContent = 'กำลังบันทึก...';

        const formData = new FormData(e.target);
        const imageFiles = Array.from(document.getElementById('imageFiles').files || []);
        const docFiles = Array.from(document.getElementById('docFiles').files || []);

        const data = Object.fromEntries(formData.entries());
        delete data.images;
        delete data.docs;

        ['brand_id', 'location_id', 'responsible_id'].forEach(k => data[k] = parseInt(data[k]));
        if (isNew) data.status_id = parseInt(data.status_id);
        else delete data.status_id;
        if (data.category_id) data.category_id = parseInt(data.category_id);
        else delete data.category_id;
        if (data.price) data.price = parseFloat(data.price);
        else delete data.price;
        if (data.purchase_date) data.purchase_date = new Date(data.purchase_date).toISOString();
        else delete data.purchase_date;

        try {
          let savedItem;
          if (isNew) {
            savedItem = await api('/items', { method: 'POST', body: JSON.stringify(data) });
          } else {
            const result = await api(`/items/${item.asset_code}`, { method: 'PUT', body: JSON.stringify(data) });
            savedItem = result.data || { ...item, ...data };
          }

          const uploadCode = savedItem.asset_code || data.asset_code;

          if (imageFiles.length) {
            const fd = new FormData();
            imageFiles.forEach(file => fd.append('files', file));
            fd.append('file_type', 'IMAGE');
            fd.append('is_cover', existingImages.length ? 'false' : 'true');
            await apiForm(`/items/${encodeURIComponent(uploadCode)}/files`, fd);
          }

          if (docFiles.length) {
            const fd = new FormData();
            docFiles.forEach(file => fd.append('files', file));
            await apiForm(`/items/${encodeURIComponent(uploadCode)}/files`, fd);
          }

          location.hash = '#/admin';
        } catch (err) {
          appAlert('บันทึกไม่สำเร็จ: ' + err.message);
          btn.disabled = false;
          btn.textContent = 'บันทึก';
        }
      };
    }


    function input(label, name, value, required = false, type = 'text') {
      return `<div><label class="block text-sm font-semibold mb-1">${label}</label>
    <input name="${name}" type="${type}" value="${value || ''}" ${required ? 'required' : ''} class="w-full px-4 py-2 border rounded-lg"></div>`;
    }


    function select(label, name, value, options) {
      return `<div><label class="block text-sm font-semibold mb-1">${label}</label>
    <select name="${name}" class="w-full px-4 py-2 border rounded-lg" required>
      <option value="">เลือก</option>
      ${(options || []).map(o => `<option value="${o.id}" ${o.id === value ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
    </select></div>`;
    }


    function selectOptional(label, name, value, options) {
      return `<div><label class="block text-sm font-semibold mb-1">${label}</label>
    <select name="${name}" class="w-full px-4 py-2 border rounded-lg">
      <option value="">ไม่ระบุ</option>
      ${(options || []).map(o => `<option value="${o.id}" ${o.id === value ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
    </select></div>`;
    }


    function textarea(label, name, value) {
      return `<div><label class="block text-sm font-semibold mb-1">${label}</label>
    <textarea name="${name}" rows="3" class="w-full px-4 py-2 border rounded-lg">${value || ''}</textarea></div>`;
    }
