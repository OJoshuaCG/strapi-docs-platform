# Despliegue en producción — Backend

Guía completa para llevar el backend a un servidor de producción por primera vez.

> Esta guía cubre **solo el backend** (Strapi + MariaDB + Meilisearch). Para el stack completo incluyendo nginx + frontend, ver `frontend/docs/despliegue.md`.

---

## Tabla de contenidos

1. [Requisitos del servidor](#1-requisitos-del-servidor)
2. [Instalar Docker en el servidor](#2-instalar-docker-en-el-servidor)
3. [Desplegar el repositorio](#3-desplegar-el-repositorio)
4. [Configurar variables de entorno de producción](#4-configurar-variables-de-entorno-de-producción)
5. [Primer arranque](#5-primer-arranque)
6. [Configuración inicial de Strapi](#6-configuración-inicial-de-strapi)
7. [Configurar Wasabi para producción](#7-configurar-wasabi-para-producción)
8. [Exponer Strapi de forma segura](#8-exponer-strapi-de-forma-segura)
9. [Verificación final](#9-verificación-final)
10. [Checklist de producción](#10-checklist-de-producción)
11. [Actualizar el sistema](#11-actualizar-el-sistema)

---

## 1. Requisitos del servidor

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 vCPUs |
| RAM | 2 GB (4 GB recomendado para el stack completo) |
| Disco | 20 GB SSD |
| Sistema operativo | Ubuntu 22.04 LTS o Debian 12 |
| Software | Docker Engine 24+, Docker Compose v2+ |

---

## 2. Instalar Docker en el servidor

```bash
# Instalar Docker Engine (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# Agregar tu usuario al grupo docker (evita usar sudo en cada comando)
sudo usermod -aG docker $USER

# Cerrar sesión y volver a entrar para que el cambio surta efecto
exit
# (vuelve a conectarte por SSH)

# Verificar instalación
docker --version
docker compose version
```

---

## 3. Desplegar el repositorio

```bash
# Clona el repositorio en el servidor
git clone https://github.com/tu-usuario/strapi-documentation-project.git /srv/docs-project

# Ve al directorio backend
cd /srv/docs-project/backend
```

---

## 4. Configurar variables de entorno de producción

```bash
cp .env.example .env
nano .env   # o el editor que prefieras
```

### Generar todos los secrets de Strapi

```bash
# APP_KEYS (mínimo 2, separadas por coma)
node -e "const c=require('crypto'); console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"

# El resto (ejecutar una vez por variable)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Valores de producción a configurar

```env
# ─── Base de datos ────────────────────────────────────────────────────────────
DATABASE_ROOT_PASSWORD=   # password fuerte para root, ej: genera con openssl rand -base64 24
DATABASE_NAME=strapi_docs
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=        # password fuerte para el usuario strapi

# ─── Strapi secrets (genera cada uno con el comando de arriba) ────────────────
APP_KEYS=clave1base64==,clave2base64==
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
JWT_SECRET=
TRANSFER_TOKEN_SALT=
ENCRYPTION_KEY=

# ─── CORS — URL del frontend en producción ────────────────────────────────────
FRONTEND_URL=https://tudominio.com

# ─── Wasabi ───────────────────────────────────────────────────────────────────
WASABI_ACCESS_KEY=
WASABI_SECRET_KEY=
WASABI_BUCKET=nombre-de-tu-bucket
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_UPLOAD_PREFIX=cms

# ─── URL de Strapi accesible desde el navegador ──────────────────────────────
VITE_STRAPI_URL=https://tudominio.com   # si nginx está frente a Strapi

# ─── Meilisearch ─────────────────────────────────────────────────────────────
MEILISEARCH_MASTER_KEY=   # genera con: openssl rand -base64 32
MEILI_ENV=production
```

> **Nunca subas `.env` a git.** Verifica que `.env` aparece en `.gitignore` (ya está configurado).

---

## 5. Primer arranque

Usa los archivos Compose en conjunto para producción:

```bash
# Construir imágenes y arrancar (primera vez)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Ver el estado de los contenedores
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

**Secuencia de arranque esperada:**

1. MariaDB inicia y se inicializa (~30 segundos para estar `healthy`)
2. Strapi arranca, conecta a MariaDB, ejecuta migraciones, construye el admin panel
3. Strapi pasa a estado `healthy` (puede tardar 60–90 segundos)
4. Frontend arranca (si está incluido en el compose)

Espera hasta que todos los servicios muestren `(healthy)` en `docker compose ps`.

### Alias para comodidad

Para no escribir los dos archivos Compose en cada comando, crea un alias en el servidor:

```bash
# ~/.bashrc o ~/.zshrc
alias dc-prod="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Uso
dc-prod ps
dc-prod logs -f strapi
dc-prod restart strapi
```

---

## 6. Configuración inicial de Strapi

Estos pasos se hacen **solo una vez** en el primer despliegue.

### 6.1 Crear el superadministrador

Accede al panel admin. En producción, Strapi no está expuesto directamente — accede a través del proxy inverso o temporalmente por SSH tunnel:

```bash
# SSH tunnel temporal (si Strapi no está expuesto públicamente aún)
ssh -L 1337:localhost:1337 usuario@IP-DEL-SERVIDOR
```

Luego abre en tu navegador local: `http://localhost:1337/admin`

Si Strapi ya está detrás de nginx: `https://tudominio.com/admin`

Completa el formulario de registro:
- First name, Last name
- Email — será tu usuario para siempre
- Password — mínimo 8 caracteres, incluye mayúsculas, minúsculas y números

### 6.2 Agregar el locale inglés

```
Settings → Internationalization → Add a locale → English (en) → Save
```

Este paso habilita la creación de contenido en inglés.

### 6.3 Verificar permisos de la API pública

El bootstrap configura automáticamente los permisos al arrancar. Verifica desde el servidor:

```bash
curl http://localhost:1337/api/documentation-categories
# Debe retornar: {"data":[],"meta":{"pagination":{"page":1,"pageSize":25,"pageCount":0,"total":0}}}
```

Si retorna `403 Forbidden`:
```bash
docker compose restart strapi
```

El bootstrap se vuelve a ejecutar al reiniciar y corrige los permisos.

### 6.4 Crear un API Token para el frontend (opcional)

Si el frontend necesita acceso autenticado (por ejemplo, para previsualizar borradores):

```
Settings → API Tokens → Create new API Token
  Name: Frontend Production
  Type: Read-only
  Duration: Unlimited
```

Copia el token generado — solo se muestra una vez. Configúralo como variable de entorno en el frontend.

---

## 7. Configurar Wasabi para producción

### Crear las credenciales

1. En [console.wasabisys.com](https://console.wasabisys.com) → **Access Keys** → **Create New Access Key**
2. Copia los valores en `WASABI_ACCESS_KEY` y `WASABI_SECRET_KEY` del `.env`

### Configurar la política del bucket

En Wasabi → tu bucket → **Policies** → **Bucket Policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE-DEL-BUCKET/cms/*"
    }
  ]
}
```

Reemplaza `NOMBRE-DEL-BUCKET` con el valor de `WASABI_BUCKET`.

### Verificar uploads

```bash
# Desde el panel admin, sube una imagen en Media Library
# Verifica que aparece con una URL del tipo:
# https://s3.wasabisys.com/BUCKET/cms/imagen.png
```

---

## 8. Exponer Strapi de forma segura

En producción, Strapi **no debe estar expuesto directamente** en el puerto 1337. Usa un reverse proxy (nginx o Caddy) que:
- Maneje HTTPS (certificados SSL)
- Dirija `/admin` y `/api` a Strapi
- Dirija `/` al frontend

### Opción A — nginx (ejemplo mínimo)

```nginx
server {
  listen 443 ssl;
  server_name tudominio.com;

  ssl_certificate     /etc/letsencrypt/live/tudominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

  # Strapi admin panel
  location /admin {
    proxy_pass http://localhost:1337;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Strapi REST API
  location /api {
    proxy_pass http://localhost:1337;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### HTTPS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado (nginx debe estar corriendo)
sudo certbot --nginx -d tudominio.com

# La renovación automática se configura sola via systemd timer
sudo systemctl status certbot.timer
```

> Para la configuración nginx completa (incluyendo frontend), ver `frontend/docs/despliegue.md`.

---

## 9. Verificación final

Lista de verificaciones antes de dar el servicio por desplegado:

```bash
# 1. Todos los contenedores healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 2. API pública responde
curl https://tudominio.com/api/documentation-categories
# → {"data":[],...}

# 3. Panel admin accesible
curl -I https://tudominio.com/admin
# → HTTP/2 200

# 4. Health check de Strapi
curl https://tudominio.com/_health
# → {"status":"healthy"} o similar

# 5. Uploads funcionan
# Sube una imagen en Media Library y verifica que la URL de Wasabi es accesible
```

---

## 10. Checklist de producción

- [ ] Todos los secrets en `.env` son valores únicos y seguros (no los del `.env.example`)
- [ ] `NODE_ENV=production` (se aplica via `docker-compose.prod.yml`)
- [ ] `MEILI_ENV=production`
- [ ] `FRONTEND_URL` tiene la URL real del frontend (para CORS)
- [ ] Wasabi configurado: bucket creado, credenciales válidas, bucket policy aplicada
- [ ] Superadministrador de Strapi creado
- [ ] Locale `en` agregado en Settings → Internationalization
- [ ] Permisos de API pública verificados (GET de articles y categories sin auth)
- [ ] HTTPS habilitado en el reverse proxy
- [ ] MariaDB no expone puertos al host en producción (sin `ports:` en docker-compose.yml para mariadb)
- [ ] Meilisearch no expuesto al público (o protegido con nginx si se necesita acceso)
- [ ] Política de backups automáticos definida (ver `maintenance.md`)
- [ ] Logs configurados para retención adecuada

---

## 11. Actualizar el sistema

### Actualizar Strapi

```bash
# 1. Backup de la DB
docker compose exec -T mariadb \
  mysqldump -u strapi -p"${DATABASE_PASSWORD}" strapi_docs \
  > backups/pre-update_$(date +%Y%m%d).sql

# 2. Actualizar versión en package.json
# Edita backend/cms/package.json — cambia "5.X.Y" a la nueva versión
# en @strapi/strapi, @strapi/plugin-users-permissions, @strapi/provider-upload-aws-s3

# 3. Reconstruir y aplicar migraciones
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build strapi

# 4. Verificar
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  logs -f strapi
```

### Desplegar cambios en el código

Si modificas el schema de un Content Type, los middlewares, o cualquier archivo fuente:

```bash
# En el servidor, desde backend/
git pull

docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build strapi
```

Strapi detecta cambios en los schemas y ejecuta las migraciones automáticamente al arrancar.
