<script lang="ts">
  import type { StrapiListBlock } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    block: StrapiListBlock;
  }

  let { block }: Props = $props();
</script>

{#if block.format === 'ordered'}
  <ol class="my-4 ml-6 list-decimal space-y-1.5 text-[var(--text-primary)]">
    {#each block.children as item}
      <li class="leading-7 pl-1">
        <InlineContent nodes={item.children} />
      </li>
    {/each}
  </ol>
{:else}
  <ul class="my-4 ml-6 list-disc space-y-1.5 text-[var(--text-primary)]">
    {#each block.children as item}
      <li class="leading-7 pl-1">
        <InlineContent nodes={item.children} />
      </li>
    {/each}
  </ul>
{/if}
