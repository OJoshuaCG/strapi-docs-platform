<script lang="ts">
  import { page } from '$app/state';

  const status = $derived(page.status);
  const is404 = $derived(status === 404);
</script>

<svelte:head>
  <title>{status} — {is404 ? 'Página no encontrada' : 'Error'}</title>
</svelte:head>

<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center;font-family:system-ui,sans-serif">
  <p style="font-size:5rem;font-weight:700;color:#2563eb;margin:0 0 1rem">{status}</p>
  <h1 style="font-size:1.25rem;font-weight:600;margin:0 0 0.5rem">
    {is404 ? 'Página no encontrada' : 'Algo salió mal'}
  </h1>
  <p style="color:#64748b;font-size:0.875rem;margin:0 0 2rem">{page.error?.message ?? ''}</p>
  <a href="/" style="padding:0.5rem 1rem;background:#2563eb;color:white;border-radius:0.375rem;text-decoration:none;font-size:0.875rem">
    Volver al inicio
  </a>
</div>
