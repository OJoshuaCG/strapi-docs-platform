import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const secret = url.searchParams.get('secret');
  const documentId = url.searchParams.get('documentId');
  const locale = url.searchParams.get('locale');
  const status = url.searchParams.get('status');

  // Validate preview secret
  const expectedSecret = import.meta.env.PREVIEW_SECRET;
  
  if (!expectedSecret || secret !== expectedSecret) {
    error(401, 'Invalid preview secret');
  }

  if (!documentId || !locale) {
    error(400, 'Missing documentId or locale');
  }

  // Fetch the article (Strapi passes draft content when status=draft)
  const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
  const apiUrl = `${strapiUrl}/api/documentation-articles`;
  
  // Query with documentId and locale filter
  const res = await fetch(`${apiUrl}?filters[documentId][$eq]=${documentId}&locale=${locale}`);
  
  if (!res.ok) {
    error(500, 'Failed to fetch preview article');
  }

  const data = await res.json();
  const article = data.data?.[0];

  if (!article) {
    error(404, 'Article not found');
  }

  // Get category slug for the URL
  const categorySlug = article.category?.slug || 'uncategorized';

  // Redirect to the article page with preview mode
  redirect(302, `/${locale}/${categorySlug}/${article.slug}?preview=true`);
};
