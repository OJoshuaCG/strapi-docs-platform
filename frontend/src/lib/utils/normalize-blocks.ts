import type { StrapiBlock, StrapiParagraphBlock } from '$lib/types/strapi';
import { parseInlineContent } from './parse-inline';

/**
 * Normalize Strapi block types to our canonical names.
 * Strapi sometimes sends shorthand types (e.g., "H" instead of "heading").
 * Also handles cases where content is a plain text string instead of blocks array.
 */
export function normalizeBlocks(blocks: unknown): StrapiBlock[] {
  // Handle plain text strings - convert to paragraph block
  if (typeof blocks === 'string') {
    if (blocks.trim() === '') {
      return [];
    }
    return [
      {
        type: 'paragraph',
        children: parseInlineContent(blocks),
      } as StrapiParagraphBlock,
    ];
  }

  // Guard: ensure blocks is actually an array
  if (!Array.isArray(blocks)) {
    console.warn('[normalizeBlocks] Expected an array but received:', typeof blocks, blocks);
    return [];
  }

  const typeMap: Record<string, string> = {
    'H': 'heading',
    'P': 'paragraph',
    'Img': 'image',
    'Code': 'code',
    'Quote': 'quote',
    'List': 'list',
  };

  return blocks.map((block) => {
    // Skip non-object entries
    if (typeof block !== 'object' || block === null) {
      // If it's a string, treat it as plain text paragraph
      if (typeof block === 'string') {
        return {
          type: 'paragraph',
          children: parseInlineContent(block),
        } as StrapiParagraphBlock;
      }
      console.warn('[normalizeBlocks] Invalid block entry:', block);
      return null;
    }

    const canonicalType = typeMap[(block as any).type] ?? (block as any).type;
    if (canonicalType !== (block as any).type) {
      return { ...block, type: canonicalType } as StrapiBlock;
    }
    return block as StrapiBlock;
  }).filter((block): block is StrapiBlock => block !== null);
}
