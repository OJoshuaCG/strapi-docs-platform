<script lang="ts">
  import type { StrapiListBlock } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiListBlock;
  }

  let { block }: Props = $props();
</script>

{#if block.format === 'ordered'}
  <ol class="my-[var(--spacing-paragraph,1rem)] pl-6 list-decimal space-y-[var(--spacing-list,0.375rem)] text-[var(--text-primary)] list-outside">
    {#each block.children as item}
      <li class="leading-[var(--line-height-base)] pl-1">
        <InlineContent nodes={item.children} />
      </li>
    {/each}
  </ol>
{:else}
  <ul class="my-[var(--spacing-paragraph,1rem)] pl-6 list-disc space-y-[var(--spacing-list,0.375rem)] text-[var(--text-primary)] list-outside">
    {#each block.children as item}
      <li class="leading-[var(--line-height-base)] pl-1">
        <InlineContent nodes={item.children} />
      </li>
    {/each}
  </ul>
{/if}
