<script lang="ts">
  interface Props {
    message?: string;
    retry?: () => void;
  }

  let { message = 'Ocurrió un error al cargar el contenido.', retry }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 text-center px-4">
  <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
    <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>
  <p class="text-[var(--text-secondary)] text-sm max-w-sm">{message}</p>
  {#if retry}
    <button
      onclick={retry}
      class="mt-4 px-4 py-2 text-sm font-medium rounded-md bg-[var(--color-brand-600)] text-white
             hover:bg-[var(--color-brand-700)] transition-colors"
    >
      Reintentar
    </button>
  {/if}
</div>
