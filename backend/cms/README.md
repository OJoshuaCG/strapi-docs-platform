# CMS — Strapi v5

Strapi v5 + TypeScript corriendo sobre MariaDB. Parte del stack `backend/`.

---

## Stack

| Pieza | Versión | Notas |
|---|---|---|
| Strapi | 5.42.0 | TypeScript, draft/publish nativo |
| Node.js | 20 – 24 | Requerido por Strapi v5 |
| MariaDB | 10.11 | Driver: `mysql2` |
| Wasabi S3 | — | `@strapi/provider-upload-aws-s3` v5 |

---

## Quick start

### Opción A — Docker Compose (recomendado)

```bash
# Desde backend/
cp .env.example .env          # copia y rellena los valores
docker compose up --build     # primera vez: construye imagen + migra DB
```

Servicios disponibles:
- Panel admin: `http://localhost:1337/admin`
- API REST: `http://localhost:1337/api`
- Meilisearch: `http://localhost:7700`

### Opción B — Local (sin Docker)

Requiere MariaDB 10.11 accesible en `127.0.0.1:3306`.

> Si usas la BD del Compose, MariaDB **no expone puertos al host** por diseño.
> Para acceso local, ver la sección "Acceso directo a la DB" en `../docs/maintenance.md`.

```bash
cd backend/cms
cp .env.example .env          # ajusta DATABASE_HOST=127.0.0.1
npm install
npm run develop               # hot reload
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_CLIENT` | Driver de Knex | `mysql2` |
| `DATABASE_HOST` | Host de MariaDB | `mariadb` (Docker) / `127.0.0.1` (local) |
| `DATABASE_PORT` | Puerto MariaDB | `3306` |
| `DATABASE_NAME` | Nombre de la DB | `strapi_docs` |
| `DATABASE_USERNAME` | Usuario MariaDB | `strapi` |
| `DATABASE_PASSWORD` | Password MariaDB | — |
| `DATABASE_SSL` | TLS hacia la DB | `false` |
| `APP_KEYS` | 2+ base64, comma-separated | — |
| `API_TOKEN_SALT` | Salt para API tokens | — |
| `ADMIN_JWT_SECRET` | Secret JWT del admin | — |
| `JWT_SECRET` | Secret JWT de usuarios | — |
| `TRANSFER_TOKEN_SALT` | Salt para data transfer | — |
| `ENCRYPTION_KEY` | Cifrado de campos sensibles | — |
| `FRONTEND_URL` | Origin para CORS | `http://localhost:5173` |
| `WASABI_ACCESS_KEY` | Wasabi access key | — |
| `WASABI_SECRET_KEY` | Wasabi secret key | — |
| `WASABI_BUCKET` | Nombre del bucket | — |
| `WASABI_REGION` | Región Wasabi | `us-east-1` |
| `WASABI_ENDPOINT` | Endpoint Wasabi | `https://s3.wasabisys.com` |
| `WASABI_UPLOAD_PREFIX` | Prefijo en el bucket | `cms` |

Genera los secrets con:
```bash
# APP_KEYS (mínimo 2, separadas por coma)
node -e "const c=require('crypto'); \
  console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"

# El resto (uno por variable)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Content Types

### `documentation-category`

```
api::documentation-category.documentation-category
GET /api/documentation-categories
```

| Campo | Tipo | Localizable | Notas |
|---|---|---|---|
| `name` | string | Sí | Requerido |
| `slug` | uid | Sí | Auto-generado desde `name` |
| `description` | text | Sí | — |
| `order` | integer | No | Ordenamiento manual |

### `documentation-article`

```
api::documentation-article.documentation-article
GET /api/documentation-articles
```

| Campo | Tipo | Localizable | Notas |
|---|---|---|---|
| `title` | string | Sí | Requerido |
| `slug` | uid | Sí | Auto-generado desde `title` |
| `content` | richtext | Sí | Requerido |
| `excerpt` | text | Sí | Max 300 chars |
| `version` | string | No | Ej: `"1.0.0"` |
| `category` | relation (manyToOne) | — | → `documentation-category` |

Ambos tipos tienen:
- `draftAndPublish: true` — solo las entradas publicadas son visibles en la API pública
- i18n habilitado — locales: `es` (default), `en`

### Relación

```
documentation-article  ──(manyToOne)──►  documentation-category
                       ◄──(oneToMany)───
```

---

## Endpoints REST

Solo retornan entradas **publicadas** cuando se accede sin autenticación.

```
GET /api/documentation-articles
GET /api/documentation-articles/:documentId

GET /api/documentation-categories
GET /api/documentation-categories/:documentId
```

### Parámetros frecuentes

```bash
# Locale
?locale=en

# Populate relación
?populate[category][fields][0]=name&populate[category][fields][1]=slug

# Filtro por slug
?filters[slug][$eq]=mi-articulo

# Paginación
?pagination[page]=1&pagination[pageSize]=20

# Ordenar
?sort=createdAt:desc
```

---

## Estructura del proyecto

```
cms/
├── config/
│   ├── admin.ts          secrets del panel admin
│   ├── api.ts            defaults de la API REST (paginación, etc.)
│   ├── database.ts       conexión MariaDB via DATABASE_CLIENT env var
│   ├── middlewares.ts    CORS (FRONTEND_URL), seguridad, etc.
│   ├── plugins.ts        proveedor de uploads Wasabi S3
│   └── server.ts         host, puerto, app keys
├── database/
│   └── migrations/       migraciones generadas por Strapi (no editar a mano)
├── src/
│   ├── api/
│   │   ├── documentation-article/
│   │   │   ├── content-types/.../schema.json
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   └── documentation-category/
│   │       └── (misma estructura)
│   ├── admin/            personalización del panel admin
│   └── index.ts          bootstraps personalizados
├── public/
│   └── uploads/          uploads locales (cuando Wasabi no está configurado)
├── Dockerfile            multi-stage: development / builder / production
└── package.json
```

---

## Tareas comunes

### Agregar un nuevo locale

```
Panel admin → Settings → Internationalization → Add a locale
```

No requiere cambios en el código. Strapi lo gestiona en la DB.

### Regenerar tipos TypeScript

```bash
npm run strapi ts:generate-types
```

Ejecutar después de modificar cualquier schema para tener tipos actualizados.

### Agregar un nuevo content type

1. Crea `src/api/<nombre>/content-types/<nombre>/schema.json`
2. Agrega controller, route y service usando los core factories:

```typescript
// controllers/<nombre>.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::<nombre>.<nombre>');

// routes/<nombre>.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::<nombre>.<nombre>');

// services/<nombre>.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::<nombre>.<nombre>');
```

3. Reinicia Strapi — genera y aplica la migración automáticamente.

### Crear un API token de solo lectura (para el frontend)

```
Panel admin → Settings → API Tokens → Create new API token
Tipo: Read-only
```

El frontend lo usa en el header: `Authorization: Bearer <token>`

---

## Permisos de la API pública

Verificar en el primer despliegue:

```
Settings → Roles → Public
  Documentation Article  → find, findOne: habilitados
  Documentation Category → find, findOne: habilitados
```

---

## Documentación adicional

- `../docs/maintenance.md` — backups, actualizaciones, troubleshooting
- `../docs/strapi-for-dummies.md` — guía para editores de contenido
- [Docs oficiales Strapi v5](https://docs.strapi.io)
