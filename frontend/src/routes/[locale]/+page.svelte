<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const labels: Record<string, Record<string, string>> = {
    es: { title: 'Documentación', subtitle: 'Explora las categorías disponibles.' },
    en: { title: 'Documentation',  subtitle: 'Browse the available categories.'  },
  };

  const t = $derived(labels[data.locale] ?? labels['es']);
</script>

<svelte:head>
  <title>{t.title}</title>
  <meta name="description" content={t.subtitle} />
</svelte:head>

<div class="max-w-3xl mx-auto px-6 py-10">
  <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">{t.title}</h1>
  <p class="text-[var(--text-secondary)] mb-10">{t.subtitle}</p>

  {#if data.categories.length === 0}
    <div class="rounded-lg border border-[var(--border-color)] p-8 text-center">
      <p class="text-[var(--text-muted)] text-sm">
        {data.locale === 'es' ? 'No hay categorías publicadas aún.' : 'No published categories yet.'}
      </p>
    </div>
  {:else}
    <ul class="grid gap-4 sm:grid-cols-2">
      {#each data.categories as cat (cat.id)}
        <li>
          <a
            href="/{data.locale}/{cat.slug}"
            class="block rounded-xl border border-[var(--border-color)] p-5
                   hover:border-[var(--color-brand-400)] hover:shadow-sm
                   transition-all duration-150 bg-[var(--bg-primary)]
                   hover:bg-[var(--bg-secondary)]"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                <svg class="w-4 h-4 text-[var(--color-brand-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-[var(--text-primary)] truncate">{cat.name}</p>
                {#if cat.description}
                  <p class="text-sm text-[var(--text-muted)] mt-0.5 line-clamp-2">{cat.description}</p>
                {/if}
              </div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
