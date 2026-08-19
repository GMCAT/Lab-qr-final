function adminNavigation(counts = {}) {
  const nav = [
    ['#/admin', 'dashboard', 'แดชบอร์ด', true, 0],
    ['#/admin', 'asset', 'ข้อมูลอุปกรณ์', true, 0],
    ['#/admin/borrow-history', 'request', 'จัดการยืม-คืน', can('can_approve_borrow'), Number(counts.borrow_pending || 0) + Number(counts.return_pending || 0)],
    ['#/admin/issue-reports', 'alert', 'รายการแจ้งเสีย', can('can_manage_items'), counts.issue_pending],
    ['#/admin/maintenance', 'settings', 'Maintenance / Calibration', can('can_manage_items'), counts.maintenance_due],
    ['#/admin/reports', 'history', 'Report Dashboard', isAdmin(), 0],
    ['#/admin/qr-batch', 'box', 'QR Batch Export', can('can_manage_items'), 0],
    ['#/admin/master-data', 'settings', 'ตั้งค่าข้อมูล', isAdmin(), 0],
    ['#/admin/users', 'users', 'ผู้ใช้และสิทธิ์', can('can_manage_users'), counts.user_pending]
  ];
  const hash = location.hash;
  return nav.filter(([, , , visible]) => visible).map(([href, icon, label, , badge]) => dashboardNavLink({
    href, icon, label, active: href === '#/admin' ? hash === '#/admin' : hash.startsWith(href), badge: Number(badge || 0)
  })).join('');
}

function bindAdminShell() {
  const shell = document.querySelector('.admin-shell');
  const open = () => shell?.classList.add('is-sidebar-open');
  const close = () => shell?.classList.remove('is-sidebar-open');
  document.getElementById('adminMenuButton')?.addEventListener('click', open);
  document.getElementById('adminSidebarBackdrop')?.addEventListener('click', close);
  document.getElementById('adminCollapseButton')?.addEventListener('click', () => {
    const collapsed = !shell.classList.contains('is-sidebar-collapsed');
    shell.classList.toggle('is-sidebar-collapsed', collapsed);
    localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
  });
  document.getElementById('adminShellLogout')?.addEventListener('click', logout);
  if (localStorage.getItem('adminSidebarCollapsed') === '1') shell?.classList.add('is-sidebar-collapsed');
}

function renderAdminPageShell(app, title, subtitle, counts = {}) {
  const user = getCurrentUser();
  app.innerHTML = `<div class="admin-shell">
    <div id="adminSidebarBackdrop" class="admin-sidebar-backdrop"></div>
    <aside class="admin-sidebar">
      <div class="admin-brand"><span class="admin-brand-mark">${dashboardIcon('box', 'admin-brand-icon')}</span><span class="admin-collapsible-copy"><strong>Lab QR Asset</strong><small>ระบบจัดการอุปกรณ์</small></span><button id="adminCollapseButton" class="admin-icon-button admin-collapse-button" title="ย่อ/ขยายเมนู">‹</button></div>
      <nav class="admin-nav">${adminNavigation(counts)}</nav>
      <div class="admin-user-panel"><span class="admin-user-avatar">${escapeHtml((user?.name || 'U').charAt(0).toUpperCase())}</span><span class="admin-user-copy admin-collapsible-copy"><strong>${escapeHtml(user?.name || '-')}</strong><small>${escapeHtml(user?.email || '-')}</small></span><button id="adminShellLogout" class="admin-icon-button" title="ออกจากระบบ">${dashboardIcon('logout')}</button></div>
    </aside>
    <main class="admin-main"><header class="admin-topbar"><div class="admin-title-group"><button id="adminMenuButton" class="admin-menu-button">${dashboardIcon('menu')}</button><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle || '')}</p></div></div><span class="admin-role-chip">${escapeHtml(roleLabel(user))}</span></header><div id="adminPageContent" class="admin-page-content"></div></main>
  </div>`;
  bindAdminShell();
  return document.getElementById('adminPageContent');
}

window.renderAdminPageShell = renderAdminPageShell;
