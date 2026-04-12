# Docker y Docker Compose — Backend

Cómo está containerizado el backend, qué hace cada pieza, y cómo trabajar con Docker en el día a día.

---

## Tabla de contenidos

1. [¿Qué es Docker?](#1-qué-es-docker)
2. [¿Qué es Docker Compose?](#2-qué-es-docker-compose)
3. [Archivos del proyecto](#3-archivos-del-proyecto)
4. [docker-compose.yml explicado](#4-docker-composeyml-explicado)
5. [docker-compose.prod.yml — overrides de producción](#5-docker-composeprodyml--overrides-de-producción)
6. [Dockerfile del CMS explicado](#6-dockerfile-del-cms-explicado)
7. [Redes y volúmenes](#7-redes-y-volúmenes)
8. [Comandos de referencia](#8-comandos-de-referencia)
9. [Override local para desarrollo](#9-override-local-para-desarrollo)
10. [Variables de entorno y Docker Compose](#10-variables-de-entorno-y-docker-compose)

---

## 1. ¿Qué es Docker?

Docker empaqueta una aplicación y todas sus dependencias en una **imagen** — una instantánea inmutable del sistema de archivos. Al ejecutar la imagen se crea un **contenedor**, que es un proceso aislado del resto del sistema operativo.

El beneficio principal: el contenedor que desarrollas en tu laptop se comporta exactamente igual en el servidor de producción, porque lleva su propio sistema operativo, runtime, y dependencias.

```
Tu código  +  Node.js  +  Alpine Linux  =  Imagen Docker
                                           └─ Contenedor (en tu laptop)
                                           └─ Contenedor (en producción)
```

---

## 2. ¿Qué es Docker Compose?

Docker Compose orquesta **múltiples contenedores** que necesitan trabajar juntos. En lugar de arrancar y configurar cada contenedor manualmente, defines todo en un archivo YAML y lo levantas con un solo comando.

El backend necesita cuatro servicios trabajando en conjunto:
- MariaDB (base de datos)
- Strapi (CMS — necesita que MariaDB esté lista primero)
- Meilisearch (motor de búsqueda)
- Frontend SvelteKit (necesita que Strapi esté listo)

Docker Compose gestiona el orden de arranque, la comunicación entre servicios, y la persistencia de datos.

---

## 3. Archivos del proyecto

```
backend/
├── docker-compose.yml          ← Configuración base (desarrollo + plantilla producción)
├── docker-compose.prod.yml     ← Overrides para producción
├── .env                        ← Variables de entorno (git-ignored)
├── .env.example                ← Plantilla de variables (commiteado)
└── cms/
    └── Dockerfile              ← Build multi-stage para Strapi
```

---

## 4. docker-compose.yml explicado

```yaml
services:

  # ─── MariaDB ────────────────────────────────────────
  mariadb:
    image: mariadb:10.11        # versión fija para reproducibilidad
    restart: unless-stopped     # reinicia al reiniciar el host, no si se detiene manualmente
    environment:
      MYSQL_ROOT_PASSWORD: ${DATABASE_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DATABASE_NAME}
      MYSQL_USER: ${DATABASE_USERNAME}
      MYSQL_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - mariadb_data:/var/lib/mysql   # datos persistentes en volume nombrado
    networks:
      - doc-network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s               # espera 30s antes de empezar a verificar
```

> MariaDB **no expone ningún puerto al host** (`ports:` no está configurado). Esto es intencional: solo `strapi` puede conectarse a la base de datos dentro de la red `doc-network`. Ver `docs/mariadb.md` para cómo acceder desde clientes externos.

```yaml
  # ─── Strapi CMS ──────────────────────────────────────
  strapi:
    build:
      context: ./cms
      target: development       # usa el stage 'development' del Dockerfile
    volumes:
      - ./cms:/app              # bind mount: cambios en src/ se reflejan al instante
      - cms_node_modules:/app/node_modules  # volume nombrado: evita conflictos Windows/Linux
    ports:
      - "1337:1337"             # expone al host para acceso directo en desarrollo
    environment:
      NODE_ENV: development
      DATABASE_HOST: mariadb    # nombre del servicio = hostname interno
      # ... resto de variables desde .env
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:1337/_health || exit 1"]
      start_period: 90s         # Strapi necesita tiempo para compilar TypeScript en dev
    depends_on:
      mariadb:
        condition: service_healthy   # no arranca hasta que MariaDB esté healthy
```

> El bind mount `./cms:/app` permite hot-reload en desarrollo: cualquier cambio en el código fuente se refleja en el contenedor sin reconstruir la imagen.

```yaml
  # ─── Meilisearch ─────────────────────────────────────
  meilisearch:
    image: getmeili/meilisearch:v1.12
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
      MEILI_ENV: ${MEILI_ENV:-development}   # :-development = valor por defecto
    volumes:
      - meilisearch_data:/meili_data

  # ─── Frontend SvelteKit ──────────────────────────────
  frontend:
    build:
      context: ../frontend
      args:
        VITE_STRAPI_URL: ${VITE_STRAPI_URL:-http://localhost:1337}
    ports:
      - "5173:3000"     # host:5173 → contenedor:3000
    depends_on:
      strapi:
        condition: service_healthy
```

> La variable `VITE_STRAPI_URL` se **hornea** en el bundle del frontend en tiempo de build. Ver `docs/wasabi-s3.md` para implicaciones en producción.

---

## 5. docker-compose.prod.yml — overrides de producción

Este archivo **no reemplaza** `docker-compose.yml`, lo **extiende** con cambios específicos para producción:

```yaml
services:
  strapi:
    build:
      target: production       # usa el stage compilado, sin hot-reload
    volumes:
      - type: volume
        source: cms_uploads    # uploads van a Wasabi; solo se monta si hay subidas locales
        target: /app/public/uploads
    environment:
      NODE_ENV: production     # desactiva logs verbosos, optimiza rendimiento

  meilisearch:
    environment:
      MEILI_ENV: production    # habilita seguridad adicional, deshabilita /health sin auth

volumes:
  cms_uploads:                 # volume para uploads locales en producción (si Wasabi no está)
```

**Diferencias clave desarrollo vs. producción:**

| Aspecto | Desarrollo | Producción |
|---|---|---|
| Strapi stage | `development` (hot-reload) | `production` (compilado) |
| Bind mount `./cms` | Sí (hot-reload) | No (imagen es fuente de verdad) |
| `NODE_ENV` | `development` | `production` |
| `MEILI_ENV` | `development` | `production` |
| Start period healthcheck | 90s | 60s (ya compilado) |

**Comando de producción:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 6. Dockerfile del CMS explicado

El Dockerfile usa **tres stages** para optimizar el tamaño de la imagen final:

```dockerfile
# ─── Stage 1: Development ──────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci                    # instala TODAS las dependencias (incluyendo dev)
COPY . .
EXPOSE 1337
CMD ["npm", "run", "develop"] # hot-reload con TypeScript en tiempo real
```

El stage `development` se usa en `docker-compose.yml` para desarrollo local. Incluye devDependencies, TypeScript compiler, etc.

```dockerfile
# ─── Stage 2: Builder ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build             # compila TypeScript → dist/ y construye el admin panel
```

El stage `builder` no se usa directamente — es un paso intermedio que produce los artefactos compilados.

```dockerfile
# ─── Stage 3: Production ───────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Solo copia lo necesario del stage builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --omit=dev         # instala SOLO dependencias de producción

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.strapi ./.strapi
COPY --from=builder /app/public ./public
COPY --from=builder /app/favicon.png ./

EXPOSE 1337
CMD ["npm", "run", "start"]   # ejecuta el servidor compilado
```

**¿Por qué multi-stage?**

La imagen final (`production`) no incluye:
- DevDependencies (TypeScript, tipos, herramientas de desarrollo)
- Código fuente TypeScript (solo el JavaScript compilado en `dist/`)
- Cache de npm

Resultado: imagen ~40% más pequeña y sin herramientas que no se necesitan en producción.

**¿Por qué `node:20-alpine`?**
- Node 20 es el mínimo requerido por Strapi v5
- Alpine es una distribución Linux mínima (~5 MB vs ~100 MB de Debian)
- La imagen final del stage `production` queda en ~150–200 MB

**¿Por qué `npm ci` en lugar de `npm install`?**
- `npm ci` instala exactamente lo que está en `package-lock.json` (reproducible)
- `npm install` puede actualizar versiones menores sin avisar
- En entornos de CI/CD y Docker, siempre se usa `npm ci`

---

## 7. Redes y volúmenes

### Red: `doc-network`

Todos los servicios comparten la red `doc-network` (tipo `bridge`). Dentro de esta red, los servicios se comunican por su nombre de servicio como hostname:

```
strapi → DATABASE_HOST=mariadb     # resuelve al contenedor mariadb
strapi → MEILISEARCH_HOST=http://meilisearch:7700
```

MariaDB no expone puertos al host (`ports:` no configurado) → solo accesible dentro de `doc-network`.

### Volúmenes nombrados

```
mariadb_data       → /var/lib/mysql       (datos de MariaDB)
meilisearch_data   → /meili_data          (índices de Meilisearch)
cms_node_modules   → /app/node_modules    (binarios Linux de Node)
cms_uploads        → /app/public/uploads  (uploads locales — solo en producción)
```

**¿Por qué `cms_node_modules` es un volume nombrado?**

En Windows, los módulos de Node se compilan para Windows. Si se bind-monta `./cms` dentro del contenedor Linux, los binarios de Windows no funcionan. La solución es mantener `node_modules` en un volume nombrado gestionado por Docker, donde los módulos se compilan para Linux dentro del contenedor.

```
./cms (tu código — bind mount)
     └── src/, config/, package.json, etc.  ← tuyo, en Windows

cms_node_modules (volume Docker — Linux)
     └── node_modules/                       ← compilado para Linux dentro del contenedor
```

---

## 8. Comandos de referencia

### Ciclo de vida básico

```bash
# Primera vez / después de cambiar Dockerfile o package.json
docker compose up --build

# Arranque normal
docker compose up -d

# Detener (datos se conservan)
docker compose down

# Detener Y eliminar volúmenes (⚠️ destruye la DB y los índices)
docker compose down -v
```

### Ver estado y logs

```bash
docker compose ps                    # estado de todos los contenedores
docker compose logs -f               # logs en tiempo real
docker compose logs -f strapi        # solo Strapi
docker compose logs --tail=50 strapi # últimas 50 líneas
```

### Reconstruir un servicio específico

```bash
docker compose build strapi          # reconstruye solo la imagen de Strapi
docker compose up -d strapi          # actualiza el contenedor con la nueva imagen
```

### Ejecutar comandos dentro de contenedores

```bash
docker compose exec strapi sh        # shell en Strapi
docker compose exec strapi npm run strapi ts:generate-types
docker compose exec mariadb bash     # shell en MariaDB
docker compose exec mariadb mysql -u strapi -p strapi_docs
```

### Monitoreo de recursos

```bash
docker stats                         # CPU, RAM, red, disco por contenedor
docker system df -v                  # espacio usado por imágenes, contenedores, volúmenes
```

---

## 9. Override local para desarrollo

Para hacer ajustes locales sin modificar el `docker-compose.yml` commiteado (por ejemplo, exponer el puerto de MariaDB), crea un archivo `docker-compose.override.yml`:

```yaml
# backend/docker-compose.override.yml
# ⚠️ No committear — está en .gitignore
services:
  mariadb:
    ports:
      - "3306:3306"    # expone MariaDB al host para clientes externos
```

Docker Compose lo aplica automáticamente junto con `docker-compose.yml`.

> Elimina `docker-compose.override.yml` cuando no lo necesites — tener MariaDB expuesto al host es un riesgo de seguridad en producción.

---

## 10. Variables de entorno y Docker Compose

Docker Compose lee automáticamente el archivo `.env` del directorio donde se ejecuta el comando (`backend/.env`).

**¿Cómo funciona la interpolación?**

```yaml
# docker-compose.yml
environment:
  DATABASE_PASSWORD: ${DATABASE_PASSWORD}  # se reemplaza con el valor de .env
  WASABI_REGION: ${WASABI_REGION:-us-east-1}  # valor por defecto si no está en .env
```

**No confundas:**
- `backend/.env` → leído por Docker Compose para interpolar `${VARIABLE}` en el YAML
- `backend/cms/.env` → leído por Node.js dentro del contenedor de Strapi (para desarrollo local sin Docker)

En Docker, las variables llegan a Strapi vía la sección `environment:` del servicio, no via el archivo `.env` del directorio `cms/`.
