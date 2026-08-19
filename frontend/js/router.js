// router.js - extracted from lab-asset-tracker.html

    function resolveRouteHash(rawHash, hasToken) {
      return rawHash || (hasToken ? '#/admin' : '#/');
    }

    async function router() {
      const hasToken = !!getToken();
      const hash = resolveRouteHash(location.hash, hasToken);

      if (hasToken && getCurrentUser()?.must_change_password && hash !== '#/change-password') {
        location.hash = '#/change-password';
        return;
      }

      // ยังไม่ล็อกอิน: ถ้าจะยืม ให้ไปหน้าสมัคร User ใหม่ก่อน; ถ้าหน้าอื่นไป login
      if (!hasToken && hash !== '#/' && hash !== '#/catalog' && hash !== '#/login' && hash !== '#/register' && hash !== '#/forgot-password' && !hash.startsWith('#/reset-password')) {
        sessionStorage.setItem('redirectAfterLogin', hash);
        location.hash = hash.startsWith('#/borrow/') ? '#/register' : '#/login';
        return;
      }

      const app = document.getElementById('app');
      const adminPage = async (title, subtitle) => renderAdminPageShell(app, title, subtitle, await api('/admin/navigation-counts'));

      try {
        if (hash === '#/' || hash === '#/catalog') {
          await loadPublicCatalog(app);
        } else if (hash === '#/login') {
          renderLoginView(app);
        } else if (hash === '#/register') {
          renderRegisterView(app);
        } else if (hash === '#/forgot-password') {
          renderForgotPasswordView(app);
        } else if (hash.startsWith('#/reset-password')) {
          renderResetPasswordView(app, new URLSearchParams(hash.split('?')[1] || '').get('token') || '');
        } else if (hash.startsWith('#/item/')) {
          const id = hash.split('/')[2];
          location.href = `item.html?id=${encodeURIComponent(id)}`;
          return;
        } else if (hash.startsWith('#/borrow/')) {
          const id = hash.split('/')[2];
          const item = await api(`/items/${encodeURIComponent(id)}`);
          renderBorrowView(app, item);
        } else if (hash === '#/home') {
          renderUserHome(app);
        } else if (hash === '#/profile') {
          const result = await api('/auth/me');
          renderProfileView(app, result.user);
        } else if (hash === '#/my-borrows') {
          const logs = await api('/my-borrows');
          renderMyBorrows(app, logs);
        } else if (hash.startsWith('#/report-issue/')) {
          const id = hash.split('/')[2];
          const item = await api(`/items/${encodeURIComponent(id)}`);
          renderIssueReportForm(app, item);
        } else if (hash === '#/my-issue-reports') {
          const issues = await api('/my-issue-reports');
          renderMyIssueReports(app, issues);
        } else if (hash === '#/change-password') {
          renderChangePasswordView(app);
        } else if (hash === '#/admin') {
          if (!isAdmin()) return renderAccessDenied(app);
          const items = await api('/items');
          renderAdminDashboardLayout(app, items);
        } else if (hash === '#/admin/users') {
          if (!can('can_manage_users')) return renderAccessDenied(app);
          const users = await api('/admin/users');
          renderUserPermissions(await adminPage('ผู้ใช้และสิทธิ์', 'ยืนยันบัญชี กรองแหล่งสมัคร และรีเซ็ตรหัสผ่าน'), users);
        } else if (hash === '#/admin/master-data') {
          if (!isAdmin()) return renderAccessDenied(app);
          const meta = await api('/meta');
          renderMasterData(await adminPage('ตั้งค่าข้อมูล', 'ข้อมูลกลางของระบบ'), meta);
        } else if (hash === '#/admin/borrow-approvals' || hash === '#/admin/borrow-requests') {
          if (!can('can_approve_borrow')) return renderAccessDenied(app);
          const logs = await api('/borrow-logs?approval_status=pending');
          renderBorrowApprovals(await adminPage('จัดการยืม-คืน', 'คำขอยืมที่รออนุมัติ'), logs);
        } else if (hash === '#/admin/borrow-history') {
          if (!can('can_approve_borrow')) return renderAccessDenied(app);
          const logs = await api('/borrow-logs');
          renderBorrowHistory(await adminPage('จัดการยืม-คืน', 'คำขอยืม คำขอคืน และประวัติในหน้าเดียว'), logs);
        } else if (hash === '#/admin/return-requests') {
          if (!can('can_approve_borrow')) return renderAccessDenied(app);
          const logs = await api('/borrow-logs?return_status=pending');
          renderReturnRequests(await adminPage('จัดการยืม-คืน', 'คำขอคืนที่รอตรวจรับ'), logs);
        } else if (hash === '#/admin/issue-reports') {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          const issues = await api('/issue-reports');
          renderAdminIssueReports(await adminPage('รายการแจ้งเสีย', 'รายการที่รอตรวจสอบและประวัติ'), issues);
        } else if (hash === '#/admin/maintenance') {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          renderMaintenanceList(await adminPage('Maintenance / Calibration', 'งานซ่อม บำรุง สอบเทียบ และตรวจสอบ'), await api('/maintenance'));
        } else if (hash === '#/admin/reports') {
          if (!isAdmin()) return renderAccessDenied(app);
          if (!can('can_manage_items')) { location.hash = '#/admin/audit-logs'; return; }
          renderReportDashboard(await adminPage('Report Dashboard', 'รายงานและการส่งออกข้อมูล'), await api('/reports/dashboard'));
        } else if (hash === '#/admin/audit-logs') {
          if (!isAdmin()) return renderAccessDenied(app);
          auditLogState.page = 1;
          await loadAuditLogs(await adminPage('Audit Log', 'ประวัติการดำเนินการในระบบ'));
        } else if (hash === '#/admin/import-items') {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          location.hash = '#/admin/item/new';
          return;
        } else if (hash === '#/admin/qr-batch') {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          renderQrBatch(await adminPage('QR Batch Export', 'สร้าง QR หลายรายการ'), await api('/items'));
        } else if (hash.startsWith('#/admin/maintenance/new/')) {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          const routePart = hash.slice('#/admin/maintenance/new/'.length);
          const [assetCode, query = ''] = routePart.split('?');
          const issueId = Number(new URLSearchParams(query).get('issue')) || null;
          const [item, meta, issues] = await Promise.all([
            api(`/items/${encodeURIComponent(decodeURIComponent(assetCode))}`), api('/meta'), issueId ? api('/issue-reports') : Promise.resolve([])
          ]);
          renderMaintenanceForm(await adminPage('สร้างงานบำรุงรักษา', item.name || item.asset_code), item, meta, issues.find(issue => issue.id === issueId) || null);
        } else if (hash.startsWith('#/admin/maintenance/')) {
          if (!can('can_manage_items')) return renderAccessDenied(app);
          const id = hash.split('/')[3];
          renderMaintenanceDetail(await adminPage('รายละเอียดงานบำรุงรักษา', 'ติดตามสถานะและเอกสาร'), await api(`/maintenance/${id}`));
        } else if (hash.startsWith('#/admin/item/')) {
          if (!can('can_manage_items')) {
            appAlert('คุณไม่มีสิทธิ์เพิ่ม/แก้ไขอุปกรณ์');
            location.hash = '#/admin';
            return;
          }
          const id = hash.split('/')[3];
          const [item, meta] = await Promise.all([
            id === 'new' ? null : api(`/items/${id}`),
            api('/meta')
          ]);
          renderAdminForm(await adminPage(id === 'new' ? 'เพิ่มอุปกรณ์' : 'แก้ไขอุปกรณ์', 'สถานะระบบเปลี่ยนผ่าน workflow เท่านั้น'), item, meta, id === 'new');
        } else {
          location.hash = isAdmin() ? '#/admin' : '#/my-borrows';
        }
      } catch (e) {
        console.error(e);
        app.innerHTML = `
          <div class="min-h-screen bg-slate-50 p-6">
            <div class="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <h1 class="text-xl font-bold text-red-700">โหลดข้อมูลไม่สำเร็จ</h1>
              <p class="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">${escapeHtml(e.message || 'เกิดข้อผิดพลาดจาก API')}</p>
              <div class="mt-4 flex gap-2">
                <button onclick="router()" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">ลองใหม่</button>
                <a href="${isAdmin() ? '#/admin' : '#/login'}" class="rounded-xl border px-4 py-2 text-sm font-semibold">กลับหน้าหลัก</a>
              </div>
            </div>
          </div>`;
      }
    }

window.addEventListener('hashchange', router);
window.resolveRouteHash = resolveRouteHash;
