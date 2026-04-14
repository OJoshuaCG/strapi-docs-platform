<script lang="ts">
  import type { StrapiHeadingBlock } from '$lib/types/strapi';
  import { slugify } from '$lib/utils/slugify';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiHeadingBlock;
  }

  let { block }: Props = $props();

  // Build a stable anchor id from the heading text (same algorithm as extractToc)
  const id = $derived(
    slugify(
      block.children
        .filter((n) => n.type === 'text')
        .map((n) => n.text)
        .join(''),
    ),
  );

  const sizeClass: Record<number, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold',
    5: 'text-base font-semibold',
    6: 'text-sm font-semibold',
  };

  const cls = $derived(
    `${sizeClass[block.level] ?? ''} leading-[var(--line-height-heading,1.25)] mt-[var(--spacing-heading-top,2rem)] mb-[var(--spacing-heading-bottom,0.75rem)] text-[var(--text-primary)] scroll-mt-20 group`,
  );
</script>

<svelte:element this={`h${block.level}`} {id} class={cls}>
  <InlineContent nodes={block.children} />
  <a
    href={`#${id}`}
    aria-label="Enlace directo"
    class="ml-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 text-[var(--color-brand-500)] transition-opacity"
  >#</a>
</svelte:element>
