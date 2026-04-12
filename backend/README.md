# Backend — Sistema de Documentación

Stack completo del backend: CMS headless, base de datos, motor de búsqueda y configuración de servicios Docker.

---

## Stack tecnológico

| Servicio | Imagen / Versión | Puerto (dev) | Propósito |
|---|---|---|---|
| **Strapi v5** | build `./cms` — Node 20 | `1337` | CMS + panel admin + REST API |
| **MariaDB** | `mariadb:10.11` | no expuesto | Base de datos persistente |
| **Meilisearch** | `getmeili/meilisearch:v1.12` | `7700` | Motor de búsqueda (Phase 2) |
| **Frontend** | build `../frontend` | `5173` | SvelteKit SSR (incluido para dev) |

---

## Estructura de directorios

```
backend/
├── .env.example              ← Variables de entorno para Docker Compose (copia → .env)
├── .gitignore                ← Solo .env está ignorado
├── docker-compose.yml        ← Configuración de desarrollo (y base para producción)
├── docker-compose.prod.yml   ← Overrides para producción
│
├── cms/                      ← Aplicación Strapi v5
│   ├── .env.example          ← Variables para desarrollo local sin Docker
│   ├── Dockerfile            ← Multi-stage: development / builder / production
│   ├── package.json
│   ├── tsconfig.json
│   ├── config/               ← Configuración de Strapi (DB, plugins, CORS, etc.)
│   ├── src/
│   │   ├── api/              ← Content Types: articles + categories
│   │   ├── admin/            ← Personalización del panel admin
│   │   └── index.ts          ← Bootstrap: configura permisos públicos al iniciar
│   └── database/
│       └── migrations/       ← Migraciones auto-generadas por Strapi
│
└── docs/                     ← Documentación técnica del backend
    ├── herramientas.md       ← Índice de todas las herramientas
    ├── strapi-para-desarrolladores.md
    ├── docker.md
    ├── mariadb.md
    ├── wasabi-s3.md
    ├── meilisearch.md
    ├── despliegue.md
    ├── troubleshooting.md
    ├── maintenance.md        ← Operaciones DevOps del día a día
    └── strapi-for-dummies.md ← Guía para editores de contenido
```

---

## Quick start — Desarrollo

### 1. Copia y configura las variables de entorno

```bash
# Desde backend/
cp .env.example .env
```

Edita `.env` y rellena los valores requeridos. Como mínimo necesitas:
- Passwords de la base de datos
- Secrets de Strapi (genera con el comando de abajo)
- `MEILISEARCH_MASTER_KEY`

Genera los secrets de Strapi:
```bash
# APP_KEYS — mínimo 2, separadas por coma
node -e "const c=require('crypto'); console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"

# El resto (uno por variable)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Levanta los servicios

```bash
# Primera vez — construye las imágenes y arranca
docker compose up --build

# Arrancas posteriores — imágenes ya construidas
docker compose up -d
```

Espera hasta que todos los servicios estén `healthy` (puede tardar ~60 segundos la primera vez mientras MariaDB inicializa).

### 3. Crea el superadministrador de Strapi

Solo en el **primer arranque**. Abre en el navegador:

```
http://localhost:1337/admin
```

Strapi mostrará un formulario de registro. Crea tu cuenta de administrador.

### 4. Agrega el locale inglés

```
Panel admin → Settings → Internationalization → Add a locale → English (en)
```

Esto solo se hace una vez y es necesario para crear contenido bilingüe.

### 5. Verifica los permisos de la API pública

El bootstrap de Strapi los configura automáticamente al arrancar. Para verificar:

```bash
curl http://localhost:1337/api/documentation-categories
# Debe retornar: {"data":[], "meta":{...}}  — sin error 403
```

Si retorna `403`, ejecuta: `docker compose restart strapi`

---

## Servicios y URLs (desarrollo)

| Servicio | URL | Descripción |
|---|---|---|
| Strapi Admin | `http://localhost:1337/admin` | Panel de administración |
| Strapi REST API | `http://localhost:1337/api` | API pública |
| Strapi health | `http://localhost:1337/_health` | Healthcheck |
| Meilisearch | `http://localhost:7700` | Motor de búsqueda |
| Frontend | `http://localhost:5173` | SvelteKit (si está levantado) |
| MariaDB | no expuesto al host | Solo accesible internamente |

> Para acceder a MariaDB desde un cliente externo (DBeaver, TablePlus), ver `docs/mariadb.md`.

---

## Comandos útiles

```bash
# Estado de los contenedores
docker compose ps

# Logs en tiempo real
docker compose logs -f
docker compose logs -f strapi

# Reiniciar un servicio
docker compose restart strapi

# Detener todo (sin borrar datos)
docker compose down

# Shell dentro de Strapi
docker compose exec strapi sh

# Shell MySQL
docker compose exec mariadb mysql -u strapi -p strapi_docs
```

---

## Producción

Para desplegar en producción se usan los archivos Docker Compose en conjunto:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Las diferencias clave con desarrollo:
- Strapi usa el stage `production` del Dockerfile (sin hot-reload, imagen compilada)
- No hay bind mounts — la imagen es la fuente de verdad
- `NODE_ENV=production`
- Meilisearch en modo `production`

Ver `docs/despliegue.md` para la guía completa de primer despliegue a producción.

---

## Documentación

| Documento | Audiencia | Contenido |
|---|---|---|
| [herramientas.md](./docs/herramientas.md) | Todos | Índice de herramientas con versiones y justificación |
| [strapi-para-desarrolladores.md](./docs/strapi-para-desarrolladores.md) | Desarrolladores | Content Types, config, bootstrap, CLI |
| [strapi-for-dummies.md](./docs/strapi-for-dummies.md) | Editores de contenido | Cómo usar el panel admin para gestionar documentación |
| [docker.md](./docs/docker.md) | Desarrolladores / DevOps | Docker Compose, Dockerfile, redes, volúmenes |
| [mariadb.md](./docs/mariadb.md) | Desarrolladores / DevOps | Configuración, backups, acceso, migraciones |
| [wasabi-s3.md](./docs/wasabi-s3.md) | Desarrolladores / DevOps | Setup del bucket, políticas, variables de entorno |
| [meilisearch.md](./docs/meilisearch.md) | Desarrolladores | Setup actual (Phase 1) y roadmap (Phase 2) |
| [despliegue.md](./docs/despliegue.md) | DevOps | Guía paso a paso para producción |
| [maintenance.md](./docs/maintenance.md) | DevOps / SRE | Operaciones del día a día, backups, actualizaciones |
| [troubleshooting.md](./docs/troubleshooting.md) | Todos | Resolución de problemas comunes |
| [cms/README.md](./cms/README.md) | Desarrolladores | Referencia rápida de la API REST y el Content Type |
