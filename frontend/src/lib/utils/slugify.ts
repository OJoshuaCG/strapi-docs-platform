/**
 * Converts heading text to a URL-safe anchor ID.
 * Single source of truth — used by both HeadingBlock.svelte and extractToc().
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}
