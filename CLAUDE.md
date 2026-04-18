# CLAUDE.md — Sistema de Documentación (Strapi + SvelteKit)

Guía de contexto para agentes de IA que trabajen en este repositorio.
Lee este archivo completo antes de proponer o aplicar cualquier cambio.

---

## Visión general del proyecto

Portal de documentación técnica multidioma (español / inglés) compuesto por:

- **Backend** (`backend/`) — CMS headless Strapi v5 + MariaDB + Wasabi S3 + Meilisearch
- **Frontend** (`frontend/`) — Portal SvelteKit 2 / Svelte 5 que consume la REST API de Strapi

El equipo editorial gestiona contenido desde el panel admin de Strapi sin tocar código.
El frontend renderiza ese contenido mediante SSR para SEO.

### Estado actual (2026-04-13)

| Fase | Estado |
|---|---|
| Phase 1 — Backend completo | ✅ Completo |
| Phase 1 — Frontend completo | ✅ Completo |
| **Phase 1.5 — Admin improvements** | ✅ **Completo** |
| Phase 2 — Búsqueda (Meilisearch + Python RAG) | 🔲 Sin empezar |
| Phase 2 — Reverse proxy nginx/Caddy | 🔲 Sin empezar |

---

## Phase 1.5 — Features implementados

### F1 — Live Preview de Artículos
- Botón "Open preview" en el editor de Strapi para ver borradores sin publicar
- Endpoint `/api/preview` en frontend valida token compartido
- Ruta de artículo detecta modo preview (`?preview=true`) y muestra banner informativo
- Previene indexación de borradores con `<meta name="robots" content="noindex,nofollow" />`
- **Variables requeridas:** `PREVIEW_SECRET` en backend y frontend `.env`

### F2 — Live Preview de Global Settings (parcial)
- Página `/preview/theme` en frontend recibe colores vía `postMessage`
- Admin `app.ts` configurado con soporte para locales es/en
- **Nota:** La integración completa del iframe en el admin requiere un plugin custom de Strapi (documentado en `docs/`)

### F3 — Servidor de Correo (Invitación de Usuarios)
- Email provider `@strapi/provider-email-nodemailer` instalado y configurado
- Soporta cualquier proveedor SMTP: Gmail, Sendgrid, Mailgun, Resend, etc.
- **Variables requeridas:** `SMTP_*` y `EMAIL_*` en backend `.env`

### F4 — Selector de Color Visual en Global Settings
- Plugin `@strapi/plugin-color-picker` instalado y habilitado
- Todos los 25 campos de color usan ahora `customField: "plugin::color-picker.color"`
- Cada campo tiene descripción explicativa en `pluginOptions.description`
- Los editores ven un selector de color visual en lugar de campos de texto

### F5a — Campos SEO en Artículos
- Nuevos campos en `documentation-article`:
  - `seoTitle` (string, opcional) — Título alternativo para `<title>` y `og:title`
  - `seoDescription` (text, max 160) — Para meta description y redes sociales
  - `ogImage` (media, imagen) — Imagen para compartir en redes sociales
- Frontend usa automáticamente `seoTitle` y `seoDescription` si están disponibles
- Genera etiquetas Open Graph completas (`og:title`, `og:description`, `og:image`)

### F5c — Orden de Artículos
- Campo `order` (integer) agregado a `documentation-article` (default: 0)
- Frontend ordena artículos por `order:asc,title:asc` en lugar de solo `title:asc`
- Permite control manual del orden de artículos dentro de una categoría

### F5e — Datos del Sitio en Global Settings
- Nuevos campos en `global-setting`:
  - `siteDescription` (text) — Descripción del sitio para SEO
  - `favicon` (media) — Favicon configurable desde el admin
  - `ogDefaultImage` (media) — Imagen por defecto para redes sociales
  - `footerText` (string) — Texto del footer
- Frontend usa favicon y siteDescription dinámicamente
- Componente `Footer.svelte` muestra `footerText` configurable

### F5b — Roles Diferenciados
- **Sin código requerido** — Se configura desde Settings → Roles en el admin
- Roles sugeridos:
  - **Editor:** Crear, editar y publicar artículos y categorías. Sin acceso a Global Settings ni gestión de usuarios
  - **Redactor:** Solo crear y editar artículos (sin publicar). Un Editor los revisa y publica

### F5d — Webhook de Invalidación de Caché
- Documentación completa en `docs/webhook-cache-invalidation.md`
- Configuración sin código desde Settings → Webhooks en Strapi admin
- Incluye código de ejemplo para endpoint `/api/cache-invalidate` en frontend

---

## Estructura del repositorio

```
strapi-documentation-project/
├── backend/
│   ├── .env                    ← Variables para Docker Compose (NO en git)
│   ├── .env.example            ← Plantilla commiteada
│   ├── docker-compose.yml      ← Desarrollo (4 servicios)
│   ├── docker-compose.prod.yml ← Overrides de producción
│   ├── docs/                   ← Documentación técnica del backend (12 archivos .md)
│   └── cms/                    ← Aplicación Strapi v5
│       ├── config/             ← DB, plugins, middlewares, admin, server, api
│       ├── src/
│       │   ├── api/            ← Content Types: article + category
│       │   ├── admin/          ← Personalización del panel admin
│       │   └── index.ts        ← Bootstrap: auto-configura permisos públicos
│       ├── database/migrations/← Migraciones auto-generadas por Strapi (no editar)
│       └── Dockerfile          ← Multi-stage: development / builder / production
│
├── frontend/
│   ├── .env                    ← Variables de entorno locales (NO en git)
│   ├── .env.example
│   ├── Dockerfile              ← Multi-stage: builder / production (Node 22)
│   ├── docs/                   ← Documentación técnica del frontend (11 archivos .md)
│   ├── src/
│   │   ├── app.html            ← Plantilla HTML raíz (%sveltekit.lang% placeholder)
│   │   ├── app.css             ← Estilos globales + @theme Tailwind + CSS vars tema
│   │   ├── hooks.server.ts     ← Inyecta lang="" correcto en el HTML (SSR)
│   │   ├── lib/
│   │   │   ├── api/            ← strapi.ts (cliente base), articles.ts, categories.ts
│   │   │   ├── types/strapi.ts ← Tipos TypeScript de toda la API Strapi v5
│   │   │   ├── components/
│   │   │   │   ├── blocks/     ← BlockRenderer + 6 block components + InlineContent
│   │   │   │   ├── layout/     ← Header, Sidebar, Breadcrumbs, TableOfContents
│   │   │   │   └── ui/         ← SkeletonLoader, ErrorState
│   │   │   └── utils/          ← slugify.ts, toc.ts
│   │   └── routes/
│   │       ├── +page.server.ts ← redirect(302, '/es')
│   │       └── [locale]/       ← "es" o "en"
│   │           ├── [category]/ ← slug de categoría
│   │           │   └── [slug]/ ← slug de artículo
│   ├── svelte.config.js        ← adapter-node, runes mode
│   ├── vite.config.ts          ← plugins: tailwindcss(), sveltekit()
│   └── package.json
│
├── CLAUDE.md                   ← Este archivo
└── plan.md                     ← Plan original del proyecto
```

---

## Stack tecnológico

### Backend

| Servicio | Versión | Puerto dev | Propósito |
|---|---|---|---|
| Strapi | 5.42.0 | 1337 | CMS + panel admin + REST API |
| MariaDB | 10.11 | no expuesto | Base de datos (driver: `mysql2`) |
| Meilisearch | v1.12 | 7700 | Motor de búsqueda (Phase 2, sin integrar) |
| Node.js | 20–24 | — | Runtime de Strapi |

### Frontend

| Herramienta | Versión |
|---|---|
| SvelteKit | ^2.57.0 |
| Svelte | ^5.55.2 (runes mode) |
| TypeScript | ^6.0.2 (strict: true) |
| TailwindCSS | ^4.2.2 (@tailwindcss/vite) |
| Vite | ^8.0.7 |
| Node.js | 22 (obligatorio — engine-strict en .npmrc) |
| @sveltejs/adapter-node | ^5.5.4 |

---

## Desarrollo local — Quick Start

### Backend

```bash
cd backend
cp .env.example .env          # rellenar passwords, secrets y MEILISEARCH_MASTER_KEY

# Generar secrets de Strapi
node -e "const c=require('crypto'); console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"
# ↑ para APP_KEYS. Para el resto, una a la vez:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

docker compose up --build     # primera vez (~60s en inicializar)
docker compose up -d          # arranques posteriores
```

Tras el primer arranque:
1. Crear superadministrador en `http://localhost:1337/admin`
2. Agregar locale inglés: Settings → Internationalization → Add a locale → English (en)
3. Verificar API pública: `curl http://localhost:1337/api/documentation-categories` → debe retornar `{"data":[],...}` sin 403

### Frontend

```bash
cd frontend
cp .env.example .env          # VITE_STRAPI_URL=http://localhost:1337
npm install
npm run dev                   # http://localhost:5173
```

### Comandos útiles (backend, desde `backend/`)

```bash
docker compose ps                          # estado de contenedores
docker compose logs -f strapi              # logs de Strapi
docker compose logs -f                     # todos los logs
docker compose restart strapi              # reiniciar (aplica bootstrap de permisos)
docker compose exec strapi sh              # shell dentro de Strapi
docker compose exec mariadb mysql -u strapi -p strapi_docs
docker compose exec strapi npm run strapi ts:generate-types   # regenerar tipos TS
docker compose down                        # detener (datos se conservan)
docker compose down -v                     # ⚠️ DESTRUYE DB e índices
```

### Comandos útiles (frontend, desde `frontend/`)

```bash
npm run dev          # servidor de desarrollo con HMR
npm run check        # verificar tipos TypeScript
npm run check:watch  # verificación continua
npm run build        # build de producción → build/
npm run preview      # preview del build
```

---

## Modelo de datos (Content Types)

### `documentation-category`

| Campo | Tipo | Localizable | Notas |
|---|---|---|---|
| `name` | string | ✅ | Requerido |
| `slug` | uid (desde name) | ✅ | Auto-generado |
| `description` | text | ✅ | Opcional |
| `order` | integer | ❌ | Compartido entre locales |
| `articles` | oneToMany → article | — | Relación inversa |

### `documentation-article`

| Campo | Tipo | Localizable | Notas |
|---|---|---|---|
| `title` | string | ✅ | Requerido |
| `slug` | uid (desde title) | ✅ | Auto-generado |
| `content` | richtext (bloques) | ✅ | Requerido |
| `excerpt` | text (max 300) | ✅ | Para listados |
| `version` | string | ❌ | Compartido entre locales |
| `category` | manyToOne → category | — | — |

**Ambos tipos tienen `draftAndPublish: true` e i18n habilitado.**  
La API pública (sin token) solo retorna entradas `publishedAt != null`.

---

## Arquitectura frontend

### Rutas (file-based routing)

```
/                   → redirect a /es (server-side)
/[locale]           → grid de categorías (valida locale: es | en)
/[locale]/[category]→ lista de artículos de la categoría
/[locale]/[category]/[slug] → artículo completo con TOC
```

### Flujo de datos

```
+layout.ts ([locale])         → getCategories({ locale })     → Sidebar
+page.ts ([locale])           → getCategories({ locale })     → grid
+page.ts ([locale]/[category])→ getArticles({ locale, categorySlug })
+page.ts ([...]/[slug])       → getArticleBySlug(slug, { locale }) + extractToc()
```

### Capas de la API

```
src/lib/api/strapi.ts     ← strapiRequest<T>(), buildQuery(), caché 30s (browser-only)
src/lib/api/articles.ts   ← getArticles(), getArticleBySlug()
src/lib/api/categories.ts ← getCategories(), getCategoryBySlug()
```

**Siempre pasa el `fetch` de SvelteKit a las funciones de API en load functions.**

### Sistema de bloques

El campo `content` es un array de bloques discriminados por `type`:

| type | Componente |
|---|---|
| `paragraph` | ParagraphBlock.svelte |
| `heading` | HeadingBlock.svelte |
| `code` | CodeBlock.svelte |
| `image` | ImageBlock.svelte |
| `list` | ListBlock.svelte |
| `quote` | QuoteBlock.svelte |

`BlockRenderer.svelte` despacha al componente correcto. Para agregar un nuevo tipo de bloque:
1. Crear `src/lib/components/blocks/NuevoBlock.svelte`
2. Agregarlo en `BlockRenderer.svelte`
3. Agregar el tipo en `src/lib/types/strapi.ts`

---

## Convenciones de código

### Svelte 5 — runes mode (obligatorio)

```svelte
<script lang="ts">
  // Props
  let { titulo, compact = false }: { titulo: string; compact?: boolean } = $props();

  // Estado reactivo
  let contador = $state(0);

  // Derivado simple
  const doble = $derived(contador * 2);

  // Derivado complejo
  const resumen = $derived.by(() => {
    if (contador === 0) return 'vacío';
    return `${contador} items`;
  });

  // Efecto
  $effect(() => {
    document.title = titulo;
  });
</script>
```

**Nunca uses la API de Svelte 4** (`$:`, `export let`, `createEventDispatcher`).

### TypeScript — patrones clave

- Los tipos de la API de Strapi v5 están en `src/lib/types/strapi.ts` — es la fuente de verdad.
- Si agregas un campo en Strapi, actualiza ese archivo primero.
- Usa el alias `$lib` siempre; nunca rutas relativas (`../../`).
- La API usa unión discriminada por `block.type` — aprovecha type narrowing en lugar de casts.

### Fetch en load functions

```typescript
// ✅ Correcto — SSR-aware
export const load: PageLoad = async ({ params, fetch }) => {
  const res = await getArticles({ locale: params.locale }, fetch);
  return { articles: res.data };
};

// ❌ Incorrecto — bypassa las optimizaciones de SvelteKit
export const load: PageLoad = async ({ params }) => {
  const res = await getArticles({ locale: params.locale }); // sin fetch
};
```

### TailwindCSS v4

- Configuración en `src/app.css` con directiva `@theme` (sin `tailwind.config.js`).
- Usa `var(--bg-primary)`, `var(--text-primary)`, etc. para todo lo que dependa del tema light/dark.
- **No usar `@apply`** — tiene soporte limitado en v4. Prefiere componentes Svelte.
- El modo oscuro se activa con la clase `.dark` en `<html>`, gestionado desde `Header.svelte`.

### Strapi — convenciones de extensión

- Los controllers/routes/services usan `core factories` de Strapi (no implementaciones manuales).
- Para agregar permisos públicos a un nuevo Content Type, añadir al array `PUBLIC_PERMISSIONS` en `backend/cms/src/index.ts`.
- Las migraciones de schema las genera Strapi automáticamente. No editar los archivos en `database/migrations/`.
- Migraciones de datos personalizadas: crear `0002_nombre.ts` con `up()` y `down()`.
- **Phase 1.5:** Los plugins se habilitan en `config/plugins.ts` (ej: `color-picker`, `email`).
- **Phase 1.5:** La preview URL se configura en `config/admin.ts` bloque `preview`.
- **Phase 1.5:** Los campos de color usan `customField: "plugin::color-picker.color"` con descripciones en `pluginOptions.description`.

---

## Reglas críticas

### Variables de entorno

- `backend/.env` — leído por Docker Compose para interpolar variables al stack
- `backend/cms/.env` — leído por Node.js para desarrollo local sin Docker
- `frontend/.env` — variables del frontend (`VITE_STRAPI_URL`)
- Las variables `VITE_*` se hornean en el bundle en tiempo de build. Para cambiar `VITE_STRAPI_URL` en producción hay que recompilar la imagen.
- **Nunca poner secretos en variables `VITE_*`** — quedan visibles en el JS del navegador.
- **Phase 1.5 nuevas variables:**
  - `PREVIEW_SECRET` — Token compartido para Live Preview (backend y frontend)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — Configuración de email
  - `EMAIL_FROM`, `EMAIL_REPLY_TO` — Remitente por defecto para correos del sistema

### Docker — red y volúmenes

- MariaDB **no expone puertos al host** (seguridad). Para acceso externo, usar `docker-compose.override.yml` temporal.
- El volume `cms_node_modules` existe para evitar conflictos de binarios Windows/Linux.
- `docker compose down -v` destruye TODOS los datos. Hacer backup antes.

### Strapi v5 vs v4

- En v5 los campos están directamente en el objeto, sin wrapper `attributes`.
  ```json
  // v5 (correcto): { "id": 1, "documentId": "abc", "title": "..." }
  // v4 (incorrecto para este proyecto): { "id": 1, "attributes": { "title": "..." } }
  ```
- Si ves referencias a `.attributes` en el código, es un bug.

### CORS

- `FRONTEND_URL` debe ser el origin exacto del frontend, sin trailing slash.
- Ejemplo: `http://localhost:5173` (correcto), `http://localhost:5173/` (incorrecto).
- Reiniciar Strapi después de cambiar `FRONTEND_URL`.

---

## Producción

### Backend

```bash
# Desde backend/
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Diferencias vs desarrollo: stage `production` del Dockerfile (código compilado), sin bind mounts, `NODE_ENV=production`, `MEILI_ENV=production`.

### Frontend

`VITE_STRAPI_URL` se pasa como build arg:
```yaml
frontend:
  build:
    args:
      VITE_STRAPI_URL: https://tudominio.com
```

### Nginx (pendiente — Phase 2)

```
tudominio.com/       → frontend:3000
tudominio.com/admin  → strapi:1337
tudominio.com/api/   → strapi:1337
```

---

## Phase 2 — Roadmap

Componentes pendientes (no empezar sin confirmar con el usuario):

1. **`backend/python-api/`** — Agente RAG que indexa artículos en Meilisearch y responde preguntas en lenguaje natural
2. **Integración Meilisearch en frontend** — Barra de búsqueda en tiempo real
3. **Webhook Strapi → indexador** — `entry.publish/unpublish/delete` → sync Meilisearch
4. **nginx/Caddy** — Reverse proxy para HTTPS y routing en producción

El placeholder del `docker-compose.yml` para el `python-api` ya existe (comentado).

---

## Backups

```bash
# Backup de MariaDB (desde backend/)
docker compose exec mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > backups/strapi_docs_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker compose exec -T mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  < backups/strapi_docs_20260101_030000.sql
```

**Hacer backup SIEMPRE antes de**: actualizar Strapi, modificar un Content Type, ejecutar migraciones de datos, cualquier operación en producción.

---

## Troubleshooting rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| `403 Forbidden` en `/api/...` | Permisos del rol Public no configurados | `docker compose restart strapi` |
| `[]` en la API aunque hay contenido | Contenido en estado Draft | Publicar desde el panel admin |
| CORS error en el navegador | `FRONTEND_URL` incorrecto | Verificar valor en `.env`, reiniciar Strapi |
| `Cannot connect to database` | MariaDB aún iniciando | Esperar o `docker compose restart strapi` |
| `Unknown database client 'undefined'` | `backend/.env` no existe o sin `DATABASE_CLIENT` | Crear/verificar `.env` |
| `cms_node_modules` desactualizado | `package.json` cambió sin reconstruir | `docker compose down && docker volume rm backend_cms_node_modules && docker compose up --build` |
| Frontend no refleja cambios de Strapi | Caché de 30s en browser | Hard reload (`Ctrl+Shift+R`) |
| `node: command not found` en frontend | Node version incorrecta | Necesita Node 22 (`nvm install 22 && nvm use 22`) |

---

## Documentación de referencia

| Documento | Ruta |
|---|---|
| Backend — entrada principal | `backend/README.md` |
| CMS — quick start y referencia API | `backend/cms/README.md` |
| Herramientas backend | `backend/docs/herramientas.md` |
| Strapi para desarrolladores | `backend/docs/strapi-para-desarrolladores.md` |
| Strapi para editores | `backend/docs/strapi-for-dummies.md` |
| Docker/Compose | `backend/docs/docker.md` |
| MariaDB | `backend/docs/mariadb.md` |
| Wasabi S3 | `backend/docs/wasabi-s3.md` |
| Meilisearch | `backend/docs/meilisearch.md` |
| Despliegue backend (Docker/VPS) | `backend/docs/despliegue.md` |
| **Despliegue backend en cPanel** | `backend/docs/despliegue-cpanel.md` |
| Mantenimiento DevOps | `backend/docs/maintenance.md` |
| Troubleshooting backend | `backend/docs/troubleshooting.md` |
| Frontend — entrada principal | `frontend/README.md` |
| Herramientas frontend | `frontend/docs/herramientas.md` |
| Arquitectura del sistema | `frontend/docs/arquitectura.md` |
| Integración API Strapi | `frontend/docs/strapi-api.md` |
| Svelte 5 (runes) | `frontend/docs/svelte-para-principiantes.md` |
| SvelteKit 2 | `frontend/docs/sveltekit-para-principiantes.md` |
| TypeScript | `frontend/docs/typescript.md` |
| TailwindCSS v4 | `frontend/docs/tailwindcss.md` |
| Vite 8 | `frontend/docs/vite.md` |
| Docker frontend | `frontend/docs/docker.md` |
| Despliegue completo (Docker + nginx) | `frontend/docs/despliegue.md` |
| **Despliegue en cPanel (Node.js App)** | `frontend/docs/despliegue-cpanel.md` |
| Guía editorial | `frontend/docs/guia-editorial.md` |
| **Plan Fase 1.5** | `docs/plan-fase-1.5.md` |
| **Webhook invalidación caché** | `docs/webhook-cache-invalidation.md` |
