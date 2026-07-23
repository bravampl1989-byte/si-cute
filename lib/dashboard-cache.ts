const dashboardCache = new Map<
  string,
  { expiresAt: number; payload: Record<string, unknown> }
>();

export const dashboardCacheSeconds = 20;

export function getDashboardCache(key: string) {
  const entry = dashboardCache.get(key);
  return entry && entry.expiresAt > Date.now() ? entry.payload : null;
}

export function setDashboardCache(key: string, payload: Record<string, unknown>) {
  dashboardCache.set(key, {
    expiresAt: Date.now() + dashboardCacheSeconds * 1000,
    payload,
  });
}

export function invalidateDashboardCache() {
  dashboardCache.clear();
}
