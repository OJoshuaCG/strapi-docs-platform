import { getGlobalSettings } from '$lib/api/settings';
import type { LayoutLoad } from './$types';

/**
 * Root layout load — fetches global settings safely.
 * Settings are optional; defaults are used if unavailable.
 * This runs during SSR, so errors must be caught gracefully.
 */
export const load: LayoutLoad = async ({ fetch }) => {
  try {
    const settings = await getGlobalSettings(fetch);
    return { settings };
  } catch {
    // Settings are optional — return null to use defaults
    return { settings: null };
  }
};
