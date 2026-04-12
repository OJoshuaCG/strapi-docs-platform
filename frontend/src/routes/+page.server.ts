import { redirect } from '@sveltejs/kit';
import { DEFAULT_LOCALE } from '$lib/types/strapi';

/** Redirect bare "/" to the default locale. */
export function load() {
  redirect(307, `/${DEFAULT_LOCALE}`);
}
