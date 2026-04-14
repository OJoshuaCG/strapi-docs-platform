import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { setInternalStrapiUrl } from '$lib/api/strapi';

// If STRAPI_INTERNAL_URL is set (Docker / production), use it for all SSR
// requests so the server can reach Strapi via the internal network (e.g.
// http://strapi:1337) regardless of what VITE_STRAPI_URL was baked as.
if (env.STRAPI_INTERNAL_URL) {
  setInternalStrapiUrl(env.STRAPI_INTERNAL_URL);
}

/**
 * Sets the HTML lang attribute on the server so that SSR responses include
 * the correct lang from the start (important for SEO and screen readers).
 * The client-side $effect in [locale]/+layout.svelte handles subsequent
 * navigations without a full page reload.
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Extract the locale from the first URL segment (e.g. /es/..., /en/...)
  const locale = event.url.pathname.split('/')[1] ?? 'es';

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%sveltekit.lang%', locale),
  });
};
