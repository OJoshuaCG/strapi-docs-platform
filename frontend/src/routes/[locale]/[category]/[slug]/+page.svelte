<script lang="ts">
  import BlockRenderer    from '$lib/components/blocks/BlockRenderer.svelte';
  import Breadcrumbs      from '$lib/components/layout/Breadcrumbs.svelte';
  import TableOfContents  from '$lib/components/layout/TableOfContents.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const article = $derived(data.article);
  const toc = $derived(data.toc);
  const locale = $derived(data.locale);

  const crumbs = $derived([
    { label: locale === 'es' ? 'Inicio' : 'Home', href: `/${locale}` },
    ...(article.category
      ? [{ label: article.category.name, href: `/${locale}/${article.category.slug}` }]
      : []),
    { label: article.title },
  ]);

  const publishedDate = $derived(
    article.publishedAt
      ? new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        }).format(new Date(article.publishedAt))
      : null,
  );
</script>

<svelte:head>
  <title>{article.title}</title>
  {#if article.excerpt}
    <meta name="description" content={article.excerpt} />
  {/if}
</svelte:head>

<!-- Two-column layout on xl screens: content | TOC -->
<div class="flex gap-8 max-w-6xl mx-auto px-6 py-8">

  <!-- Main article content -->
  <article class="flex-1 min-w-0">
    <Breadcrumbs crumbs={crumbs} />

    <!-- Article header -->
    <header class="mb-8">
      <div class="flex items-center gap-3 mb-3 flex-wrap">
        {#if article.version}
          <span class="px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-mono font-medium border border-[var(--color-brand-200)]">
            v{article.version}
          </span>
        {/if}
        {#if article.category}
          <span class="text-sm text-[var(--text-muted)]">{article.category.name}</span>
        {/if}
      </div>

      <h1 class="text-3xl font-bold text-[var(--text-primary)] leading-tight mb-3">
        {article.title}
      </h1>

      {#if article.excerpt}
        <p class="text-lg text-[var(--text-secondary)] leading-relaxed">{article.excerpt}</p>
      {/if}

      {#if publishedDate}
        <p class="mt-4 text-sm text-[var(--text-muted)]">
          {locale === 'es' ? 'Publicado el' : 'Published'} {publishedDate}
        </p>
      {/if}
    </header>

    <hr class="border-[var(--border-color)] mb-8" />

    <!-- Rich content blocks -->
    {#if article.content && article.content.length > 0}
      <BlockRenderer blocks={article.content} />
    {:else}
      <p class="text-[var(--text-muted)] italic">
        {locale === 'es' ? 'Este artículo no tiene contenido.' : 'This article has no content.'}
      </p>
    {/if}

    <!-- Footer navigation -->
    <footer class="mt-12 pt-6 border-t border-[var(--border-color)]">
      {#if article.category}
        <a
          href="/{locale}/{article.category.slug}"
          class="inline-flex items-center gap-2 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {locale === 'es' ? `Volver a ${article.category.name}` : `Back to ${article.category.name}`}
        </a>
      {/if}
    </footer>
  </article>

  <!-- Table of contents (visible only on xl+) -->
  {#if toc.length > 1}
    <aside class="w-56 shrink-0 hidden xl:block">
      <div class="sticky top-20">
        <TableOfContents entries={toc} />
      </div>
    </aside>
  {/if}

</div>
