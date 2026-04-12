import { strapiRequest, buildQuery } from './strapi';
import type {
  StrapiListResponse,
  StrapiSingleResponse,
  StrapiCategory,
  CategoryFilters,
} from '$lib/types/strapi';

/**
 * Fetch all published categories for a given locale, sorted by `order` asc.
 * Pass SvelteKit's `fetch` from a load function for proper SSR deduplication.
 */
export async function getCategories(
  filters: CategoryFilters = {},
  fetchFn?: typeof fetch,
): Promise<StrapiListResponse<StrapiCategory>> {
  const { locale = 'es', page = 1, pageSize = 100 } = filters;

  const query = buildQuery({
    locale,
    sort: 'order:asc,name:asc',
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  });

  return strapiRequest<StrapiListResponse<StrapiCategory>>(
    `/documentation-categories${query}`,
    {},
    fetchFn,
  );
}

/**
 * Fetch a single category by slug, including its articles (title + slug only).
 * Pass SvelteKit's `fetch` from a load function for proper SSR deduplication.
 */
export async function getCategoryBySlug(
  slug: string,
  locale = 'es',
  fetchFn?: typeof fetch,
): Promise<StrapiCategory | null> {
  const query = buildQuery({
    locale,
    'filters[slug][$eq]': slug,
    'populate[articles][fields][0]': 'title',
    'populate[articles][fields][1]': 'slug',
    'populate[articles][sort]': 'title:asc',
  });

  const res = await strapiRequest<StrapiListResponse<StrapiCategory>>(
    `/documentation-categories${query}`,
    {},
    fetchFn,
  );

  return res.data[0] ?? null;
}
