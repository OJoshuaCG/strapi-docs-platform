<script lang="ts">
  import { getGlobalSettings } from '$lib/api/settings';
  import type { GlobalSettings } from '$lib/types/strapi';

  let { locale }: { locale: string } = $props();

  let settings = $state<GlobalSettings | null>(null);
  let footerText = $derived(
    settings?.footerText || 
    (locale === 'es' ? '© 2026 Documentation Portal' : '© 2026 Documentation Portal')
  );

  // Fetch settings on mount (non-blocking)
  (async () => {
    const s = await getGlobalSettings();
    if (s) settings = s;
  })();
</script>

<footer class="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-6 px-6">
  <div class="max-w-6xl mx-auto">
    <p class="text-sm text-[var(--text-muted)] text-center">
      {footerText}
    </p>
  </div>
</footer>
