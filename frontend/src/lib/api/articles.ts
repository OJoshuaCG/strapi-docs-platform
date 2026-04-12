import { strapiRequest, buildQuery } from './strapi';
import type {
  StrapiListResponse,
  StrapiArticle,
  ArticleFilters,
} from '$lib/types/strapi';

/**
 * Fetch a list of published articles.
 * Optionally filter by locale and/or category slug.
 * Pass SvelteKit's `fetch` from a load function for proper SSR deduplication.
 */
export async function getArticles(
  filters: ArticleFilters = {},
  fetchFn?: typeof fetch,
): Promise<StrapiListResponse<StrapiArticle>> {
  const { locale = 'es', categorySlug, page = 1, pageSize = 25 } = filters;

  const query = buildQuery({
    locale,
    'populate[category][fields][0]': 'name',
    'populate[category][fields][1]': 'slug',
    ...(categorySlug
      ? { 'filters[category][slug][$eq]': categorySlug }
      : {}),
    sort: 'title:asc',
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  });

  return strapiRequest<StrapiListResponse<StrapiArticle>>(
    `/documentation-articles${query}`,
    {},
    fetchFn,
  );
}

/**
 * Fetch a single article by slug, populating all fields including rich content
 * and the parent category.
 * Pass SvelteKit's `fetch` from a load function for proper SSR deduplication.
 */
export async function getArticleBySlug(
  slug: string,
  locale = 'es',
  fetchFn?: typeof fetch,
): Promise<StrapiArticle | null> {
  const query = buildQuery({
    locale,
    'filters[slug][$eq]': slug,
    'populate[category][fields][0]': 'name',
    'populate[category][fields][1]': 'slug',
    'populate[category][fields][2]': 'order',
  });

  const res = await strapiRequest<StrapiListResponse<StrapiArticle>>(
    `/documentation-articles${query}`,
    {},
    fetchFn,
  );

  return res.data[0] ?? null;
}
