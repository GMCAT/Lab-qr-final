// api.js - shared API helpers

async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || "API error");
  }

  return data;
}

async function apiForm(path, formData, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const optimizedForm = await optimizeImageFormData(formData);
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "POST",
    body: optimizedForm,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || "Upload failed");
  }

  return data;
}

async function compressImage(file) {
  if (!(file instanceof File) || !/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size < 700 * 1024) return file;
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  const type = file.type === 'image/png' ? 'image/webp' : file.type;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.(png|jpe?g|webp)$/i, type === 'image/webp' ? '.webp' : '.$1'), { type, lastModified: file.lastModified });
}
async function optimizeImageFormData(formData) {
  const output = new FormData();
  for (const [key, value] of formData.entries()) output.append(key, value instanceof File ? await compressImage(value) : value);
  return output;
}

window.api = api;
window.apiForm = apiForm;
