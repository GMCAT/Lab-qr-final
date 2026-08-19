// Shared configuration and URL helpers

const LOCAL_STATIC_PORTS = new Set(['5500', '5501']);
const APP_ORIGIN = LOCAL_STATIC_PORTS.has(window.location.port)
  ? 'http://localhost:3001'
  : window.location.origin;
const API_URL = `${APP_ORIGIN}/api`;

window.APP_CONFIG = {
  API_BASE: API_URL,
  PUBLIC_API_BASE: `${APP_ORIGIN}/api/public`,
  FRONTEND_BASE: LOCAL_STATIC_PORTS.has(window.location.port)
    ? 'http://127.0.0.1:5500/frontend'
    : `${window.location.origin}/frontend`,
};

// expose for legacy scripts
window.API_URL = API_URL;

function publicItemHref(assetCode) {
  return `item.html?id=${encodeURIComponent(assetCode)}`;
}

function publicItemAbsoluteUrl(assetCode) {
  const url = new URL(publicItemHref(assetCode), window.location.href);
  url.hash = "";
  return url.toString();
}

function absUrl(url) {
  if (!url) return "";
  const value = String(url);
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  try {
    const parsed = new URL(value, `${APP_ORIGIN}/`);
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    if (!LOCAL_STATIC_PORTS.has(window.location.port) && isLoopback) {
      return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, `${APP_ORIGIN}/`).toString();
    }
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

window.publicItemHref = publicItemHref;
window.publicItemAbsoluteUrl = publicItemAbsoluteUrl;
window.absUrl = absUrl;
