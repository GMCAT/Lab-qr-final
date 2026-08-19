// utils.js - extracted from lab-asset-tracker.html

    function getStatusColor(status) {
      const colors = {
        'ใช้งานได้': 'bg-green-100 text-green-800',
        'รอดำเนินการ': 'bg-amber-100 text-amber-800',
        'ระหว่างยืม': 'bg-blue-100 text-blue-800',
        'รอตรวจรับคืน': 'bg-violet-100 text-violet-800',
        'อยู่ระหว่างบำรุงรักษา': 'bg-cyan-100 text-cyan-800',
        'ส่งซ่อม': 'bg-yellow-100 text-yellow-800',
        'เสีย': 'bg-red-100 text-red-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    }

    function returnStatusLabel(status) {
      const labels = {
        not_requested: 'ยังไม่แจ้งคืน',
        pending: 'รอตรวจรับคืน',
        completed: 'คืนเรียบร้อย',
        rejected: 'ตีกลับให้แก้ไข',
        damaged: 'รับคืนแบบชำรุด'
      };
      return labels[status] || status || '-';
    }


    function returnStatusClass(status) {
      const colors = {
        not_requested: 'bg-slate-100 text-slate-700 border-slate-200',
        pending: 'bg-violet-100 text-violet-800 border-violet-200',
        completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        rejected: 'bg-red-100 text-red-800 border-red-200',
        damaged: 'bg-orange-100 text-orange-800 border-orange-200'
      };
      return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }


    function approvalStatusLabel(status) {
      const labels = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
      return labels[status] || status || '-';
    }


    function approvalStatusClass(status) {
      const colors = {
        pending: 'bg-amber-100 text-amber-800 border-amber-200',
        approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        rejected: 'bg-red-100 text-red-800 border-red-200'
      };
      return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }


    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }


    function formatDateOnly(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    }


    function formatPrice(price) {
      if (!price) return '-';
      return new Intl.NumberFormat('th-TH').format(price) + ' บาท';
    }




    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
      }[ch]));
    }


    function isImageFile(file) {
      const type = String(file?.file_type || '').toUpperCase();
      const url = String(file?.file_url || '').toLowerCase();
      return type === 'IMAGE' || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].some(ext => url.endsWith(ext));
    }


    function getFileUrl(file) {
      if (!file?.file_url) return '';
      return typeof absUrl === 'function' ? absUrl(file.file_url) : file.file_url;
    }


    function getThumbnail(item) {
      const img = item.files?.find(f => f.is_cover && isImageFile(f)) || item.files?.find(isImageFile);
      return img ? getFileUrl(img) : 'https://placehold.co/40x40/e2e8f0/a0aec0?text=N/A';
    }
