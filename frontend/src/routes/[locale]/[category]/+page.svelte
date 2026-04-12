<script lang="ts">
  import Breadcrumbs from '$lib/components/layout/Breadcrumbs.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const locale = $derived(data.locale);

  const crumbs = $derived([
    { label: locale === 'es' ? 'Inicio' : 'Home', href: `/${locale}` },
    { label: data.category.name },
  ]);
</script>

<svelte:head>
  <title>{data.category.name}</title>
  {#if data.category.description}
    <meta name="description" content={data.category.description} />
  {/if}
</svelte:head>

<div class="max-w-3xl mx-auto px-6 py-8">
  <Breadcrumbs crumbs={crumbs} />

  <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">{data.category.name}</h1>
  {#if data.category.description}
    <p class="text-[var(--text-secondary)] mb-8">{data.category.description}</p>
  {:else}
    <div class="mb-8"></div>
  {/if}

  {#if data.articles.length === 0}
    <div class="rounded-lg border border-[var(--border-color)] p-8 text-center">
      <p class="text-[var(--text-muted)] text-sm">
        {locale === 'es' ? 'No hay artículos publicados en esta categoría.' : 'No published articles in this category.'}
      </p>
    </div>
  {:else}
    <ul class="divide-y divide-[var(--border-color)]">
      {#each data.articles as article (article.id)}
        <li>
          <a
            href="/{locale}/{data.category.slug}/{article.slug}"
            class="flex items-start justify-between gap-4 py-4 group"
          >
            <div class="min-w-0">
              <p class="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-brand-600)] transition-colors truncate">
                {article.title}
              </p>
              {#if article.excerpt}
                <p class="text-sm text-[var(--text-muted)] mt-0.5 line-clamp-2">{article.excerpt}</p>
              {/if}
              {#if article.version}
                <span class="inline-block mt-1 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-mono">
                  v{article.version}
                </span>
              {/if}
            </div>
            <svg
              class="w-4 h-4 shrink-0 mt-1 text-[var(--text-muted)] group-hover:text-[var(--color-brand-500)] transition-colors"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </li>
      {/each}
    </ul>

    {#if data.meta.pagination && data.meta.pagination.pageCount > 1}
      <p class="mt-6 text-center text-sm text-[var(--text-muted)]">
        {data.articles.length} / {data.meta.pagination.total} artículos
      </p>
    {/if}
  {/if}
</div>
