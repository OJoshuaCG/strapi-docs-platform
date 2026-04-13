import type { StrapiBlock, TocEntry } from '$lib/types/strapi';
import { slugify } from './slugify';

/**
 * Extract all heading blocks from an article's content array and convert
 * them into TocEntry objects for the TableOfContents component.
 * Only h2 and h3 are included (h1 is the article title).
 */
export function extractToc(blocks: StrapiBlock[]): TocEntry[] {
  // Guard: ensure blocks is actually an array
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .filter(
      (b): b is Extract<StrapiBlock, { type: 'heading' }> =>
        b.type === 'heading' && b.level >= 2 && b.level <= 3,
    )
    .map((b) => {
      const text = b.children
        .filter((n) => n.type === 'text')
        .map((n) => n.text)
        .join('');

      return { id: slugify(text), text, level: b.level };
    });
}
