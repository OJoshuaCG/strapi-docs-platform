import { strapiRequest, buildQuery } from './strapi';
import type { GlobalSettings } from '$lib/types/strapi';

/**
 * Fetch global settings from Strapi.
 * Returns null if no settings exist or if the request fails.
 * Cached for 5 minutes on the client side.
 */
let settingsCache: { data: GlobalSettings | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getGlobalSettings(fetchFn?: typeof fetch): Promise<GlobalSettings | null> {
  // Check cache (only on client side)
  if (typeof window !== 'undefined' && settingsCache) {
    const now = Date.now();
    if (now - settingsCache.timestamp < CACHE_DURATION) {
      return settingsCache.data;
    }
  }

  try {
    const query = buildQuery({ populate: '*' });
    const response = await strapiRequest<{
      data: Array<GlobalSettings>;
      meta: unknown;
    }>(`/global-settings${query}`, {}, fetchFn);

    // Settings should be a single entry (singleton pattern)
    const settings = response.data?.[0] ?? null;

    // Update cache
    if (typeof window !== 'undefined') {
      settingsCache = { data: settings, timestamp: Date.now() };
    }

    return settings;
  } catch (error) {
    console.warn('[getGlobalSettings] Failed to fetch settings:', error);
    return null;
  }
}

/**
 * Clear the global settings cache.
 */
export function clearSettingsCache(): void {
  settingsCache = null;
}
