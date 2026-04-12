import type { PageLoad } from './$types';

/** The locale home page reuses the categories already loaded by the layout. */
export const load: PageLoad = async ({ parent }) => {
  const { locale, categories } = await parent();
  return { locale, categories };
};
