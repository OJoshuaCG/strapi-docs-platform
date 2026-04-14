<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import type { LayoutData } from './$types';
  import type { GlobalSettings } from '$lib/types/strapi';

  interface Props {
    data: LayoutData & { settings: GlobalSettings | null };
    children: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  let sidebarOpen = $state(false);

  // Set <html lang> for accessibility / SEO — runs on every locale change
  $effect(() => {
    document.documentElement.lang = data.locale;
  });
</script>

<Header
  locale={data.locale}
  {sidebarOpen}
  onsidebarToggle={() => (sidebarOpen = !sidebarOpen)}
  headerLinkText={data.settings?.headerLinkText ?? null}
  headerLinkUrl={data.settings?.headerLinkUrl ?? null}
  sidebarLogo={data.settings?.sidebarLogo ?? null}
  headerLogoSize={data.settings?.headerLogoSize ?? 'md'}
/>

<Sidebar
  categories={data.categories}
  locale={data.locale}
  open={sidebarOpen}
  onclose={() => (sidebarOpen = false)}
/>

<!-- Main content area — offset by header height and sidebar width on large screens -->
<main class="pt-13 lg:pl-64 min-h-screen bg-[var(--bg-primary)]">
  <div class="page-enter">
    {@render children()}
  </div>
  <Footer locale={data.locale} />
</main>
