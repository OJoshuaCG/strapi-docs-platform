<script lang="ts">
  // This page receives theme colors via postMessage from Strapi admin
  // and applies them in real-time for live preview

  let themeColors = $state<Record<string, string>>({});

  // Listen for postMessage from Strapi admin panel
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      // Validate origin (should come from Strapi admin)
      if (event.data?.type === 'theme-preview') {
        themeColors = event.data.colors || {};
        applyThemeColors();
      }
    });
  }

  function applyThemeColors() {
    const root = document.documentElement;
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(`--preview-${key}`, value);
    });
  }
</script>

<svelte:head>
  <title>Theme Preview</title>
  <style>
    :root {
      /* Default fallback colors */
      --preview-lightBgPrimary: #ffffff;
      --preview-lightBgSecondary: #f8fafc;
      --preview-lightBgSidebar: #f1f5f9;
      --preview-lightTextPrimary: #0f172a;
      --preview-lightTextSecondary: #475569;
      --preview-lightTextMuted: #94a3b8;
      --preview-lightBorderColor: #e2e8f0;
      --preview-lightCodeBg: #f1f5f9;
      --preview-lightCodeText: #0f172a;
      --preview-lightCalloutBg: #eff6ff;
      --preview-lightCalloutBorder: #3b82f6;
      --preview-darkBgPrimary: #0f172a;
      --preview-darkBgSecondary: #1e293b;
      --preview-darkBgSidebar: #1e293b;
      --preview-darkTextPrimary: #f1f5f9;
      --preview-darkTextSecondary: #94a3b8;
      --preview-darkTextMuted: #475569;
      --preview-darkBorderColor: #334155;
      --preview-darkCodeBg: #1e293b;
      --preview-darkCodeText: #e2e8f0;
      --preview-darkCalloutBg: #1e3a8a;
      --preview-darkCalloutBorder: #60a5fa;
      --preview-brand50: #eff6ff;
      --preview-brand500: #3b82f6;
      --preview-brand900: #1e3a8a;
    }
  </style>
</svelte:head>

<div class="min-h-screen p-8" style="background-color: var(--preview-lightBgPrimary); color: var(--preview-lightTextPrimary);">
  <div class="max-w-4xl mx-auto space-y-8">
    
    <!-- Header mock -->
    <header class="p-4 rounded-lg border space-y-2" style="background-color: var(--preview-lightBgSecondary); border-color: var(--preview-lightBorderColor);">
      <h1 class="text-2xl font-bold" style="color: var(--preview-lightTextPrimary);">Documentation Portal</h1>
      <p class="text-sm" style="color: var(--preview-lightTextMuted);">Live Theme Preview</p>
    </header>

    <!-- Content mock -->
    <main class="space-y-6">
      <section class="p-6 rounded-lg border space-y-4" style="background-color: var(--preview-lightBgPrimary); border-color: var(--preview-lightBorderColor);">
        <h2 class="text-xl font-semibold" style="color: var(--preview-lightTextPrimary);">Sample Heading</h2>
        <p style="color: var(--preview-lightTextPrimary);">
          This is a preview of how your documentation will look with the current theme settings.
          Secondary text appears in <span style="color: var(--preview-lightTextSecondary);">this color</span>
          and muted text in <span style="color: var(--preview-lightTextMuted);">this color</span>.
        </p>
      </section>

      <!-- Code block mock -->
      <section class="p-4 rounded-lg space-y-2" style="background-color: var(--preview-lightCodeBg); color: var(--preview-lightCodeText);">
        <div class="text-sm font-mono">const example = "code block";</div>
      </section>

      <!-- Callout mock -->
      <section class="p-4 rounded-lg border-l-4 space-y-2" style="background-color: var(--preview-lightCalloutBg); border-color: var(--preview-lightCalloutBorder);">
        <p class="font-semibold">ℹ️ Information</p>
        <p class="text-sm">This is how callouts will appear with your theme colors.</p>
      </section>

      <!-- Brand colors demo -->
      <section class="p-4 rounded-lg border space-y-3" style="background-color: var(--preview-lightBgSecondary); border-color: var(--preview-lightBorderColor);">
        <h3 class="font-semibold">Brand Colors</h3>
        <div class="flex gap-4 flex-wrap">
          <div class="w-20 h-20 rounded flex items-center justify-center text-xs text-center" style="background-color: var(--preview-brand50); color: var(--preview-lightTextPrimary);">Brand 50</div>
          <div class="w-20 h-20 rounded flex items-center justify-center text-xs text-center text-white" style="background-color: var(--preview-brand500);">Brand 500</div>
          <div class="w-20 h-20 rounded flex items-center justify-center text-xs text-center text-white" style="background-color: var(--preview-brand900);">Brand 900</div>
        </div>
      </section>
    </main>

    <!-- Footer mock -->
    <footer class="pt-4 border-t text-center text-sm" style="border-color: var(--preview-lightBorderColor); color: var(--preview-lightTextMuted);">
      © 2026 Documentation Portal
    </footer>

  </div>
</div>
