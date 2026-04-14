<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { generateThemeCss } from '$lib/utils/theme-injector';
  import { generateFontsHtml } from '$lib/utils/fonts';
  import { STRAPI_URL } from '$lib/api/strapi';
  import type { GlobalSettings } from '$lib/types/strapi';
  import { onMount } from 'svelte';

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

  // Determine MIME type from favicon URL extension
  function getFaviconType(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      svg: 'image/svg+xml',
      png: 'image/png',
      ico: 'image/x-icon',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext ?? ''] ?? 'image/png';
  }

  const faviconType = getFaviconType(faviconUrl);

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

  // Update favicon dynamically in browser after hydration
  onMount(() => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link with the correct URL
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    link.type = faviconType;
    document.head.appendChild(link);
    
    console.log('[Favicon] Updated to:', faviconUrl);
  });
</script>

<svelte:head>
  {#if siteDescription}
    <meta name="description" content={siteDescription} />
  {/if}
  {@html fontsHtml}
  {#if themeCss}
    {@html `<style>${themeCss}</style>`}
  {/if}
</svelte:head>

{@render children()}
