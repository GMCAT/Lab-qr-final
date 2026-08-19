// Admin dashboard layout inspired by the supplied CRMS reference.
// This renderer is intentionally isolated so the previous dashboard remains a reversible fallback.

function dashboardIcon(name, className = 'admin-icon') {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    asset: '<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="M9 12h6"/>',
    request: '<path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    box: '<path d="M21 8l-9 5-9-5"/><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M12 13v8"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.5L2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };

  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
}

function dashboardPercent(value, total) {
  return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
}

function dashboardNavLink({ href, icon, label, active = false, badge = 0 }) {
  return `
    <a href="${href}" class="admin-nav-link${active ? ' is-active' : ''}">
      ${dashboardIcon(icon)}
      <span>${label}</span>
      ${badge ? `<span class="admin-nav-badge">${badge}</span>` : ''}
    </a>
  `;
}

function dashboardStatCard({ filter, tone, icon, label, value, detail }) {
  return `
    <button type="button" class="admin-stat-card admin-stat-${tone}" data-filter="${filter}">
      <span class="admin-stat-copy">
        <span class="admin-stat-label">${label}</span>
        <strong>${value}</strong>
        <span class="admin-stat-detail">${detail}</span>
      </span>
      <span class="admin-stat-icon">${dashboardIcon(icon)}</span>
    </button>
  `;
}

function dashboardLegendRow(color, label, value, total, filter) {
  return `
    <button type="button" class="admin-legend-row" data-filter="${filter}">
      <span class="admin-legend-name"><i style="background:${color}"></i>${label}</span>
      <span><strong>${value}</strong> <small>${dashboardPercent(value, total)}%</small></span>
    </button>
  `;
}

function renderAdminDashboardLayout(app, items) {
  const safeItems = Array.isArray(items) ? items : [];
  const stats = {
    total: safeItems.length,
    ok: safeItems.filter(item => item.status?.name === 'ใช้งานได้').length,
    pending: safeItems.filter(item => item.status?.name === 'รอดำเนินการ').length,
    borrow: safeItems.filter(item => item.status?.name === 'ระหว่างยืม').length,
    returnPending: safeItems.filter(item => item.status?.name === 'รอตรวจรับคืน').length,
    maintenance: safeItems.filter(item => item.status?.name === 'อยู่ระหว่างบำรุงรักษา').length,
    repair: safeItems.filter(item => item.status?.name === 'ส่งซ่อม').length,
    broken: safeItems.filter(item => item.status?.name === 'เสีย').length
  };
  stats.issues = stats.repair + stats.broken;

  const currentUser = getCurrentUser();
  let currentFilter = 'all';
  let selectedCodes = new Set();

  app.innerHTML = `
    <div class="admin-shell">
      <div id="adminSidebarBackdrop" class="admin-sidebar-backdrop"></div>
      <aside id="adminSidebar" class="admin-sidebar">
        <div class="admin-brand">
          <span class="admin-brand-mark">${dashboardIcon('box', 'admin-brand-icon')}</span>
          <span class="admin-collapsible-copy">
            <strong>Lab QR Asset</strong>
            <small>ระบบจัดการอุปกรณ์</small>
          </span><button id="adminCollapseButton" class="admin-icon-button admin-collapse-button" title="ย่อ/ขยายเมนู">‹</button>
        </div>

        <nav class="admin-nav" aria-label="เมนูผู้ดูแลระบบ">
          ${dashboardNavLink({ href: '#/admin', icon: 'dashboard', label: 'แดชบอร์ด', active: true })}
          <button type="button" id="adminAssetsNav" class="admin-nav-link">
            ${dashboardIcon('asset')}
            <span>ข้อมูลอุปกรณ์</span>
          </button>
          ${can('can_approve_borrow') ? dashboardNavLink({ href: '#/admin/borrow-history', icon: 'request', label: 'จัดการยืม-คืน', badge: stats.pending + stats.returnPending }) : ''}
          ${can('can_manage_items') ? dashboardNavLink({ href: '#/admin/issue-reports', icon: 'alert', label: 'รายการแจ้งเสีย', badge: stats.issues }) : ''}
          ${can('can_manage_items') ? dashboardNavLink({ href: '#/admin/maintenance', icon: 'settings', label: 'Maintenance / Calibration' }) : ''}
          ${isAdmin() ? dashboardNavLink({ href: '#/admin/reports', icon: 'history', label: 'Report Dashboard' }) : ''}
          ${can('can_manage_items') ? dashboardNavLink({ href: '#/admin/qr-batch', icon: 'box', label: 'QR Batch Export' }) : ''}
          ${isAdmin() ? dashboardNavLink({ href: '#/admin/master-data', icon: 'settings', label: 'ตั้งค่าข้อมูล' }) : ''}
          ${can('can_manage_users') ? dashboardNavLink({ href: '#/admin/users', icon: 'users', label: 'ผู้ใช้และสิทธิ์' }) : ''}
        </nav>

        <div class="admin-user-panel">
          <span class="admin-user-avatar">${escapeHtml((currentUser?.name || 'A').trim().charAt(0).toUpperCase())}</span>
          <span class="admin-user-copy admin-collapsible-copy">
            <strong>${escapeHtml(currentUser?.name || 'ผู้ดูแลระบบ')}</strong>
            <small>${escapeHtml(currentUser?.email || '-')}</small>
          </span>
          <button type="button" class="admin-icon-button" id="dashboardLogout" title="ออกจากระบบ">
            ${dashboardIcon('logout')}
          </button>
        </div>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div class="admin-title-group">
            <button type="button" id="adminMenuButton" class="admin-menu-button" aria-label="เปิดเมนู">
              ${dashboardIcon('menu')}
            </button>
            <div>
              <h1>ระบบจัดการอุปกรณ์ Lab</h1>
              <p>ภาพรวมทรัพย์สิน สถานะ และคำขอยืมอุปกรณ์</p>
            </div>
          </div>
          <div class="admin-topbar-actions">
            <span class="admin-role-chip">${escapeHtml(roleLabel(currentUser))}</span>
            ${can('can_manage_items') ? `<a href="#/admin/item/new" class="admin-primary-button">${dashboardIcon('plus')}<span>เพิ่มอุปกรณ์</span></a>` : ''}
          </div>
        </header>

        <div class="admin-content">
          <section class="admin-stat-grid" aria-label="สรุปข้อมูล">
            ${dashboardStatCard({
              filter: 'all',
              tone: 'teal',
              icon: 'box',
              label: 'อุปกรณ์ทั้งหมด',
              value: stats.total,
              detail: 'รายการในระบบ'
            })}
            ${dashboardStatCard({
              filter: 'ใช้งานได้',
              tone: 'blue',
              icon: 'check',
              label: 'พร้อมใช้งาน',
              value: stats.ok,
              detail: `${dashboardPercent(stats.ok, stats.total)}% ของทั้งหมด`
            })}
            ${dashboardStatCard({
              filter: 'รอดำเนินการ',
              tone: 'amber',
              icon: 'clock',
              label: 'รอดำเนินการ',
              value: stats.pending,
              detail: 'คำขอที่ต้องตรวจสอบ'
            })}
            ${dashboardStatCard({
              filter: 'issues',
              tone: 'red',
              icon: 'alert',
              label: 'ต้องดำเนินการ',
              value: stats.issues,
              detail: `ส่งซ่อม ${stats.repair} · เสีย ${stats.broken}`
            })}
          </section>

          <section class="admin-overview-grid">
            <article class="admin-panel admin-chart-panel">
              <div class="admin-panel-heading">
                <div>
                  <h2>ภาพรวมสถานะอุปกรณ์</h2>
                  <p>เลือกสถานะเพื่อกรองรายการในตาราง</p>
                </div>
              </div>
              <div class="admin-chart-layout">
                <div class="admin-chart-wrap">
                  <canvas id="statusChart"></canvas>
                  <div class="admin-chart-center">
                    <strong>${stats.total}</strong>
                    <span>ทั้งหมด</span>
                  </div>
                </div>
                <div class="admin-legend-list">
                  ${dashboardLegendRow('#10B981', 'ใช้งานได้', stats.ok, stats.total, 'ใช้งานได้')}
                  ${dashboardLegendRow('#F59E0B', 'รอดำเนินการ', stats.pending, stats.total, 'รอดำเนินการ')}
                  ${dashboardLegendRow('#3B82F6', 'ระหว่างยืม', stats.borrow, stats.total, 'ระหว่างยืม')}
                  ${dashboardLegendRow('#8B5CF6', 'รอตรวจรับคืน', stats.returnPending, stats.total, 'รอตรวจรับคืน')}
                  ${dashboardLegendRow('#06B6D4', 'อยู่ระหว่างบำรุงรักษา', stats.maintenance, stats.total, 'อยู่ระหว่างบำรุงรักษา')}
                  ${dashboardLegendRow('#F97316', 'ส่งซ่อม', stats.repair, stats.total, 'ส่งซ่อม')}
                  ${dashboardLegendRow('#EF4444', 'เสีย', stats.broken, stats.total, 'เสีย')}
                </div>
              </div>
            </article>

            <article class="admin-panel admin-quick-panel">
              <div class="admin-panel-heading">
                <div>
                  <h2>งานที่ต้องติดตาม</h2>
                  <p>ทางลัดสำหรับงานประจำของผู้ดูแลระบบ</p>
                </div>
              </div>
              <div class="admin-quick-list">
                ${can('can_approve_borrow') ? `
                  <a href="#/admin/borrow-requests" class="admin-quick-item">
                    <span class="admin-quick-icon is-amber">${dashboardIcon('request')}</span>
                    <span><strong>คำขอยืมรออนุมัติ</strong><small>ตรวจเอกสารและอนุมัติคำขอ</small></span>
                    <b>${stats.pending}</b>
                  </a>` : ''}
                <button type="button" class="admin-quick-item" data-filter="ระหว่างยืม">
                  <span class="admin-quick-icon is-blue">${dashboardIcon('history')}</span>
                  <span><strong>อุปกรณ์ระหว่างยืม</strong><small>ติดตามอุปกรณ์ที่ยังไม่คืน</small></span>
                  <b>${stats.borrow}</b>
                </button>
                ${can('can_approve_borrow') ? `
                  <a href="#/admin/return-requests" class="admin-quick-item">
                    <span class="admin-quick-icon is-blue">${dashboardIcon('check')}</span>
                    <span><strong>คำขอคืนรอตรวจรับ</strong><small>ตรวจสภาพและปิด BorrowLog</small></span>
                    <b>${stats.returnPending}</b>
                  </a>` : ''}
                <button type="button" class="admin-quick-item" data-filter="issues">
                  <span class="admin-quick-icon is-red">${dashboardIcon('alert')}</span>
                  <span><strong>อุปกรณ์มีปัญหา</strong><small>รายการส่งซ่อมและเสีย</small></span>
                  <b>${stats.issues}</b>
                </button>
              </div>
            </article>
          </section>

          <section id="adminAssets" class="admin-panel admin-assets-panel">
            <div class="admin-assets-toolbar">
              <div>
                <h2>ข้อมูลอุปกรณ์</h2>
                <p id="filterLabel">แสดง: ทั้งหมด</p>
              </div>
              <div class="admin-toolbar-actions">
                <button id="bulkDownloadBtn" type="button" class="admin-secondary-button hidden">
                  ดาวน์โหลด QR (<span id="selectedCount">0</span>)
                </button>
                <label class="admin-search">
                  ${dashboardIcon('search')}
                  <input id="search" type="search" placeholder="ค้นหารหัส ชื่อ หรือ Serial Number">
                </label>
                <select id="assetSort" class="rounded-xl border bg-white px-3 py-2 text-sm" aria-label="เรียงรายการอุปกรณ์"><option value="code-asc">รหัส A-Z</option><option value="code-desc">รหัส Z-A</option><option value="name-asc">ชื่อ A-Z</option><option value="name-desc">ชื่อ Z-A</option><option value="updated-desc">แก้ไขล่าสุด</option></select>
              </div>
            </div>

            <div class="admin-table-scroll">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" id="selectAllCheckbox" aria-label="เลือกทั้งหมด"></th>
                    <th>รูป</th>
                    <th>รหัสเครื่อง</th>
                    <th>ชื่ออุปกรณ์</th>
                    <th>สถานะ</th>
                    <th class="is-center">QR</th>
                    <th class="is-right">จัดการ</th>
                    <th class="is-right">วันที่เพิ่ม</th>
                  </tr>
                </thead>
                <tbody id="tableBody">${renderTableRows(safeItems)}</tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <div id="bulkModal" class="admin-modal hidden" role="dialog" aria-modal="true" aria-labelledby="bulkModalTitle">
        <div class="admin-modal-card">
          <div class="admin-modal-header">
            <div>
              <h2 id="bulkModalTitle">ดาวน์โหลด QR Code</h2>
              <p>ตรวจสอบรายการก่อนสร้างไฟล์ ZIP</p>
            </div>
            <button id="closeBulkModalButton" type="button" class="admin-icon-button" aria-label="ปิด">×</button>
          </div>
          <div class="admin-modal-toolbar">
            <label><input type="checkbox" id="modalSelectAll" checked> เลือกทั้งหมด</label>
            <span>เลือก <strong id="modalCount">0</strong> รายการ</span>
          </div>
          <div id="modalList" class="admin-modal-list"></div>
          <div class="admin-modal-footer">
            <button id="cancelBulkModalButton" type="button" class="admin-secondary-button">ยกเลิก</button>
            <button id="confirmDownloadBtn" type="button" class="admin-primary-button">ดาวน์โหลด ZIP</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function filteredItems() {
    const keyword = document.getElementById('search')?.value.trim().toLowerCase() || '';
    let filtered = safeItems;

    if (currentFilter === 'issues') {
      filtered = filtered.filter(item => ['ส่งซ่อม', 'เสีย'].includes(item.status?.name));
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(item => item.status?.name === currentFilter);
    }

    if (keyword) {
      filtered = filtered.filter(item =>
        String(item.asset_code || '').toLowerCase().includes(keyword) ||
        String(item.name || '').toLowerCase().includes(keyword) ||
        String(item.serial_no || '').toLowerCase().includes(keyword)
      );
    }
    const mode = document.getElementById('assetSort')?.value || 'code-asc';
    const textCompare = (a, b) => String(a || '').localeCompare(String(b || ''), 'th', { numeric:true, sensitivity:'base' });
    return [...filtered].sort((a, b) => mode === 'code-desc' ? textCompare(b.asset_code, a.asset_code) : mode === 'name-asc' ? textCompare(a.name, b.name) : mode === 'name-desc' ? textCompare(b.name, a.name) : mode === 'updated-desc' ? new Date(b.updated_at || 0) - new Date(a.updated_at || 0) : textCompare(a.asset_code, b.asset_code));
  }

  function filterLabel() {
    if (currentFilter === 'all') return 'ทั้งหมด';
    if (currentFilter === 'issues') return 'ส่งซ่อมและเสีย';
    return currentFilter;
  }

  function applyFilter() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = renderTableRows(filteredItems());
    document.getElementById('filterLabel').textContent = `แสดง: ${filterLabel()}`;
    selectedCodes.clear();
    syncBulkState();
    bindRowSelection();
  }

  function selectFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(element => {
      element.classList.toggle('is-selected', element.dataset.filter === filter);
    });
    applyFilter();
    if (filter !== 'all') document.getElementById('adminAssets')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncBulkState() {
    const button = document.getElementById('bulkDownloadBtn');
    const count = selectedCodes.size;
    document.getElementById('selectedCount').textContent = count;
    button.classList.toggle('hidden', count === 0);
    const rowCheckboxes = [...document.querySelectorAll('.row-checkbox')];
    const selectAll = document.getElementById('selectAllCheckbox');
    selectAll.checked = rowCheckboxes.length > 0 && rowCheckboxes.every(checkbox => checkbox.checked);
    selectAll.indeterminate = rowCheckboxes.some(checkbox => checkbox.checked) && !selectAll.checked;
  }

  function bindRowSelection() {
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedCodes.add(checkbox.dataset.code);
        else selectedCodes.delete(checkbox.dataset.code);
        syncBulkState();
      });
    });
  }

  function openBulkModal() {
    const list = document.getElementById('modalList');
    list.innerHTML = [...selectedCodes].map(code => {
      const item = safeItems.find(candidate => candidate.asset_code === code);
      return `
        <label class="admin-modal-row">
          <input type="checkbox" class="modal-checkbox" data-code="${escapeHtml(code)}" checked>
          <span><strong>${escapeHtml(code)}</strong><small>${escapeHtml(item?.name || '-')}</small></span>
        </label>
      `;
    }).join('');
    document.getElementById('modalSelectAll').checked = true;
    updateModalState();
    document.getElementById('bulkModal').classList.remove('hidden');
  }

  function closeBulkModalLayout() {
    document.getElementById('bulkModal').classList.add('hidden');
  }

  function updateModalState() {
    const checkboxes = [...document.querySelectorAll('.modal-checkbox')];
    const checked = checkboxes.filter(checkbox => checkbox.checked);
    document.getElementById('modalCount').textContent = checked.length;
    document.getElementById('confirmDownloadBtn').disabled = checked.length === 0;
    document.getElementById('modalSelectAll').checked = checkboxes.length > 0 && checked.length === checkboxes.length;
  }

  async function downloadSelectedQr() {
    const button = document.getElementById('confirmDownloadBtn');
    const codes = [...document.querySelectorAll('.modal-checkbox:checked')].map(checkbox => checkbox.dataset.code);
    if (!codes.length) return;

    button.disabled = true;
    const originalText = button.textContent;
    const zip = new JSZip();
    try {
      for (let index = 0; index < codes.length; index += 1) {
        button.textContent = `กำลังสร้าง ${index + 1}/${codes.length}`;
        zip.file(`QR-${codes[index]}.png`, await generateQrBlob(codes[index]));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `QR-Codes-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      closeBulkModalLayout();
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  document.querySelectorAll('[data-filter]').forEach(element => {
    element.addEventListener('click', () => selectFilter(element.dataset.filter));
  });
  document.getElementById('search').addEventListener('input', applyFilter);
  document.getElementById('assetSort').addEventListener('change', applyFilter);
  document.getElementById('selectAllCheckbox').addEventListener('change', event => {
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.checked = event.target.checked;
      if (checkbox.checked) selectedCodes.add(checkbox.dataset.code);
      else selectedCodes.delete(checkbox.dataset.code);
    });
    syncBulkState();
  });
  document.getElementById('bulkDownloadBtn').addEventListener('click', openBulkModal);
  document.getElementById('closeBulkModalButton').addEventListener('click', closeBulkModalLayout);
  document.getElementById('cancelBulkModalButton').addEventListener('click', closeBulkModalLayout);
  document.getElementById('bulkModal').addEventListener('click', event => {
    if (event.target.id === 'bulkModal') closeBulkModalLayout();
  });
  document.getElementById('modalSelectAll').addEventListener('change', event => {
    document.querySelectorAll('.modal-checkbox').forEach(checkbox => { checkbox.checked = event.target.checked; });
    updateModalState();
  });
  document.getElementById('modalList').addEventListener('change', updateModalState);
  document.getElementById('confirmDownloadBtn').addEventListener('click', downloadSelectedQr);
  document.getElementById('dashboardLogout').addEventListener('click', logout);
  document.getElementById('adminAssetsNav').addEventListener('click', () => {
    document.getElementById('adminAssets')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector('.admin-shell').classList.remove('is-sidebar-open');
  });
  document.getElementById('adminMenuButton').addEventListener('click', () => {
    document.querySelector('.admin-shell').classList.toggle('is-sidebar-open');
  });
  document.getElementById('adminCollapseButton')?.addEventListener('click', () => {
    const shell = document.querySelector('.admin-shell');
    const collapsed = !shell.classList.contains('is-sidebar-collapsed');
    shell.classList.toggle('is-sidebar-collapsed', collapsed);
    localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
  });
  if (localStorage.getItem('adminSidebarCollapsed') === '1') document.querySelector('.admin-shell')?.classList.add('is-sidebar-collapsed');
  document.getElementById('adminSidebarBackdrop').addEventListener('click', () => {
    document.querySelector('.admin-shell').classList.remove('is-sidebar-open');
  });
  selectFilter('all');

  const chartCanvas = document.getElementById('statusChart');
  if (chartCanvas && typeof Chart === 'function') {
    new Chart(chartCanvas, {
      type: 'doughnut',
      data: {
        labels: ['ใช้งานได้', 'รอดำเนินการ', 'ระหว่างยืม', 'รอตรวจรับคืน', 'อยู่ระหว่างบำรุงรักษา', 'ส่งซ่อม', 'เสีย'],
        datasets: [{
          data: [stats.ok, stats.pending, stats.borrow, stats.returnPending, stats.maintenance, stats.repair, stats.broken],
          backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444'],
          borderColor: '#FFFFFF',
          borderWidth: 4,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.raw} (${dashboardPercent(context.raw, stats.total)}%)`;
              }
            }
          }
        }
      }
    });
  }
}

window.renderAdminDashboardLayout = renderAdminDashboardLayout;
