/** Base path for the authenticated student portal (landing lives at `/`). */
export const APP_BASE = '/app';

export function appPath(path = '/') {
  if (!path || path === '/') return APP_BASE;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}`;
}

export function isAppHome(pathname = '') {
  return pathname === APP_BASE || pathname === `${APP_BASE}/`;
}

export function isAppPath(pathname = '', segment) {
  if (!segment || segment === '/') return isAppHome(pathname);
  const target = appPath(segment);
  return pathname === target || pathname.startsWith(`${target}/`);
}
