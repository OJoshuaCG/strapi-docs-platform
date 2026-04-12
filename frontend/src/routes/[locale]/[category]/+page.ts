import { error } from '@sveltejs/kit';
import { getArticles } from '$lib/api/articles';
import { getCategoryBySlug } from '$lib/api/categories';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent, fetch }) => {
  const { locale } = await parent();
  const { category: categorySlug } = params;

  const [categoryRes, articlesRes] = await Promise.all([
    getCategoryBySlug(categorySlug, locale, fetch),
    getArticles({ locale, categorySlug }, fetch),
  ]);

  if (!categoryRes) {
    error(404, `Categoría no encontrada: "${categorySlug}"`);
  }

  return {
    locale,
    category: categoryRes,
    articles: articlesRes.data,
    meta: articlesRes.meta,
  };
};
