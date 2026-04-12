// ─── Strapi v5 API response envelope ────────────────────────────────────────
// In Strapi v5 the `attributes` wrapper is gone — fields live directly on the
// entity object alongside `id`, `documentId`, `locale`, and timestamps.

export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: StrapiMeta;
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: StrapiMeta;
}

export interface StrapiError {
  status: number;
  name: string;
  message: string;
  details?: unknown;
}

export interface StrapiErrorResponse {
  data: null;
  error: StrapiError;
}

// ─── Inline nodes (inside paragraph / heading / quote) ────────────────────

export interface StrapiTextNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface StrapiLinkNode {
  type: 'link';
  url: string;
  children: StrapiTextNode[];
}

export type StrapiInlineNode = StrapiTextNode | StrapiLinkNode;

// ─── Block nodes ─────────────────────────────────────────────────────────────

export interface StrapiHeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: StrapiInlineNode[];
}

export interface StrapiParagraphBlock {
  type: 'paragraph';
  children: StrapiInlineNode[];
}

export interface StrapiListItem {
  type: 'list-item';
  children: StrapiInlineNode[];
}

export interface StrapiListBlock {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: StrapiListItem[];
}

export interface StrapiImageData {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
  caption?: string | null;
}

export interface StrapiImageBlock {
  type: 'image';
  image: StrapiImageData;
  /** Strapi always sends an empty text child here */
  children: [{ type: 'text'; text: '' }];
}

export interface StrapiCodeBlock {
  type: 'code';
  /** Language hint from Strapi's blocks editor (e.g. "javascript", "bash"). */
  language?: string | null;
  children: [{ type: 'text'; text: string }];
}

export interface StrapiQuoteBlock {
  type: 'quote';
  children: StrapiInlineNode[];
}

// Discriminated union — the BlockRenderer switches on `.type`
export type StrapiBlock =
  | StrapiHeadingBlock
  | StrapiParagraphBlock
  | StrapiListBlock
  | StrapiImageBlock
  | StrapiCodeBlock
  | StrapiQuoteBlock;

// ─── Content-type entities ────────────────────────────────────────────────────

export interface StrapiCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
  order: number | null;
  locale: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: StrapiBlock[];
  excerpt: string | null;
  version: string | null;
  category: StrapiCategory | null;
  locale: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API query helpers ────────────────────────────────────────────────────────

export interface ArticleFilters {
  locale?: string;
  categorySlug?: string;
  slug?: string;
  page?: number;
  pageSize?: number;
}

export interface CategoryFilters {
  locale?: string;
  page?: number;
  pageSize?: number;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'es';

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
