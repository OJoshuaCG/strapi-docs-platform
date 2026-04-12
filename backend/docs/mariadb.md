# MariaDB — Base de datos

MariaDB es el motor de base de datos relacional que usa Strapi para almacenar todo el contenido gestionado en el CMS.

---

## Tabla de contenidos

1. [¿Qué es MariaDB?](#1-qué-es-mariadb)
2. [Por qué MariaDB en este proyecto](#2-por-qué-mariadb-en-este-proyecto)
3. [Cómo Strapi se conecta a MariaDB](#3-cómo-strapi-se-conecta-a-mariadb)
4. [Configuración de la conexión](#4-configuración-de-la-conexión)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Qué almacena MariaDB](#6-qué-almacena-mariadb)
7. [Migraciones automáticas](#7-migraciones-automáticas)
8. [Backup y restore](#8-backup-y-restore)
9. [Acceso desde clientes externos](#9-acceso-desde-clientes-externos)
10. [Healthcheck](#10-healthcheck)

---

## 1. ¿Qué es MariaDB?

MariaDB es un sistema de gestión de bases de datos relacional (RDBMS) **compatible con MySQL**. Fue creado como un fork de MySQL en 2009 por el fundador original de MySQL, con el objetivo de mantenerlo completamente open-source.

Usa el mismo protocolo de red, el mismo driver (`mysql2`), y la misma sintaxis SQL que MySQL. Para una aplicación como Strapi, son intercambiables.

---

## 2. Por qué MariaDB en este proyecto

- **Compatible con MySQL**: el driver `mysql2` de Node.js funciona sin cambios.
- **Menor overhead de memoria**: consume menos RAM que PostgreSQL para bases de datos pequeñas-medianas.
- **Imagen Docker oficial estable**: `mariadb:10.11` es una versión LTS.
- **InnoDB como motor por defecto**: soporte de transacciones, claves foráneas y recuperación ante fallos.

La alternativa más obvia sería PostgreSQL. Strapi soporta ambos; la elección en este proyecto es de simplicidad y familiaridad.

---

## 3. Cómo Strapi se conecta a MariaDB

Strapi usa **Knex.js** como query builder. Knex abstrae la diferencia entre MySQL, PostgreSQL y SQLite — el mismo código de Strapi funciona con cualquiera de los tres.

El driver de Node.js es `mysql2` (más rápido y moderno que `mysql`).

```
Strapi (Knex.js)
    → mysql2 driver
        → MariaDB :3306
```

La configuración completa está en `cms/config/database.ts`.

---

## 4. Configuración de la conexión

```typescript
// cms/config/database.ts (fragmento mysql2)
{
  connection: {
    host: env('DATABASE_HOST', 'localhost'),     // 'mariadb' en Docker
    port: env.int('DATABASE_PORT', 3306),
    database: env('DATABASE_NAME', 'strapi'),
    user: env('DATABASE_USERNAME', 'strapi'),
    password: env('DATABASE_PASSWORD', 'strapi'),
    ssl: env.bool('DATABASE_SSL', false) && { ... },
  },
  pool: {
    min: env.int('DATABASE_POOL_MIN', 2),        // mínimo 2 conexiones siempre abiertas
    max: env.int('DATABASE_POOL_MAX', 10),       // máximo 10 conexiones simultáneas
  },
  acquireConnectionTimeout: 60000,               // 60s para obtener una conexión del pool
}
```

**Pool de conexiones:** Knex mantiene un pool de conexiones abiertas para no pagar el costo de establecer una nueva conexión TCP en cada query. Con `min: 2` siempre hay 2 conexiones listas; si hay carga alta puede crecer hasta 10.

**SSL/TLS:** Deshabilitado por defecto (`DATABASE_SSL=false`). Si el servidor de MariaDB es externo al entorno Docker (por ejemplo, un servicio gestionado en la nube), configura SSL con las variables `DATABASE_SSL_KEY`, `DATABASE_SSL_CERT`, `DATABASE_SSL_CA`.

---

## 5. Variables de entorno

| Variable | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|
| `DATABASE_CLIENT` | Sí | Driver de Knex | `mysql2` |
| `DATABASE_HOST` | Sí | Hostname del servidor | `mariadb` (Docker) / `127.0.0.1` (local) |
| `DATABASE_PORT` | No | Puerto | `3306` |
| `DATABASE_NAME` | Sí | Nombre de la base de datos | `strapi_docs` |
| `DATABASE_USERNAME` | Sí | Usuario de Strapi | `strapi` |
| `DATABASE_PASSWORD` | Sí | Password del usuario | — |
| `DATABASE_ROOT_PASSWORD` | Sí* | Password del usuario root | — |
| `DATABASE_SSL` | No | Activar TLS | `false` |
| `DATABASE_POOL_MIN` | No | Mínimo de conexiones | `2` |
| `DATABASE_POOL_MAX` | No | Máximo de conexiones | `10` |

> `*` `DATABASE_ROOT_PASSWORD` es requerida por la imagen Docker de MariaDB para inicializar el motor. Strapi no usa el usuario root; usa el usuario `strapi` con acceso solo a `strapi_docs`.

**Diferencia entre usuarios:**
- `root` — acceso total al servidor MariaDB (solo para administración/backups)
- `strapi` — acceso solo a la base de datos `strapi_docs` (principio de mínimo privilegio)

---

## 6. Qué almacena MariaDB

Strapi crea y gestiona su propio esquema de base de datos. Nunca modifiques las tablas directamente — usa el panel admin o las migraciones.

**Tablas principales generadas por Strapi:**

| Grupo | Tablas | Descripción |
|---|---|---|
| Contenido | `documentation_articles`, `documentation_categories` | Registros de los Content Types |
| i18n | `*_localizations` | Relaciones entre locales del mismo contenido |
| Draft/Publish | `*_document_state` | Estado draft/published de cada entrada |
| Usuarios | `up_users`, `up_roles`, `up_permissions` | Usuarios del plugin users-permissions |
| Admin | `admin_users`, `admin_roles` | Usuarios del panel de administración |
| API Tokens | `strapi_api_tokens` | Tokens de API creados en Settings |
| Archivos | `files`, `files_related_morphs` | Metadatos de la Media Library |
| Config interna | `strapi_core_store_settings`, `strapi_migrations` | Estado interno de Strapi |

**Lo que NO está en MariaDB:**
- Archivos de imagen/PDF — esos van a Wasabi S3
- Índices de búsqueda — esos van a Meilisearch

---

## 7. Migraciones automáticas

Strapi genera y ejecuta **sus propias migraciones** al iniciar, cuando detecta cambios en los Content Types.

```
backend/cms/database/migrations/
└── 0001_xxxxxxxxxx.ts    ← auto-generado por Strapi
```

**Regla de oro: nunca edites los archivos de migración generados por Strapi.**

Si necesitas una migración de datos personalizada (por ejemplo, transformar valores de un campo):

```typescript
// backend/cms/database/migrations/0002_mi-migracion-custom.ts
export async function up(knex) {
  await knex('documentation_articles')
    .where({ version: null })
    .update({ version: '1.0.0' });
}

export async function down(knex) {
  await knex('documentation_articles')
    .where({ version: '1.0.0' })
    .update({ version: null });
}
```

Strapi ejecuta automáticamente las migraciones pendientes al iniciar el servidor.

---

## 8. Backup y restore

### Backup manual

```bash
# Desde backend/ (requiere que Docker Compose esté levantado)
docker compose exec mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > backups/strapi_docs_$(date +%Y%m%d_%H%M%S).sql
```

> Crea el directorio `backend/backups/` si no existe. Está en `.gitignore`.

### Backup automático (cron diario)

```bash
# /etc/cron.d/strapi-backup
0 3 * * * cd /ruta/a/backend && \
  docker compose exec -T mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > backups/strapi_docs_$(date +\%Y\%m\%d).sql
```

La flag `-T` es necesaria en cron para deshabilitar la pseudo-TTY.

### Restore

```bash
docker compose exec -T mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  < backups/strapi_docs_20250101_030000.sql
```

> Siempre haz un backup antes de un restore, de actualizar Strapi, o de modificar un Content Type.

### Verificar integridad

```bash
docker compose exec mariadb \
  mysqlcheck -u strapi -p"${DATABASE_PASSWORD}" --check strapi_docs
```

---

## 9. Acceso desde clientes externos

MariaDB no expone puertos al host deliberadamente (sin `ports:` en `docker-compose.yml`). Para conectar desde herramientas como DBeaver, TablePlus o MySQL Workbench:

### Opción A — Override temporal (recomendado para desarrollo)

Crea `backend/docker-compose.override.yml` (está en `.gitignore`):

```yaml
services:
  mariadb:
    ports:
      - "3306:3306"
```

```bash
docker compose up -d   # el override se aplica automáticamente
```

Datos de conexión:
- Host: `127.0.0.1` / Puerto: `3306`
- Usuario: `strapi` / Password: `${DATABASE_PASSWORD}` del `.env`
- Base de datos: `strapi_docs`

> Elimina el override cuando termines. Nunca uses este override en producción.

### Opción B — Comando puntual via socat

Para un acceso one-shot sin modificar la configuración:

```bash
docker run --rm -d \
  --network backend_doc-network \
  -p 3306:3306 \
  alpine/socat TCP-LISTEN:3306,fork,reuseaddr TCP:mariadb:3306
```

Esto crea un proxy temporal hacia el contenedor MariaDB.

---

## 10. Healthcheck

El healthcheck de MariaDB en Docker Compose usa el script oficial de MariaDB:

```yaml
healthcheck:
  test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

- `--connect` verifica que MariaDB acepta conexiones TCP
- `--innodb_initialized` verifica que el motor InnoDB terminó de inicializarse

Strapi solo arranca (`depends_on: condition: service_healthy`) cuando este healthcheck pasa. Esto evita errores de "Cannot connect to database" al arrancar el stack completo.

**¿Cuánto tarda en estar healthy?**
- Primera vez: ~30–45 segundos (inicialización del sistema de archivos InnoDB)
- Reinicios posteriores: ~5–10 segundos
