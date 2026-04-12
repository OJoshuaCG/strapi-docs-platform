# Despliegue en producción

Guía completa para llevar el sistema a un servidor de producción usando Docker Compose y nginx como reverse proxy.

---

## Tabla de contenidos

1. [Requisitos del servidor](#requisitos-del-servidor)
2. [Estructura de servicios](#estructura-de-servicios)
3. [Docker Compose](#docker-compose)
4. [Variables de entorno de producción](#variables-de-entorno-de-producción)
5. [Configuración de nginx](#configuración-de-nginx)
6. [Primer arranque](#primer-arranque)
7. [Operaciones del día a día](#operaciones-del-día-a-día)
8. [HTTPS con Let's Encrypt](#https-con-lets-encrypt)
9. [Resolución de problemas](#resolución-de-problemas)

---

## Requisitos del servidor

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 vCPUs |
| RAM | 2 GB (4 GB recomendado) |
| Disco | 20 GB SSD |
| Sistema operativo | Ubuntu 22.04 LTS o Debian 12 |
| Software | Docker Engine 24+, Docker Compose v2+ |

**Instalar Docker en Ubuntu:**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que el grupo surta efecto
docker --version
docker compose version
```

---

## Estructura de servicios

```
docker-compose.yml
├── nginx          ← Reverse proxy, SSL, punto de entrada público
├── frontend       ← SvelteKit SSR (Node 22)
├── strapi         ← CMS + Admin panel (Node 22)
└── mariadb        ← Base de datos
```

Wasabi no es un contenedor — es un servicio externo en la nube.  
Meilisearch se agrega en la Fase 2.

---

## Docker Compose

Crea el archivo `docker-compose.yml` en el directorio raíz del proyecto (fuera de `frontend/` y `backend/`):

```yaml
# docker-compose.yml
version: "3.9"

services:

  # ─── Reverse proxy ───────────────────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro   # Certificados SSL
    depends_on:
      - frontend
      - strapi
    networks:
      - public

  # ─── Frontend ────────────────────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        # VITE_STRAPI_URL es la URL que el NAVEGADOR usará para llamar a Strapi
        # Con nginx en el mismo dominio, puede ser relativo o usar el dominio
        VITE_STRAPI_URL: https://tudominio.com
    restart: unless-stopped
    environment:
      PORT: 3000
    networks:
      - public
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ─── CMS Strapi ──────────────────────────────────────────────────────────────
  strapi:
    build:
      context: ./backend/cms
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 1337
      APP_KEYS: ${APP_KEYS}
      API_TOKEN_SALT: ${API_TOKEN_SALT}
      ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      TRANSFER_TOKEN_SALT: ${TRANSFER_TOKEN_SALT}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      DATABASE_CLIENT: mysql
      DATABASE_HOST: mariadb
      DATABASE_PORT: 3306
      DATABASE_NAME: ${DATABASE_NAME}
      DATABASE_USERNAME: ${DATABASE_USERNAME}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      WASABI_ACCESS_KEY: ${WASABI_ACCESS_KEY}
      WASABI_SECRET_KEY: ${WASABI_SECRET_KEY}
      WASABI_BUCKET: ${WASABI_BUCKET}
      WASABI_REGION: ${WASABI_REGION}
      FRONTEND_URL: https://tudominio.com
    depends_on:
      mariadb:
        condition: service_healthy
    networks:
      - public
      - internal
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:1337/_health"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ─── Base de datos ───────────────────────────────────────────────────────────
  mariadb:
    image: mariadb:10.11
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${DATABASE_ROOT_PASSWORD}
      MARIADB_DATABASE: ${DATABASE_NAME}
      MARIADB_USER: ${DATABASE_USERNAME}
      MARIADB_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - mariadb_data:/var/lib/mysql
    networks:
      - internal
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  mariadb_data:

networks:
  public:     # nginx, frontend, strapi
  internal:   # solo strapi y mariadb (no expuesto)
```

---

## Variables de entorno de producción

Crea el archivo `.env` en el mismo directorio que `docker-compose.yml`:

```env
# ─── Base de datos ────────────────────────────────────────────────────────────
DATABASE_ROOT_PASSWORD=GeneraUnPasswordSeguro123!
DATABASE_NAME=strapi_docs
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=OtroPasswordSeguro456!

# ─── Strapi secrets ───────────────────────────────────────────────────────────
# Genera cada uno con: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_KEYS=clave1base64==,clave2base64==,clave3base64==,clave4base64==
API_TOKEN_SALT=saltBase64==
ADMIN_JWT_SECRET=secretBase64==
JWT_SECRET=otroSecretBase64==
TRANSFER_TOKEN_SALT=saltTransferBase64==
ENCRYPTION_KEY=encryptionBase64==

# ─── Wasabi S3 ────────────────────────────────────────────────────────────────
WASABI_ACCESS_KEY=tu-access-key-de-wasabi
WASABI_SECRET_KEY=tu-secret-key-de-wasabi
WASABI_BUCKET=nombre-de-tu-bucket
WASABI_REGION=us-east-1
```

**Generar secrets seguros:**

```bash
# Para APP_KEYS necesitas 4 valores separados por coma
node -e "
  const crypto = require('crypto');
  const keys = Array.from({length: 4}, () => crypto.randomBytes(32).toString('base64'));
  console.log(keys.join(','));
"

# Para el resto (uno a la vez)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Nunca subas `.env` a git.** Verifica que `.env` esté en `.gitignore`.

---

## Configuración de nginx

Crea la carpeta `nginx/` y el archivo de configuración:

```bash
mkdir -p nginx
```

```nginx
# nginx/nginx.conf

events {
  worker_connections 1024;
}

http {
  # ─── Configuración base ──────────────────────────────────────────────────────
  sendfile on;
  tcp_nopush on;
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml;

  # ─── Upstream services ───────────────────────────────────────────────────────
  upstream frontend {
    server frontend:3000;
  }

  upstream strapi {
    server strapi:1337;
  }

  # ─── Redirección HTTP → HTTPS ─────────────────────────────────────────────────
  server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    return 301 https://$host$request_uri;
  }

  # ─── Servidor HTTPS principal ─────────────────────────────────────────────────
  server {
    listen 443 ssl;
    server_name tudominio.com www.tudominio.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Strapi admin panel
    location /admin {
      proxy_pass http://strapi;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strapi REST API
    location /api {
      proxy_pass http://strapi;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strapi uploads y assets (si se sirven localmente)
    location /uploads {
      proxy_pass http://strapi;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
    }

    # Frontend SvelteKit — todo lo demás
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
}
```

---

## Primer arranque

### 1. Construir y arrancar los contenedores

```bash
# Desde el directorio raíz del proyecto
docker compose up -d --build

# Ver los logs de todos los servicios
docker compose logs -f

# Ver el estado de los contenedores
docker compose ps
```

Espera a que todos los servicios estén `healthy`. MariaDB tarda ~30 segundos en estar lista.

### 2. Crear el superadministrador de Strapi

**Solo en el primer arranque.** Abre en tu navegador:

```
http://tudominio.com/admin
```

Si el servidor aún no tiene HTTPS configurado, usa la IP directamente:
```
http://IP_DEL_SERVIDOR:1337/admin
```

Strapi mostrará el formulario de registro del primer administrador. Completa:
- **First name** y **Last name**
- **Email** — será tu usuario para entrar al panel
- **Password** — mínimo 8 caracteres, incluye mayúscula, minúscula y número

### 3. Agregar el idioma inglés

1. En el panel de Strapi, ve a **Settings → Internationalization**
2. Haz clic en **"+ Add new locale"**
3. Busca y selecciona **"English (en)"**
4. Haz clic en **"Save"**

### 4. Verificar permisos del API público

El backend tiene un script de bootstrap que configura automáticamente los permisos públicos al arrancar. Para verificar que funcionó:

```bash
# Desde el servidor
curl http://localhost:1337/api/documentation-categories
# Debe retornar JSON con data: []  (vacío, pero sin error 401/403)
```

Si retorna un error `403 Forbidden`, ejecuta el bootstrap manualmente:

```bash
docker compose restart strapi
```

---

## Operaciones del día a día

### Detener todos los servicios

```bash
docker compose down
```

### Reiniciar un servicio específico

```bash
docker compose restart strapi
docker compose restart frontend
docker compose restart nginx
```

### Ver logs en tiempo real

```bash
docker compose logs -f              # Todos los servicios
docker compose logs -f strapi       # Solo Strapi
docker compose logs -f frontend     # Solo el frontend
```

### Actualizar el frontend (nuevo build)

```bash
# Reconstruir solo el frontend con el código nuevo
docker compose up -d --build frontend
```

### Actualizar Strapi

```bash
docker compose up -d --build strapi
```

### Backup de la base de datos

```bash
# Exportar
docker compose exec mariadb mysqldump \
  -u root -p${DATABASE_ROOT_PASSWORD} \
  strapi_docs > backup_$(date +%Y%m%d).sql

# Importar
docker compose exec -T mariadb mysql \
  -u root -p${DATABASE_ROOT_PASSWORD} \
  strapi_docs < backup_20250101.sql
```

---

## HTTPS con Let's Encrypt

Para obtener certificados SSL gratuitos con Certbot:

```bash
# Instalar Certbot en el servidor (fuera de Docker)
sudo apt install certbot

# Parar nginx temporalmente para liberar el puerto 80
docker compose stop nginx

# Obtener el certificado
sudo certbot certonly --standalone \
  -d tudominio.com \
  -d www.tudominio.com

# Copiar los certificados a la carpeta nginx
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem nginx/certs/
sudo chmod 644 nginx/certs/*.pem

# Arrancar nginx nuevamente
docker compose start nginx
```

**Renovación automática:**

Los certificados de Let's Encrypt expiran cada 90 días. Agrega una tarea cron:

```bash
sudo crontab -e
# Agregar esta línea:
0 0 1 * * docker compose -f /ruta/al/proyecto/docker-compose.yml stop nginx && certbot renew && cp /etc/letsencrypt/live/tudominio.com/*.pem /ruta/al/proyecto/nginx/certs/ && docker compose -f /ruta/al/proyecto/docker-compose.yml start nginx
```

---

## Resolución de problemas

### El frontend no arranca / error 502

```bash
# Ver los logs del frontend
docker compose logs frontend

# Verificar que el contenedor esté corriendo
docker compose ps

# Reconstruir si hay errores de build
docker compose up -d --build frontend
```

### Strapi no conecta con la base de datos

```bash
# Verificar que MariaDB esté healthy
docker compose ps mariadb

# Ver los logs de MariaDB
docker compose logs mariadb

# Ver los logs de Strapi
docker compose logs strapi
# Buscar errores como: "Connection refused" o "Access denied"
```

### El panel admin de Strapi no carga

Verifica que nginx esté redirigiendo `/admin` al contenedor correcto:

```bash
docker compose logs nginx
# Buscar errores de conexión a "strapi:1337"
```

### Las imágenes no cargan

Verifica las credenciales de Wasabi en el archivo `.env` y reinicia Strapi:

```bash
docker compose restart strapi
```

Revisa los logs buscando errores relacionados con S3 o Wasabi.

### Cambios del frontend no aparecen después de un `--build`

Las variables `VITE_*` se hornean en el build. Verifica que estés pasando las variables de entorno correctas como `args` en `docker-compose.yml`:

```yaml
frontend:
  build:
    args:
      VITE_STRAPI_URL: https://tudominio.com
```

Luego reconstruye: `docker compose up -d --build frontend`.
