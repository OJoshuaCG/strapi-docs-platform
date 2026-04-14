<script lang="ts">
  import type { StrapiCodeBlock } from '$lib/types/strapi';
  import hljs from 'highlight.js/lib/core';

  // Import only the languages you need to keep bundle size small
  import javascript from 'highlight.js/lib/languages/javascript';
  import typescript from 'highlight.js/lib/languages/typescript';
  import python from 'highlight.js/lib/languages/python';
  import bash from 'highlight.js/lib/languages/bash';
  import xml from 'highlight.js/lib/languages/xml';
  import css from 'highlight.js/lib/languages/css';
  import json from 'highlight.js/lib/languages/json';
  import sql from 'highlight.js/lib/languages/sql';
  import yaml from 'highlight.js/lib/languages/yaml';
  import markdown from 'highlight.js/lib/languages/markdown';
  import plaintext from 'highlight.js/lib/languages/plaintext';

  // Register languages
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts', typescript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', python);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('sh', bash);
  hljs.registerLanguage('shell', bash);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('yml', yaml);
  hljs.registerLanguage('markdown', markdown);
  hljs.registerLanguage('md', markdown);
  hljs.registerLanguage('plaintext', plaintext);
  hljs.registerLanguage('text', plaintext);

  interface Props {
    block: StrapiCodeBlock;
  }

  let { block }: Props = $props();

  const code = $derived(block.children[0]?.text ?? '');
  const language = $derived(block.language ?? 'plaintext');

  // Highlight the code
  const highlightedCode = $derived.by(() => {
    if (!code) return '';
    try {
      const result = hljs.highlight(code, { language: language || 'plaintext' });
      return result.value;
    } catch {
      // If language not found, return plain text
      return escapeHtml(code);
    }
  });

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let copied = $state(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="relative my-5 rounded-lg overflow-hidden border border-[var(--border-color)]">
  <!-- header bar -->
  <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
    <span class="text-xs font-mono text-[var(--text-muted)]">{language || 'código'}</span>
    <button
      onclick={copyCode}
      class="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
      aria-label="Copiar código"
    >
      {#if copied}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Copiado
      {:else}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar
      {/if}
    </button>
  </div>

  <!-- code body -->
  <pre class="overflow-x-auto p-4 bg-[var(--code-bg)] text-sm leading-6"><code class="font-mono hljs-code-block">{@html highlightedCode}</code></pre>
</div>
