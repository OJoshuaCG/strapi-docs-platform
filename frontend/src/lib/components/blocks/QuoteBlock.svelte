<script lang="ts">
  import type { StrapiQuoteBlock } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiQuoteBlock;
  }

  let { block }: Props = $props();
</script>

<blockquote
  class="my-5 pl-4 border-l-4 border-[var(--color-brand-500)] bg-[var(--callout-bg)] rounded-r-lg py-3 pr-4"
>
  <p class="text-[var(--text-secondary)] italic leading-7">
    <InlineContent nodes={block.children} />
  </p>
</blockquote>
