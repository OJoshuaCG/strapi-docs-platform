# TypeScript

TypeScript es un superconjunto de JavaScript que añade **tipado estático**. El compilador detecta errores antes de ejecutar el código, hace el refactoring más seguro, y mejora el autocompletado en el editor.

---

## Tabla de contenidos

1. [¿Por qué TypeScript?](#por-qué-typescript)
2. [Versión y configuración del proyecto](#versión-y-configuración-del-proyecto)
3. [Verificar tipos](#verificar-tipos)
4. [Alias de rutas (`$lib`)](#alias-de-rutas-lib)
5. [Tipos en este proyecto](#tipos-en-este-proyecto)
6. [Patrones de TypeScript usados](#patrones-de-typescript-usados)
7. [TypeScript con Svelte 5](#typescript-con-svelte-5)
8. [Errores comunes y cómo resolverlos](#errores-comunes-y-cómo-resolverlos)

---

## ¿Por qué TypeScript?

En un proyecto que consume una API externa (Strapi), TypeScript garantiza que los datos que llegan del servidor tienen la forma esperada. Sin TypeScript:

```javascript
// ¿Qué tiene article? ¿article.title? ¿article.name? ¿article.data.title?
const title = article.titulo; // Typo — nadie lo detecta hasta runtime
```

Con TypeScript:

```typescript
const article: StrapiArticle = await getArticleBySlug(slug);
const title = article.titulo; // ❌ Error en el editor: Property 'titulo' does not exist
const title = article.title;  // ✅ Correcto
```

---

## Versión y configuración del proyecto

**Versión:** `typescript ^6.0.2`

**Archivo `tsconfig.json`:**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "rewriteRelativeImportExtensions": true,
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "sourceMap": true
  }
}
```

**Opciones clave:**

| Opción | Efecto |
|---|---|
| `"strict": true` | Activa todas las verificaciones estrictas (nullability, implicit any, etc.) |
| `"moduleResolution": "bundler"` | Resolución moderna compatible con Vite y ESM |
| `"allowJs": true` | Permite mezclar `.js` con `.ts` |
| `"checkJs": true` | Verifica tipos también en archivos `.js` |
| `"skipLibCheck": true` | No verifica `.d.ts` de `node_modules` (más rápido) |
| `"extends": "./.svelte-kit/tsconfig.json"` | SvelteKit inyecta sus propios paths aquí (incluyendo `$lib`) |

---

## Verificar tipos

```bash
# Verificación única
npm run check

# Verificación continua (se re-ejecuta al guardar archivos)
npm run check:watch
```

Internamente, estos comandos ejecutan:
```bash
svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
```

- `svelte-kit sync` regenera los tipos automáticos de SvelteKit (`$types`, paths)
- `svelte-check` verifica los `.svelte` además de los `.ts`

---

## Alias de rutas (`$lib`)

SvelteKit configura automáticamente el alias `$lib` que apunta a `src/lib/`. Siempre úsalo en lugar de rutas relativas.

```typescript
// ✅ Con alias — claro, no se rompe al mover archivos
import { strapiRequest } from '$lib/api/strapi';
import type { StrapiArticle } from '$lib/types/strapi';
import { slugify } from '$lib/utils/slugify';

// ❌ Con ruta relativa — frágil
import { strapiRequest } from '../../../lib/api/strapi';
```

El alias funciona en archivos `.ts`, `.svelte` (sección `<script>`), y `.svelte` (CSS con `url()`).

---

## Tipos en este proyecto

Todos los tipos del API de Strapi están en `src/lib/types/strapi.ts`. Este archivo es la fuente de verdad para la forma de los datos.

### Respuestas de la API

```typescript
// Lista de items (categories, articles)
interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Item único
interface StrapiSingleResponse<T> {
  data: T;
}

// Error del API
interface StrapiErrorResponse {
  error: {
    status: number;
    name: string;
    message: string;
    details?: unknown;
  };
}
```

### Entidades de contenido

```typescript
interface StrapiCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  locale: string;
  description?: string | null;
}

interface StrapiArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  locale: string;
  excerpt?: string | null;
  content: StrapiBlock[];
  category?: StrapiCategory | null;
  publishedAt: string;
  updatedAt: string;
}
```

### Bloques de contenido (unión discriminada)

```typescript
type StrapiBlock =
  | StrapiParagraphBlock
  | StrapiHeadingBlock
  | StrapiCodeBlock
  | StrapiImageBlock
  | StrapiListBlock
  | StrapiQuoteBlock;

interface StrapiHeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: StrapiInlineNode[];
}

interface StrapiCodeBlock {
  type: 'code';
  language?: string | null;
  children: [{ type: 'text'; text: string }];
}
```

La **unión discriminada** (campo `type`) permite a TypeScript inferir el tipo correcto en cada rama:

```typescript
function renderBlock(block: StrapiBlock) {
  if (block.type === 'heading') {
    // TypeScript sabe que block es StrapiHeadingBlock
    console.log(block.level);  // ✅ level existe
  } else if (block.type === 'code') {
    // TypeScript sabe que block es StrapiCodeBlock
    console.log(block.language); // ✅ language existe
  }
}
```

---

## Patrones de TypeScript usados

### Genéricos

La función `strapiRequest` es genérica — el tipo de respuesta lo decide el llamador:

```typescript
export async function strapiRequest<T>(path: string): Promise<T> {
  const res = await fetch(url);
  const data: T = await res.json();
  return data;
}

// Uso — T se infiere o se especifica
const categorias = await strapiRequest<StrapiListResponse<StrapiCategory>>('/documentation-categories');
// categorias.data es StrapiCategory[]
```

### Clases de error tipadas

```typescript
export class StrapiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly strapiError: StrapiErrorResponse['error'],
  ) {
    super(strapiError.message);
    this.name = 'StrapiRequestError';
  }
}

// En un +page.ts puedes atrapar este error específico
try {
  const data = await getArticleBySlug(slug);
} catch (e) {
  if (e instanceof StrapiRequestError && e.status === 404) {
    error(404, 'Artículo no encontrado');
  }
  throw e;
}
```

### Tipos opcionales y nullish coalescing

```typescript
// El campo puede no existir en la respuesta de Strapi
interface StrapiArticle {
  excerpt?: string | null;  // undefined o null
}

// Acceso seguro con ?? (nullish coalescing)
const extracto = article.excerpt ?? 'Sin descripción';

// Acceso seguro con ?. (optional chaining)
const primeraLinea = article.content?.[0]?.text ?? '';
```

### `Readonly` e inmutabilidad

Los props de los componentes son implícitamente readonly con `$props()` — no debes mutar props recibidos:

```typescript
let { items }: { items: StrapiArticle[] } = $props();

// ❌ Nunca hacer esto — muta la referencia del padre
items.push(nuevoItem);

// ✅ Crear estado local derivado del prop si necesitas mutarlo
let listaLocal = $state([...items]);
```

---

## TypeScript con Svelte 5

### Tipado de props

```svelte
<script lang="ts">
  import type { StrapiArticle } from '$lib/types/strapi';

  interface Props {
    article: StrapiArticle;
    compact?: boolean;
  }

  let { article, compact = false }: Props = $props();
</script>
```

### Tipos de eventos del DOM

```svelte
<script lang="ts">
  function handleClick(event: MouseEvent) { ... }
  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log(input.value);
  }
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { ... }
  }
</script>
```

### Tipos de `$app/state` y `$app/navigation`

SvelteKit genera tipos automáticos en `.svelte-kit/`. Los `$types` se generan por ruta:

```typescript
// src/routes/[locale]/[category]/[slug]/+page.ts
import type { PageLoad, PageData } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  // params.locale, params.category, params.slug — todos tipados
  return { article };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  // data.article está tipado según lo que retornó la load function
</script>
```

---

## Errores comunes y cómo resolverlos

### `Object is possibly 'null' or 'undefined'`

```typescript
// ❌ Error: article puede ser null
const title = data.article.title;

// ✅ Guard explícito
if (!data.article) return;
const title = data.article.title;

// ✅ O con optional chaining
const title = data.article?.title ?? 'Sin título';
```

### `Property does not exist on type`

El campo existe en Strapi pero no en el tipo TypeScript:

```typescript
// Agregar el campo en src/lib/types/strapi.ts
interface StrapiArticle {
  // ... campos existentes ...
  nuevoCampo?: string | null;  // Agregar aquí
}
```

### `Type 'string' is not assignable to type '...'`

```typescript
// Strapi retorna strings, pero el tipo espera un enum
interface StrapiHeadingBlock {
  level: 1 | 2 | 3 | 4 | 5 | 6;  // Literal union
}

// Al parsear JSON necesitas un cast o validación
const level = data.level as 1 | 2 | 3 | 4 | 5 | 6;
```

### `Cannot find module '$lib/...'`

Ejecutar `npm run check` (que incluye `svelte-kit sync`) regenera los paths. Si el error persiste, reinicia el servidor de desarrollo.
