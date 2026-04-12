<script lang="ts">
  interface Props {
    /** Which skeleton pattern to display */
    type?: 'article' | 'sidebar' | 'card-list';
  }

  let { type = 'article' }: Props = $props();
</script>

{#if type === 'article'}
  <!-- Article skeleton -->
  <div class="animate-pulse space-y-4" aria-hidden="true" aria-label="Cargando contenido...">
    <div class="skeleton h-8 w-3/4 rounded"></div>
    <div class="skeleton h-4 w-1/3 rounded"></div>
    <div class="space-y-2 pt-4">
      <div class="skeleton h-4 w-full rounded"></div>
      <div class="skeleton h-4 w-full rounded"></div>
      <div class="skeleton h-4 w-5/6 rounded"></div>
    </div>
    <div class="skeleton h-6 w-1/2 rounded mt-6"></div>
    <div class="space-y-2">
      <div class="skeleton h-4 w-full rounded"></div>
      <div class="skeleton h-4 w-4/5 rounded"></div>
    </div>
    <div class="skeleton h-32 w-full rounded-lg mt-4"></div>
  </div>

{:else if type === 'sidebar'}
  <!-- Sidebar skeleton -->
  <div class="animate-pulse space-y-2 px-3 py-4" aria-hidden="true">
    {#each [1, 2, 3, 4, 5] as _}
      <div class="skeleton h-8 w-full rounded-md"></div>
    {/each}
  </div>

{:else if type === 'card-list'}
  <!-- Card list skeleton -->
  <div class="animate-pulse space-y-4" aria-hidden="true">
    {#each [1, 2, 3] as _}
      <div class="rounded-lg border border-[var(--border-color)] p-5 space-y-2">
        <div class="skeleton h-5 w-2/3 rounded"></div>
        <div class="skeleton h-4 w-full rounded"></div>
        <div class="skeleton h-4 w-4/5 rounded"></div>
      </div>
    {/each}
  </div>
{/if}
