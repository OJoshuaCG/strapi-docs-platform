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
7. [Middleware documentation-space-filter](#7-middleware-documentation-space-filter)
8. [Lifecycle hooks](#8-lifecycle-hooks)
9. [Archivos de configuración](#9-archivos-de-configuración)
10. [Personalización del admin panel](#10-personalización-del-admin-panel)
11. [Agregar un nuevo Content Type](#11-agregar-un-nuevo-content-type)
12. [Generación de tipos TypeScript](#12-generación-de-tipos-typescript)
13. [API Tokens](#13-api-tokens)
14. [Webhooks](#14-webhooks)
15. [Referencia de comandos CLI](#15-referencia-de-comandos-cli)

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
│   ├── middlewares.ts    ← CORS, CSP, security headers, middleware personalizado
│   ├── plugins.ts        ← Upload provider (Wasabi S3)
│   └── server.ts         ← Host, puerto, app keys
│
├── src/
│   ├── api/
│   │   ├── documentation-space/
│   │   │   ├── content-types/documentation-space/
│   │   │   │   └── schema.json    ← Definición de campos
│   │   │   ├── controllers/
│   │   │   │   └── documentation-space.ts
│   │   │   ├── routes/
│   │   │   │   └── documentation-space.ts
│   │   │   └── services/
│   │   │       └── documentation-space.ts
│   │   ├── documentation-section/
│   │   │   ├── content-types/documentation-section/
│   │   │   │   └── schema.json
│   │   │   ├── controllers/
│   │   │   │   └── documentation-section.ts
│   │   │   ├── routes/
│   │   │   │   └── documentation-section.ts
│   │   │   └── services/
│   │   │       └── documentation-section.ts
│   │   ├── documentation-category/
│   │   │   ├── content-types/documentation-category/
│   │   │   │   └── schema.json
│   │   │   ├── controllers/
│   │   │   │   └── documentation-category.ts
│   │   │   ├── routes/
│   │   │   │   └── documentation-category.ts
│   │   │   └── services/
│   │   │       └── documentation-category.ts
│   │   ├── documentation-article/
│   │   │   ├── content-types/documentation-article/
│   │   │   │   └── schema.json
│   │   │   ├── controllers/
│   │   │   │   └── documentation-article.ts
│   │   │   ├── routes/
│   │   │   │   └── documentation-article.ts
│   │   │   └── services/
│   │   │       └── documentation-article.ts
│   │   └── documentation-space-setting/
│   │       ├── content-types/documentation-space-setting/
│   │       │   └── schema.json
│   │       ├── controllers/
│   │       │   └── documentation-space-setting.ts
│   │       ├── routes/
│   │       │   └── documentation-space-setting.ts
│   │       └── services/
│   │           └── documentation-space-setting.ts
│   │
│   ├── middlewares/
│   │   └── documentation-space-filter.ts  ← Inyecta filtro ?space= automáticamente
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

El proyecto tiene 4 Content Types organizados en una jerarquía de cuatro niveles:

```
documentation-space      (sin i18n, sin draftAndPublish)
  └── documentation-section   (i18n, draftAndPublish)
        └── documentation-category   (i18n, draftAndPublish)
              └── documentation-article  (i18n, draftAndPublish)
```

Un espacio (`space`) agrupa secciones. Una sección agrupa categorías. Una categoría agrupa artículos. Esta estructura permite gestionar múltiples portales de documentación independientes desde una sola instancia de Strapi.

### `documentation-space`

```json
{
  "kind": "collectionType",
  "collectionName": "documentation_spaces",
  "info": {
    "singularName": "documentation-space",
    "pluralName": "documentation-spaces",
    "displayName": "Documentation Space"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name":        { "type": "string", "required": true, "unique": true },
    "slug":        { "type": "uid", "targetField": "name", "required": true },
    "description": { "type": "text" },
    "is_active":   { "type": "boolean", "default": true }
  }
}
```

**Campos:**
- `name` — requerido, único en toda la instancia
- `slug` — UID auto-generado desde `name`; se usa como identificador en la URL (`?space=<slug>`)
- `description` — texto libre
- `is_active` — si es `false`, el espacio no aparece en la API aunque el registro exista

**Sin i18n ni draftAndPublish** — la configuración de un espacio es global.

### `documentation-section`

```json
{
  "kind": "collectionType",
  "collectionName": "documentation_sections",
  "info": {
    "singularName": "documentation-section",
    "pluralName": "documentation-sections",
    "displayName": "Documentation Section"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": { "localized": true }
  },
  "attributes": {
    "name":        { "type": "string", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "slug":        { "type": "uid", "targetField": "name", "pluginOptions": { "i18n": { "localized": true } } },
    "description": { "type": "text", "pluginOptions": { "i18n": { "localized": true } } },
    "order":       { "type": "integer", "default": 0 },
    "icon":        { "type": "string" },
    "documentation_space": {
      "type": "relation", "relation": "manyToOne",
      "target": "api::documentation-space.documentation-space"
    },
    "documentation_categories": {
      "type": "relation", "relation": "oneToMany",
      "target": "api::documentation-category.documentation-category",
      "mappedBy": "documentation_section"
    }
  }
}
```

**Campos:**
- `name` — requerido, localizado
- `slug` — UID auto-generado desde `name`, localizado
- `description` — texto libre, localizado
- `order` — entero para ordenamiento manual, NO localizado (compartido entre idiomas)
- `icon` — identificador de icono para el frontend (ej: `"agents"`, `"cloud"`), NO localizado
- `documentation_space` — relación manyToOne con el espacio al que pertenece
- `documentation_categories` — relación inversa hacia las categorías de esta sección

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
    "name":        { "type": "string", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "slug":        { "type": "uid", "targetField": "name", "pluginOptions": { "i18n": { "localized": true } } },
    "description": { "type": "text", "pluginOptions": { "i18n": { "localized": true } } },
    "order":       { "type": "integer" },
    "articles": {
      "type": "relation", "relation": "oneToMany",
      "target": "api::documentation-article.documentation-article",
      "mappedBy": "category"
    },
    "documentation_section": {
      "type": "relation", "relation": "manyToOne",
      "target": "api::documentation-section.documentation-section",
      "inversedBy": "documentation_categories"
    }
  }
}
```

**Campos:**
- `name` — requerido, localizado
- `slug` — UID auto-generado desde `name`, localizado
- `description` — texto libre, localizado
- `order` — entero para ordenamiento manual, NO localizado
- `articles` — relación inversa a los artículos de esta categoría
- `documentation_section` — relación manyToOne con la sección a la que pertenece

> No tiene `documentation_space` directo. El espacio se deriva navegando la cadena `section → space`.

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
    "title":          { "type": "string", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "slug":           { "type": "uid", "targetField": "title", "pluginOptions": { "i18n": { "localized": true } } },
    "content":        { "type": "richtext", "required": true, "pluginOptions": { "i18n": { "localized": true } } },
    "excerpt":        { "type": "text", "maxLength": 300, "pluginOptions": { "i18n": { "localized": true } } },
    "seoTitle":       { "type": "string", "pluginOptions": { "i18n": { "localized": true } } },
    "seoDescription": { "type": "text", "maxLength": 160, "pluginOptions": { "i18n": { "localized": true } } },
    "ogImage":        { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "version":        { "type": "string" },
    "order":          { "type": "integer", "default": 0 },
    "category": {
      "type": "relation", "relation": "manyToOne",
      "target": "api::documentation-category.documentation-category",
      "inversedBy": "articles"
    }
  }
}
```

**Campos:**
- `title` — requerido, localizado
- `slug` — UID auto-generado desde `title`, localizado
- `content` — richtext (editor de bloques de Strapi), requerido, localizado
- `excerpt` — máximo 300 caracteres, localizado
- `seoTitle` — título alternativo para `<title>` y `og:title`, localizado
- `seoDescription` — meta description y redes sociales, máx 160 caracteres, localizado
- `ogImage` — imagen para compartir en redes sociales, NO localizado
- `version` — string libre (ej: `"1.0.0"`), NO localizado
- `order` — orden dentro de la categoría, default 0, NO localizado
- `category` — relación manyToOne hacia una categoría

> No tiene `documentation_space` directo. El espacio se deriva navegando la cadena `category → section → space`.

### `documentation-space-setting`

Configuración visual y de sitio **por espacio**. Un registro por espacio, sin i18n ni draftAndPublish.

```json
{
  "kind": "collectionType",
  "collectionName": "documentation_space_settings",
  "info": {
    "singularName": "documentation-space-setting",
    "pluralName": "documentation-space-settings",
    "displayName": "Documentation Space Setting"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "documentation_space": { "type": "relation", "relation": "oneToOne", "target": "api::documentation-space.documentation-space" },
    "siteName":            { "type": "string", "required": true, "default": "Documentation Portal" },
    "siteDescription":     { "type": "text" },
    "favicon":             { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "sidebarLogo":         { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "headerLogoSize":      { "type": "enumeration", "enum": ["sm", "md", "lg", "xl"] },
    "headerLinkText":      { "type": "string", "maxLength": 50 },
    "headerLinkUrl":       { "type": "string" },
    "ogDefaultImage":      { "type": "media", "multiple": false, "allowedTypes": ["images"] },
    "footerText":          { "type": "string" },
    "typography":          { "type": "component", "component": "theme.typography" },
    "spacing":             { "type": "component", "component": "theme.spacing" },
    "colors":              { "type": "component", "component": "theme.colors" },
    "layout":              { "type": "component", "component": "theme.layout" }
  }
}
```

**Campos:**
- `documentation_space` — relación oneToOne con el espacio al que aplica esta configuración
- `siteName` — requerido, default "Documentation Portal"
- `siteDescription` — para SEO del sitio
- `favicon` / `sidebarLogo` / `ogDefaultImage` — archivos de imagen
- `headerLogoSize` — enum `sm | md | lg | xl`
- `headerLinkText` / `headerLinkUrl` — link opcional en el header
- `footerText` — texto del footer
- `typography` / `spacing` / `colors` / `layout` — componentes del tema visual

### Diagrama de relaciones

```
documentation-space (1)
    └──(oneToMany)──► documentation-section (N)
                           └──(oneToMany)──► documentation-category (N)
                                                  └──(oneToMany)──► documentation-article (N)

(Las flechas inversas oneToMany implican una relación manyToOne en el lado "hijo")
```

### draftAndPublish

Con `"draftAndPublish": true`, cada entrada tiene dos estados: **Draft** y **Published**. La API pública (sin token) solo devuelve entradas publicadas. `documentation-space` no usa este mecanismo — sus entradas están siempre disponibles; la visibilidad se controla con el campo `is_active`.

### i18n

Con `"i18n": { "localized": true }`, el Content Type soporta múltiples idiomas. Cada campo marcado con `"pluginOptions": { "i18n": { "localized": true } }` tiene valores independientes por idioma.

Los campos SIN esa opción (`order`, `version`, `icon`) son compartidos — el mismo valor en todos los idiomas.

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
  'api::documentation-section.documentation-section.find',
  'api::documentation-section.documentation-section.findOne',
  'api::documentation-space.documentation-space.find',
  'api::documentation-space.documentation-space.findOne',
  'api::documentation-space-setting.documentation-space-setting.find',
  'api::documentation-space-setting.documentation-space-setting.findOne',
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

## 7. Middleware documentation-space-filter

El middleware `global::documentation-space-filter` (implementado en `src/middlewares/documentation-space-filter.ts`) protege los endpoints de la API garantizando que cada frontend solo acceda al contenido del espacio que le corresponde.

### Qué hace

Intercepta las requests `GET` a los endpoints de contenido y:
1. Valida que el parámetro `?space=<slug>` esté presente (salvo para `documentation-spaces`)
2. Verifica que el slug corresponde a un espacio existente y activo (`is_active: true`)
3. Inyecta automáticamente los filtros de Strapi necesarios en la query, sin que el frontend tenga que construirlos

### Endpoints protegidos

| Endpoint | Parámetro obligatorio | Parámetro opcional |
|---|---|---|
| `GET /api/documentation-sections` | `?space=<slug>` | — |
| `GET /api/documentation-categories` | `?space=<slug>` | `?section=<slug>` |
| `GET /api/documentation-articles` | `?space=<slug>` | `?section=<slug>` |
| `GET /api/documentation-space-settings` | `?space=<slug>` | — |
| `GET /api/documentation-spaces` | — (lista todos los activos) | — |

Los endpoints `findOne` (con `:documentId`) no son interceptados por el middleware; el control de acceso para entradas individuales se delega a los permisos del rol.

### Parámetro `?space=<slug>`

Obligatorio en sections, categories y articles. Si falta o el espacio no existe/está inactivo, la API devuelve `400 Bad Request`.

El middleware transforma este parámetro en los filtros apropiados según el endpoint:

- En **sections**: `filters[documentation_space][slug][$eq]=<slug>`
- En **categories**: `filters[documentation_section][documentation_space][slug][$eq]=<slug>`
- En **articles**: `filters[category][documentation_section][documentation_space][slug][$eq]=<slug>`

### Parámetro `?section=<slug>` (opcional)

Disponible en categories y articles. Permite filtrar por sección dentro de un espacio:

- En **categories**: añade `filters[documentation_section][slug][$eq]=<section>`
- En **articles**: añade `filters[category][documentation_section][slug][$eq]=<section>`

### Registro del middleware

El middleware debe estar registrado en `config/middlewares.ts` para que Strapi lo aplique:

```typescript
// config/middlewares.ts
export default [
  // ... middlewares de Strapi por defecto ...
  'global::documentation-space-filter',
];
```

> Si el middleware no está registrado, los artículos de distintos espacios pueden mezclarse en las respuestas.

### Ejemplo de request

```bash
# Obtener las secciones del espacio "mi-producto"
GET /api/documentation-sections?space=mi-producto

# Obtener categorías de una sección específica
GET /api/documentation-categories?space=mi-producto&section=primeros-pasos

# Obtener artículos filtrando por sección
GET /api/documentation-articles?space=mi-producto&section=primeros-pasos&locale=es
```

---

## 8. Lifecycle hooks

Los **lifecycle hooks** son funciones que Strapi ejecuta automáticamente antes o después de operaciones en la base de datos (crear, actualizar, eliminar, publicar). Se definen en un archivo `lifecycles.ts` dentro de `content-types/<nombre>/`.

### Estado actual del proyecto

**Ningún Content Type tiene lifecycle hooks activos.** Los hooks de validación de coherencia de espacio fueron eliminados porque la arquitectura de cadena los hace innecesarios:

- `documentation-category` y `documentation-article` no tienen campo `documentation_space` directo.
- No hay nada que validar entre el espacio de un nodo y el espacio de su padre — la cadena `article → category → section → space` es la única fuente de verdad.
- El aislamiento en lectura lo garantiza el middleware. La coherencia en escritura se confía al editor.

### Hooks disponibles (referencia)

| Hook | Cuándo se ejecuta |
|---|---|
| `beforeCreate` | Antes de insertar un nuevo registro |
| `afterCreate` | Después de insertar un nuevo registro |
| `beforeUpdate` | Antes de actualizar un registro |
| `afterUpdate` | Después de actualizar un registro |
| `beforeDelete` | Antes de eliminar un registro |
| `afterDelete` | Después de eliminar un registro |

### Cuándo usar lifecycle hooks vs middleware

- **Lifecycle hook**: lógica que depende del estado de los datos (validaciones de relaciones, cálculos derivados, auditoría). Se ejecuta para cualquier operación, incluidas las del panel admin.
- **Middleware**: lógica que depende de la request HTTP (filtrado por parámetros de URL, autenticación, modificación de headers). Solo se ejecuta para requests a la API REST.

### Importante: formato de relaciones en Strapi v5

En Strapi v5, cuando el Content Manager envía una relación al guardar, el dato llega en este formato:

```typescript
// v5 — formato en lifecycle hooks
data.documentation_section = {
  connect: [{ id: 7, position: { before: null } }],
  disconnect: []
}

// NO como: data.documentation_section = 7
// NO como: data.documentation_section = { id: 7 }
```

Si escribes un lifecycle hook que accede a `data.documentation_section.id`, obtendrás `undefined` y cualquier query con ese valor fallará con `Undefined attribute level operator connect`. Extraer el ID correctamente:

```typescript
const sectionId =
  Array.isArray(data.documentation_section?.connect)
    ? data.documentation_section.connect[0]?.id
    : data.documentation_section?.id ?? data.documentation_section;
```

---

## 9. Archivos de configuración

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

CORS, Content Security Policy y middlewares personalizados. Las claves:

```typescript
// CORS — solo acepta requests desde el frontend configurado
origin: [env('FRONTEND_URL', 'http://localhost:5173')]

// CSP — permite cargar imágenes desde Wasabi
'img-src': ["'self'", 'data:', 'blob:', env('WASABI_ENDPOINT')]

// Middleware personalizado al final del array
'global::documentation-space-filter',
```

> Cuando despliegues a producción, actualiza `FRONTEND_URL` con la URL real del frontend.

### `config/plugins.ts`

Configuración del proveedor de uploads (Wasabi S3). Ver `docs/wasabi-s3.md`.

---

## 10. Personalización del admin panel

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

## 11. Agregar un nuevo Content Type

**Ejemplo: agregar un Content Type "FAQ"**

### 1. Crea los archivos

```bash
# Desde la raíz del repo, dentro del contenedor o con acceso a cms/
mkdir -p cms/src/api/faq/content-types/faq
mkdir -p cms/src/api/faq/controllers
mkdir -p cms/src/api/faq/routes
mkdir -p cms/src/api/faq/services
touch cms/src/api/faq/content-types/faq/schema.json
touch cms/src/api/faq/controllers/faq.ts
touch cms/src/api/faq/routes/faq.ts
touch cms/src/api/faq/services/faq.ts
```

Si el nuevo tipo tiene validaciones de integridad referencial, crea también el archivo de lifecycle hooks:

```bash
touch cms/src/api/faq/content-types/faq/lifecycles.ts
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

## 12. Generación de tipos TypeScript

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

## 13. API Tokens

Los API tokens permiten hacer requests autenticadas a la API de Strapi. Útiles para:
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

## 14. Webhooks

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

## 15. Referencia de comandos CLI

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
