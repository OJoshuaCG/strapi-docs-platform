import type { 
  StrapiBlock, 
  StrapiHeadingBlock, 
  StrapiParagraphBlock, 
  StrapiCodeBlock, 
  StrapiQuoteBlock,
  StrapiListBlock,
  StrapiListItem,
  StrapiImageBlock,
  StrapiImageData 
} from '$lib/types/strapi';
import { parseInlineContent } from './parse-inline';

/**
 * Detect if content is a Markdown string or a structured blocks array.
 * If it's Markdown, parse it into Strapi-compatible blocks.
 * If it's already an array, return it as-is (after normalization).
 */
export function parseContent(content: unknown): StrapiBlock[] {
  // Already an array - return as-is (caller should normalize types)
  if (Array.isArray(content)) {
    return content as StrapiBlock[];
  }

  // Not a string - return empty
  if (typeof content !== 'string') {
    console.warn('[parseContent] Expected string or array, got:', typeof content);
    return [];
  }

  // Parse Markdown-like text into blocks
  return parseMarkdownToBlocks(content);
}

/**
 * Simple Markdown parser that handles:
 * - Headings (# H1, ## H2, ### H3, etc.)
 * - Code blocks (```language ... ```)
 * - Blockquotes (> text)
 * - Images (![alt](url))
 * - Unordered lists (- item or * item)
 * - Ordered lists (1. item)
 * - Paragraphs (default)
 * - Inline formatting: **bold**, *italic*, ~~strikethrough~~, `code`, [link](url)
 *
 * This is a lightweight parser - not a full Markdown spec implementation.
 */
function parseMarkdownToBlocks(text: string): StrapiBlock[] {
  const lines = text.split('\n');
  const blocks: StrapiBlock[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';
  let inList = false;
  let listItems: StrapiListItem[] = [];
  let listFormat: 'ordered' | 'unordered' = 'unordered';

  function flushParagraph() {
    const paragraphText = currentParagraph.join(' ').trim();
    if (paragraphText) {
      blocks.push({
        type: 'paragraph',
        children: parseInlineContent(paragraphText),
      } as StrapiParagraphBlock);
    }
    currentParagraph = [];
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({
        type: 'list',
        format: listFormat,
        children: listItems,
      } as StrapiListBlock);
      listItems = [];
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
        codeContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          type: 'code',
          language: codeLanguage || null,
          children: [{ type: 'text', text: codeContent.join('\n') }],
        } as StrapiCodeBlock);
        codeContent = [];
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const headingText = headingMatch[2].trim();
      blocks.push({
        type: 'heading',
        level,
        children: parseInlineContent(headingText),
      } as StrapiHeadingBlock);
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      const quoteText = line.slice(2).trim();
      if (quoteText) {
        blocks.push({
          type: 'quote',
          children: parseInlineContent(quoteText),
        } as StrapiQuoteBlock);
      }
      continue;
    }

    // Handle images: ![alt](url)
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      const altText = imageMatch[1];
      const imageUrl = imageMatch[2];
      const imageData: StrapiImageData = {
        url: imageUrl,
        alternativeText: altText || null,
        width: null,
        height: null,
      };
      blocks.push({
        type: 'image',
        image: imageData,
        children: [{ type: 'text', text: '' }],
      } as StrapiImageBlock);
      continue;
    }

    // Handle unordered lists: - item or * item
    const unorderedMatch = line.match(/^[\-\*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listFormat = 'unordered';
      }
      listItems.push({
        type: 'list-item',
        children: parseInlineContent(unorderedMatch[1]),
      } as StrapiListItem);
      continue;
    }

    // Handle ordered lists: 1. item
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listFormat = 'ordered';
      }
      listItems.push({
        type: 'list-item',
        children: parseInlineContent(orderedMatch[1]),
      } as StrapiListItem);
      continue;
    }

    // If we were in a list but now hit a non-list line, flush the list
    if (inList && line.trim() !== '') {
      flushList();
    }

    // Handle empty lines
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular text - accumulate for paragraph
    currentParagraph.push(line.trim());
  }

  // Flush any remaining content
  flushParagraph();
  flushList();

  return blocks;
}
