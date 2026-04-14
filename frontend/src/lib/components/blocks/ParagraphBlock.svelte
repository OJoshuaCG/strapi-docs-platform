<script lang="ts">
  import type { StrapiParagraphBlock } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiParagraphBlock;
  }

  let { block }: Props = $props();
</script>

<p class="leading-[var(--line-height-base)] my-[var(--spacing-paragraph,1rem)] text-[var(--text-primary)]">
  <InlineContent nodes={block.children} />
</p>
