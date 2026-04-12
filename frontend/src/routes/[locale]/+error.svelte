<script lang="ts">
  import { page } from '$app/state';

  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? 'Ha ocurrido un error inesperado.');
  const is404 = $derived(status === 404);
</script>

<svelte:head>
  <title>{status} — {is404 ? 'Página no encontrada' : 'Error'}</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
  <p class="text-7xl font-bold text-[var(--color-brand-500)] mb-4 tabular-nums">{status}</p>

  <h1 class="text-xl font-semibold text-[var(--text-primary)] mb-2">
    {is404 ? 'Página no encontrada' : 'Algo salió mal'}
  </h1>

  <p class="text-sm text-[var(--text-secondary)] max-w-sm mb-8">{message}</p>

  <a
    href="/"
    class="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
           bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] transition-colors"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Volver al inicio
  </a>
</div>
