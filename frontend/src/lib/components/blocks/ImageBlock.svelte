<script lang="ts">
  import type { StrapiImageBlock } from '$lib/types/strapi';
  import { STRAPI_URL } from '$lib/api/strapi';

  interface Props {
    block: StrapiImageBlock;
  }

  let { block }: Props = $props();

  // Resolve relative URLs (local dev storage) to absolute ones
  const src = $derived(
    block.image.url.startsWith('http')
      ? block.image.url
      : `${STRAPI_URL}${block.image.url}`,
  );

  const alt = $derived(block.image.alternativeText ?? '');
</script>

<figure class="my-6">
  <img
    {src}
    {alt}
    width={block.image.width ?? undefined}
    height={block.image.height ?? undefined}
    loading="lazy"
    class="rounded-lg border border-[var(--border-color)] max-w-full h-auto mx-auto shadow-sm"
  />
  {#if block.image.caption}
    <figcaption class="mt-2 text-center text-sm text-[var(--text-muted)]">
      {block.image.caption}
    </figcaption>
  {/if}
</figure>
