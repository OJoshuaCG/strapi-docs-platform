import { error } from '@sveltejs/kit';
import { getArticleBySlug } from '$lib/api/articles';
import { extractToc } from '$lib/utils/toc';
import { parseContent } from '$lib/utils/parse-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent, fetch, url }) => {
  const { locale } = await parent();
  const { slug } = params;

  // Check if we're in preview mode
  const isPreview = url.searchParams.get('preview') === 'true';

  const article = await getArticleBySlug(slug, locale, fetch);

  if (!article) {
    error(404, `Artículo no encontrado: "${slug}"`);
  }

  // Parse content (handles both Markdown strings and structured blocks arrays)
  const parsedContent = parseContent(article.content);
  const toc = extractToc(parsedContent);

  return { locale, article, toc, parsedContent, isPreview };
};
