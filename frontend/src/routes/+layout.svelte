<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { generateThemeCss } from '$lib/utils/theme-injector';
  import { generateFontsHtml } from '$lib/utils/fonts';
  import { STRAPI_URL } from '$lib/api/strapi';
  import type { GlobalSettings } from '$lib/types/strapi';

  interface Props {
    data: {
      settings: GlobalSettings | null;
    };
    children: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  const settings = data.settings;
  const themeCss = settings ? generateThemeCss(settings) : '';
  const fontsHtml = settings?.typography ? generateFontsHtml(settings.typography) : generateDefaultFontsHtml();

  // Favicon from settings or fallback to default
  const faviconUrl = settings?.favicon?.url
    ? settings.favicon.url.startsWith('http')
      ? settings.favicon.url
      : `${STRAPI_URL}${settings.favicon.url}`
    : favicon;

  // Site description for SEO
  const siteDescription = settings?.siteDescription || '';

  // Default fonts fallback (matches hardcoded app.html fonts)
  function generateDefaultFontsHtml(): string {
    return `
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    `;
  }
</script>

<svelte:head>
  <link rel="icon" href={faviconUrl} type="image/svg+xml" />
  {#if siteDescription}
    <meta name="description" content={siteDescription} />
  {/if}
  {@html fontsHtml}
  {#if themeCss}
    <!-- Dynamic theme variables from Strapi settings -->
    <style>{themeCss}</style>
  {/if}
</svelte:head>

{@render children()}
