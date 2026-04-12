# Sistema de documentación con Strapi + Wasabi + Multi-idioma

## Contexto y objetivo

Implementar un sistema de gestión de documentación técnica usando Strapi v5 como CMS
headless. El sistema debe soportar múltiples idiomas, gestión de archivos en Wasabi
(compatible S3), y exponer una API REST consumible por un frontend SvelteKit.

El frontend NO es parte de este alcance.
La integración con IA (RAG) NO es parte de este alcance — es Phase 2.

---

## Entorno de trabajo

- Node.js 20+
- Docker + Docker Compose disponible
- Base de datos: MariaDB 10.11
- OS: Linux (Ubuntu 22.04)
- El proyecto debe vivir bajo `/apps/cms`
- TypeScript habilitado en Strapi (para aprovechar tipos generados de Content Types)

Si algo de esto es incompatible con alguna decisión técnica, detente y avísame antes
de continuar.

---

## Arquitectura de servicios

Todos los servicios corren en un único `docker-compose.yml`.

### Servicios requeridos en Phase 1

| Servicio     | Puerto interno | Puerto expuesto | Notas                          |
|---|---|---|---|
| `mariadb`    | 3306           | ninguno         | solo red interna               |
| `strapi`     | 1337           | 1337            | accesible desde host           |
| `meilisearch`| 7700           | 7700            | levantarlo ahora, configurar en Phase 2 |

### Servicio placeholder para Phase 2 (comentado en el Compose)

```yaml
# python-api:
#   build: ./apps/python-api
#   ports:
#     - "8000:8000"
#   networks:
#     - internal
```

### Red

- Todos los servicios en una red interna llamada `doc-network`
- Solo `strapi` y `meilisearch` exponen puertos al host
- `mariadb` NO expone puertos fuera del Compose

---

## Paso 1 — Setup base de Strapi con MariaDB

1. Inicializar proyecto Strapi v5 con TypeScript en `/apps/cms`
2. Configurar conexión a MariaDB via variables de entorno
3. Proveer `docker-compose.yml` con:
   - Servicios: `mariadb`, `strapi`, `meilisearch`
   - Red interna `doc-network`
   - Volúmenes persistentes para DB, uploads y datos de Meilisearch
4. Archivo `.env.example` con todas las variables documentadas
5. `.env` en `.gitignore`
6. CORS configurado explícitamente con la variable `FRONTEND_URL`
   (no usar `*` — aunque el frontend no esté listo, dejar la variable preparada)

**Criterio de éxito:** `docker compose up` levanta los tres servicios.
Strapi accesible en `localhost:1337/admin`. Meilisearch en `localhost:7700`.

---

## Paso 2 — Plugin i18n

1. Habilitar `@strapi/plugin-i18n`
2. Locales: `es` (default), `en`
3. Documentar cómo agregar nuevos locales desde el panel

**Criterio de éxito:** En el panel admin se puede seleccionar idioma al crear contenido.

---

## Paso 3 — Content Types

Crear los siguientes Content Types con i18n habilitado:

### `documentation-article`

| Campo         | Tipo              | Requerido | Notas                        |
|---|---|---|---|
| `title`       | string            | sí        | localizable                  |
| `slug`        | uid (from title)  | sí        | único por locale             |
| `content`     | richtext          | sí        | localizable                  |
| `excerpt`     | text              | no        | localizable, max 300 chars   |
| `is_published`| boolean           | sí        | default: false               |
| `published_at`| datetime          | no        |                              |
| `version`     | string            | no        | ej: "1.0.0"                  |

### `documentation-category`

| Campo         | Tipo             | Requerido | Notas       |
|---|---|---|---|
| `name`        | string           | sí        | localizable |
| `slug`        | uid (from name)  | sí        |             |
| `description` | text             | no        | localizable |
| `order`       | integer          | no        | ordenamiento manual |

### Relación

`documentation-article` → belongsTo → `documentation-category`

**Criterio de éxito:** Ambos Content Types visibles en panel, campos i18n funcionando.

---

## Paso 4 — Integración con Wasabi

1. Instalar `@strapi/provider-upload-aws-s3`
2. Configurar endpoint custom de Wasabi: `https://s3.wasabisys.com`
3. Todas las credenciales vía variables de entorno:

| Variable          | Descripción              |
|---|---|
| `WASABI_ACCESS_KEY` | Access key             |
| `WASABI_SECRET_KEY` | Secret key             |
| `WASABI_BUCKET`     | Nombre del bucket      |
| `WASABI_REGION`     | Región (ej: us-east-1) |
| `WASABI_ENDPOINT`   | https://s3.wasabisys.com |

**Criterio de éxito:** Subir una imagen desde Media Library → la URL apunta a
Wasabi, no a storage local.

---

## Paso 5 — Permisos API

Configurar roles mínimos:

| Rol             | Permiso                                                     |
|---|---|
| Public          | GET en `documentation-article` y `documentation-category`  |
| Public          | Solo registros con `is_published: true` (filtrar en query) |
| Authenticated   | Sin cambios por ahora                                       |
| Admin           | Acceso completo                                             |

El filtro de `is_published` debe aplicarse a nivel de query en Strapi,
no confiar en que el admin no publique por error.

Documentar los endpoints REST expuestos al finalizar.

**Criterio de éxito:**
`GET /api/documentation-articles?filters[is_published][$eq]=true`
retorna datos sin autenticación.

---

## Variables de entorno requeridas (`.env.example`)

```env
# Base de datos
DATABASE_HOST=mariadb
DATABASE_PORT=3306
DATABASE_NAME=strapi_docs
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=

# Strapi
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
JWT_SECRET=

# CORS
FRONTEND_URL=http://localhost:5173

# Wasabi
WASABI_ACCESS_KEY=
WASABI_SECRET_KEY=
WASABI_BUCKET=
WASABI_REGION=
WASABI_ENDPOINT=https://s3.wasabisys.com

# Meilisearch (se usará en Phase 2)
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=
```

---

## Lo que NO debes hacer en esta sesión

- No instalar ni configurar `strapi-plugin-meilisearch` (es Phase 2)
- No implementar el agente de IA ni RAG
- No generar el frontend SvelteKit
- No exponer `mariadb` fuera de la red interna del Compose
- No usar `*` en CORS

---

## Seguridad por defecto

- Nunca hardcodear credenciales
- `.env` en `.gitignore`
- CORS explícito vía variable de entorno
- `mariadb` sin puertos expuestos al host
- Filtro de `is_published` en servidor, no en cliente

---

## Cómo reportar progreso

Al completar cada paso:
1. Mostrar el código o configuración generada
2. Indicar el comando para verificar el criterio de éxito
3. Listar decisiones técnicas tomadas y por qué
4. Preguntar antes de continuar al siguiente paso si encontraste algo ambiguo