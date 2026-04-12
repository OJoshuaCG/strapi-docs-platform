# Guía de Mantenimiento — CMS

> Audiencia: DevOps / SRE / administrador del sistema.
> Cubre operaciones del día a día, backups, actualizaciones, y resolución de problemas.

---

## Tabla de contenidos

1. [Arquitectura de servicios](#1-arquitectura-de-servicios)
2. [Operaciones Docker Compose](#2-operaciones-docker-compose)
3. [Base de datos — MariaDB](#3-base-de-datos--mariadb)
4. [Almacenamiento — Wasabi S3](#4-almacenamiento--wasabi-s3)
5. [Meilisearch](#5-meilisearch)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Actualizar Strapi](#7-actualizar-strapi)
8. [Logs y monitoreo](#8-logs-y-monitoreo)
9. [Troubleshooting](#9-troubleshooting)
10. [Seguridad](#10-seguridad)

---

## 1. Arquitectura de servicios

```
┌─────────────────────────────────────────────────────┐
│                    doc-network                      │
│                                                     │
│   ┌──────────┐     ┌──────────┐   ┌─────────────┐  │
│   │ mariadb  │────▶│  strapi  │   │ meilisearch │  │
│   │  :3306   │     │  :1337   │   │   :7700     │  │
│   └──────────┘     └──────────┘   └─────────────┘  │
│   (sin puerto        (host:1337)    (host:7700)     │
│    expuesto)                                        │
└─────────────────────────────────────────────────────┘
```

| Servicio      | Imagen              | Puerto host | Datos persistentes       |
|---------------|---------------------|-------------|--------------------------|
| `mariadb`     | mariadb:10.11       | ninguno     | volume `mariadb_data`    |
| `strapi`      | build ./cms         | 1337        | bind mount `./cms` + volume `cms_node_modules` |
| `meilisearch` | getmeili/meilisearch:v1.12 | 7700 | volume `meilisearch_data` |

> **MariaDB no expone puertos al host deliberadamente.** Solo `strapi` puede conectarse a la DB dentro de la red interna. Para acceso directo desde el host, ver sección [3.4 Acceso directo a la DB](#34-acceso-directo-a-la-db).

### Volumes nombrados

```
mariadb_data      → datos de MariaDB (/var/lib/mysql)
meilisearch_data  → índices de Meilisearch (/meili_data)
cms_node_modules  → node_modules Linux del contenedor Strapi
```

---

## 2. Operaciones Docker Compose

Todos los comandos se ejecutan desde `backend/`.

### Arrancar servicios

```bash
# Primera vez o después de cambiar el Dockerfile / package.json
docker compose up --build

# Arranque normal (imagen ya construida)
docker compose up -d

# Solo un servicio específico
docker compose up -d mariadb
```

### Detener servicios

```bash
# Detiene contenedores (datos persistentes se conservan)
docker compose down

# Detiene Y elimina volumes (⚠️ destruye toda la DB y los índices)
docker compose down -v
```

### Reconstruir la imagen de Strapi

Necesario cuando cambias `package.json`, el `Dockerfile`, o archivos de configuración que se copian en tiempo de build.

```bash
docker compose build strapi
docker compose up -d strapi
```

### Ver estado de contenedores

```bash
docker compose ps
```

### Ejecutar un comando dentro de un contenedor

```bash
# Shell en Strapi
docker compose exec strapi sh

# Shell en MariaDB
docker compose exec mariadb bash

# Shell con mysql
docker compose exec mariadb mysql -u strapi -p strapi_docs
```

### Reiniciar un servicio sin downtime

```bash
docker compose restart strapi
```

---

## 3. Base de datos — MariaDB

### 3.1 Backup

> Realizar backups antes de cualquier actualización de Strapi o migración de contenido.

```bash
# Backup completo (ejecutar desde la raíz del proyecto o backend/)
docker compose exec mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > "backups/strapi_docs_$(date +%Y%m%d_%H%M%S).sql"
```

Para automatizar (cron diario):

```bash
# /etc/cron.d/strapi-backup
0 3 * * * cd /ruta/a/backend && \
  docker compose exec -T mariadb \
  mysqldump -u strapi -p"TU_PASSWORD" strapi_docs \
  > backups/strapi_docs_$(date +%Y%m%d).sql
```

> **Nota:** La flag `-T` es necesaria en cron para evitar la asignación de pseudo-TTY.

### 3.2 Restore

```bash
# Restore desde un archivo .sql
docker compose exec -T mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  < backups/strapi_docs_20240101_030000.sql
```

### 3.3 Verificar integridad

```bash
docker compose exec mariadb \
  mysqlcheck -u strapi -p"${DATABASE_PASSWORD}" --check strapi_docs
```

### 3.4 Acceso directo a la DB

MariaDB no expone puerto al host. Para conectarte desde un cliente externo (DBeaver, TablePlus, etc.) existen dos opciones:

**Opción A — Forward de puerto temporal (solo cuando lo necesites)**

```bash
# Abre un túnel temporal sin modificar el Compose
docker compose exec -p 3306:3306 mariadb true 2>/dev/null || \
  docker run --rm -it --network backend_doc-network \
    -p 3306:3306 alpine/socat TCP-LISTEN:3306,fork,reuseaddr TCP:mariadb:3306
```

**Opción B — override de Compose para desarrollo (no commitear)**

Crea `docker-compose.override.yml` en `backend/` (ya está en `.gitignore`):

```yaml
services:
  mariadb:
    ports:
      - "3306:3306"
```

```bash
docker compose up -d  # el override se aplica automáticamente
```

> Elimina `docker-compose.override.yml` cuando termines.

### 3.5 Migraciones

Strapi genera y ejecuta sus propias migraciones al iniciar cuando detecta cambios en los content types. Los archivos de migración se guardan en `backend/cms/database/migrations/`.

Nunca modifiques estos archivos manualmente. Si necesitas una migración de datos personalizada:

```typescript
// backend/cms/database/migrations/0001_mi_migracion.ts
export async function up(knex) {
  // lógica de migración
}

export async function down(knex) {
  // rollback
}
```

---

## 4. Almacenamiento — Wasabi S3

### 4.1 Crear el bucket

1. Entra a [console.wasabisys.com](https://console.wasabisys.com)
2. Crea un bucket con el nombre definido en `WASABI_BUCKET`
3. Región: debe coincidir con `WASABI_REGION` (ej: `us-east-1`)
4. **No habilites acceso público al bucket** — configura la política debajo

### 4.2 Política del bucket (acceso público a uploads)

Para que las imágenes sean accesibles desde el frontend:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE_DE_TU_BUCKET/cms/*"
    }
  ]
}
```

Reemplaza `NOMBRE_DE_TU_BUCKET` con el valor de `WASABI_BUCKET`.
El prefijo `/cms/*` coincide con `WASABI_UPLOAD_PREFIX=cms`.

### 4.3 CORS del bucket (si el frontend sube directamente)

Si el frontend alguna vez sube archivos directamente al bucket (presigned URLs), configura CORS:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://tu-dominio.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 4.4 Rotar credenciales de Wasabi

1. Crea nuevas access keys en la consola de Wasabi
2. Actualiza `WASABI_ACCESS_KEY` y `WASABI_SECRET_KEY` en `backend/.env`
3. Reinicia Strapi: `docker compose restart strapi`
4. Verifica que las subidas funcionan antes de eliminar las keys viejas

---

## 5. Meilisearch

> La integración con Strapi es Phase 2. Esta sección cubre la administración básica del servicio.

### 5.1 Acceso a la API

```
http://localhost:7700
```

Requiere el header `Authorization: Bearer TU_MASTER_KEY` para operaciones admin.

```bash
# Health check (sin autenticación)
curl http://localhost:7700/health

# Listar índices
curl -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  http://localhost:7700/indexes
```

### 5.2 Rotar la master key

1. Actualiza `MEILISEARCH_MASTER_KEY` en `backend/.env`
2. Reinicia el servicio: `docker compose restart meilisearch`
3. Actualiza cualquier cliente que use la key anterior

> Cambiar la master key invalida todos los API keys derivados de ella.

### 5.3 Backup de índices

Los datos de Meilisearch están en el volume `meilisearch_data`. Para un backup:

```bash
docker compose exec meilisearch \
  curl -X POST "http://localhost:7700/snapshots" \
  -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}"
```

El snapshot queda en `/meili_data/snapshots/` dentro del volume.

---

## 6. Variables de entorno

Archivo: `backend/.env` (nunca commitear, ya está en `.gitignore`).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_ROOT_PASSWORD` | Sí | Password del usuario root de MariaDB |
| `DATABASE_NAME` | Sí | Nombre de la base de datos |
| `DATABASE_USERNAME` | Sí | Usuario de MariaDB para Strapi |
| `DATABASE_PASSWORD` | Sí | Password del usuario de Strapi |
| `APP_KEYS` | Sí | 2+ strings base64 separados por coma |
| `API_TOKEN_SALT` | Sí | Salt para tokens de API |
| `ADMIN_JWT_SECRET` | Sí | Secret para JWT del panel admin |
| `JWT_SECRET` | Sí | Secret para JWT de usuarios (plugin users-permissions) |
| `TRANSFER_TOKEN_SALT` | Sí | Salt para tokens de transferencia de datos |
| `ENCRYPTION_KEY` | Sí | Clave de cifrado de campos sensibles |
| `FRONTEND_URL` | Sí | Origin permitido en CORS (sin wildcard) |
| `WASABI_ACCESS_KEY` | No* | Access key de Wasabi |
| `WASABI_SECRET_KEY` | No* | Secret key de Wasabi |
| `WASABI_BUCKET` | No* | Nombre del bucket |
| `WASABI_REGION` | No* | Región de Wasabi (default: us-east-1) |
| `WASABI_ENDPOINT` | No* | Endpoint de Wasabi |
| `WASABI_UPLOAD_PREFIX` | No | Prefijo en el bucket (default: cms) |
| `MEILISEARCH_MASTER_KEY` | Sí | Master key de Meilisearch |

> `*` Si Wasabi no está configurado, los uploads van a `backend/cms/public/uploads/` (disco local).

### Regenerar secrets de Strapi

```bash
# APP_KEYS (mínimo 2, separadas por coma)
node -e "const c=require('crypto'); \
  console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"

# Cualquier otro secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Después de cambiar cualquier secret, reinicia Strapi:
```bash
docker compose restart strapi
```

> **Advertencia:** Cambiar `APP_KEYS` o `ADMIN_JWT_SECRET` invalida todas las sesiones activas del admin panel.

---

## 7. Actualizar Strapi

> Siempre haz backup de la DB antes de actualizar.

### 7.1 Proceso de actualización

```bash
# 1. Backup
docker compose exec -T mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > backups/pre-update_$(date +%Y%m%d).sql

# 2. Actualiza la versión en package.json
# Edita backend/cms/package.json:
# "@strapi/strapi": "5.X.Y"  ← nueva versión
# "@strapi/plugin-users-permissions": "5.X.Y"
# "@strapi/provider-upload-aws-s3": "5.X.Y"

# 3. Reconstruye la imagen
docker compose build strapi

# 4. Arranca (Strapi ejecuta migraciones automáticamente al iniciar)
docker compose up -d strapi

# 5. Verifica logs
docker compose logs -f strapi
```

### 7.2 Verificar compatibilidad

Antes de actualizar, revisa el [changelog oficial de Strapi v5](https://github.com/strapi/strapi/releases) para breaking changes en tu rango de versión.

### 7.3 Rollback

Si algo falla:

```bash
# 1. Detener Strapi
docker compose stop strapi

# 2. Restaurar la DB
docker compose exec -T mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  < backups/pre-update_20240101.sql

# 3. Revertir package.json a la versión anterior y reconstruir
docker compose build strapi
docker compose up -d strapi
```

---

## 8. Logs y monitoreo

### Ver logs en tiempo real

```bash
# Todos los servicios
docker compose logs -f

# Solo Strapi
docker compose logs -f strapi

# Solo MariaDB (errores de conexión, queries lentas)
docker compose logs -f mariadb

# Últimas N líneas
docker compose logs --tail=100 strapi
```

### Niveles de log de Strapi

Strapi usa la variable `NODE_ENV` para determinar el nivel de log:
- `development` → logs verbosos (query SQL, peticiones HTTP)
- `production` → solo errores y warnings

Para debug puntual en producción, añade temporalmente a `docker-compose.yml`:
```yaml
environment:
  NODE_ENV: development
```

### Métricas básicas

```bash
# Uso de CPU/memoria por contenedor
docker stats

# Espacio en disco de volumes
docker system df -v
```

---

## 9. Troubleshooting

### Strapi no arranca — "Cannot connect to database"

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Causa probable:** MariaDB aún no está lista (el healthcheck no ha pasado).

**Verificar:**
```bash
docker compose ps  # ¿mariadb aparece como "healthy"?
docker compose logs mariadb
```

**Solución:** Esperar o reiniciar: `docker compose restart strapi`

---

### Strapi no arranca — "Unknown database client"

```
Error: Unknown database client 'undefined'
```

**Causa probable:** La variable `DATABASE_CLIENT` no está definida en el entorno.

**Verificar:**
```bash
docker compose exec strapi env | grep DATABASE_CLIENT
```

**Solución:** Asegurarse de que `backend/.env` existe y tiene `DATABASE_CLIENT=mysql2`. Docker Compose lee `.env` automáticamente si está en el mismo directorio.

---

### Uploads no llegan a Wasabi

**Verificar que las variables de Wasabi están presentes:**
```bash
docker compose exec strapi env | grep WASABI
```

**Verificar en logs de Strapi** errores de tipo `AccessDenied` o `NoSuchBucket`:
```bash
docker compose logs strapi | grep -i "wasabi\|s3\|upload\|error"
```

**Causas comunes:**
- `WASABI_BUCKET` no existe en la región `WASABI_REGION`
- Access key sin permisos de escritura en el bucket
- `WASABI_ENDPOINT` incorrecto para la región del bucket

---

### El panel admin carga en blanco

**Causa probable:** Admin panel no fue compilado.

```bash
# Compilar dentro del contenedor
docker compose exec strapi npm run build
docker compose restart strapi
```

---

### Volumen cms_node_modules desactualizado

Ocurre cuando actualizas `package.json` pero no reconstruyes la imagen.

```bash
# Eliminar el volume y reconstruir
docker compose down
docker volume rm backend_cms_node_modules
docker compose up --build
```

---

### MariaDB ocupa demasiado espacio

```bash
# Ver tamaño de las tablas
docker compose exec mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  -e "SELECT table_name, ROUND(data_length/1024/1024,2) AS 'MB' \
      FROM information_schema.tables \
      WHERE table_schema='strapi_docs' ORDER BY data_length DESC;"
```

---

## 10. Seguridad

### Principios aplicados en este setup

- `mariadb` no expone puertos al host — accesible solo dentro de `doc-network`
- CORS configurado con origen explícito (`FRONTEND_URL`), sin wildcard `*`
- Todos los secrets en `backend/.env` (fuera del control de versiones)
- Credenciales de DB separadas: usuario `strapi` (acceso a `strapi_docs` únicamente), usuario `root` (solo para administración)

### Checklist de despliegue a producción

- [ ] Cambiar todos los secrets en `.env` (no usar los valores de desarrollo)
- [ ] `NODE_ENV=production` en el servicio `strapi`
- [ ] Cambiar `target: development` a `target: production` en `docker-compose.yml`
- [ ] Configurar Wasabi con bucket policy de lectura pública solo para `/cms/*`
- [ ] Habilitar HTTPS en el proxy inverso (Nginx/Caddy) que esté frente a Strapi
- [ ] Configurar `FRONTEND_URL` con la URL real del frontend
- [ ] Revisar permisos de la API (Settings → Roles → Public) — solo GET habilitado por defecto
- [ ] Habilitar logs de query lenta en MariaDB para monitorear performance
- [ ] Definir política de backups automáticos con retención

### Rotar todos los secrets (procedimiento de emergencia)

Si sospechas que algún secret fue expuesto:

1. Genera nuevos valores para todas las variables de Strapi
2. Actualiza `backend/.env`
3. `docker compose restart strapi`
4. Todos los usuarios deberán volver a iniciar sesión en el panel admin
5. Regenera los API tokens desde Settings → API Tokens
