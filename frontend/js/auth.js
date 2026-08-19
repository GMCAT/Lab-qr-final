// auth.js - extracted from lab-asset-tracker.html

    function getToken() { return localStorage.getItem('token'); }

    function getCurrentUser() {
      try { return JSON.parse(localStorage.getItem('user') || 'null'); }
      catch (_) { return null; }
    }

    function isSuperAdmin() { return getCurrentUser()?.role === 'super_admin'; }

    function isAdmin() { return getCurrentUser()?.role === 'admin' || getCurrentUser()?.role === 'super_admin'; }

    function can(permission) {
      const user = getCurrentUser();
      return user?.role === 'super_admin' || (isAdmin() && !!user?.[permission]);
    }

    function roleLabel(user = getCurrentUser()) {
      if (!user) return 'Guest';
      if (user.role === 'super_admin') return 'Super Admin';
      if (user.role === 'admin') return 'Admin';
      return 'User';
    }

    function logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.hash = '#/';
      location.reload();
    }
