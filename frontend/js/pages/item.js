// pages/item.js - extracted from lab-asset-tracker.html

    function renderItemView(app, item) {
      if (!item) {
        app.innerHTML = `<div class="p-6 text-center">ไม่พบอุปกรณ์</div>`;
        return;
      }

      app.innerHTML = `
    <div class="max-w-md mx-auto min-h-screen bg-white">
      <header class="p-4 border-b sticky top-0 bg-white z-10">
        <h1 class="text-xl font-bold">Lab Asset Tracker</h1>
      </header>
      <div class="p-4">
        <img src="${getFileUrl(item.files?.find(f => String(f.file_type).toLowerCase() === 'jpg')) || 'https://placehold.co/600x400'}"
             class="w-full h-52 object-cover rounded-xl mb-4" alt="${item.name}">
        <h2 class="text-2xl font-bold mb-2">${item.name}</h2>
        <div class="mb-4">
          <span class="px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1 ${getStatusColor(item.status.name)}">
            <span class="w-2 h-2 rounded-full bg-white"></span>${item.status.name}
          </span>
        </div>
        <div class="space-y-3 text-base mb-6">
          ${row('รหัสเครื่อง', item.asset_code)}
          ${row('รุ่น', item.model)}
          ${row('SN', item.serial_no)}
          ${row('ยี่ห้อ', item.brand.name)}
          ${row('ขนาด', item.size)}
          ${row('หมายเหตุ', item.note)}
        </div>
        <button onclick="toggleDetail()" id="detailBtn" class="px-6 py-3 rounded-lg font-semibold text-base transition-all active:scale-95 bg-[#2563EB] text-white hover:bg-blue-700 w-full mb-3">
          ดูข้อมูลเพิ่มเติม ↓
        </button>
        <div id="detailSection" class="hidden space-y-3 text-base mb-6 border-t pt-4">
          ${row('ที่เก็บ', item.location.name)}
          ${row('ผู้รับผิดชอบ', item.responsible.name)}
          ${row('วันที่ซื้อ', formatDate(item.purchase_date))}
          ${row('ราคา', formatPrice(item.price))}
          <div class="pt-2">
            <p class="text-gray-500 mb-2">เอกสารแนบ</p>
            ${item.files.map(f => `
              <a href="${getFileUrl(f)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-2">
                <span>${f.file_type === 'pdf' ? '📄' : '🖼️'}</span>
                <span class="text-[#2563EB] font-semibold">${f.file_name}</span>
              </a>
            `).join('') || '<p class="text-gray-400">ไม่มีไฟล์</p>'}
          </div>
          <div class="pt-2">
            <p class="text-gray-500 mb-2">ประวัติการยืม-คืน</p>
            ${item.borrow_logs.slice(0, 2).map(log => `
              <div class="text-sm p-2 bg-gray-50 rounded mb-1">
                → ${formatDate(log.borrow_date)} ${log.borrower_name} ${log.return_date ? 'คืนแล้ว' : 'ยังไม่คืน'}
              </div>
            `).join('') || '<p class="text-gray-400">ไม่มีประวัติ</p>'}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <a href="#/borrow/${item.asset_code}" class="px-6 py-3 rounded-lg font-semibold text-base bg-[#2563EB] text-white hover:bg-blue-700 text-center">ยืมอุปกรณ์</a>
          <a href="#/report-issue/${encodeURIComponent(item.asset_code)}" class="px-6 py-3 rounded-lg font-semibold text-base bg-[#DC2626] text-white hover:bg-red-700 text-center">แจ้งเสีย</a>
        </div>
      </div>
    </div>
  `;
    }


    function row(label, value) {
      return `<div class="flex justify-between"><span class="text-gray-500">${label}</span><span class="font-semibold text-right">${value || '-'}</span></div>`;
    }


    function toggleDetail() {
      const sec = document.getElementById('detailSection');
      const btn = document.getElementById('detailBtn');
      sec.classList.toggle('hidden');
      btn.textContent = sec.classList.contains('hidden') ? 'ดูข้อมูลเพิ่มเติม ↓' : 'ซ่อนข้อมูล ↑';
    }

    async function downloadQr(assetCode) {
      try {
        const qrUrl = publicItemAbsoluteUrl(assetCode);

        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        // สร้าง QR ขนาด 400px
        const qrcode = new QRCode(tempDiv, {
          text: qrUrl,
          width: 400,
          height: 400,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
          const canvas = tempDiv.querySelector('canvas');
          if (!canvas) {
            appAlert('สร้าง QR ไม่สำเร็จ');
            document.body.removeChild(tempDiv);
            return;
          }

          // สร้าง Canvas ใหม่ ใหญ่กว่าเดิม เพื่อทำกรอบขาว + ใส่รหัสเครื่องด้านล่าง
          const padding = 40;
          const textHeight = 60;
          const finalCanvas = document.createElement('canvas');
          const ctx = finalCanvas.getContext('2d');

          finalCanvas.width = 400 + (padding * 2);
          finalCanvas.height = 400 + (padding * 2) + textHeight;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          ctx.drawImage(canvas, padding, padding);

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(assetCode, finalCanvas.width / 2, finalCanvas.height - 20);

          const link = document.createElement('a');
          link.download = `QR-${assetCode}.png`;
          link.href = finalCanvas.toDataURL('image/png');
          link.click();

          document.body.removeChild(tempDiv);
        }, 100);
      } catch (err) {
        console.error('QR Download Error:', err);
        appAlert('ดาวน์โหลด QR ไม่สำเร็จ: ' + err.message);
      }
    }
