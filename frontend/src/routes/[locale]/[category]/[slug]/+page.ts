import { error } from '@sveltejs/kit';
import { getArticleBySlug } from '$lib/api/articles';
import { extractToc } from '$lib/utils/toc';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent, fetch }) => {
  const { locale } = await parent();
  const { slug } = params;

  const article = await getArticleBySlug(slug, locale, fetch);

  if (!article) {
    error(404, `Artículo no encontrado: "${slug}"`);
  }

  const toc = extractToc(article.content ?? []);

  return { locale, article, toc };
};
