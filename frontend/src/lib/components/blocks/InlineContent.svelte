<script lang="ts">
  import type { StrapiInlineNode } from '$lib/types/strapi';
  import InlineContent from './InlineContent.svelte';

  interface Props {
    nodes: StrapiInlineNode[];
  }

  let { nodes }: Props = $props();
</script>

{#each nodes as node}
  {#if node.type === 'link'}
    {@const isExternal = node.url.startsWith('http')}
    {@const safeHref = node.url.toLowerCase().startsWith('javascript:') ? '#' : node.url}
    <a
      href={safeHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      class="text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] underline decoration-[var(--color-brand-300)] underline-offset-2 transition-colors"
    >
      {#each node.children as child}
        <InlineContent nodes={[child]} />
      {/each}
    </a>
  {:else}
    <!-- text node — apply inline marks -->
    {#if node.code}
      <code class="px-1.5 py-0.5 rounded bg-[var(--code-bg)] text-[var(--code-text)] font-mono text-[0.875em]"
        >{node.text}</code
      >
    {:else if node.bold || node.italic || node.underline || node.strikethrough}
      <span
        class:font-semibold={node.bold}
        class:italic={node.italic}
        class:underline={node.underline}
        class:line-through={node.strikethrough}
      >{node.text}</span>
    {:else}
      {node.text}
    {/if}
  {/if}
{/each}
