import type { StrapiInlineNode, StrapiLinkNode } from '$lib/types/strapi';

/**
 * Parse inline Markdown formatting into inline nodes.
 * Handles: **bold**, *italic*, ~~strikethrough~~, __underline__, `code`, [text](url), <u>underline</u>
 */
export function parseInlineContent(text: string): StrapiInlineNode[] {
  const nodes: StrapiInlineNode[] = [];
  
  // Enhanced regex to handle: links, inline code, bold, italic, strikethrough, underline (HTML and Markdown)
  // Order: links first, then code, then HTML tags, then bold/italic/strikethrough/underline
  const regex = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|<u>([^<]+)<\/u>|<strong>([^<]+)<\/strong>|<em>([^<]+)<\/em>|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText.trim()) {
        nodes.push({ type: 'text', text: plainText });
      }
    }

    if (match[1] && match[2]) {
      // Link: [text](url)
      const linkNode: StrapiLinkNode = {
        type: 'link',
        url: match[2],
        children: [{ type: 'text', text: match[1] }],
      };
      nodes.push(linkNode);
    } else if (match[3]) {
      // Inline code
      nodes.push({ type: 'text', text: match[3], code: true });
    } else if (match[4]) {
      // HTML underline: <u>text</u>
      nodes.push({
        type: 'text',
        text: match[4],
        underline: true,
      });
    } else if (match[5]) {
      // HTML bold: <strong>text</strong>
      nodes.push({
        type: 'text',
        text: match[5],
        bold: true,
      });
    } else if (match[6]) {
      // HTML italic: <em>text</em>
      nodes.push({
        type: 'text',
        text: match[6],
        italic: true,
      });
    } else if (match[7] || match[8]) {
      // Bold (**text** or __text__)
      nodes.push({
        type: 'text',
        text: match[7] || match[8],
        bold: true,
      });
    } else if (match[9]) {
      // Strikethrough (~~text~~)
      nodes.push({
        type: 'text',
        text: match[9],
        strikethrough: true,
      });
    } else if (match[10] || match[11]) {
      // Italic (*text* or _text_)
      nodes.push({
        type: 'text',
        text: match[10] || match[11],
        italic: true,
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      nodes.push({ type: 'text', text: remaining });
    }
  }

  // If no nodes were created, add the full text
  if (nodes.length === 0) {
    nodes.push({ type: 'text', text });
  }

  return nodes;
}
