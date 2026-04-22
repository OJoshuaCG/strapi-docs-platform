# Multi-documentación — Referencia técnica del backend

Este documento describe la arquitectura de multi-documentación del CMS Strapi: cómo están modelados los datos, cómo funciona el middleware de aislamiento, y cómo operar múltiples portales de documentación independientes desde una sola instalación de Strapi.

---

## 1. Visión general

El sistema de multi-documentación permite que un único backend Strapi sirva varios portales de documentación completamente aislados entre sí. Cada portal se denomina **espacio** (`documentation-space`) y agrupa toda su jerarquía de contenido de forma independiente.

### Analogía visual

La estructura replica el patrón de portales técnicos populares como la documentación de LiveKit o Stripe:

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (horizontal)                                    │
│  [ Guía de inicio ]  [ API Reference ]  [ SDK ]        │  ← documentation-section
├──────────────┬──────────────────────────────────────────┤
│  SIDEBAR     │  CONTENIDO                               │
│              │                                          │
│  Introducción│  # Título del artículo                  │
│  Instalación │                                          │  ← documentation-article
│  Configurar  │  Cuerpo del artículo...                  │
│              │                                          │
│  Conceptos   │                                          │
│  Espacios    │                                          │  ← documentation-category
│  Middleware  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- **Secciones** (`documentation-section`) → elementos del navbar horizontal
- **Categorías** (`documentation-category`) → títulos de grupo en el sidebar
- **Artículos** (`documentation-article`) → páginas individuales de contenido

### Diagrama de jerarquía

```
documentation-space
│   name, slug, description, is_active
│
└── documentation-section  (i18n, draftAndPublish)
    │   name, slug, icon, order
    │
    └── documentation-category  (i18n, draftAndPublish)
        │   name, slug, description, order
        │
        └── documentation-article  (i18n, draftAndPublish)
                title, slug, content, excerpt, version, order
                seoTitle, seoDescription, ogImage
```

Cada nodo conoce **únicamente a su padre inmediato** — no existe relación directa a `documentation-space` en category ni en article. El middleware de aislamiento deriva el espacio navegando la cadena: `article → category → section → space`.

---

## 2. Roles de cada Content Type

| Content Type | Rol visual | Ejemplo | API endpoint | ¿Requiere `?space`? |
|---|---|---|---|---|
| `documentation-space` | Identificador del portal | "Portal Alpha", "Docs Beta" | `GET /api/documentation-spaces` | No |
| `documentation-section` | Elemento del navbar | "Guía de inicio", "API Reference" | `GET /api/documentation-sections` | **Sí** |
| `documentation-category` | Título de grupo en el sidebar | "Instalación", "Conceptos clave" | `GET /api/documentation-categories` | **Sí** |
| `documentation-article` | Página de contenido | "Configurar el SDK", "Autenticación" | `GET /api/documentation-articles` | **Sí** |
| `documentation-space-setting` | Configuración visual por espacio | Colores, tipografía, logo, favicon | `GET /api/documentation-space-settings` | **Sí** |

Cada espacio tiene su propia configuración visual en `documentation-space-setting`. No existe un `global-setting` compartido — cada portal es completamente independiente.

---

## 3. Configurar un nuevo espacio de documentación

### Paso 1 — Crear el registro en el Content Manager

1. Ingresar al panel admin de Strapi: `http://localhost:1337/admin`
2. Navegar a **Content Manager → Documentation Space**
3. Hacer clic en **Create new entry**
4. Completar los campos:
   - `name`: nombre descriptivo del portal (ej. `Portal Alpha`)
   - `slug`: se genera automáticamente desde `name`; se puede ajustar manualmente
   - `description`: descripción opcional del portal
   - `is_active`: activado por defecto — desactivar para suspender el portal sin eliminar los datos
5. Guardar la entrada

> **Nota:** `documentation-space` no tiene `draftAndPublish` — los registros se crean directamente en estado activo. El campo `is_active` controla la disponibilidad.

### Paso 2 — Crear un API Token de solo lectura

Cada portal debe tener su propio token. Esto permite revocar el acceso a un portal sin afectar a los demás.

1. Ir a **Settings → API Tokens**
2. Hacer clic en **Create new API Token**
3. Configurar:
   - **Name:** nombre descriptivo (ej. `Portal Alpha — Read Only`)
   - **Token duration:** `Unlimited` (o con expiración, según la política de seguridad)
   - **Token type:** `Read-only`
4. Copiar el token generado — **solo se muestra una vez**

### Paso 3 — Configurar el frontend

En el archivo `.env` del frontend asignar las tres variables mínimas:

```env
STRAPI_API_URL          = https://cms.tudominio.com
STRAPI_API_TOKEN        = <token generado en el paso anterior>
DOCUMENTATION_SPACE_SLUG = portal-alpha
```

El frontend debe enviar el token en el header `Authorization: Bearer <token>` y el slug en el parámetro `?space=` de cada petición a secciones, categorías y artículos.

### Paso 4 — Crear el contenido del espacio

El orden recomendado de creación respeta la jerarquía referencial:

**4.1 Crear secciones** (Documentation Section):

1. En el Content Manager ir a **Documentation Section**
2. Crear cada sección del navbar:
   - `name`, `slug`
   - `icon`: identificador del ícono (ej. `book`, `code`, `settings`) — el frontend lo interpreta
   - `order`: entero positivo para controlar el orden en el navbar (0, 10, 20...)
   - `documentation_space`: seleccionar el espacio recién creado
3. Publicar cada sección

**4.2 Crear categorías** (Documentation Category):

1. En el Content Manager ir a **Documentation Category**
2. Crear cada grupo del sidebar:
   - `name`, `slug`
   - `order`: orden dentro de la sección
   - `documentation_section`: seleccionar la sección correspondiente al espacio correcto
3. Publicar cada categoría

> La categoría no tiene campo `documentation_space` directo. El espacio se deriva de la sección asignada. El middleware garantiza el aislamiento en la API.

**4.3 Crear artículos** (Documentation Article):

1. En el Content Manager ir a **Documentation Article**
2. Para cada artículo:
   - Completar `title`, `slug`, `content`, `excerpt`
   - Campos opcionales de SEO: `seoTitle`, `seoDescription`, `ogImage`
   - `version`: etiqueta de versión visible en el frontend (ej. `v2.1`)
   - `order`: orden dentro de la categoría
   - `category`: seleccionar la categoría correspondiente
3. Publicar cada artículo

> El artículo no tiene campo `documentation_space` directo. El espacio se deriva de la cadena `category → section → space`.

---

## 4. API — referencia de endpoints

### Resumen de endpoints

| Método | Endpoint | `?space` | Descripción |
|---|---|---|---|
| `GET` | `/api/documentation-spaces` | No | Lista todos los espacios activos |
| `GET` | `/api/documentation-spaces/:documentId` | No | Detalle de un espacio |
| `GET` | `/api/documentation-sections` | **Obligatorio** | Secciones del navbar |
| `GET` | `/api/documentation-sections/:documentId` | No | Detalle de una sección |
| `GET` | `/api/documentation-categories` | **Obligatorio** | Categorías del sidebar |
| `GET` | `/api/documentation-categories/:documentId` | No | Detalle de una categoría |
| `GET` | `/api/documentation-articles` | **Obligatorio** | Lista de artículos |
| `GET` | `/api/documentation-articles/:documentId` | No | Detalle de un artículo |
| `GET` | `/api/documentation-space-settings` | **Obligatorio** | Configuración visual del espacio |

> Las rutas de detalle (`:documentId`) no pasan por el middleware de filtrado — acceden directamente al registro por su ID único. El middleware solo actúa sobre las rutas de colección (`find`).

### Ejemplos de queries para construir la navegación completa

**1. Obtener todas las secciones del navbar**

```
GET /api/documentation-sections
  ?space=mi-portal
  &locale=es
  &sort=order:asc
  &fields[0]=name
  &fields[1]=slug
  &fields[2]=icon
  &fields[3]=order
  &pagination[pageSize]=100
```

**2. Obtener todas las categorías de una sección específica**

```
GET /api/documentation-categories
  ?space=mi-portal
  &section=guia-de-inicio
  &locale=es
  &sort=order:asc
  &fields[0]=name
  &fields[1]=slug
  &fields[2]=order
  &populate[articles][fields][0]=title
  &populate[articles][fields][1]=slug
  &populate[articles][fields][2]=order
  &pagination[pageSize]=100
```

**3. Obtener todos los artículos de una sección (para pre-cargar la navegación completa)**

```
GET /api/documentation-articles
  ?space=mi-portal
  &section=guia-de-inicio
  &locale=es
  &sort=order:asc
  &fields[0]=title
  &fields[1]=slug
  &fields[2]=order
  &fields[3]=excerpt
  &populate[category][fields][0]=name
  &populate[category][fields][1]=slug
  &pagination[pageSize]=500
```

**4. Obtener un artículo completo por slug**

```
GET /api/documentation-articles
  ?space=mi-portal
  &locale=es
  &filters[slug][$eq]=configurar-el-sdk
  &populate[category][populate][documentation_section][fields][0]=name
  &populate[category][populate][documentation_section][fields][1]=slug
  &populate[ogImage][fields][0]=url
  &populate[ogImage][fields][1]=alternativeText
```

**5. Configuración visual del espacio**

```
GET /api/documentation-space-settings
  ?space=mi-portal
  &populate[colors]=true
  &populate[typography]=true
  &populate[spacing]=true
  &populate[layout]=true
  &populate[favicon][fields][0]=url
  &populate[sidebarLogo][fields][0]=url
  &populate[ogDefaultImage][fields][0]=url
```

---

## 5. Estructura de respuesta JSON

### Respuesta de secciones (`/api/documentation-sections`)

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123def456",
      "name": "Guía de inicio",
      "slug": "guia-de-inicio",
      "icon": "book",
      "order": 0,
      "description": null,
      "locale": "es",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "publishedAt": "2026-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "documentId": "xyz789uvw012",
      "name": "API Reference",
      "slug": "api-reference",
      "icon": "code",
      "order": 10,
      "description": "Referencia completa de la API REST",
      "locale": "es",
      "createdAt": "2026-01-15T10:05:00.000Z",
      "updatedAt": "2026-01-15T10:05:00.000Z",
      "publishedAt": "2026-01-15T10:05:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 100,
      "pageCount": 1,
      "total": 2
    }
  }
}
```

### Respuesta de artículo con categoría y sección populadas

```json
{
  "data": [
    {
      "id": 42,
      "documentId": "art001pqr234",
      "title": "Configurar el SDK",
      "slug": "configurar-el-sdk",
      "excerpt": "Aprende a instalar y configurar el SDK en tu proyecto.",
      "content": [...],
      "version": "v2.1",
      "order": 5,
      "seoTitle": "Configuración del SDK — Portal Alpha",
      "seoDescription": "Guía paso a paso para configurar el SDK en entornos Node.js y Python.",
      "locale": "es",
      "createdAt": "2026-02-01T09:00:00.000Z",
      "updatedAt": "2026-02-10T14:30:00.000Z",
      "publishedAt": "2026-02-01T09:00:00.000Z",
      "category": {
        "id": 7,
        "documentId": "cat007stu890",
        "name": "Instalación",
        "slug": "instalacion",
        "order": 0,
        "documentation_section": {
          "id": 1,
          "documentId": "abc123def456",
          "name": "Guía de inicio",
          "slug": "guia-de-inicio"
        }
      },
      "ogImage": null
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

> **Recuerda:** En Strapi v5 los campos están directamente en el objeto, sin el wrapper `attributes` que existía en v4. Si ves `.attributes` en el código del frontend, es un bug.

---

## 6. Integridad referencial

El aislamiento entre espacios se aplica exclusivamente a través del middleware HTTP. No existen lifecycle hooks de validación — la arquitectura de cadena hace que esta validación sea innecesaria.

### Arquitectura de cadena (sin relaciones directas a space)

`documentation-category` y `documentation-article` **no tienen** campo `documentation_space` directo. Cada nodo conoce únicamente a su padre inmediato:

```
article.category  →  category.documentation_section  →  section.documentation_space
```

Esto elimina la posibilidad de inconsistencias entre un campo `documentation_space` en el artículo y el espacio real derivado por la cadena.

### El middleware filtra por espacio en todas las consultas de colección

El middleware `global::documentation-space-filter` registrado en `config/middlewares.ts` intercepta todas las peticiones `GET` a las rutas de colección. Inyecta automáticamente los filtros de cadena antes de que Strapi ejecute la consulta a la base de datos:

| Endpoint | Filtro inyectado |
|---|---|
| `/api/documentation-sections` | `documentation_space.slug = space` |
| `/api/documentation-categories` | `documentation_section.documentation_space.slug = space` |
| `/api/documentation-articles` | `category.documentation_section.documentation_space.slug = space` |
| `/api/documentation-space-settings` | `documentation_space.slug = space` |

Si el parámetro `?space` no está presente o el espacio no existe/está inactivo, la API devuelve `400 Bad Request` antes de consultar la base de datos.

### Flujo completo

```
Cliente → Request →  Middleware (valida ?space, inyecta filtro de cadena)
                          ↓
                     Strapi Controller (aplica filtros inyectados)
                          ↓
                     MariaDB (devuelve solo registros del espacio)
                          ↓
                     Response → Cliente
```

> **Nota:** La validación de que "la sección asignada a una categoría pertenece al mismo espacio" se confía al editor en el panel admin. El middleware garantiza el aislamiento en lectura; la integridad en escritura se mantiene por convención operativa.

---

## 7. Gestionar múltiples portales en el mismo Strapi

### Escenario: empresa con dos productos independientes

```
Strapi (instalación única)
│
├── Space A: slug=producto-alpha
│   ├── Section: "Getting Started"  (icon=book,   order=0)
│   ├── Section: "API Reference"    (icon=code,   order=10)
│   └── Section: "Changelog"        (icon=clock,  order=20)
│
└── Space B: slug=producto-beta
    ├── Section: "Introducción"     (icon=home,   order=0)
    └── Section: "Configuración"    (icon=settings, order=10)
```

### Configuración de cada frontend

**Frontend del Producto Alpha:**
```env
STRAPI_API_URL           = https://cms.empresa.com
STRAPI_API_TOKEN         = <token_alpha_readonly>
DOCUMENTATION_SPACE_SLUG = producto-alpha
```

**Frontend del Producto Beta:**
```env
STRAPI_API_URL           = https://cms.empresa.com
STRAPI_API_TOKEN         = <token_beta_readonly>
DOCUMENTATION_SPACE_SLUG = producto-beta
```

Ambos frontends apuntan al mismo CMS pero cada uno recibe exclusivamente el contenido de su espacio. El middleware garantiza el aislamiento — aunque el token de Alpha tenga permisos de lectura sobre todas las entradas, el filtro de espacio impide que las consultas devuelvan datos de Beta.

### Operaciones de mantenimiento

**Suspender un portal temporalmente:**
- En el Content Manager, ir al registro del space correspondiente
- Cambiar `is_active` a `false`
- El middleware devuelve `400` para cualquier petición al espacio suspendido

**Eliminar un portal:**
1. Eliminar todos los artículos del espacio
2. Eliminar todas las categorías del espacio
3. Eliminar todas las secciones del espacio
4. Eliminar el registro del space
5. Revocar el API Token correspondiente en Settings → API Tokens

> Strapi no aplica borrado en cascada automático entre Content Types personalizados. Seguir el orden de eliminación de abajo hacia arriba (artículos → categorías → secciones → space) para evitar registros huérfanos.

---

## 8. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `400 El parámetro space es obligatorio.` | El cliente no envía `?space=` en la petición | Verificar que el frontend incluye `?space=${DOCUMENTATION_SPACE_SLUG}` en cada petición a secciones, categorías y artículos |
| `400 El espacio de documentación no existe o está inactivo.` | El slug enviado no existe en la DB, o el campo `is_active` del space es `false` | Verificar el slug exacto en Content Manager → Documentation Space; verificar que `is_active=true` |
| Las secciones no aparecen aunque existen en el Content Manager | Las secciones están en estado Draft | Publicar las secciones desde el Content Manager (la columna Published muestra el estado) |
| Una categoría aparece en la sección incorrecta del sidebar | El campo `documentation_section` de la categoría apunta a la sección equivocada | Editar la categoría y seleccionar la sección correcta |
| Artículos de otro portal aparecen mezclados en las respuestas | El middleware `global::documentation-space-filter` no está registrado o no está activo | Verificar que `global::documentation-space-filter` aparece en `config/middlewares.ts` en la posición correcta (después de `strapi::query`); reiniciar Strapi |
| `403 Forbidden` al consultar la API | El rol Public no tiene permisos para `find` en los Content Types de documentación | Ejecutar `docker compose restart strapi` para que el bootstrap en `src/index.ts` re-aplique los permisos públicos |
| La navegación completa tarda demasiado en cargar | El frontend hace múltiples peticiones secuenciales | Utilizar `populate` para traer categorías y artículos en una sola petición de secciones; o construir la navegación en paralelo |
| `[]` en la respuesta aunque hay contenido publicado | El `locale` del parámetro no coincide con el locale en que se creó el contenido | Verificar que el contenido existe en el locale solicitado; crear la traducción desde el Content Manager |

---

## 9. Variables de entorno por frontend

Estas son las variables mínimas requeridas en cada instancia de frontend para conectarse a un espacio de documentación:

```env
# URL base del CMS Strapi (sin trailing slash)
STRAPI_API_URL = https://cms.tudominio.com

# Token de API de solo lectura generado para este espacio
STRAPI_API_TOKEN = <token_de_solo_lectura>

# Slug del espacio de documentación asignado a este frontend
DOCUMENTATION_SPACE_SLUG = <slug-del-space>
```

El frontend debe usar estas variables de la siguiente forma:

```typescript
// En cada petición a la API de Strapi
const response = await fetch(
  `${STRAPI_API_URL}/api/documentation-sections?space=${DOCUMENTATION_SPACE_SLUG}&locale=${locale}`,
  {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`
    }
  }
);
```

### Variables adicionales relacionadas (opcionales)

```env
# Token compartido para Live Preview de borradores (Phase 1.5)
PREVIEW_SECRET = <secret-compartido-con-el-backend>
```

### Consideraciones de seguridad

- `STRAPI_API_TOKEN` **nunca** debe ser una variable con prefijo `VITE_` — ese prefijo la hornea en el bundle del navegador, exponiendo el token públicamente. Mantenerla solo en el servidor (SvelteKit `load` functions server-side).
- Usar un token diferente por espacio. Si un token se compromete, se revoca solo el acceso a ese portal.
- Los tokens de tipo `Read-only` no permiten crear, modificar ni eliminar contenido aunque sean interceptados.

---

## Referencias

| Documento | Ruta |
|---|---|
| Strapi para desarrolladores | `backend/docs/strapi-para-desarrolladores.md` |
| Configuración de plugins | `backend/cms/config/plugins.ts` |
| Bootstrap de permisos públicos | `backend/cms/src/index.ts` |
| Middleware de filtrado | `backend/cms/src/middlewares/documentation-space-filter.ts` |
| Schema — space | `backend/cms/src/api/documentation-space/content-types/documentation-space/schema.json` |
| Schema — section | `backend/cms/src/api/documentation-section/content-types/documentation-section/schema.json` |
| Schema — category | `backend/cms/src/api/documentation-category/content-types/documentation-category/schema.json` |
| Schema — article | `backend/cms/src/api/documentation-article/content-types/documentation-article/schema.json` |
| Schema — space-setting | `backend/cms/src/api/documentation-space-setting/content-types/documentation-space-setting/schema.json` |
