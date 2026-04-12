# Arquitectura del sistema

Visión general de todos los componentes del sistema de documentación: cómo se conectan, qué hace cada uno, y por qué se eligió cada tecnología.

---

## Tabla de contenidos

1. [Diagrama general](#diagrama-general)
2. [Componentes del sistema](#componentes-del-sistema)
3. [Flujo de una petición](#flujo-de-una-petición)
4. [Flujo editorial (publicar contenido)](#flujo-editorial-publicar-contenido)
5. [Puertos y redes](#puertos-y-redes)
6. [Decisiones de arquitectura](#decisiones-de-arquitectura)
7. [Fase 2 — Búsqueda inteligente](#fase-2--búsqueda-inteligente)

---

## Diagrama general

```
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │  nginx/Caddy  │  ← Reverse proxy
                    │  :80 / :443   │     SSL, routing
                    └───┬───────────┘
                        │
              ┌─────────┴──────────┐
              │                    │
              ▼                    ▼
   ┌─────────────────┐   ┌─────────────────┐
   │    Frontend     │   │     Strapi      │
   │   SvelteKit     │   │   Admin Panel   │
   │    Node SSR     │   │   REST API      │
   │    :3000        │   │    :1337        │
   └────────┬────────┘   └──────┬──────────┘
            │                   │
            │   API REST        │
            └──────────────────►│
                                │
                     ┌──────────┴──────────┐
                     │                     │
                     ▼                     ▼
          ┌─────────────────┐   ┌──────────────────┐
          │    MariaDB      │   │   Wasabi S3      │
          │  Base de datos  │   │  Almacenamiento  │
          │    :3306        │   │  de archivos     │
          └─────────────────┘   └──────────────────┘
```

---

## Componentes del sistema

### Frontend — SvelteKit

**Repositorio:** `frontend/`  
**Puerto:** `3000` (producción), `5173` (desarrollo)  
**Tecnologías:** SvelteKit 2, Svelte 5, TailwindCSS v4, TypeScript, Node adapter

**Responsabilidades:**
- Renderizar el portal de documentación para los usuarios finales (clientes)
- SSR — genera HTML en el servidor para SEO y velocidad de carga inicial
- Consumir la API REST de Strapi para obtener categorías y artículos
- Soporte de múltiples idiomas (`/es/...`, `/en/...`)
- Renderizar el contenido enriquecido (bloques de texto, código, imágenes, etc.)
- Modo oscuro/claro con persistencia en localStorage

**No hace:**
- No tiene base de datos propia
- No gestiona contenido (eso es Strapi)
- No almacena archivos (eso es Wasabi)

---

### CMS — Strapi v5

**Repositorio:** `backend/cms/`  
**Puerto:** `1337`  
**Tecnologías:** Strapi v5, Node.js, TypeScript

**Responsabilidades:**
- Panel de administración para el equipo editorial (`/admin`)
- API REST para que el frontend consuma el contenido
- Gestión de usuarios del CMS (editores, administradores)
- Soporte de internacionalización (español, inglés)
- Delegar el almacenamiento de archivos a Wasabi vía plugin S3

**Endpoints expuestos al frontend:**
```
GET /api/documentation-categories   ← Lista de categorías
GET /api/documentation-articles     ← Lista de artículos
```

---

### Base de datos — MariaDB

**Puerto:** `3306`  
**Tecnologías:** MariaDB 10.x

**Responsabilidades:**
- Almacenar todo el contenido gestionado en Strapi: categorías, artículos, usuarios, permisos, localizaciones
- Strapi es el único servicio que accede a MariaDB directamente

**No almacena:**
- Archivos binarios (imágenes, PDFs) — esos van a Wasabi

---

### Almacenamiento de archivos — Wasabi S3

**Servicio:** Wasabi Cloud Storage (compatible con Amazon S3)  
**Tecnologías:** API S3-compatible

**Responsabilidades:**
- Almacenar todos los archivos subidos desde el panel de Strapi: imágenes, PDFs, documentos Excel, etc.
- Strapi usa el plugin `@strapi/provider-upload-aws-s3` configurado con `forcePathStyle: true` (necesario para Wasabi)
- Los archivos son accesibles públicamente vía URL directa del bucket de Wasabi

**Flujo de un upload:**
```
Editor sube imagen en Strapi admin
    → Strapi la envía a Wasabi via API S3
    → Wasabi retorna la URL pública
    → Strapi guarda la URL en MariaDB
    → Frontend muestra la imagen vía URL de Wasabi
```

---

### Reverse proxy — nginx / Caddy

**Puerto:** `80` (HTTP) y `443` (HTTPS)  
**Estado:** Pendiente de configurar

**Responsabilidades:**
- Ser el único punto de entrada público al sistema
- Routing por ruta:
  - `tudominio.com/` → frontend `:3000`
  - `tudominio.com/admin` → Strapi `:1337`
  - `tudominio.com/api/` → Strapi `:1337`
- Terminar SSL (certificados HTTPS)
- Comprimir respuestas (gzip)

---

## Flujo de una petición

**Usuario visita `tudominio.com/es/guias/introduccion`:**

```
1. Navegador → nginx :443
   nginx reescribe → frontend :3000

2. SvelteKit SSR recibe la petición
   Extrae parámetros: locale=es, category=guias, slug=introduccion

3. Ejecuta load functions en paralelo:
   ├── [locale]/+layout.ts
   │     └── GET /api/documentation-categories?filters[locale]=es
   │           → Strapi :1337
   │               └── SELECT * FROM documentation_categories WHERE locale='es'
   │                     → MariaDB :3306
   │
   └── [locale]/[category]/[slug]/+page.ts
         └── GET /api/documentation-articles?filters[slug]=introduccion&...
               → Strapi :1337
                   └── SELECT * FROM documentation_articles WHERE slug='introduccion'
                         → MariaDB :3306

4. SvelteKit renderiza el HTML en el servidor:
   └── <Header> + <Sidebar categories=[...]> + <Article content=[...]>

5. HTML completo → nginx → Navegador del usuario
   (tiempo total: ~100-300ms en condiciones normales)

6. Navegador recibe el HTML, lo muestra de inmediato
   Luego descarga el JS de SvelteKit y "hidrata" la página
   (la página se vuelve interactiva sin reload)

7. Usuario hace clic en otro artículo
   SvelteKit router intercepta (sin recarga de página)
   Fetch al API de Strapi directamente desde el navegador
   Actualiza solo el contenido del artículo
```

---

## Flujo editorial (publicar contenido)

```
1. Editor accede a tudominio.com/admin
   nginx reenvía a Strapi :1337/admin

2. Editor inicia sesión con usuario/contraseña del CMS
   (usuarios gestionados dentro de Strapi, independientes del sistema principal)

3. Editor crea/edita un artículo:
   - Rellena título, slug, categoría
   - Escribe contenido con el editor de bloques
   - Sube imágenes → Wasabi S3

4. Editor hace clic en "Publicar"
   Strapi guarda en MariaDB con publishedAt = NOW()

5. Frontend refleja el cambio en máximo 30 segundos
   (tiempo de expiración del caché del navegador)
   En el servidor (SSR) el cambio es inmediato (no hay caché SSR)
```

---

## Puertos y redes

### Desarrollo local

| Servicio | Puerto | URL |
|---|---|---|
| Frontend (dev) | 5173 | `http://localhost:5173` |
| Strapi API + Admin | 1337 | `http://localhost:1337` |
| MariaDB | 3306 | Solo acceso local |
| Meilisearch (fase 2) | 7700 | `http://localhost:7700` |

### Producción (Docker)

| Servicio | Puerto interno | Acceso externo |
|---|---|---|
| nginx | 80, 443 | Público |
| Frontend | 3000 | Solo via nginx |
| Strapi | 1337 | Solo via nginx |
| MariaDB | 3306 | Solo red interna Docker |
| Wasabi | — | API S3 externa |

---

## Decisiones de arquitectura

### ¿Por qué Strapi headless en lugar de un CMS integrado?

El equipo editorial (no técnico) necesita una interfaz amigable para gestionar documentación en dos idiomas. Strapi proporciona un panel admin generado automáticamente basado en los tipos de contenido definidos. Una alternativa (CMS propio) habría requerido semanas de desarrollo adicional.

### ¿Por qué SSR en el frontend?

La documentación debe ser indexada por motores de búsqueda (Google, Bing) para que los clientes puedan encontrarla. SSR garantiza que el HTML completo, incluyendo el contenido, esté disponible para los crawlers. Un SPA puro (solo cliente) no sería indexado correctamente.

### ¿Por qué TailwindCSS v4 y no CSS modules o styled-components?

Tailwind reduce drásticamente la cantidad de CSS escrito y elimina el problema de nombres de clases. La v4 con plugins nativos de Vite elimina la fricción de configuración de PostCSS.

### ¿Por qué Wasabi y no AWS S3?

Wasabi es compatible con la API de S3 pero tiene precios significativamente más bajos y sin cargos por transferencia de datos. Para un sistema de documentación con principalmente lecturas, es más económico.

### ¿Por qué MariaDB y no PostgreSQL?

MariaDB es completamente compatible con MySQL y tiene menor overhead de memoria para cargas pequeñas. Strapi soporta ambos; la elección es de preferencia/familiaridad.

---

## Fase 2 — Búsqueda inteligente

Componentes pendientes de implementar:

```
                    ┌──────────────────┐
                    │   Meilisearch    │
                    │   Motor de       │
                    │   búsqueda       │
                    │    :7700         │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌─────────────────┐           ┌──────────────────┐
   │    Frontend     │           │  Python API      │
   │   (búsqueda     │◄──────────│  RAG Agent       │
   │    en tiempo    │           │  (respuestas con  │
   │    real)        │           │  IA sobre docs)  │
   └─────────────────┘           └──────────────────┘
```

**Meilisearch:** Motor de búsqueda full-text con typo-tolerance. Los artículos de Strapi se indexan aquí para búsquedas instantáneas.

**Python API + RAG Agent:** Servicio que recibe preguntas en lenguaje natural, busca en los documentos, y genera respuestas contextuales usando un modelo de lenguaje. Repositorio: `backend/python-api/`.
