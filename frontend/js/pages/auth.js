// pages/auth.js - extracted from lab-asset-tracker.html

function resolvePostAuthHash(user, redirectTo) {
  if (user?.must_change_password) return '#/change-password';
  if (redirectTo) return redirectTo;
  if (user?.role === 'admin' || user?.role === 'super_admin') return '#/admin';
  return '#/home';
}

function navigateAfterAuth(nextHash) {
  if (location.hash === nextHash) {
    router();
    return;
  }
  location.hash = nextHash;
}

function redirectAfterAuth(user) {
  const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '';
  sessionStorage.removeItem('redirectAfterLogin');
  const nextHash = resolvePostAuthHash(user, redirectTo);

  if (nextHash !== '#/login' || redirectTo) {
    navigateAfterAuth(nextHash);
    return;
  }

  navigateAfterAuth(nextHash);
  appAlert('เข้าสู่ระบบสำเร็จแล้ว กรุณากลับไปกดปุ่มยืมจากหน้า QR อีกครั้ง');
}

window.resolvePostAuthHash = resolvePostAuthHash;

    function renderLoginView(app) {
      app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="bg-white p-8 rounded-xl border w-full max-w-sm">
        <h1 class="text-2xl font-bold mb-1 text-center">Lab Asset Tracker</h1>
        <p class="text-gray-500 text-sm text-center mb-6">เข้าสู่ระบบเพื่อใช้งาน</p>
        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold mb-1">อีเมล</label>
            <input name="email" type="email" required autofocus class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">รหัสผ่าน</label>
            <input name="password" type="password" required class="w-full px-4 py-2 border rounded-lg">
          </div>
          <p id="loginError" class="text-red-600 text-sm hidden"></p>
          <button type="submit" id="loginBtn" class="w-full px-6 py-3 rounded-lg font-semibold text-base bg-[#2563EB] text-white hover:bg-blue-700">เข้าสู่ระบบ</button>
        </form>
        <p class="mt-3 text-center text-sm"><a href="#/forgot-password" class="font-semibold text-blue-600 hover:underline">ลืมรหัสผ่าน?</a></p>
        <div class="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">
          ยังไม่มีบัญชี? <a href="#/register" class="font-semibold text-blue-600 hover:underline">สมัคร User ใหม่เพื่อยืมอุปกรณ์</a>
        </div>
      </div>
    </div>
  `;

      document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const errorEl = document.getElementById('loginError');
        const btn = document.getElementById('loginBtn');
        errorEl.classList.add('hidden');
        btn.disabled = true;
        btn.textContent = 'กำลังเข้าสู่ระบบ...';

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();

          if (!res.ok) {
            errorEl.textContent = data.error || 'เข้าสู่ระบบไม่สำเร็จ';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'เข้าสู่ระบบ';
            return;
          }

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          redirectAfterAuth(data.user);
        } catch (err) {
          errorEl.textContent = 'ต่อ API ไม่ได้ เช็คว่า npm run dev รันอยู่มั้ยที่ port 3001';
          errorEl.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = 'เข้าสู่ระบบ';
        }
      };
    }

    function renderRegisterView(app) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '';
      const borrowMatch = redirectTo.match(/^#\/borrow\/(.+)$/);
      app.innerHTML = `
        <div class="min-h-screen bg-slate-50 px-4 py-8">
          <div class="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div class="mb-6 text-center">
              <h1 class="text-2xl font-bold text-slate-950">สมัคร User ใหม่</h1>
              <p class="mt-1 text-sm text-slate-500">กรอกข้อมูลเพื่อสร้างบัญชีสำหรับยืมอุปกรณ์ Lab</p>
              ${borrowMatch ? `<p class="mt-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">หลังสมัครจะพาไปหน้าฟอร์มยืมอุปกรณ์อัตโนมัติ</p>` : ''}
            </div>

            <form id="registerForm" class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-semibold">ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
                <input name="name" required autofocus placeholder="เช่น นายสมชาย ใจดี" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">อีเมล <span class="text-red-500">*</span></label>
                <input name="email" type="email" required placeholder="name@example.com" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">รหัสผ่าน <span class="text-red-500">*</span></label>
                <input name="password" type="password" required minlength="6" maxlength="21" placeholder="6-21 ตัวอักษร" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">ตำแหน่ง</label>
                <input name="position" placeholder="เช่น นักศึกษา / อาจารย์ / เจ้าหน้าที่" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">แผนก / ห้อง Lab</label>
                <input name="department_lab" placeholder="เช่น Lab Electronics / EE" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">วันเดือนปีเกิด</label>
                <input name="birth_date" type="date" class="w-full rounded-xl border px-4 py-3">
              </div>
              <div>
                <label class="mb-1 block text-sm font-semibold">เบอร์โทร</label>
                <input name="phone" inputmode="tel" placeholder="08x-xxx-xxxx" class="w-full rounded-xl border px-4 py-3">
              </div>
              <p id="registerError" class="hidden rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"></p>
              <button id="registerBtn" class="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 sm:col-span-2">ส่งคำขอสมัคร</button>
            </form>

            <div class="mt-5 text-center text-sm text-slate-500">
              มีบัญชีแล้ว? <a href="#/login" class="font-semibold text-blue-600 hover:underline">เข้าสู่ระบบ</a>
            </div>
          </div>
        </div>`;

      document.getElementById('registerForm').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const errorEl = document.getElementById('registerError');
        const btn = document.getElementById('registerBtn');
        errorEl.classList.add('hidden');
        btn.disabled = true;
        btn.textContent = 'กำลังสมัคร...';
        try {
          const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fd.get('name'),
              email: fd.get('email'),
              password: fd.get('password'),
              position: fd.get('position'),
              department_lab: fd.get('department_lab'),
              birth_date: fd.get('birth_date'),
              phone: fd.get('phone')
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'สมัครไม่สำเร็จ');
          appAlert('สมัครเรียบร้อยแล้ว บัญชีกำลังรอ Admin ยืนยัน');
          sessionStorage.removeItem('redirectAfterLogin');
          location.hash = '#/login';
        } catch (err) {
          errorEl.textContent = err.message || 'สมัครไม่สำเร็จ';
          errorEl.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = 'สมัครและเข้าสู่ระบบ';
        }
      };
    }

function renderChangePasswordView(app) {
  const forced = !!getCurrentUser()?.must_change_password;
  app.innerHTML = `<div class="min-h-screen bg-slate-50 px-4 py-10"><div class="mx-auto max-w-lg rounded-3xl border bg-white p-7 shadow-sm"><h1 class="text-2xl font-bold">เปลี่ยนรหัสผ่าน</h1><p class="mt-2 text-sm text-slate-500">${forced ? 'บัญชีนี้ใช้รหัสผ่านเริ่มต้น กรุณาเปลี่ยนก่อนใช้งานส่วนอื่น' : 'รหัสผ่านต้องมีความยาว 6-21 ตัวอักษร'}</p><form id="changePasswordForm" class="mt-6 space-y-4"><label class="block text-sm font-semibold">รหัสผ่านปัจจุบัน<input name="current_password" type="password" required minlength="6" maxlength="21" class="mt-1 w-full rounded-xl border px-4 py-3"></label><label class="block text-sm font-semibold">รหัสผ่านใหม่<input name="new_password" type="password" required minlength="6" maxlength="21" class="mt-1 w-full rounded-xl border px-4 py-3"></label><label class="block text-sm font-semibold">ยืนยันรหัสผ่านใหม่<input name="confirm_password" type="password" required minlength="6" maxlength="21" class="mt-1 w-full rounded-xl border px-4 py-3"></label><p id="changePasswordError" class="hidden rounded-xl bg-red-50 p-3 text-sm text-red-700"></p><button class="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white">บันทึกรหัสผ่านใหม่</button></form>${forced ? '' : '<a href="#/home" class="mt-4 block text-center text-sm font-semibold text-teal-700">กลับหน้าหลัก</a>'}</div></div>`;
  document.getElementById('changePasswordForm').addEventListener('submit', async event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); const error = document.getElementById('changePasswordError');
    if (data.new_password !== data.confirm_password) { error.textContent = 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'; error.classList.remove('hidden'); return; }
    try { await api('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }); appAlert('เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่'); logout(); }
    catch (err) { error.textContent = err.message; error.classList.remove('hidden'); }
  });
}
