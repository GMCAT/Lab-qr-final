function appToast(message, type = 'success', duration = 3200) {
  let region = document.getElementById('appToastRegion');
  if (!region) {
    region = document.createElement('div'); region.id = 'appToastRegion';
    region.setAttribute('aria-live', 'polite'); region.className = 'fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2';
    document.body.appendChild(region);
  }
  const tones = { success:'border-emerald-200 bg-emerald-50 text-emerald-900', error:'border-red-200 bg-red-50 text-red-900', info:'border-blue-200 bg-blue-50 text-blue-900' };
  const toast = document.createElement('div'); toast.className = `rounded-xl border px-4 py-3 shadow-lg transition ${tones[type] || tones.info}`;
  toast.textContent = String(message || ''); region.appendChild(toast);
  setTimeout(() => { toast.classList.add('translate-x-4','opacity-0'); setTimeout(() => toast.remove(), 250); }, Math.max(1000, duration));
}
window.appToast = appToast;
