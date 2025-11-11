const ASSET_CDN_BASE = 'https://assets.235800.xyz';

function normalizePath(input) {
  if (!input) return '';
  return String(input)
    .trim()
    .replace(/^(\.\.\/|\.\/)+/, '') 
    .replace(/^\/+/, ''); 
}

export function resolveAssetUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:)/i.test(path)) return path;
  const base = ASSET_CDN_BASE.replace(/\/$/, '');
  const normalized = normalizePath(path);
  return normalized ? `${base}/${normalized}` : base;
}

export function getAssetBaseUrl() {
  return ASSET_CDN_BASE.replace(/\/$/, '');
}
