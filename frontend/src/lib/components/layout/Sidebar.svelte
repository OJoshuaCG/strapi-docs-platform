<script lang="ts">
  import { page } from '$app/state';
  import type { StrapiCategory } from '$lib/types/strapi';

  interface Props {
    categories: StrapiCategory[];
    locale: string;
    open?: boolean;
    onclose?: () => void;
  }

  let { categories, locale, open = false, onclose }: Props = $props();

  // Currently active category and article slugs (from URL)
  const activeCategorySlug = $derived(page.params.category ?? null);
  const activeArticleSlug  = $derived(page.params.slug ?? null);
</script>

<!-- Backdrop (mobile) — <button> satisfies a11y click/keyboard requirements -->
{#if open}
  <button
    type="button"
    aria-label="Cerrar menú"
    class="fixed inset-0 z-30 bg-black/40 lg:hidden cursor-default border-0"
    onclick={onclose}
  ></button>
{/if}

<!-- Sidebar panel -->
<aside
  class={[
    'fixed top-14 left-0 bottom-0 z-40 w-64 overflow-y-auto',
    'bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]',
    'transition-transform duration-200 ease-[var(--ease-smooth)]',
    open ? 'translate-x-0' : '-translate-x-full',
    'lg:translate-x-0',
  ].join(' ')}
  aria-label="Navegación principal"
>
  <nav class="py-4 px-3">
    {#each categories as category (category.id)}
      {@const isCatActive = category.slug === activeCategorySlug}

      <div class="mb-1">
        <a
          href="/{locale}/{category.slug}"
          class={[
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isCatActive
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--callout-bg)] dark:text-[var(--color-brand-300)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
          ].join(' ')}
        >
          <svg class="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {category.name}
        </a>
      </div>
    {/each}

    {#if categories.length === 0}
      <p class="px-3 py-4 text-sm text-[var(--text-muted)] italic">
        Sin categorías publicadas.
      </p>
    {/if}
  </nav>
</aside>
