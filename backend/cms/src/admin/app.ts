import type { StrapiApp } from '@strapi/strapi/admin';

/**
 * Strapi admin panel customization.
 *
 * Branding:
 *   - Replace logo paths with your actual assets (PNG/SVG recommended, max 750×750px).
 *   - Place your logo files in `public/` so Strapi can serve them.
 *   - Theme colors inherit the same brand palette used in the frontend.
 *
 * Docs: https://docs.strapi.io/dev-docs/admin-panel-customization
 */
export default {
  config: {
    // ─── App identity ──────────────────────────────────────────────────────────
    // Replace these with your actual logo paths (relative to /public or absolute URL)
    auth: {
      logo: '/logo-auth.png',      // shown on the login screen
    },
    menu: {
      logo: '/logo-menu.png',      // shown in the top-left of the admin sidebar
    },
    head: {
      favicon: '/favicon.ico',
    },

    // ─── Brand theme ───────────────────────────────────────────────────────────
    // Mirrors the brand palette from the SvelteKit frontend (blue #2563eb family)
    theme: {
      light: {
        colors: {
          primary100: '#eff6ff',
          primary200: '#bfdbfe',
          primary500: '#3b82f6',
          primary600: '#2563eb',
          primary700: '#1d4ed8',
          buttonPrimary500: '#2563eb',
          buttonPrimary600: '#1d4ed8',
          danger700: '#b91c1c',
        },
      },
      dark: {
        colors: {
          primary100: '#1e3a8a',
          primary200: '#1e40af',
          primary500: '#3b82f6',
          primary600: '#60a5fa',
          primary700: '#93c5fd',
          buttonPrimary500: '#2563eb',
          buttonPrimary600: '#1d4ed8',
        },
      },
    },

    // ─── UI preferences ────────────────────────────────────────────────────────
    tutorials: false,               // hide the "getting started" tutorial widget
    notifications: {
      releases: false,              // hide Strapi release update banners
    },
  },

  bootstrap(_app: StrapiApp) {
    // Runs after the admin app is initialized.
    // Use this to register custom fields, plugins, or inject UI components.
  },
};
