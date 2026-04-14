import type { GlobalSettings } from '$lib/types/strapi';

/**
 * Convert GlobalSettings from Strapi into CSS custom properties.
 * Returns a string of CSS variable declarations.
 */
export function settingsToCssVariables(settings: GlobalSettings): string {
  const cssVars: string[] = [];

  const { typography, colors, spacing, layout } = settings;

  // ─── Typography ─────────────────────────────────────────────────────────
  if (typography) {
    if (typography.fontSans) {
      cssVars.push(`--font-sans: "${typography.fontSans}", ui-sans-serif, system-ui, sans-serif;`);
    }
    if (typography.fontMono) {
      cssVars.push(`--font-mono: "${typography.fontMono}", ui-monospace, monospace;`);
    }
    if (typography.baseFontSize) {
      cssVars.push(`--font-size-base: ${typography.baseFontSize};`);
    }
    if (typography.baseLineHeight) {
      cssVars.push(`--line-height-base: ${typography.baseLineHeight};`);
    }
    if (typography.headingLineHeight) {
      cssVars.push(`--line-height-heading: ${typography.headingLineHeight};`);
    }
    if (typography.paragraphSpacing) {
      cssVars.push(`--spacing-paragraph: ${typography.paragraphSpacing};`);
    }
    if (typography.listSpacing) {
      cssVars.push(`--spacing-list: ${typography.listSpacing};`);
    }
    if (typography.headingSpacingTop) {
      cssVars.push(`--spacing-heading-top: ${typography.headingSpacingTop};`);
    }
    if (typography.headingSpacingBottom) {
      cssVars.push(`--spacing-heading-bottom: ${typography.headingSpacingBottom};`);
    }
  }

  // ─── Colors (Light Mode) ────────────────────────────────────────────────
  if (colors) {
    cssVars.push(`--bg-primary: ${colors.lightBgPrimary || '#ffffff'};`);
    cssVars.push(`--bg-secondary: ${colors.lightBgSecondary || '#f8fafc'};`);
    cssVars.push(`--bg-sidebar: ${colors.lightBgSidebar || '#f1f5f9'};`);
    cssVars.push(`--text-primary: ${colors.lightTextPrimary || '#0f172a'};`);
    cssVars.push(`--text-secondary: ${colors.lightTextSecondary || '#475569'};`);
    cssVars.push(`--text-muted: ${colors.lightTextMuted || '#94a3b8'};`);
    cssVars.push(`--border-color: ${colors.lightBorderColor || '#e2e8f0'};`);
    cssVars.push(`--code-bg: ${colors.lightCodeBg || '#f1f5f9'};`);
    cssVars.push(`--code-text: ${colors.lightCodeText || '#0f172a'};`);
    cssVars.push(`--callout-bg: ${colors.lightCalloutBg || '#eff6ff'};`);
    cssVars.push(`--callout-border: ${colors.lightCalloutBorder || '#3b82f6'};`);

    // Brand colors
    if (colors.brand50) {
      cssVars.push(`--color-brand-50: ${colors.brand50};`);
    }
    if (colors.brand500) {
      cssVars.push(`--color-brand-500: ${colors.brand500};`);
    }
    if (colors.brand900) {
      cssVars.push(`--color-brand-900: ${colors.brand900};`);
    }

    // ─── Colors (Dark Mode) ─────────────────────────────────────────────
    // These will be applied within .dark selector
  }

  // ─── Spacing ────────────────────────────────────────────────────────────
  if (spacing) {
    if (spacing.contentPaddingX) {
      cssVars.push(`--spacing-content-x: ${spacing.contentPaddingX};`);
    }
    if (spacing.contentPaddingY) {
      cssVars.push(`--spacing-content-y: ${spacing.contentPaddingY};`);
    }
    if (spacing.sectionGap) {
      cssVars.push(`--spacing-section: ${spacing.sectionGap};`);
    }
    if (spacing.headerHeight) {
      cssVars.push(`--header-height: ${spacing.headerHeight};`);
    }
    if (spacing.sidebarWidth) {
      cssVars.push(`--sidebar-width: ${spacing.sidebarWidth};`);
    }
  }

  // ─── Layout ─────────────────────────────────────────────────────────────
  if (layout) {
    if (layout.maxContentWidth) {
      cssVars.push(`--max-content-width: ${layout.maxContentWidth};`);
    }
    if (layout.tocWidth) {
      cssVars.push(`--toc-width: ${layout.tocWidth};`);
    }
    if (layout.borderRadius) {
      cssVars.push(`--radius-default: ${layout.borderRadius};`);
    }
    if (layout.codeBorderRadius) {
      cssVars.push(`--radius-code: ${layout.codeBorderRadius};`);
    }
    if (layout.transitionDuration) {
      cssVars.push(`--transition-duration: ${layout.transitionDuration};`);
    }
    if (layout.animationEasing) {
      cssVars.push(`--ease-smooth: ${layout.animationEasing};`);
    }
  }

  return cssVars.join('\n  ');
}

/**
 * Generate the full dark mode CSS block from settings.
 */
export function generateDarkModeCss(settings: GlobalSettings): string {
  const { colors } = settings;
  if (!colors) return '';

  const darkVars: string[] = [];

  darkVars.push(`--bg-primary: ${colors.darkBgPrimary || '#0f172a'};`);
  darkVars.push(`--bg-secondary: ${colors.darkBgSecondary || '#1e293b'};`);
  darkVars.push(`--bg-sidebar: ${colors.darkBgSidebar || '#1e293b'};`);
  darkVars.push(`--text-primary: ${colors.darkTextPrimary || '#f1f5f9'};`);
  darkVars.push(`--text-secondary: ${colors.darkTextSecondary || '#94a3b8'};`);
  darkVars.push(`--text-muted: ${colors.darkTextMuted || '#475569'};`);
  darkVars.push(`--border-color: ${colors.darkBorderColor || '#334155'};`);
  darkVars.push(`--code-bg: ${colors.darkCodeBg || '#1e293b'};`);
  darkVars.push(`--code-text: ${colors.darkCodeText || '#e2e8f0'};`);
  darkVars.push(`--callout-bg: ${colors.darkCalloutBg || '#1e3a8a'};`);
  darkVars.push(`--callout-border: ${colors.darkCalloutBorder || '#60a5fa'};`);

  return darkVars.join('\n  ');
}

/**
 * Generate the complete CSS injection string for both light and dark modes.
 */
export function generateThemeCss(settings: GlobalSettings): string {
  const lightVars = settingsToCssVariables(settings);
  const darkVars = generateDarkModeCss(settings);

  return `
    :root {
      ${lightVars}
    }
    .dark {
      ${darkVars}
    }
  `;
}
