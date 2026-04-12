# Troubleshooting — Backend

Guía de resolución de problemas organizados por categoría. Para cada problema se indica: síntoma, causa probable, diagnóstico y solución.

> Para operaciones del día a día (backups, actualizaciones, logs), ver `maintenance.md`.

---

## Tabla de contenidos

1. [Comandos de diagnóstico rápido](#1-comandos-de-diagnóstico-rápido)
2. [Problemas de base de datos](#2-problemas-de-base-de-datos)
3. [Problemas de arranque de Strapi](#3-problemas-de-arranque-de-strapi)
4. [Problemas del panel admin](#4-problemas-del-panel-admin)
5. [Problemas de la API REST](#5-problemas-de-la-api-rest)
6. [Problemas de uploads / Wasabi](#6-problemas-de-uploads--wasabi)
7. [Problemas de Docker / contenedores](#7-problemas-de-docker--contenedores)
8. [Problemas de Meilisearch](#8-problemas-de-meilisearch)
9. [Problemas de permisos y CORS](#9-problemas-de-permisos-y-cors)
10. [Problemas en producción](#10-problemas-en-producción)

---

## 1. Comandos de diagnóstico rápido

Antes de investigar un problema específico, ejecuta estos comandos para tener una visión general:

```bash
# Estado de todos los contenedores
docker compose ps

# Logs de todos los servicios (últimas 50 líneas)
docker compose logs --tail=50

# Logs específicos (en tiempo real)
docker compose logs -f strapi
docker compose logs -f mariadb
docker compose logs -f meilisearch

# Variables de entorno que recibe Strapi
docker compose exec strapi env | sort

# Recursos de CPU/memoria
docker stats --no-stream

# Espacio en disco
docker system df -v
```

---

## 2. Problemas de base de datos

### "Cannot connect to database" / "ECONNREFUSED"

**Síntoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
Error: getaddrinfo ENOTFOUND mariadb
```

**Causa probable:** MariaDB aún no está lista, o Strapi intenta conectarse antes de que el healthcheck pase.

**Diagnóstico:**
```bash
docker compose ps
# Verifica que mariadb aparece como "healthy", no "starting" o "unhealthy"

docker compose logs mariadb
# Busca mensajes como "ready for connections" al final
```

**Solución:**
```bash
# Si mariadb está healthy pero Strapi falló antes de que lo estuviera:
docker compose restart strapi

# Si mariadb no está healthy, espera o reiníciala:
docker compose restart mariadb
# Espera ~30 segundos, luego:
docker compose restart strapi
```

---

### "Unknown database client 'undefined'"

**Síntoma:**
```
Error: Unknown database client 'undefined'
```

**Causa:** La variable `DATABASE_CLIENT` no está llegando a Strapi.

**Diagnóstico:**
```bash
docker compose exec strapi env | grep DATABASE_CLIENT
# Si no aparece nada, el .env no se está leyendo correctamente
```

**Solución:**
1. Verifica que `backend/.env` existe: `ls -la backend/.env`
2. Verifica que `DATABASE_CLIENT=mysql2` está en el archivo
3. Reinicia: `docker compose up -d --force-recreate strapi`

---

### "Access denied for user 'strapi'"

**Síntoma:**
```
Error: Access denied for user 'strapi'@'...' (using password: YES)
```

**Causa:** Password incorrecto en `DATABASE_PASSWORD`, o el usuario `strapi` no existe con ese password en MariaDB.

**Diagnóstico:**
```bash
# Intenta conectarte manualmente
docker compose exec mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs -e "SELECT 1"
```

**Solución:** Si el password cambió después del primer arranque, MariaDB ya tiene el password viejo. Necesitas resetearlo:

```bash
docker compose exec mariadb \
  mysql -u root -p"${DATABASE_ROOT_PASSWORD}" -e \
  "ALTER USER 'strapi'@'%' IDENTIFIED BY 'NuevoPassword';"
```

Luego actualiza `DATABASE_PASSWORD` en `.env` y reinicia.

---

### MariaDB ocupa demasiado espacio en disco

**Diagnóstico:**
```bash
# Ver tamaño de tablas
docker compose exec mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  -e "SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'MB' \
      FROM information_schema.tables \
      WHERE table_schema='strapi_docs' \
      ORDER BY data_length DESC;"

# Espacio total del volume
docker system df -v | grep mariadb_data
```

**Solución común:** Las tablas de historial de Strapi pueden crecer con el tiempo. Limpia los borradores no necesarios desde el panel admin.

---

## 3. Problemas de arranque de Strapi

### Strapi tarda mucho en arrancar

**Causa en modo desarrollo:** Strapi compila TypeScript en caliente. En el primer arranque o después de cambios, puede tardar **2–3 minutos**.

El healthcheck tiene `start_period: 90s` — no considera el servicio como fallido hasta después de ese tiempo.

**Diagnóstico:**
```bash
docker compose logs -f strapi
# Espera hasta ver: "Strapi is running"
```

**En producción** (stage `production`): el código ya está compilado, el arranque debe ser <30 segundos. Si tarda más, verifica la conexión a MariaDB.

---

### "Cannot find module" / errores de import

**Síntoma:**
```
Error: Cannot find module '@strapi/strapi'
```

**Causa probable:** El volume `cms_node_modules` está desactualizado (se instalaron dependencias nuevas pero el volume viejo no tiene los módulos).

**Solución:**
```bash
docker compose down
docker volume rm backend_cms_node_modules
docker compose up --build
```

---

### Error de migración al arrancar

**Síntoma:**
```
Error running migration: ...
```

**Causa probable:** Migraciones fallidas por cambios inconsistentes en los schemas.

**Diagnóstico:**
```bash
docker compose logs strapi | grep -i "migrat"
```

**Solución (desarrollo):**
```bash
# Si puedes perder los datos de desarrollo:
docker compose down -v
docker compose up --build
```

**Solución (producción):**
1. Haz un backup de la DB
2. Revisa la migración fallida en `backend/cms/database/migrations/`
3. Si es un schema inconsistente, corrige el `schema.json` y reinicia

---

## 4. Problemas del panel admin

### El panel admin carga en blanco

**Causa probable A:** El admin panel no fue compilado.

```bash
docker compose exec strapi npm run build
docker compose restart strapi
```

**Causa probable B:** En modo producción, el stage del Dockerfile no compiló el panel.

```bash
# Verifica que se está usando el target correcto
docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep target
# Debe mostrar: target: production
```

---

### "JWT expired" / "Invalid token" al iniciar sesión

**Causa:** El `ADMIN_JWT_SECRET` cambió después de que se crearon las sesiones.

**Solución:** Esto es esperado — los usuarios deben volver a iniciar sesión. Si el problema persiste con credentials correctas:

```bash
docker compose exec strapi sh
# Dentro del contenedor:
npm run strapi console
# En la consola:
await strapi.db.query('admin::user').findMany({})
```

---

### Olvidé la contraseña del superadministrador

**Solución A:** Usa "Forgot your password?" en el panel (requiere servidor de email configurado).

**Solución B:** Reset directo en DB:

```bash
# Genera un hash bcrypt del nuevo password
docker compose exec strapi sh
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('NuevoPassword123!', 10, (err, hash) => console.log(hash));
"

# Actualiza en la DB (reemplaza el hash generado)
docker compose exec mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  -e "UPDATE admin_users SET password='HASH_GENERADO' WHERE email='tu@email.com';"
```

---

## 5. Problemas de la API REST

### `GET /api/documentation-articles` retorna `403 Forbidden`

**Causa:** Los permisos del rol Public no están configurados.

**Diagnóstico:**
```bash
curl -v http://localhost:1337/api/documentation-articles
# Verifica el código HTTP en la respuesta
```

**Solución A (automática):** Reinicia Strapi — el bootstrap reconfigura los permisos:
```bash
docker compose restart strapi
```

**Solución B (manual):**
```
Panel admin → Settings → Roles → Public
  Documentation Article → find: ✓, findOne: ✓
  Documentation Category → find: ✓, findOne: ✓
→ Save
```

---

### La API retorna `[]` (sin resultados) aunque hay contenido creado

**Causa más común:** El contenido está en estado **Draft**, no **Published**. La API pública solo retorna entradas publicadas.

**Verificación:** En el panel admin, el artículo debe mostrar el badge "Published" (verde), no "Draft".

**Verificación técnica:**
```bash
curl "http://localhost:1337/api/documentation-articles?status=published"
curl "http://localhost:1337/api/documentation-articles?status=draft"
# El segundo requiere autenticación (API token)
```

---

### Respuesta de la API tiene estructura inesperada (comparando con Strapi v4)

**Causa:** En Strapi v5 se eliminó el wrapper `attributes`. Los campos del objeto están directamente en el nivel raíz:

```json
// Strapi v4 (incorrecto para este proyecto)
{ "data": [{ "id": 1, "attributes": { "title": "..." } }] }

// Strapi v5 (correcto)
{ "data": [{ "id": 1, "documentId": "abc", "title": "..." }] }
```

El frontend está construido para la estructura v5. Si ves referencias a `.attributes` en el código del frontend, es un bug.

---

## 6. Problemas de uploads / Wasabi

### Las imágenes no cargan / URLs de Wasabi retornan 403 o 404

**Diagnóstico:**
```bash
# Verifica que las variables de Wasabi están configuradas
docker compose exec strapi env | grep WASABI

# Verifica logs de Strapi al hacer upload
docker compose logs strapi | grep -i "upload\|s3\|wasabi\|error" | tail -20
```

**Causas comunes:**

| Error | Causa | Solución |
|---|---|---|
| `AccessDenied` | Access key sin permisos, o bucket policy no configurada | Verifica permisos en la consola Wasabi |
| `NoSuchBucket` | `WASABI_BUCKET` no existe en `WASABI_REGION` | Crea el bucket o corrige la región |
| `PermanentRedirect` | `WASABI_ENDPOINT` no corresponde a la región del bucket | Usa el endpoint correcto para la región |
| `NetworkingError` | Sin conectividad al endpoint de Wasabi | Verifica conectividad: `curl https://s3.wasabisys.com` |
| URL retorna 403 | Bucket policy no permite acceso público | Configura la bucket policy (ver `wasabi-s3.md`) |

---

### Uploads van al disco local en lugar de Wasabi

**Causa:** Las variables de Wasabi están vacías en `.env`.

**Verificación:**
```bash
docker compose exec strapi env | grep "WASABI_ACCESS_KEY\|WASABI_BUCKET"
```

Si están vacías, Strapi usa el proveedor local por defecto. Configura las variables y reinicia.

---

## 7. Problemas de Docker / contenedores

### "port is already allocated" al arrancar

**Síntoma:**
```
Error: port is already allocated: 1337
```

**Causa:** Otro proceso (o contenedor) ya usa ese puerto.

**Diagnóstico:**
```bash
# En Linux
sudo ss -tulnp | grep 1337
# o
sudo lsof -i :1337
```

**Solución:**
```bash
# Encuentra y detén el proceso o contenedor que usa el puerto
docker ps | grep 1337
docker stop <nombre-del-contenedor>
```

---

### Contenedor sale inmediatamente con código de error

**Diagnóstico:**
```bash
# Ver los logs del último intento del contenedor
docker compose logs strapi
docker compose logs --no-log-prefix strapi 2>&1 | tail -30
```

El error generalmente está en las últimas líneas.

---

### "no space left on device"

**Diagnóstico:**
```bash
df -h
docker system df -v
```

**Solución:**
```bash
# Limpiar imágenes, contenedores y caché no usados
docker system prune -f

# Más agresivo (incluye volumes no usados — ⚠️ cuidado)
docker system prune --volumes -f
```

---

### Los cambios en el código no se reflejan en Docker

**En desarrollo** (con bind mount): los cambios deberían reflejarse automáticamente. Si no ocurre:
```bash
docker compose restart strapi
```

Si el problema persiste, reconstruye:
```bash
docker compose up --build strapi
```

**En producción** (sin bind mount): el código está en la imagen. Debes reconstruir:
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up --build strapi
```

---

## 8. Problemas de Meilisearch

### Meilisearch no acepta requests / retorna 401

**Causa:** En modo `production`, todos los endpoints requieren autenticación.

**Solución:**
```bash
curl -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  http://localhost:7700/health
```

---

### Pérdida de datos de Meilisearch

En Phase 1, los índices están vacíos — no hay pérdida funcional. En Phase 2 (cuando estén indexados los artículos):

1. Identifica si el volume `meilisearch_data` fue eliminado (`docker compose down -v`)
2. Reindexa todos los artículos desde Strapi (con el script de indexación que se creará en Phase 2)

---

## 9. Problemas de permisos y CORS

### El frontend recibe `CORS error` al llamar a la API

**Síntoma** (en el navegador):
```
Access to fetch at 'http://localhost:1337/api/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Causa:** `FRONTEND_URL` en `.env` no coincide exactamente con el origen del frontend.

**Diagnóstico:**
```bash
docker compose exec strapi env | grep FRONTEND_URL
```

**Solución:** El valor de `FRONTEND_URL` debe ser exactamente el origen del frontend (sin trailing slash):

```env
# Correcto
FRONTEND_URL=http://localhost:5173

# Incorrecto — no incluir trailing slash
FRONTEND_URL=http://localhost:5173/

# En producción
FRONTEND_URL=https://tudominio.com
```

Reinicia Strapi después de cambiar `FRONTEND_URL`.

---

### Las imágenes de Wasabi no cargan en el panel admin (Content Security Policy)

**Síntoma:** Las imágenes subidas a Wasabi se ven en el frontend pero no en el panel admin.

**Causa:** El endpoint de Wasabi no está en la Content Security Policy del admin.

**Verificación:**
```bash
# El endpoint debe estar en img-src y media-src en middlewares.ts
grep -A 20 "contentSecurityPolicy" cms/config/middlewares.ts
```

El `WASABI_ENDPOINT` debe coincidir exactamente. Si usas un endpoint de región diferente, actualiza:

```typescript
// config/middlewares.ts
'img-src': [
  "'self'", 'data:', 'blob:',
  'market-assets.strapi.io',
  env('WASABI_ENDPOINT', 'https://s3.wasabisys.com'),
  // Si usas región eu: 'https://s3.eu-central-1.wasabisys.com'
],
```

---

## 10. Problemas en producción

### Strapi en producción responde lento

**Diagnóstico:**
```bash
# Monitoreo en tiempo real
docker stats

# Logs de queries lentas (habilitar temporalmente)
docker compose exec strapi env | grep NODE_ENV
# Cambia a NODE_ENV=development para ver queries SQL completas
```

**Causas comunes:**
- Pool de conexiones exhausto (demasiadas requests simultáneas)
- Queries sin filtros que retornan miles de resultados
- MariaDB con poca RAM disponible

**Acciones:**
```bash
# Ver conexiones activas en MariaDB
docker compose exec mariadb \
  mysql -u strapi -p"${DATABASE_PASSWORD}" \
  -e "SHOW PROCESSLIST;"
```

---

### Strapi en producción se reinicia inesperadamente (OOM)

**Causa:** El proceso Node.js supera el límite de memoria disponible.

**Diagnóstico:**
```bash
docker inspect $(docker compose ps -q strapi) \
  | grep -i "oomkilled\|exitcode"
```

**Solución:** Aumenta la RAM del servidor o ajusta el límite del pool de conexiones en `database.ts`:

```env
DATABASE_POOL_MAX=5   # reduce conexiones simultáneas
```

---

### Certificado SSL expirado

**Síntoma:** Los navegadores muestran "NET::ERR_CERT_DATE_INVALID".

**Con Let's Encrypt (Certbot):**
```bash
# Verificar expiración
sudo certbot certificates

# Renovar manualmente
sudo certbot renew
sudo systemctl reload nginx
```

**Automatizar la renovación:**
```bash
sudo crontab -e
# Agregar:
0 0 1 * * certbot renew --quiet && systemctl reload nginx
```
