# Strapi para Desarrolladores

Guía técnica de Strapi v5 orientada a desarrolladores que trabajan en el CMS: cómo están estructurados los Content Types, qué hace cada archivo de configuración, cómo extender la API y cómo usar las herramientas de desarrollo.

> Para la guía de uso del panel admin (editores de contenido), ver `strapi-for-dummies.md`.

---

## Tabla de contenidos

1. [Arquitectura de Strapi](#1-arquitectura-de-strapi)
2. [Estructura del proyecto cms/](#2-estructura-del-proyecto-cms)
3. [Content Types — conceptos](#3-content-types--conceptos)
4. [Los schemas de este proyecto](#4-los-schemas-de-este-proyecto)
5. [Controllers, Routes y Services](#5-controllers-routes-y-services)
6. [Bootstrap — src/index.ts](#6-bootstrap--srcindexts)
7. [Archivos de configuración](#7-archivos-de-configuración)
8. [Personalización del admin panel](#8-personalización-del-admin-panel)
9. [Agregar un nuevo Content Type](#9-agregar-un-nuevo-content-type)
10. [Generación de tipos TypeScript](#10-generación-de-tipos-typescript)
11. [API Tokens](#11-api-tokens)
12. [Webhooks](#12-webhooks)
13. [Referencia de comandos CLI](#13-referencia-de-comandos-cli)

---

## 1. Arquitectura de Strapi

Strapi es un **CMS headless** — gestiona contenido y expone una API, pero no renderiza páginas web.

```
┌─────────────────────────────────────────┐
│                Strapi                   │
│                                         │
│   Content Manager (panel admin)         │
│       └─ gestiona entradas del CMS      │
│                                         │
│   Core API (REST)                       │
│       └─ expone los datos via HTTP      │
│                                         │
│   Plugins                               │
│       ├─ users-permissions (roles/auth) │
│       ├─ i18n (internacionalización)    │
│       └─ upload (gestión de archivos)   │
│                                         │
│   Base de datos (Knex.js → MariaDB)     │
└─────────────────────────────────────────┘
```

**Flujo de datos:**
1. El editor crea contenido en el panel admin
2. Strapi guarda los datos en MariaDB
3. El frontend hace un `GET /api/documentation-articles` a Strapi
4. Strapi consulta MariaDB y retorna JSON
5. El frontend renderiza la respuesta

---

## 2. Estructura del proyecto cms/

```
cms/
├── config/
│   ├── admin.ts          ← Secrets del panel admin (APP_KEYS, JWT)
│   ├── api.ts            ← Defaults de la API REST (paginación, respuestas)
│   ├── database.ts       ← Conexión a la DB (mysql2/postgres/sqlite)
│   ├── middlewares.ts    ← CORS, CSP, security headers
│   ├── plugins.ts        ← Upload provider (Wasabi S3)
│   └── server.ts         ← Host, puerto, app keys
│
├── src/
│   ├── api/
│   │   ├── documentation-article/
│   │   │   ├── content-types/documentation-article/
│   │   │   │   └── schema.json    ← Definición de campos
│   │   │   ├── controllers/
│   │   │   │   └── documentation-article.ts
│   │   │   ├── routes/
│   │   │   │   └── documentation-article.ts
│   │   │   └── services/
│   │   │       └── documentation-article.ts
│   │   └── documentation-category/
│   │       └── (misma estructura)
│   │
│   ├── admin/
│   │   └── app.ts        ← Personalización del panel admin (logo, tema)
│   │
│   └── index.ts          ← Bootstrap: lógica al arrancar Strapi
│
├── database/
│   └── migrations/       ← Auto-generadas por Strapi (no editar)
│
└── public/
    └── uploads/          ← Uploads locales (cuando Wasabi no está configurado)
```

---

## 3. Content Types — conceptos

Un **Content Type** define la estructura de un tipo de contenido, equivalente a una tabla en la base de datos.

Strapi tiene dos tipos:
- **Collection Type**: múltiples entradas (artículos, categorías, usuarios)
- **Single Type**: una sola entrada (página "Acerca de", configuración global)

Este proyecto usa solo Collection Types.

**Relación entre Content Types y la API:**
```
Content Type "documentation-article"
    → Tabla en MariaDB: documentation_articles
    → Endpoints REST:
        GET /api/documentation-articles
        GET /api/documentation-articles/:documentId
```

El nombre del endpoint se deriva del `singularName` del Content Type, en plural.

---

## 4. Los schemas de este proyecto

### `documentation-category`

```json
{
  "kind": "collectionType",
  "collectionName": "documentation_categories",
  "info": {
    "singularName": "documentation-category",
    "pluralName": "documentation-categories",
    "displayName": "Documentation Category"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name": { "type": "string", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "slug": { "type": "uid", "targetField": "name", "pluginOptions": { "i18n": { "localized": true } } },
    "description": { "type": "text", "pluginOptions": { "i18n": { "localized": true } } },
    "order": { "type": "integer" },
    "articles": { "type": "relation", "relation": "oneToMany", "target": "api::documentation-article.documentation-article", "mappedBy": "category" }
  }
}
```

**Campos:**
- `name` — requerido, localizado (uno por idioma)
- `slug` — UID auto-generado desde `name`, localizado
- `description` — texto libre, localizado
- `order` — entero para ordenamiento manual, NO localizado (compartido entre todos los idiomas)
- `articles` — relación inversa a los artículos de esta categoría

### `documentation-article`

```json
{
  "kind": "collectionType",
  "collectionName": "documentation_articles",
  "info": {
    "singularName": "documentation-article",
    "pluralName": "documentation-articles",
    "displayName": "Documentation Article"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "title": { "type": "string", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "slug": { "type": "uid", "targetField": "title", "pluginOptions": { "i18n": { "localized": true } } },
    "content": { "type": "richtext", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "excerpt": { "type": "text", "maxLength": 300, "pluginOptions": { "i18n": { "localized": true } } },
    "version": { "type": "string" },
    "category": { "type": "relation", "relation": "manyToOne", "target": "api::documentation-category.documentation-category", "inversedBy": "articles" }
  }
}
```

**Campos:**
- `title` — requerido, localizado
- `slug` — UID auto-generado desde `title`, localizado
- `content` — richtext (editor de bloques de Strapi), requerido, localizado
- `excerpt` — máximo 300 caracteres, localizado
- `version` — string libre (ej: `"1.0.0"`), NO localizado (igual para todos los idiomas)
- `category` — relación manyToOne hacia una categoría

### Relación entre los dos tipos

```
documentation-article  ──(manyToOne)──►  documentation-category
                       ◄──(oneToMany)───
```

Un artículo pertenece a una categoría. Una categoría tiene muchos artículos.

### draftAndPublish

Con `"draftAndPublish": true`, cada entrada tiene dos estados: **Draft** y **Published**. La API pública (sin token) solo devuelve entradas publicadas.

### i18n

Con `"i18n": { "localized": true }`, el Content Type soporta múltiples idiomas. Cada campo marcado con `"pluginOptions": { "i18n": { "localized": true } }` tiene valores independientes por idioma.

Los campos SIN esa opción (`order`, `version`) son compartidos — el mismo valor en todos los idiomas.

---

## 5. Controllers, Routes y Services

Strapi usa el patrón **Controller → Service → DB**:

```
Request HTTP  →  Route  →  Controller  →  Service  →  DB (Knex)
```

- **Route**: define qué URLs existen y qué método HTTP las atiende
- **Controller**: recibe la request, llama al service, devuelve la response
- **Service**: contiene la lógica de negocio (queries, transformaciones)

En este proyecto, los tres usan **core factories** — Strapi genera implementaciones por defecto basadas en el schema:

```typescript
// controllers/documentation-article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController(
  'api::documentation-article.documentation-article'
);

// routes/documentation-article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter(
  'api::documentation-article.documentation-article'
);

// services/documentation-article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService(
  'api::documentation-article.documentation-article'
);
```

Los core factories proveen automáticamente los endpoints `find` y `findOne` (y también `create`, `update`, `delete` — aunque esos no son accesibles públicamente por los permisos configurados).

### Extender un controller

Si necesitas lógica personalizada, extiende el core factory:

```typescript
// controllers/documentation-article.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::documentation-article.documentation-article',
  ({ strapi }) => ({
    // Override del método find
    async find(ctx) {
      // Lógica personalizada antes
      ctx.query = { ...ctx.query, sort: 'order:asc' };

      // Llama al método original
      const result = await super.find(ctx);

      // Lógica personalizada después
      return result;
    },

    // Acción completamente nueva
    async featured(ctx) {
      const articles = await strapi.service(
        'api::documentation-article.documentation-article'
      ).find({
        filters: { featured: true },
        populate: ['category'],
      });
      return this.transformResponse(articles);
    },
  })
);
```

---

## 6. Bootstrap — src/index.ts

El archivo `src/index.ts` se ejecuta **cada vez que Strapi arranca**. Contiene lógica de inicialización.

```typescript
export default {
  register({ strapi }) {
    // Se ejecuta antes de que los plugins se carguen
    // Útil para registrar nuevos providers o servicios
  },

  async bootstrap({ strapi }) {
    // Se ejecuta después de que Strapi está completamente inicializado
    // Aquí van las configuraciones que dependen de que la DB esté disponible
    await configurePublicPermissions(strapi);
  },
};
```

**Lo que hace `configurePublicPermissions`:**

```typescript
const PUBLIC_PERMISSIONS = [
  'api::documentation-article.documentation-article.find',
  'api::documentation-article.documentation-article.findOne',
  'api::documentation-category.documentation-category.find',
  'api::documentation-category.documentation-category.findOne',
];

// Para cada permiso:
// 1. Busca el rol "public" en la DB
// 2. Verifica si el permiso ya existe y está habilitado
// 3. Si no existe: lo crea
// 4. Si existe pero está deshabilitado: lo habilita
// → Es idempotente: seguro de ejecutar múltiples veces
```

Esta función garantiza que la API pública funcione desde el primer arranque, sin necesidad de ir al panel admin a configurar permisos manualmente.

**Si necesitas agregar permisos adicionales**, solo agrega la acción al array `PUBLIC_PERMISSIONS`:

```typescript
// Para un nuevo content type "faq"
'api::faq.faq.find',
'api::faq.faq.findOne',
```

---

## 7. Archivos de configuración

### `config/server.ts`

Host, puerto, y configuración del servidor HTTP de Strapi.

```typescript
// Configuración típica
export default {
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),  // array de strings base64
  },
};
```

`APP_KEYS` se usa para firmar cookies de sesión del panel admin.

### `config/admin.ts`

Configuración del panel de administración.

```typescript
export default {
  auth: {
    secret: env('ADMIN_JWT_SECRET'),  // firmado de JWTs del panel admin
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),      // salt para hash de API tokens
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),  // para data transfer (import/export)
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),  // cifrado de campos sensibles
  },
};
```

### `config/api.ts`

Defaults de la REST API.

```typescript
export default {
  rest: {
    maxLimit: 100,     // máximo de resultados en una sola request
    defaultLimit: 25,  // resultados por defecto si no se especifica pagination
  },
};
```

Esto significa que `GET /api/documentation-articles` sin parámetros retorna 25 artículos.

### `config/database.ts`

Conexión a la base de datos via Knex. Soporta `mysql2`, `postgres`, y `sqlite`. Ver `docs/mariadb.md` para la configuración completa.

### `config/middlewares.ts`

CORS y Content Security Policy. Las claves:

```typescript
// CORS — solo acepta requests desde el frontend configurado
origin: [env('FRONTEND_URL', 'http://localhost:5173')]

// CSP — permite cargar imágenes desde Wasabi
'img-src': ["'self'", 'data:', 'blob:', env('WASABI_ENDPOINT')]
```

> Cuando despliegues a producción, actualiza `FRONTEND_URL` con la URL real del frontend.

### `config/plugins.ts`

Configuración del proveedor de uploads (Wasabi S3). Ver `docs/wasabi-s3.md`.

---

## 8. Personalización del admin panel

El panel admin de Strapi puede personalizarse visualmente sin modificar el core.

```typescript
// src/admin/app.ts
export default {
  config: {
    // Nombre del proyecto en el panel
    locales: ['es', 'en'],
    // Logo en la pantalla de login
    auth: {
      logo: '/logo-auth.png',     // debe existir en public/
    },
    // Logo en la barra lateral
    menu: {
      logo: '/logo-menu.png',
    },
    // Tutorial deshabilitado
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap() {
    // Lógica ejecutada al cargar el panel admin en el navegador
  },
};
```

Los archivos de imagen referenciados (`logo-auth.png`, `logo-menu.png`) deben estar en `cms/public/`. Actualmente solo existe `favicon.png`.

---

## 9. Agregar un nuevo Content Type

**Ejemplo: agregar un Content Type "FAQ"**

### 1. Crea los archivos

```bash
# Estructura necesaria
mkdir -p cms/src/api/faq/content-types/faq
touch cms/src/api/faq/content-types/faq/schema.json
touch cms/src/api/faq/controllers/faq.ts
touch cms/src/api/faq/routes/faq.ts
touch cms/src/api/faq/services/faq.ts
```

### 2. Define el schema

```json
// cms/src/api/faq/content-types/faq/schema.json
{
  "kind": "collectionType",
  "collectionName": "faqs",
  "info": {
    "singularName": "faq",
    "pluralName": "faqs",
    "displayName": "FAQ"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "question": {
      "type": "string",
      "required": true,
      "pluginOptions": { "i18n": { "localized": true } }
    },
    "answer": {
      "type": "text",
      "required": true,
      "pluginOptions": { "i18n": { "localized": true } }
    }
  }
}
```

### 3. Agrega controller, route y service

```typescript
// controllers/faq.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::faq.faq');

// routes/faq.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::faq.faq');

// services/faq.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::faq.faq');
```

### 4. Agrega los permisos públicos en el bootstrap

```typescript
// src/index.ts
const PUBLIC_PERMISSIONS = [
  // ... permisos existentes ...
  'api::faq.faq.find',
  'api::faq.faq.findOne',
];
```

### 5. Reinicia Strapi

```bash
docker compose restart strapi
```

Strapi detecta el nuevo schema, genera la migración y crea la tabla en MariaDB automáticamente.

### 6. Regenera los tipos TypeScript

```bash
docker compose exec strapi npm run strapi ts:generate-types
```

---

## 10. Generación de tipos TypeScript

Strapi puede generar tipos TypeScript a partir de los schemas definidos:

```bash
npm run strapi ts:generate-types
# → genera en src/types/generated/
```

Los tipos generados cubren:
- Tipos de respuesta de la REST API
- Tipos de los Content Types para uso dentro del CMS (controllers, services)

> Ejecuta este comando **después de cada cambio en un schema** para mantener los tipos actualizados.

---

## 11. API Tokens

Los API tokens permiten hacer requests autenticadas a la API de Strapi. Útiless para:
- Acceso de escritura desde el frontend (si se necesita crear contenido)
- Integración con herramientas externas
- Acceso a contenido en estado Draft

### Crear un token de solo lectura

```
Panel admin → Settings → API Tokens → Create new API Token
  Name: Frontend Production
  Type: Read-only
  Duration: Unlimited (o según política de seguridad)
```

### Usar el token en requests

```bash
curl -H "Authorization: Bearer TU_TOKEN" \
  http://localhost:1337/api/documentation-articles?status=draft
```

> El token es el mecanismo para acceder a contenido en **draft** (no publicado) — útil para preview en el frontend.

---

## 12. Webhooks

Los webhooks permiten que Strapi notifique a sistemas externos cuando ocurre un evento (publicación, actualización, etc.).

Serán necesarios en **Phase 2** para indexar artículos en Meilisearch automáticamente.

### Configurar un webhook

```
Panel admin → Settings → Webhooks → Create new webhook
  URL: http://meilisearch-indexer:8000/webhook
  Eventos:
    ✓ entry.publish
    ✓ entry.unpublish
    ✓ entry.delete
  Filtro de Content Type: Documentation Article
```

### Estructura del payload

```json
{
  "event": "entry.publish",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "model": "documentation-article",
  "uid": "api::documentation-article.documentation-article",
  "entry": {
    "id": 42,
    "documentId": "abc123xyz",
    "title": "Cómo instalar el sistema",
    "slug": "como-instalar-el-sistema",
    "locale": "es",
    "publishedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## 13. Referencia de comandos CLI

```bash
# Dentro del contenedor (o en desarrollo local con npm)

# Modo desarrollo (hot-reload)
npm run develop

# Build de producción
npm run build

# Servidor de producción (requiere build previo)
npm run start

# Consola interactiva de Strapi
npm run strapi console

# Regenerar tipos TypeScript
npm run strapi ts:generate-types

# Verificar actualización disponible (dry-run)
npm run strapi upgrade latest -- --dry

# Listar plugins instalados
npm run strapi plugins:list

# Información del proyecto
npm run strapi info
```

**Desde Docker:**

```bash
docker compose exec strapi npm run strapi ts:generate-types
docker compose exec strapi npm run strapi console
docker compose exec strapi npm run strapi info
```
