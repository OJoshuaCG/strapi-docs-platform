<!--
  BlockRenderer — the single entry point for rendering Strapi Blocks content.

  Usage:
    <BlockRenderer blocks={article.content} />

  To add a new block type:
    1. Add it to StrapiBlock union in $lib/types/strapi.ts
    2. Create a new XxxBlock.svelte component
    3. Add a branch in the {#each} below
-->
<script lang="ts">
  import type { StrapiBlock } from '$lib/types/strapi';

  import HeadingBlock   from './HeadingBlock.svelte';
  import ParagraphBlock from './ParagraphBlock.svelte';
  import ListBlock      from './ListBlock.svelte';
  import ImageBlock     from './ImageBlock.svelte';
  import CodeBlock      from './CodeBlock.svelte';
  import QuoteBlock     from './QuoteBlock.svelte';

  interface Props {
    blocks: StrapiBlock[];
  }

  let { blocks }: Props = $props();
</script>

<div class="block-renderer">
  {#each blocks as block, i (i)}
    {#if block.type === 'heading'}
      <HeadingBlock {block} />
    {:else if block.type === 'paragraph'}
      <ParagraphBlock {block} />
    {:else if block.type === 'list'}
      <ListBlock {block} />
    {:else if block.type === 'image'}
      <ImageBlock {block} />
    {:else if block.type === 'code'}
      <CodeBlock {block} />
    {:else if block.type === 'quote'}
      <QuoteBlock {block} />
    {:else}
      <!-- Unknown block type — render nothing but log in dev -->
      {#if import.meta.env.DEV}
        <pre class="my-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
[BlockRenderer] unknown block type: {JSON.stringify(block, null, 2)}</pre>
      {/if}
    {/if}
  {/each}
</div>
