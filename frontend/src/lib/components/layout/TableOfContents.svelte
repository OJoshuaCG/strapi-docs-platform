<script lang="ts">
  import type { TocEntry } from '$lib/types/strapi';
  import { browser } from '$app/environment';

  interface Props {
    entries: TocEntry[];
  }

  let { entries }: Props = $props();

  let activeId = $state<string | null>(null);

  // Highlight the heading currently in the viewport
  $effect(() => {
    if (!browser || entries.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) {
            activeId = r.target.id;
            break;
          }
        }
      },
      { rootMargin: '-56px 0px -60% 0px', threshold: 0 },
    );

    const els = entries.map((e) => document.getElementById(e.id)).filter(Boolean);
    els.forEach((el) => observer.observe(el!));

    return () => observer.disconnect();
  });
</script>

{#if entries.length > 1}
  <nav aria-label="En esta página" class="hidden xl:block">
    <p class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
      En esta página
    </p>
    <ul class="space-y-1">
      {#each entries as entry}
        <li style="padding-left: {(entry.level - 2) * 12}px">
          <a
            href={`#${entry.id}`}
            class={[
              'block text-sm py-0.5 transition-colors truncate',
              activeId === entry.id
                ? 'text-[var(--color-brand-600)] font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {entry.text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
