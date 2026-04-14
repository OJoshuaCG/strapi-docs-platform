import type { StrapiBlock, TocEntry } from '$lib/types/strapi';
import { slugify } from './slugify';
import { normalizeBlocks } from './normalize-blocks';

/**
 * Extract all heading blocks from an article's content array and convert
 * them into TocEntry objects for the TableOfContents component.
 * Only h2 and h3 are included (h1 is the article title).
 */
export function extractToc(blocks: unknown): TocEntry[] {
  // Normalize blocks first to handle Strapi shorthand types
  const normalizedBlocks = normalizeBlocks(blocks);

  return normalizedBlocks
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
