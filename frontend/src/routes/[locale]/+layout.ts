import { error } from '@sveltejs/kit';
import { isSupportedLocale } from '$lib/types/strapi';
import { getCategories } from '$lib/api/categories';
import { getGlobalSettings } from '$lib/api/settings';
import type { LayoutLoad } from './$types';

/**
 * Shared locale layout load function.
 *
 * Validates the locale param — returns 404 for unsupported values.
 * Fetches all categories for the sidebar and global settings for header/footer.
 */
export const load: LayoutLoad = async ({ params, fetch }) => {
  const { locale } = params;

  if (!isSupportedLocale(locale)) {
    error(404, `Idioma no soportado: "${locale}"`);
  }

  const [categoriesRes, settings] = await Promise.all([
    getCategories({ locale }, fetch),
    getGlobalSettings(fetch),
  ]);

  return {
    locale,
    categories: categoriesRes.data,
    settings,
  };
};
