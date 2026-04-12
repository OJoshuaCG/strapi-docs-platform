import type { Handle } from '@sveltejs/kit';

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
