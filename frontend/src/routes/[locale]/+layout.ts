import { error } from '@sveltejs/kit';
import { isSupportedLocale } from '$lib/types/strapi';
import { getCategories } from '$lib/api/categories';
import type { LayoutLoad } from './$types';

/**
 * Shared locale layout load function.
 *
 * Validates the locale param — returns 404 for unsupported values.
 * Fetches all categories for the sidebar so they are available everywhere
 * under this locale without re-fetching on each page navigation.
 */
export const load: LayoutLoad = async ({ params, fetch }) => {
  const { locale } = params;

  if (!isSupportedLocale(locale)) {
    error(404, `Idioma no soportado: "${locale}"`);
  }

  const categoriesRes = await getCategories({ locale }, fetch);

  return {
    locale,
    categories: categoriesRes.data,
  };
};
