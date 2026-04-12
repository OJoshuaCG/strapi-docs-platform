<script lang="ts">
  interface Crumb {
    label: string;
    href?: string;
  }

  interface Props {
    crumbs: Crumb[];
  }

  let { crumbs }: Props = $props();
</script>

{#if crumbs.length > 1}
  <nav aria-label="Ruta de navegación" class="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-6 flex-wrap">
    {#each crumbs as crumb, i}
      {#if i > 0}
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      {/if}

      {#if crumb.href && i < crumbs.length - 1}
        <a
          href={crumb.href}
          class="hover:text-[var(--text-primary)] transition-colors"
        >
          {crumb.label}
        </a>
      {:else}
        <span class={i === crumbs.length - 1 ? 'text-[var(--text-primary)] font-medium' : ''}>
          {crumb.label}
        </span>
      {/if}
    {/each}
  </nav>
{/if}
