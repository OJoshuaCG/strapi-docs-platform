<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import type { SupportedLocale } from '$lib/types/strapi';

  interface Props {
    locale: SupportedLocale;
    sidebarOpen?: boolean;
    onsidebarToggle?: () => void;
  }

  let { locale, sidebarOpen = false, onsidebarToggle }: Props = $props();

  // Dark mode toggle — persisted in localStorage
  let dark = $state(browser ? localStorage.getItem('theme') === 'dark' : false);

  $effect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  });

  const altLocale = $derived<SupportedLocale>(locale === 'es' ? 'en' : 'es');

  // Build the same path in the alternative locale
  const altHref = $derived.by(() => {
    const segments = page.url.pathname.split('/').filter(Boolean);
    segments[0] = altLocale;
    return '/' + segments.join('/');
  });
</script>

<header
  class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--border-color)]
         bg-[var(--bg-primary)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/80
         flex items-center px-4 gap-4"
>
  <!-- Hamburger (mobile) -->
  <button
    onclick={onsidebarToggle}
    aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
    class="lg:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
  >
    {#if sidebarOpen}
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    {:else}
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    {/if}
  </button>

  <!-- Logo / home link -->
  <a
    href="/{locale}"
    class="font-semibold text-[var(--text-primary)] hover:text-[var(--color-brand-600)] transition-colors text-sm"
  >
    Documentación
  </a>

  <div class="flex-1"></div>

  <!-- Lang switcher -->
  <a
    href={altHref}
    aria-label={`Cambiar a ${altLocale === 'es' ? 'Español' : 'English'}`}
    class="px-2.5 py-1 rounded text-xs font-medium border border-[var(--border-color)]
           text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-brand-400)]
           transition-colors uppercase tracking-wide"
  >
    {altLocale}
  </a>

  <!-- Dark mode toggle -->
  <button
    onclick={() => (dark = !dark)}
    aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
    class="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
  >
    {#if dark}
      <!-- Sun -->
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    {:else}
      <!-- Moon -->
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    {/if}
  </button>
</header>
