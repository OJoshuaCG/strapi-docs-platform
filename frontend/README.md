# Frontend — Portal de Documentación

SvelteKit 2 + Svelte 5 + TailwindCSS v4  
Consume contenido de un CMS **Strapi v5** y lo presenta como un portal de documentación multidioma.

---

## Tabla de contenidos

1. [Descripción del proyecto](#descripción-del-proyecto)
2. [Requisitos previos](#requisitos-previos)
3. [Instalación](#instalación)
4. [Variables de entorno](#variables-de-entorno)
5. [Comandos disponibles](#comandos-disponibles)
6. [Estructura de carpetas](#estructura-de-carpetas)
7. [Flujo de datos](#flujo-de-datos)
8. [Convenciones de código](#convenciones-de-código)
9. [Despliegue con Docker](#despliegue-con-docker)
10. [Resolución de problemas](#resolución-de-problemas)

---

## Descripción del proyecto

Este frontend es el portal que leen los clientes finales del sistema. Muestra la documentación almacenada en Strapi organizada por **categorías** y **artículos**, con soporte para:

- Múltiples idiomas (`es`, `en`) vía rutas dinámicas `/:locale/...`
- Renderizado de contenido enriquecido: bloques de párrafo, encabezados, código, imágenes, listas, citas
- Modo oscuro/claro persistente
- Tabla de contenidos auto-generada por artículo
- Diseño responsivo con barra lateral colapsable
- SSR (Server-Side Rendering) para SEO
- Caché en memoria en el navegador (30 segundos)

El backend (Strapi) es independiente de este repositorio y corre en `http://localhost:1337` por defecto.

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | **22.x** | El `Dockerfile` y `.npmrc` lo exigen (`engine-strict=true`) |
| npm | 10.x | Viene incluido con Node 22 |
| Strapi backend | corriendo | Este frontend no funciona sin el CMS activo |

> Verifica tu versión: `node -v` debe mostrar `v22.x.x`.

---

## Instalación

```bash
# 1. Entrar a la carpeta del frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
```

Edita `.env` con los valores correctos (ver sección siguiente).

---

## Variables de entorno

Archivo: `frontend/.env`

```env
# URL del CMS Strapi (sin barra final)
# Desarrollo local:            http://localhost:1337
# Docker Compose (inter-servicio): http://strapi:1337
VITE_STRAPI_URL=http://localhost:1337

# Servidor de desarrollo
HOST=0.0.0.0
PORT=5173
```

**Importante — prefijo `VITE_`:**  
Solo las variables con el prefijo `VITE_` son accesibles desde el código del navegador.  
Variables sin ese prefijo son exclusivas del servidor (Node SSR).

---

## Comandos disponibles

```bash
# Servidor de desarrollo con hot-reload
npm run dev

# Servidor de desarrollo + abrir navegador automáticamente
npm run dev -- --open

# Verificar tipos TypeScript y errores de Svelte
npm run check

# Verificar en modo watch (se re-ejecuta al guardar)
npm run check:watch

# Compilar para producción
npm run build

# Previsualizar el build de producción localmente
npm run preview
```

---

## Estructura de carpetas

```
frontend/
├── src/
│   ├── app.html              ← Plantilla HTML raíz. %sveltekit.body% = tu app
│   ├── app.css               ← Estilos globales, tokens de diseño, Tailwind
│   ├── app.d.ts              ← Tipos TypeScript globales de SvelteKit
│   ├── hooks.server.ts       ← Interceptor SSR: inyecta lang="" en el HTML
│   │
│   ├── lib/                  ← Código reutilizable (alias: $lib)
│   │   ├── api/              ← Clientes HTTP para el CMS
│   │   │   ├── strapi.ts     ← Cliente base: strapiRequest(), buildQuery(), cache
│   │   │   ├── articles.ts   ← getArticles(), getArticleBySlug()
│   │   │   └── categories.ts ← getCategories(), getCategoryBySlug()
│   │   │
│   │   ├── types/
│   │   │   └── strapi.ts     ← Tipos TypeScript del API de Strapi v5
│   │   │
│   │   ├── utils/
│   │   │   ├── slugify.ts    ← Texto → ID de ancla (compartido por TOC y headings)
│   │   │   └── toc.ts        ← Extrae encabezados del contenido para la TOC
│   │   │
│   │   ├── components/
│   │   │   ├── blocks/       ← Un componente por tipo de bloque de contenido
│   │   │   │   ├── BlockRenderer.svelte    ← Despachador principal
│   │   │   │   ├── CodeBlock.svelte        ← Bloque de código con copiar
│   │   │   │   ├── HeadingBlock.svelte     ← h1–h6 con ancla
│   │   │   │   ├── ImageBlock.svelte       ← Imagen con caption
│   │   │   │   ├── InlineContent.svelte    ← Texto inline (bold, links, etc.)
│   │   │   │   ├── ListBlock.svelte        ← ul / ol
│   │   │   │   ├── ParagraphBlock.svelte   ← Párrafo
│   │   │   │   └── QuoteBlock.svelte       ← Cita
│   │   │   │
│   │   │   ├── layout/       ← Componentes estructurales de la página
│   │   │   │   ├── Header.svelte           ← Barra superior + idioma + dark mode
│   │   │   │   ├── Sidebar.svelte          ← Navegación de categorías/artículos
│   │   │   │   ├── Breadcrumbs.svelte      ← Migas de pan
│   │   │   │   └── TableOfContents.svelte  ← TOC del artículo actual
│   │   │   │
│   │   │   └── ui/           ← Componentes de interfaz genéricos
│   │   │       ├── ErrorState.svelte       ← Pantalla de error
│   │   │       └── SkeletonLoader.svelte   ← Animación de carga
│   │   │
│   │   └── assets/
│   │       └── favicon.svg
│   │
│   └── routes/               ← Rutas de la aplicación (file-based routing)
│       ├── +layout.svelte    ← Layout raíz (envuelve toda la app)
│       ├── +page.svelte      ← Página raíz: redirige a /es
│       ├── +page.server.ts   ← Redirección server-side a /es
│       ├── +error.svelte     ← Página de error global
│       │
│       └── [locale]/         ← Parámetro dinámico: "es" o "en"
│           ├── +layout.svelte    ← Layout del idioma: Header + Sidebar
│           ├── +layout.ts        ← Carga categorías para el sidebar
│           ├── +page.svelte      ← Lista de categorías del idioma
│           ├── +page.ts          ← Fetch de categorías
│           ├── +error.svelte     ← Error dentro del locale
│           │
│           └── [category]/   ← Parámetro dinámico: slug de categoría
│               ├── +page.svelte  ← Lista de artículos de la categoría
│               ├── +page.ts      ← Fetch de artículos
│               │
│               └── [slug]/   ← Parámetro dinámico: slug del artículo
│                   ├── +page.svelte  ← Artículo completo con TOC
│                   └── +page.ts      ← Fetch del artículo + generación de TOC
│
├── static/                   ← Archivos servidos tal cual (robots.txt, favicons extra)
│
├── .env.example              ← Plantilla de variables de entorno
├── .env                      ← Variables locales (NO subir a git)
├── Dockerfile                ← Build multi-etapa para producción
├── svelte.config.js          ← Config de SvelteKit (adapter-node, runes mode)
├── vite.config.ts            ← Config de Vite (plugins: tailwindcss, sveltekit)
├── tsconfig.json             ← Config de TypeScript
└── package.json              ← Dependencias y scripts
```

### ¿Dónde va cada cosa nueva?

| Quiero agregar... | Lo pongo en... |
|---|---|
| Una nueva ruta/página | `src/routes/` siguiendo la convención de carpetas |
| Un componente reutilizable de UI | `src/lib/components/ui/` |
| Un componente de layout (nav, footer) | `src/lib/components/layout/` |
| Un nuevo tipo de bloque de contenido | `src/lib/components/blocks/` + registrarlo en `BlockRenderer.svelte` |
| Una función de API para Strapi | `src/lib/api/` |
| Un tipo TypeScript del API | `src/lib/types/strapi.ts` |
| Una utilidad genérica | `src/lib/utils/` |
| Un asset estático (imagen, font local) | `static/` |
| Un estilo global o token de diseño | `src/app.css` |

---

## Flujo de datos

```
Usuario visita /es/guias/introduccion
        │
        ▼
SvelteKit Router
        │
        ├── [locale] = "es"
        ├── [category] = "guias"
        └── [slug] = "introduccion"
        │
        ▼
+layout.ts ([locale])
  └── getCategories({ locale: "es" }, fetch)
      └── GET /api/documentation-categories?filters[locale]=es
        │
        ▼
+page.ts ([locale]/[category]/[slug])
  └── getArticleBySlug("introduccion", { locale: "es" }, fetch)
      └── GET /api/documentation-articles?filters[slug]=introduccion&populate=...
        │
        ▼
+page.svelte
  ├── <Header /> ← usa datos del layout
  ├── <Sidebar /> ← usa categorías del layout
  ├── <Breadcrumbs />
  ├── <TableOfContents toc={data.toc} />
  └── <BlockRenderer blocks={data.article.content} />
        ├── <HeadingBlock />
        ├── <ParagraphBlock />
        │     └── <InlineContent />
        ├── <CodeBlock />
        └── ...
```

---

## Convenciones de código

### Svelte 5 runes (obligatorio en este proyecto)

El proyecto corre en **runes mode** (Svelte 5). Siempre usa las nuevas APIs:

```svelte
<script lang="ts">
  // Props del componente
  let { titulo, subtitulo = 'sin subtítulo' }: { titulo: string; subtitulo?: string } = $props();

  // Estado reactivo
  let contador = $state(0);

  // Valor derivado simple
  const doble = $derived(contador * 2);

  // Valor derivado complejo (múltiples líneas)
  const resumen = $derived.by(() => {
    if (contador === 0) return 'vacío';
    return `${contador} elemento(s)`;
  });

  // Efecto secundario
  $effect(() => {
    console.log('contador cambió a', contador);
  });
</script>
```

### Importaciones

Usa el alias `$lib` para importar desde `src/lib/`:

```typescript
import { getArticles } from '$lib/api/articles';
import type { StrapiArticle } from '$lib/types/strapi';
import { slugify } from '$lib/utils/slugify';
```

### Tipado

Todos los archivos son TypeScript. Los tipos del API de Strapi están en `src/lib/types/strapi.ts`. Al agregar nuevos campos a Strapi, actualiza ese archivo primero.

### Fetch en load functions

Siempre usa el `fetch` inyectado por SvelteKit en las load functions, no `globalThis.fetch`:

```typescript
// ✅ Correcto — usa el fetch de SvelteKit (SSR-aware)
export const load: PageLoad = async ({ params, fetch }) => {
  const data = await getArticles({ locale: params.locale }, fetch);
  return { data };
};

// ❌ Incorrecto — bypassa el fetch mejorado de SvelteKit
export const load: PageLoad = async ({ params }) => {
  const data = await getArticles({ locale: params.locale }); // sin fetch
  return { data };
};
```

---

## Despliegue con Docker

```bash
# Construir imagen
docker build -t docs-frontend .

# Correr contenedor (apuntando a Strapi en el mismo host)
docker run -p 3000:3000 \
  -e VITE_STRAPI_URL=http://strapi:1337 \
  docs-frontend
```

En producción con Docker Compose, el `VITE_STRAPI_URL` debe apuntar al nombre del servicio de Strapi definido en `docker-compose.yml`.

> Para un despliegue completo (frontend + backend + base de datos + reverse proxy), consulta la documentación de infraestructura en el repositorio raíz.

---

## Resolución de problemas

### El frontend muestra error de conexión al CMS

1. Verifica que Strapi esté corriendo: `curl http://localhost:1337/api/documentation-categories`
2. Comprueba que `VITE_STRAPI_URL` en `.env` sea correcto
3. Si usas Docker, verifica que el contenedor de Strapi esté en la misma red

### Cambios en Strapi no aparecen de inmediato

El caché del navegador dura 30 segundos. Para forzar la actualización recarga con `Ctrl+Shift+R` (hard reload).

### Error de tipo TypeScript

Ejecuta `npm run check` para ver todos los errores. Si agregaste un campo nuevo en Strapi, probablemente necesitas actualizar `src/lib/types/strapi.ts`.

### `node: command not found` o versión incorrecta

Este proyecto requiere Node 22. Usa [nvm](https://github.com/nvm-sh/nvm) para manejar versiones:

```bash
nvm install 22
nvm use 22
```
