<script lang="ts">
  import type { StrapiCodeBlock } from '$lib/types/strapi';

  interface Props {
    block: StrapiCodeBlock;
  }

  let { block }: Props = $props();

  const code = $derived(block.children[0]?.text ?? '');

  let copied = $state(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="relative my-5 rounded-lg overflow-hidden border border-[var(--border-color)]">
  <!-- header bar -->
  <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
    <span class="text-xs font-mono text-[var(--text-muted)]">{block.language ?? 'código'}</span>
    <button
      onclick={copyCode}
      class="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
      aria-label="Copiar código"
    >
      {#if copied}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Copiado
      {:else}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar
      {/if}
    </button>
  </div>

  <!-- code body -->
  <pre class="overflow-x-auto p-4 bg-[var(--code-bg)] text-sm leading-6"><code class="font-mono text-[var(--code-text)]">{code}</code></pre>
</div>
