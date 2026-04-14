<script lang="ts">
  import BlockRenderer    from '$lib/components/blocks/BlockRenderer.svelte';
  import Breadcrumbs      from '$lib/components/layout/Breadcrumbs.svelte';
  import TableOfContents  from '$lib/components/layout/TableOfContents.svelte';
  import { STRAPI_URL } from '$lib/api/strapi';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const article = $derived(data.article);
  const toc = $derived(data.toc);
  const parsedContent = $derived(data.parsedContent);
  const locale = $derived(data.locale);
  const isPreview = $derived(data.isPreview);

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

  // SEO metadata
  const seoTitle = $derived(article.seoTitle || article.title);
  const seoDescription = $derived(article.seoDescription || article.excerpt);
  const ogImageUrl = $derived(
    article.ogImage?.url 
      ? article.ogImage.url.startsWith('http') 
        ? article.ogImage.url 
        : `${STRAPI_URL}${article.ogImage.url}`
      : null
  );
</script>

<svelte:head>
  <title>{seoTitle}</title>
  {#if seoDescription}
    <meta name="description" content={seoDescription} />
    <meta property="og:description" content={seoDescription} />
  {/if}
  <meta property="og:title" content={seoTitle} />
  {#if ogImageUrl}
    <meta property="og:image" content={ogImageUrl} />
  {/if}
  {#if isPreview}
    <meta name="robots" content="noindex,nofollow" />
  {/if}
</svelte:head>

<div class="flex gap-8 max-w-6xl mx-auto px-6 py-8">

  <!-- Main article content -->
  <article class="flex-1 min-w-0">
    <Breadcrumbs crumbs={crumbs} />

    <!-- Preview mode banner -->
    {#if isPreview}
      <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              {locale === 'es' ? 'Vista previa del borrador' : 'Draft Preview'}
            </p>
            <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              {locale === 'es' 
                ? 'Estás viendo una versión no publicada. Los cambios aún no son públicos.' 
                : 'You are viewing an unpublished version. Changes are not yet public.'}
            </p>
          </div>
        </div>
      </div>
    {/if}

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
    <BlockRenderer blocks={parsedContent} />

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
