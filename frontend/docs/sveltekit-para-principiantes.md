# SvelteKit para principiantes

Guía práctica para entender SvelteKit 2 desde cero: enrutamiento, carga de datos, layouts, y más.  
Con ejemplos directos del proyecto de documentación.

---

## Tabla de contenidos

1. [¿Qué es SvelteKit?](#qué-es-sveltekit)
2. [Enrutamiento basado en archivos](#enrutamiento-basado-en-archivos)
3. [Parámetros dinámicos](#parámetros-dinámicos)
4. [Archivos especiales de ruta](#archivos-especiales-de-ruta)
5. [Load functions — carga de datos](#load-functions--carga-de-datos)
6. [Layouts — estructura compartida](#layouts--estructura-compartida)
7. [Navegación y links](#navegación-y-links)
8. [Manejo de errores](#manejo-de-errores)
9. [Hooks del servidor](#hooks-del-servidor)
10. [Variables de entorno](#variables-de-entorno)
11. [El objeto `page` (store reactivo)](#el-objeto-page-store-reactivo)
12. [SSR vs CSR](#ssr-vs-csr)
13. [Ejemplos del proyecto](#ejemplos-del-proyecto)

---

## ¿Qué es SvelteKit?

SvelteKit es el framework **full-stack** que envuelve a Svelte. Proporciona:

- **Enrutamiento** basado en la estructura de archivos
- **SSR** (Server-Side Rendering) — el servidor genera el HTML antes de enviarlo
- **Carga de datos** integrada con funciones `load`
- **Pre-rendering** opcional (genera HTML estático en el build)
- **Navegación** del lado del cliente (SPA después de la primera carga)
- **Hooks** para interceptar requests del servidor

La aplicación funciona así en el primer acceso:
```
Navegador → SvelteKit SSR → HTML completo → Navegador
                 ↕                              ↕
           Strapi API                    Hydratación (JS)
```

Y en navegaciones posteriores (SPA):
```
Clic en link → SvelteKit router → load() → HTML parcial
```

---

## Enrutamiento basado en archivos

SvelteKit crea rutas según la estructura de carpetas dentro de `src/routes/`.

| Archivo | URL |
|---|---|
| `src/routes/+page.svelte` | `/` |
| `src/routes/sobre/+page.svelte` | `/sobre` |
| `src/routes/blog/+page.svelte` | `/blog` |
| `src/routes/blog/nuevo/+page.svelte` | `/blog/nuevo` |

**Regla:** Las carpetas = segmentos de URL. El archivo `+page.svelte` dentro de la carpeta = la página de esa URL.

---

## Parámetros dinámicos

Los nombres de carpeta entre corchetes son parámetros dinámicos:

| Carpeta | URL de ejemplo | Parámetros |
|---|---|---|
| `[locale]` | `/es` | `locale = "es"` |
| `[locale]/[category]` | `/es/guias` | `locale = "es"`, `category = "guias"` |
| `[locale]/[category]/[slug]` | `/es/guias/introduccion` | `locale = "es"`, `category = "guias"`, `slug = "introduccion"` |

**Estructura de este proyecto:**

```
src/routes/
├── +page.svelte                              → /
├── [locale]/
│   ├── +page.svelte                          → /es  o  /en
│   ├── [category]/
│   │   ├── +page.svelte                      → /es/guias
│   │   └── [slug]/
│   │       └── +page.svelte                  → /es/guias/introduccion
```

Acceder a los parámetros en una load function:

```typescript
// src/routes/[locale]/[category]/[slug]/+page.ts
export const load = async ({ params }) => {
  console.log(params.locale);   // "es"
  console.log(params.category); // "guias"
  console.log(params.slug);     // "introduccion"
};
```

---

## Archivos especiales de ruta

Dentro de cada carpeta de ruta, SvelteKit reconoce estos archivos:

| Archivo | Propósito |
|---|---|
| `+page.svelte` | El componente de la página (HTML visible) |
| `+page.ts` | Carga datos en servidor Y cliente (isomórfico) |
| `+page.server.ts` | Carga datos SOLO en el servidor |
| `+layout.svelte` | Componente de layout compartido |
| `+layout.ts` | Carga datos del layout (accesibles a todas las rutas hijas) |
| `+layout.server.ts` | Carga datos del layout solo en servidor |
| `+error.svelte` | Página de error para esta ruta |
| `+server.ts` | Endpoint de API puro (JSON, no HTML) |

---

## Load functions — carga de datos

Las load functions (`+page.ts`, `+layout.ts`) son la forma estándar de cargar datos antes de renderizar.

### `+page.ts` — isomórfico (servidor + cliente)

```typescript
// src/routes/[locale]/[category]/[slug]/+page.ts
import type { PageLoad } from './$types';
import { getArticleBySlug } from '$lib/api/articles';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  // 'fetch' aquí es el fetch especial de SvelteKit (SSR-aware)
  const res = await getArticleBySlug(params.slug, { locale: params.locale }, fetch);

  if (!res.data || res.data.length === 0) {
    // Lanza un error 404 que captura +error.svelte
    error(404, `Artículo "${params.slug}" no encontrado`);
  }

  const article = res.data[0];
  return { article, locale: params.locale };
};
```

Lo que retorna la load function llega como `data` al `+page.svelte`:

```svelte
<!-- src/routes/[locale]/[category]/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const article = $derived(data.article);
  const locale  = $derived(data.locale);
</script>

<h1>{article.title}</h1>
```

### `+page.server.ts` — solo servidor

Úsalo cuando necesitas acceso a cosas que solo existen en el servidor:
- Variables de entorno privadas (sin prefijo `VITE_`)
- Bases de datos directas
- Cookies seguras

```typescript
// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('session');
  if (!token) redirect(302, '/login');

  return { usuario: 'Admin' };
};
```

### Heredar datos del layout

Las load functions de layouts "padres" se combinan automáticamente con las de las páginas hijas usando `parent()`:

```typescript
// src/routes/[locale]/[category]/+page.ts
export const load: PageLoad = async ({ params, parent, fetch }) => {
  // Espera los datos del layout padre ([locale]/+layout.ts)
  const parentData = await parent();
  // parentData.categories está disponible aquí

  const articles = await getArticles({ locale: params.locale }, fetch);
  return { articles };
};
```

---

## Layouts — estructura compartida

Un `+layout.svelte` envuelve a todas las páginas dentro de su carpeta y subcarpetas.

```svelte
<!-- src/routes/[locale]/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import Header from '$lib/components/layout/Header.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<Header />

<div class="page-layout">
  <Sidebar categories={data.categories} />
  <main>
    <!-- Aquí se renderiza la página hija -->
    {@render children()}
  </main>
</div>
```

El layout raíz (`src/routes/+layout.svelte`) envuelve **toda** la aplicación:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';  // Estilos globales
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
```

**Anidamiento:**

```
src/routes/
├── +layout.svelte          ← Layout raíz (app.css, envuelve todo)
└── [locale]/
    ├── +layout.svelte      ← Layout del locale (Header + Sidebar)
    └── [category]/
        └── [slug]/
            └── +page.svelte  ← Renderizado dentro de AMBOS layouts
```

Cuando visitas `/es/guias/intro`, el orden de renderizado es:
1. Layout raíz
2. Layout `[locale]`
3. Página `[slug]`

---

## Navegación y links

### Links normales

```svelte
<!-- SvelteKit intercepta <a> automáticamente para SPA navigation -->
<a href="/es/guias">Guías</a>
<a href="/es/guias/introduccion">Introducción</a>
```

### Precarga de datos (preloading)

El atributo `data-sveltekit-preload-data` en `app.html` activa la precarga al hacer hover:

```html
<body data-sveltekit-preload-data="hover">
```

Cuando el usuario pone el cursor sobre un link, SvelteKit ejecuta la load function en segundo plano. Al hacer clic, la página aparece instantáneamente.

### Navegación programática

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  async function irAGuias() {
    await goto('/es/guias');
    // También puedes usar:
    // goto('/es/guias', { replaceState: true })  // sin agregar al historial
    // goto('/es/guias', { noScroll: true })       // sin scroll to top
  }
</script>
```

### Invalidar datos (refetch)

```svelte
<script lang="ts">
  import { invalidate, invalidateAll } from '$app/navigation';

  async function actualizar() {
    await invalidate('/api/articulos');  // Refetch específico
    // o
    await invalidateAll();              // Refetch todo
  }
</script>
```

---

## Manejo de errores

### Lanzar errores desde load functions

```typescript
import { error, redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  const data = await fetchData(params.id);

  if (!data) {
    error(404, 'No encontrado');  // Capturado por +error.svelte
  }

  if (!estaAutorizado) {
    redirect(302, '/login');      // Redirige al usuario
  }

  return { data };
};
```

### `+error.svelte` — página de error

Cada carpeta puede tener su propio `+error.svelte`. SvelteKit usa el más cercano en la jerarquía.

```svelte
<!-- src/routes/[locale]/+error.svelte -->
<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="error-page">
  <h1>{page.status}</h1>
  <p>{page.error?.message}</p>
  <a href="/">Volver al inicio</a>
</div>
```

El `+error.svelte` raíz (`src/routes/+error.svelte`) captura errores que no tienen un `+error.svelte` más específico.

---

## Hooks del servidor

Los hooks (`src/hooks.server.ts`) interceptan cada request del servidor. Son útiles para:
- Modificar el HTML generado
- Autenticación global
- Logs

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Código ANTES de que SvelteKit procese la ruta
  const locale = event.url.pathname.split('/')[1] ?? 'es';

  const response = await resolve(event, {
    // Reemplazar el placeholder %sveltekit.lang% en app.html
    transformPageChunk: ({ html }) =>
      html.replace('%sveltekit.lang%', locale),
  });

  // Código DESPUÉS de que SvelteKit generó la respuesta
  return response;
};
```

Así funciona en este proyecto: `app.html` tiene `<html lang="%sveltekit.lang%">` y el hook lo reemplaza con `"es"` o `"en"` según la URL, dando el idioma correcto al HTML para SEO y accesibilidad.

---

## Variables de entorno

SvelteKit categoriza las variables de entorno en 4 módulos:

| Módulo | Disponible en | Ejemplo |
|---|---|---|
| `$env/static/public` | Todo (compilado) | `PUBLIC_API_URL` |
| `$env/dynamic/public` | Todo (runtime) | `PUBLIC_VERSION` |
| `$env/static/private` | Solo servidor (compilado) | `DATABASE_URL` |
| `$env/dynamic/private` | Solo servidor (runtime) | `SESSION_SECRET` |

**En este proyecto** se usa Vite directamente para las variables públicas (prefijo `VITE_`):

```typescript
// Funciona en todo (cliente + servidor)
const strapiUrl = import.meta.env.VITE_STRAPI_URL;

// Alternativa con módulo de SvelteKit
import { VITE_STRAPI_URL } from '$env/static/public';
```

---

## El objeto `page` (store reactivo)

`page` de `$app/state` contiene información de la ruta actual y es reactivo:

```svelte
<script lang="ts">
  import { page } from '$app/state';
</script>

<!-- URL actual -->
<p>Ruta: {page.url.pathname}</p>
<p>Parámetros: {JSON.stringify(page.params)}</p>

<!-- Estado de error (cuando estás en +error.svelte) -->
<p>Error: {page.error?.message}</p>
<p>Status: {page.status}</p>

<!-- Datos de la página actual -->
<p>Título: {page.data.title}</p>
```

---

## SSR vs CSR

SvelteKit tiene varios modos que puedes controlar por ruta:

```typescript
// +page.ts
export const ssr = true;      // Renderizar en servidor (default)
export const csr = true;      // Hidratar en cliente (default)
export const prerender = true; // Pre-generar en build (estático)
```

**SSR (Server-Side Rendering) — default:**
- El servidor genera el HTML completo
- El navegador recibe HTML con contenido (bueno para SEO)
- Luego JavaScript "hidrata" la página para hacerla interactiva

**CSR (Client-Side Rendering):**
- El servidor envía HTML vacío
- JavaScript carga y renderiza el contenido
- Más rápido para navegaciones internas

**Pre-rendering:**
- El HTML se genera durante el `npm run build`
- Sin servidor necesario (se sirven archivos estáticos)
- Solo para páginas con contenido que no cambia frecuentemente

**En este proyecto:** SSR activo (default) para SEO, ya que es un portal de documentación que debe ser indexado por buscadores.

---

## Ejemplos del proyecto

### Ruta con herencia de datos del layout

```typescript
// src/routes/[locale]/+layout.ts
// Carga categorías — disponibles en TODAS las rutas hijas
import type { LayoutLoad } from './$types';
import { getCategories } from '$lib/api/categories';

export const load: LayoutLoad = async ({ params, fetch }) => {
  const categoriesRes = await getCategories({ locale: params.locale }, fetch);
  return { categories: categoriesRes.data };
};
```

```typescript
// src/routes/[locale]/[category]/+page.ts
// Hereda categories del layout, agrega articles
import type { PageLoad } from './$types';
import { getArticles } from '$lib/api/articles';

export const load: PageLoad = async ({ params, parent, fetch }) => {
  const { categories } = await parent(); // ← datos del layout
  const articlesRes = await getArticles({
    locale: params.locale,
    categorySlug: params.category,
  }, fetch);
  return { locale: params.locale, articles: articlesRes.data };
};
```

### Página que lee datos del load

```svelte
<!-- src/routes/[locale]/[category]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  // $props() recibe el data de la load function
  let { data }: { data: PageData } = $props();

  // Derivar valores del data reactivo
  const articles = $derived(data.articles);
  const locale   = $derived(data.locale);
</script>

{#each articles as article (article.id)}
  <a href="/{locale}/{article.category?.slug}/{article.slug}">
    <h3>{article.title}</h3>
    <p>{article.excerpt ?? ''}</p>
  </a>
{:else}
  <p>No hay artículos en esta categoría</p>
{/each}
```

### Server hook inyectando idioma en el HTML

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Extrae el locale del primer segmento de la URL
  const locale = event.url.pathname.split('/')[1] ?? 'es';

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%sveltekit.lang%', locale),
  });
};
```

```html
<!-- src/app.html — el placeholder que reemplaza el hook -->
<html lang="%sveltekit.lang%">
```

El resultado en producción es `<html lang="es">` o `<html lang="en">` según la URL — correcto para lectores de pantalla y motores de búsqueda.

### Redirect automático desde la raíz

```typescript
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  // La raíz "/" redirige a "/es" automáticamente
  redirect(302, '/es');
};
```

Esto garantiza que el usuario siempre vea una URL con locale y que el `+layout.svelte` de `[locale]` siempre tenga acceso al parámetro `params.locale`.
