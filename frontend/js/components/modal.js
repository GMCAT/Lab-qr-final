// Accessible, centered replacements for native alert/confirm/prompt dialogs.
let appDialogQueue = Promise.resolve();

function showAppDialog({ title = 'แจ้งเตือน', message = '', type = 'alert', defaultValue = '', maxLength = 500 }) {
  const task = () => new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="appDialogTitle" class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${type === 'alert' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'} text-2xl">${type === 'alert' ? 'i' : '?'}</div>
        <h2 id="appDialogTitle" class="text-center text-xl font-bold text-slate-900"></h2>
        <p id="appDialogMessage" class="mt-3 whitespace-pre-wrap break-words text-center text-sm leading-6 text-slate-600"></p>
        ${type === 'prompt' ? `<textarea id="appDialogInput" rows="3" maxlength="${Math.min(2000, Math.max(1, Number(maxLength) || 500))}" class="mt-4 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"></textarea><p class="mt-1 text-right text-xs text-slate-400"><span id="appDialogCount">0</span>/${Math.min(2000, Math.max(1, Number(maxLength) || 500))}</p>` : ''}
        <div class="mt-6 flex justify-center gap-3">
          ${type !== 'alert' ? '<button type="button" data-dialog-cancel class="min-w-28 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700">ยกเลิก</button>' : ''}
          <button type="button" data-dialog-ok class="min-w-28 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">ตกลง</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#appDialogTitle').textContent = title;
    overlay.querySelector('#appDialogMessage').textContent = String(message ?? '');
    const input = overlay.querySelector('#appDialogInput');
    if (input) {
      input.value = String(defaultValue ?? '').slice(0, input.maxLength);
      const count = overlay.querySelector('#appDialogCount');
      const updateCount = () => { count.textContent = input.value.length; };
      input.addEventListener('input', updateCount); updateCount();
    }
    const close = value => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(value); };
    const onKey = event => {
      if (event.key === 'Escape') close(type === 'alert' ? true : type === 'prompt' ? null : false);
      if (event.key === 'Enter' && type !== 'prompt') close(true);
    };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('[data-dialog-ok]').onclick = () => close(type === 'prompt' ? input.value : true);
    overlay.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(type === 'prompt' ? null : false));
    overlay.addEventListener('click', event => { if (event.target === overlay && type === 'alert') close(true); });
    setTimeout(() => (input || overlay.querySelector('[data-dialog-ok]')).focus(), 0);
  });
  const queued = appDialogQueue.then(task, task);
  appDialogQueue = queued.catch(() => {});
  return queued;
}

function appAlert(message, title = 'แจ้งเตือน') {
  if (typeof window.appToast === 'function' && /สำเร็จ|เรียบร้อย|บันทึกแล้ว|อัปโหลดแล้ว|ปิดรายการแล้ว/.test(String(message || ''))) {
    window.appToast(message, 'success');
    return Promise.resolve(true);
  }
  return showAppDialog({ title, message, type: 'alert' });
}

function appConfirm(message, title = 'ยืนยันการดำเนินการ') {
  return showAppDialog({ title, message, type: 'confirm' });
}

function appPrompt(message, { title = 'กรอกข้อมูล', defaultValue = '', maxLength = 500 } = {}) {
  return showAppDialog({ title, message, type: 'prompt', defaultValue, maxLength });
}

window.appAlert = appAlert;
window.appConfirm = appConfirm;
window.appPrompt = appPrompt;

// Search/filter text is intentionally bounded on both paste and typing.
const FILTER_INPUT_MAX_LENGTH = 100;
function applyFilterInputLimits(root = document) {
  root.querySelectorAll?.('input').forEach(input => {
    const key = `${input.type} ${input.id} ${input.name} ${input.placeholder}`.toLowerCase();
    if (input.type === 'search' || /search|ค้นหา|กรอง/.test(key)) input.maxLength = FILTER_INPUT_MAX_LENGTH;
  });
}
document.addEventListener('input', event => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.maxLength === FILTER_INPUT_MAX_LENGTH && input.value.length > FILTER_INPUT_MAX_LENGTH) input.value = input.value.slice(0, FILTER_INPUT_MAX_LENGTH);
}, true);
new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
  if (node.nodeType === Node.ELEMENT_NODE) applyFilterInputLimits(node);
}))).observe(document.documentElement, { childList: true, subtree: true });
applyFilterInputLimits();
