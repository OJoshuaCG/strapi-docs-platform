# TailwindCSS v4

TailwindCSS es un framework CSS **utility-first**: en lugar de escribir CSS personalizado, compones el diseño con clases predefinidas directamente en el HTML.

La versión 4 es una reescritura completa que elimina el archivo `tailwind.config.js` y mueve toda la configuración a CSS puro.

---

## Tabla de contenidos

1. [¿Qué es utility-first?](#qué-es-utility-first)
2. [Diferencias v4 vs v3](#diferencias-v4-vs-v3)
3. [Integración con Vite](#integración-con-vite)
4. [Tokens de diseño con `@theme`](#tokens-de-diseño-con-theme)
5. [Sistema de temas (light/dark)](#sistema-de-temas-lightdark)
6. [Plugin Typography (`prose`)](#plugin-typography-prose)
7. [Clases de uso frecuente en el proyecto](#clases-de-uso-frecuente-en-el-proyecto)
8. [Clases dinámicas en Svelte](#clases-dinámicas-en-svelte)
9. [Buenas prácticas](#buenas-prácticas)

---

## ¿Qué es utility-first?

En CSS tradicional escribes clases semánticas:

```css
/* Defines la clase primero */
.boton-primario {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
```

```html
<button class="boton-primario">Guardar</button>
```

Con Tailwind usas clases utilitarias directamente:

```html
<button class="bg-blue-600 text-white px-4 py-2 rounded text-sm">
  Guardar
</button>
```

**Ventajas:**
- No hay que nombrar clases (el mayor tiempo perdido en CSS)
- Los estilos están junto al HTML — fácil de leer y modificar
- Sin CSS muerto — solo se incluye en el bundle lo que usas

---

## Diferencias v4 vs v3

| Aspecto | v3 | v4 |
|---|---|---|
| Configuración | `tailwind.config.js` | Directiva `@theme` en CSS |
| Importación | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| Integración con Vite | PostCSS plugin | Plugin nativo de Vite |
| Variables CSS | Opcional | Primera clase — todo genera CSS vars |
| Dark mode | Clase `dark:` o media query | Igual, pero mejor integración con CSS vars |

---

## Integración con Vite

El plugin oficial para Vite es `@tailwindcss/vite` (no PostCSS):

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),  // ← Plugin de Tailwind (debe ir antes de sveltekit)
    sveltekit()
  ]
});
```

```css
/* src/app.css — importar Tailwind y plugins */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

No se necesita nada más. Tailwind escanea automáticamente todos los archivos `.svelte`, `.ts`, `.html` en busca de clases usadas.

---

## Tokens de diseño con `@theme`

La directiva `@theme` define los tokens personalizados del proyecto. Estos tokens se convierten en clases de Tailwind usables:

```css
/* src/app.css */
@theme {
  /* Fuentes */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;

  /* Paleta de marca (se convierte en text-brand-*, bg-brand-*, etc.) */
  --color-brand-50:  #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;  ← Color principal de acento
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;

  /* Medidas personalizadas */
  --sidebar-width: 16rem;

  /* Animaciones */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Uso en componentes:**

```svelte
<!-- Clases generadas automáticamente desde @theme -->
<a class="text-brand-600 hover:text-brand-700">Link</a>
<div class="bg-brand-50 border border-brand-200">Callout</div>
<span class="font-mono text-sm">código</span>
```

---

## Sistema de temas (light/dark)

Este proyecto usa un sistema de variables CSS manuales para el tema, no la clase `dark:` de Tailwind. La razón: permite usar las mismas variables CSS tanto en Tailwind como en CSS puro.

**Definición en `app.css`:**

```css
/* Variables del tema claro (default) */
:root {
  --bg-primary:      #ffffff;
  --bg-secondary:    #f8fafc;
  --bg-sidebar:      #f1f5f9;
  --text-primary:    #0f172a;
  --text-secondary:  #475569;
  --text-muted:      #94a3b8;
  --border-color:    #e2e8f0;
  --code-bg:         #f1f5f9;
  --code-text:       #0f172a;
  --callout-bg:      #eff6ff;
  --callout-border:  #3b82f6;
}

/* Variables del tema oscuro — se activan con clase .dark en <html> */
.dark {
  --bg-primary:      #0f172a;
  --bg-secondary:    #1e293b;
  --bg-sidebar:      #1e293b;
  --text-primary:    #f1f5f9;
  --text-secondary:  #94a3b8;
  --text-muted:      #475569;
  --border-color:    #334155;
  --code-bg:         #1e293b;
  --code-text:       #e2e8f0;
  --callout-bg:      #1e3a8a;
  --callout-border:  #60a5fa;
}
```

**Uso en componentes con `var()`:**

```svelte
<!-- Referencia a variables CSS en clases de Tailwind (sintaxis de corchetes) -->
<div class="bg-[var(--bg-primary)] text-[var(--text-primary)]">
  <p class="text-[var(--text-secondary)]">Texto secundario</p>
  <hr class="border-[var(--border-color)]" />
</div>
```

**Activar/desactivar el modo oscuro (desde `Header.svelte`):**

```svelte
<script lang="ts">
  import { browser } from '$app/environment';

  let dark = $state(browser ? localStorage.getItem('theme') === 'dark' : false);

  $effect(() => {
    if (!browser) return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
</script>

<button onclick={() => (dark = !dark)}>
  {dark ? 'Modo claro' : 'Modo oscuro'}
</button>
```

---

## Plugin Typography (`prose`)

`@tailwindcss/typography` añade la clase `prose` que estiliza automáticamente el HTML generado por el CMS (encabezados, listas, código, citas, etc.).

**Importar el plugin:**
```css
@plugin "@tailwindcss/typography";
```

**Usar en componentes:**
```svelte
<article class="prose prose-lg max-w-none">
  <!-- El HTML aquí obtiene tipografía automática -->
  <h2>Encabezado</h2>
  <p>Párrafo con <strong>negritas</strong> y <a href="#">links</a>.</p>
  <pre><code>código</code></pre>
</article>
```

**Personalización con variables CSS (`app.css`):**

El plugin expone variables CSS que puedes sobreescribir para que el `prose` respete el tema del proyecto:

```css
.prose {
  --tw-prose-body:          var(--text-primary);
  --tw-prose-headings:      var(--text-primary);
  --tw-prose-links:         var(--color-brand-600);
  --tw-prose-bold:          var(--text-primary);
  --tw-prose-bullets:       var(--text-muted);
  --tw-prose-hr:            var(--border-color);
  --tw-prose-quote-borders: var(--color-brand-500);
  --tw-prose-code:          var(--code-text);
  --tw-prose-pre-bg:        var(--code-bg);
}
```

Con esto, `prose` cambia automáticamente cuando cambia el tema (sin escribir `dark:prose-invert` ni nada adicional).

---

## Clases de uso frecuente en el proyecto

### Layout y espaciado

```
flex items-center justify-between   — flexbox horizontal centrado
flex flex-col gap-4                 — columna con espacio entre elementos
grid grid-cols-1 md:grid-cols-2     — grid responsive
p-4 px-6 py-3                       — padding
m-4 mt-2 mb-6                       — margin
w-full max-w-3xl                    — ancho
min-h-screen                        — altura mínima de pantalla
overflow-hidden overflow-x-auto     — desbordamiento
```

### Tipografía

```
text-sm text-base text-lg text-xl text-2xl    — tamaño
font-normal font-medium font-semibold font-bold — peso
text-brand-600                                  — color de marca
leading-6 leading-relaxed                       — interlineado
truncate line-clamp-2                           — recorte de texto
```

### Bordes y formas

```
border border-[var(--border-color)]   — borde con token de tema
rounded rounded-md rounded-lg rounded-full  — bordes redondeados
ring-2 ring-brand-500                 — outline ring (foco)
```

### Interactividad

```
hover:bg-brand-50 hover:text-brand-700    — hover
focus:outline-none focus:ring-2           — focus
transition-colors transition-all          — transiciones
cursor-pointer cursor-not-allowed         — cursor
```

### Responsive

```
sm:text-lg md:grid-cols-2 lg:flex   — breakpoints
hidden md:block                      — ocultar/mostrar por breakpoint
```

---

## Clases dinámicas en Svelte

### Clases condicionales

```svelte
<script lang="ts">
  let activo = $state(false);
  let tipo = $state<'primario' | 'secundario'>('primario');
</script>

<!-- Ternario inline -->
<div class="{activo ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'} p-4 rounded">
  Contenido
</div>

<!-- Directiva class: (más limpio para una clase) -->
<button class="px-4 py-2 rounded transition-colors" class:bg-brand-600={activo}>
  Botón
</button>
```

### Interpolación de variables CSS

```svelte
<script lang="ts">
  let progreso = $state(75);
</script>

<!-- Variables CSS calculadas dinámicamente -->
<div style:width="{progreso}%" class="h-2 bg-brand-500 rounded-full"></div>
```

---

## Buenas prácticas

**Usa variables CSS (`var(--...)`) para todo lo que dependa del tema:**

```svelte
<!-- ✅ Cambia con dark mode automáticamente -->
<div class="bg-[var(--bg-primary)]">

<!-- ❌ Fijo, ignora dark mode -->
<div class="bg-white">
```

**Extrae componentes cuando las clases se repiten demasiado:**

Si copias el mismo bloque de 10 clases en 5 lugares, crea un componente Svelte — no una clase CSS abstracta.

**Prefiere `prose` para contenido del CMS:**

El contenido de Strapi se renderiza con `BlockRenderer` componente a componente, por lo que no uses `prose` en esos componentes individualmente — cada bloque ya tiene sus propios estilos. Usa `prose` solo si algún día renderizas HTML crudo.

**No uses `@apply` en v4:**

En Tailwind v4, `@apply` tiene soporte limitado. Prefiere componentes Svelte sobre clases CSS abstractas con `@apply`.
