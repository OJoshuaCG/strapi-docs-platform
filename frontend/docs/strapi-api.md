# Integración con Strapi API

Documentación del cliente HTTP que conecta el frontend con el CMS Strapi v5.

---

## Tabla de contenidos

1. [Arquitectura del cliente](#arquitectura-del-cliente)
2. [Cliente base (`strapi.ts`)](#cliente-base-strapits)
3. [Funciones de endpoint](#funciones-de-endpoint)
4. [Formato de respuesta Strapi v5](#formato-de-respuesta-strapi-v5)
5. [Sistema de caché](#sistema-de-caché)
6. [Manejo de errores](#manejo-de-errores)
7. [Usar el fetch de SvelteKit](#usar-el-fetch-de-sveltekit)
8. [Cómo agregar un nuevo endpoint](#cómo-agregar-un-nuevo-endpoint)
9. [Filtros y parámetros de Strapi](#filtros-y-parámetros-de-strapi)

---

## Arquitectura del cliente

```
src/lib/api/
├── strapi.ts       ← Cliente base: HTTP, caché, errores, buildQuery
├── articles.ts     ← Funciones para el tipo "documentation-articles"
└── categories.ts   ← Funciones para el tipo "documentation-categories"
```

Las funciones de endpoints (`articles.ts`, `categories.ts`) nunca hacen `fetch` directamente. Siempre delegan a `strapiRequest()` del cliente base. Esto centraliza la lógica de caché, errores y headers en un solo lugar.

---

## Cliente base (`strapi.ts`)

Ubicación: `src/lib/api/strapi.ts`

### URL base

```typescript
const STRAPI_URL = import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337';
```

Todos los requests se construyen como `${STRAPI_URL}/api${path}`.

### `strapiRequest<T>`

Función central para todos los requests:

```typescript
export async function strapiRequest<T>(
  path: string,              // Ruta del API: '/documentation-articles?...'
  options: RequestInit = {}, // Opciones de fetch: method, headers, body
  fetchFn: typeof fetch = globalThis.fetch, // fetch a usar (SvelteKit lo sobreescribe)
  useCache = true,           // Usar caché en memoria (solo GET)
): Promise<T>
```

**Lo que hace internamente:**
1. Construye la URL completa
2. Revisa el caché si es GET
3. Llama a `fetchFn` con un timeout de 10 segundos (`AbortSignal.timeout(10_000)`)
4. Si la respuesta no es `ok`, parsea el error de Strapi y lanza `StrapiRequestError`
5. Si es `ok`, parsea el JSON y lo guarda en caché

```typescript
// Ejemplo de uso directo (raramente necesario — usa las funciones de endpoint)
const data = await strapiRequest<StrapiListResponse<StrapiArticle>>(
  '/documentation-articles?populate=category&filters[locale]=es',
  {},
  fetch  // fetch de SvelteKit en load functions
);
```

### `buildQuery`

Convierte un objeto JavaScript a query string en formato Strapi (compatible con `qs`):

```typescript
buildQuery({
  filters: { locale: 'es', category: { slug: 'guias' } },
  populate: 'category',
  pagination: { pageSize: 25 }
})
// → ?filters[locale]=es&filters[category][slug]=guias&populate=category&pagination[pageSize]=25
```

**Reglas de serialización:**
- Arrays: `key[0]=a&key[1]=b`
- Objetos: `key[subkey]=value`
- `null` y `undefined` se omiten

```typescript
// Ejemplo completo
const query = buildQuery({
  filters: {
    locale: params.locale,        // filters[locale]=es
    slug: params.slug,            // filters[slug]=introduccion
  },
  populate: {
    category: true,               // populate[category]=true
    cover: { fields: ['url'] },   // populate[cover][fields][0]=url
  },
  pagination: { pageSize: 1 }
});

const url = `/documentation-articles${query}`;
```

### `invalidateCache`

Limpia todo el caché en memoria del navegador:

```typescript
import { invalidateCache } from '$lib/api/strapi';

// Útil después de mutaciones o cuando quieres forzar un refetch
invalidateCache();
```

---

## Funciones de endpoint

### Categorías (`categories.ts`)

```typescript
// Lista de categorías con filtros opcionales
getCategories(
  filters?: { locale?: string; pageSize?: number },
  fetchFn?: typeof fetch
): Promise<StrapiListResponse<StrapiCategory>>

// Categoría por slug
getCategoryBySlug(
  slug: string,
  filters?: { locale?: string },
  fetchFn?: typeof fetch
): Promise<StrapiListResponse<StrapiCategory>>
```

**Ejemplo:**
```typescript
// En un +layout.ts
const res = await getCategories({ locale: 'es' }, fetch);
const categorias = res.data; // StrapiCategory[]
```

### Artículos (`articles.ts`)

```typescript
// Lista de artículos con filtros opcionales
getArticles(
  filters?: { locale?: string; categorySlug?: string; pageSize?: number },
  fetchFn?: typeof fetch
): Promise<StrapiListResponse<StrapiArticle>>

// Artículo por slug (incluye contenido completo)
getArticleBySlug(
  slug: string,
  filters?: { locale?: string },
  fetchFn?: typeof fetch
): Promise<StrapiListResponse<StrapiArticle>>
```

**Ejemplo:**
```typescript
// En un +page.ts — artículo con su contenido completo
const res = await getArticleBySlug(params.slug, { locale: 'es' }, fetch);

if (res.data.length === 0) {
  error(404, 'Artículo no encontrado');
}

const article = res.data[0]; // StrapiArticle con content: StrapiBlock[]
```

---

## Formato de respuesta Strapi v5

**Diferencia clave vs Strapi v4:** En v5, los campos están directamente en el objeto, no dentro de `attributes`.

```json
// Strapi v4 (VIEJO — no aplica a este proyecto)
{
  "data": {
    "id": 1,
    "attributes": {
      "title": "Introducción",
      "slug": "introduccion"
    }
  }
}

// Strapi v5 (ACTUAL)
{
  "data": {
    "id": 1,
    "documentId": "abc123xyz",
    "title": "Introducción",
    "slug": "introduccion",
    "locale": "es",
    "publishedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

### Respuesta de lista

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "kj3h4...",
      "name": "Guías",
      "slug": "guias",
      "locale": "es"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 3
    }
  }
}
```

### Campo `content` — bloques de contenido

El campo `content` de un artículo es un array de bloques. Cada bloque tiene un campo `type` que discrimina el tipo:

```json
[
  {
    "type": "heading",
    "level": 2,
    "children": [{ "type": "text", "text": "Introducción" }]
  },
  {
    "type": "paragraph",
    "children": [
      { "type": "text", "text": "Este es un texto con " },
      { "type": "text", "text": "negrita", "bold": true },
      { "type": "text", "text": " y " },
      {
        "type": "link",
        "url": "https://ejemplo.com",
        "children": [{ "type": "text", "text": "un link" }]
      }
    ]
  },
  {
    "type": "code",
    "language": "typescript",
    "children": [{ "type": "text", "text": "const x = 1;" }]
  },
  {
    "type": "list",
    "format": "unordered",
    "children": [
      {
        "type": "list-item",
        "children": [{ "type": "text", "text": "Elemento uno" }]
      }
    ]
  }
]
```

**Tipos de bloques soportados:**

| `type` | Descripción | Componente |
|---|---|---|
| `paragraph` | Párrafo con texto inline | `ParagraphBlock.svelte` |
| `heading` | Encabezado h1–h6 | `HeadingBlock.svelte` |
| `code` | Bloque de código con lenguaje | `CodeBlock.svelte` |
| `image` | Imagen con URL y metadatos | `ImageBlock.svelte` |
| `list` | Lista ordenada/no ordenada | `ListBlock.svelte` |
| `quote` | Cita (blockquote) | `QuoteBlock.svelte` |

---

## Sistema de caché

El caché vive exclusivamente en el **navegador** (nunca en SSR):

```typescript
const CACHE_TTL = 30 * 1000; // 30 segundos

// Estructura interna
const cache = new Map<string, { data: unknown; expires: number }>();
```

**Comportamiento:**

| Contexto | Comportamiento |
|---|---|
| SSR (primer render del servidor) | **Nunca usa caché** — siempre hace fetch |
| Navegador, primera visita | Hace fetch, guarda en caché |
| Navegador, visita < 30s después | Devuelve desde caché (sin red) |
| Navegador, visita > 30s después | Hace fetch nuevo, actualiza caché |

**¿Por qué 30 segundos?**  
Tiempo suficientemente corto para que los cambios publicados en el admin de Strapi aparezcan rápido, pero suficientemente largo para evitar requests duplicados en navegación rápida.

**Invalidación manual:**

```typescript
import { invalidateCache } from '$lib/api/strapi';

// Limpia TODO el caché — útil después de guardar cambios
invalidateCache();
```

---

## Manejo de errores

### `StrapiRequestError`

Todos los errores HTTP de Strapi se convierten en instancias de `StrapiRequestError`:

```typescript
export class StrapiRequestError extends Error {
  status: number;          // Código HTTP: 404, 403, 500, etc.
  strapiError: {
    status: number;
    name: string;          // 'NotFoundError', 'ValidationError', etc.
    message: string;       // Mensaje legible
    details?: unknown;
  };
}
```

**Atrapar en load functions:**

```typescript
import { error } from '@sveltejs/kit';
import { StrapiRequestError } from '$lib/api/strapi';

export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const res = await getArticleBySlug(params.slug, { locale: params.locale }, fetch);
    if (res.data.length === 0) error(404, 'Artículo no encontrado');
    return { article: res.data[0] };
  } catch (e) {
    if (e instanceof StrapiRequestError) {
      error(e.status, e.message);
    }
    throw e; // Re-lanzar errores inesperados
  }
};
```

### Timeout

Todos los requests tienen un timeout de **10 segundos** via `AbortSignal.timeout(10_000)`. Si Strapi no responde en ese tiempo, el fetch lanza un `DOMException: TimeoutError`.

---

## Usar el fetch de SvelteKit

En load functions (`+page.ts`, `+layout.ts`), siempre pasa el `fetch` de SvelteKit a las funciones de API:

```typescript
// ✅ Correcto — fetch de SvelteKit
export const load: PageLoad = async ({ params, fetch }) => {
  const res = await getCategories({ locale: params.locale }, fetch);
  return { categories: res.data };
};

// ❌ Incorrecto — globalThis.fetch (bypassa SSR optimizations)
export const load: PageLoad = async ({ params }) => {
  const res = await getCategories({ locale: params.locale }); // sin fetch
  return { categories: res.data };
};
```

**¿Por qué importa?**  
El `fetch` de SvelteKit:
1. Deduplica requests idénticos durante SSR
2. Reenvía cookies de autenticación al backend
3. Permite que SvelteKit cachee y reutilice responses durante hidratación

---

## Cómo agregar un nuevo endpoint

**Escenario:** Quieres agregar un tipo de contenido nuevo en Strapi, por ejemplo `documentation-guides`.

**Paso 1 — Agregar los tipos en `src/lib/types/strapi.ts`:**

```typescript
export interface StrapiGuide {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  locale: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: StrapiBlock[];
}
```

**Paso 2 — Crear `src/lib/api/guides.ts`:**

```typescript
import { strapiRequest, buildQuery } from './strapi';
import type { StrapiListResponse } from '$lib/types/strapi';
import type { StrapiGuide } from '$lib/types/strapi';

interface GuideFilters {
  locale?: string;
  difficulty?: string;
  pageSize?: number;
}

export async function getGuides(
  filters: GuideFilters = {},
  fetchFn?: typeof fetch,
): Promise<StrapiListResponse<StrapiGuide>> {
  const params: Record<string, unknown> = {
    populate: 'category',
    pagination: { pageSize: filters.pageSize ?? 25 },
  };

  if (filters.locale) params['filters[locale]'] = filters.locale;
  if (filters.difficulty) params['filters[difficulty]'] = filters.difficulty;

  const query = buildQuery(params);
  return strapiRequest<StrapiListResponse<StrapiGuide>>(
    `/documentation-guides${query}`,
    {},
    fetchFn,
  );
}
```

**Paso 3 — Usar en una load function:**

```typescript
// src/routes/[locale]/guides/+page.ts
import { getGuides } from '$lib/api/guides';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await getGuides({ locale: params.locale }, fetch);
  return { guides: res.data };
};
```

---

## Filtros y parámetros de Strapi

Strapi v5 usa una sintaxis de filtros basada en `qs`. Los principales:

### Filtros básicos

```
filters[campo]=valor          → campo = valor (exacto)
filters[campo][$contains]=x  → campo contiene x
filters[campo][$gt]=10        → campo > 10
filters[campo][$in][0]=a&...  → campo está en [a, b, c]
```

### Populate (traer relaciones)

```
populate=*                        → Todas las relaciones (nivel 1)
populate=category                 → Solo la relación "category"
populate[category][fields][0]=name → Solo el campo "name" de category
```

### Paginación

```
pagination[page]=1
pagination[pageSize]=25
pagination[start]=0    → Alternativo: offset
pagination[limit]=10   → Alternativo: limit
```

### Locale (internacionalización)

```
locale=es              → Contenido en español
locale=en              → Contenido en inglés
```

### Ordenamiento

```
sort[0]=publishedAt:desc    → Más recientes primero
sort[0]=title:asc           → Alfabético ascendente
```

**Ejemplo completo con `buildQuery`:**

```typescript
const query = buildQuery({
  filters: {
    locale: 'es',
    category: { slug: 'guias' },
  },
  populate: 'category',
  sort: ['publishedAt:desc'],
  pagination: { pageSize: 10 },
});
// → ?filters[locale]=es&filters[category][slug]=guias&populate=category&sort[0]=publishedAt:desc&pagination[pageSize]=10
```
