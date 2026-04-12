<script lang="ts">
  import type { StrapiParagraphBlock } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiParagraphBlock;
  }

  let { block }: Props = $props();
</script>

<p class="my-4 leading-7 text-[var(--text-primary)]">
  <InlineContent nodes={block.children} />
</p>
