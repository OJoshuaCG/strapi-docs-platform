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
    1: 'text-3xl font-bold mt-10 mb-4',
    2: 'text-2xl font-semibold mt-8 mb-3',
    3: 'text-xl font-semibold mt-6 mb-2',
    4: 'text-lg font-semibold mt-5 mb-2',
    5: 'text-base font-semibold mt-4 mb-1',
    6: 'text-sm font-semibold mt-4 mb-1',
  };

  const cls = $derived(
    `${sizeClass[block.level] ?? ''} text-[var(--text-primary)] scroll-mt-20 group`,
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
