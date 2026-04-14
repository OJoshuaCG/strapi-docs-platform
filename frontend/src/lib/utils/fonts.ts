import type { GlobalSettings, ThemeTypography } from '$lib/types/strapi';

/**
 * Build a Google Fonts URL from typography settings.
 * Supports loading multiple families with specified weights.
 */
export function buildGoogleFontsUrl(
  typography: ThemeTypography,
  weights: Record<string, string[]> = {
    sans: ['400', '500', '600', '700'],
    mono: ['400', '500'],
  }
): string | null {
  const families: string[] = [];

  // Sans-serif font
  if (typography.fontSans) {
    const weightsStr = weights.sans.join(';');
    families.push(`family=${encodeURIComponent(typography.fontSans)}:wght@${weightsStr}`);
  }

  // Monospace font
  if (typography.fontMono) {
    const weightsStr = weights.mono.join(';');
    families.push(`family=${encodeURIComponent(typography.fontMono)}:wght@${weightsStr}`);
  }

  if (families.length === 0) return null;

  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

/**
 * Generate the Google Fonts <link> tag.
 */
export function generateFontsLink(typography: ThemeTypography): string {
  const url = buildGoogleFontsUrl(typography);
  if (!url) return '';

  return `<link href="${url}" rel="stylesheet" />`;
}

/**
 * Generate preconnect links for Google Fonts.
 */
export function generateFontsPreconnect(): string {
  return `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  `;
}

/**
 * Generate the complete font-related HTML for <svelte:head>.
 */
export function generateFontsHtml(typography: ThemeTypography): string {
  return `
    ${generateFontsPreconnect()}
    ${generateFontsLink(typography)}
  `;
}
