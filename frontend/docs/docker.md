# Docker y adapter-node

Documentación del proceso de compilación y despliegue del frontend en producción usando Docker y el adaptador Node.js de SvelteKit.

---

## Tabla de contenidos

1. [¿Por qué adapter-node?](#por-qué-adapter-node)
2. [Cómo funciona adapter-node](#cómo-funciona-adapter-node)
3. [Dockerfile explicado](#dockerfile-explicado)
4. [Build y ejecución manual](#build-y-ejecución-manual)
5. [Variables de entorno en Docker](#variables-de-entorno-en-docker)
6. [Puertos](#puertos)
7. [Limitaciones y consideraciones](#limitaciones-y-consideraciones)

---

## ¿Por qué adapter-node?

SvelteKit necesita un **adaptador** para saber a qué entorno de despliegue compilar. Los adaptadores disponibles son:

| Adaptador | Para |
|---|---|
| `adapter-node` | Servidor Node.js (VPS, Docker, cualquier servidor) |
| `adapter-vercel` | Plataforma Vercel |
| `adapter-netlify` | Plataforma Netlify |
| `adapter-static` | Archivos HTML estáticos (sin SSR) |
| `adapter-auto` | Detecta el entorno automáticamente |

Este proyecto usa `adapter-node` porque:
- Se despliega en un VPS/servidor propio dentro de un contenedor Docker
- Necesita SSR (el servidor genera HTML antes de enviarlo al navegador)
- Permite control total sobre la configuración del servidor

---

## Cómo funciona adapter-node

Cuando ejecutas `npm run build`, SvelteKit + adapter-node:

1. Compila todos los componentes `.svelte` a JavaScript
2. Genera el código de servidor SSR
3. Genera los assets del cliente (CSS, JS, imágenes con hash)
4. Produce un servidor Node.js standalone en la carpeta `build/`

La estructura de `build/` después de compilar:

```
build/
├── index.js              ← Punto de entrada del servidor Node.js
├── handler.js            ← Request handler (exportado para uso en Express/etc.)
├── env.js                ← Carga variables de entorno
├── client/               ← Assets servidos al navegador
│   └── _app/
│       ├── immutable/    ← JS/CSS con hash → cache forever en el CDN
│       └── version.json
└── server/               ← Código de servidor (SSR)
    └── chunks/
```

**Para ejecutar el servidor:**

```bash
node build/index.js
# Servidor escuchando en http://0.0.0.0:3000
```

No se necesita `node_modules` completo para ejecutar — solo las dependencias de producción (`--omit=dev`).

---

## Dockerfile explicado

El Dockerfile usa un **build multi-etapa** para separar el entorno de compilación del de producción. La imagen final es mucho más pequeña porque no incluye las devDependencies.

```dockerfile
# ═══════════════════════════════════════════════
# ETAPA 1: Build (compilar la aplicación)
# ═══════════════════════════════════════════════
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias primero
# (se cachea si package.json no cambia)
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar → genera la carpeta build/
RUN npm run build


# ═══════════════════════════════════════════════
# ETAPA 2: Producción (imagen final liviana)
# ═══════════════════════════════════════════════
FROM node:22-alpine

WORKDIR /app

# Copiar SOLO el build compilado de la etapa anterior
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev

# Puerto que expone el servidor
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["node", "build/index.js"]
```

**¿Por qué `node:22-alpine`?**
- Node 22 es requerido por `.npmrc` (`engine-strict=true`)
- `alpine` es una distribución Linux mínima (~5MB vs ~100MB de Debian)
- Resultado: imagen de producción muy pequeña (~80-100MB total)

**¿Por qué `npm ci` en lugar de `npm install`?**
- `npm ci` instala exactamente lo que está en `package-lock.json` (reproducible)
- `npm install` puede actualizar versiones menores (no determinista)
- En CI/CD, siempre usa `npm ci`

---

## Build y ejecución manual

```bash
# Construir la imagen Docker
docker build -t docs-frontend .

# Ver el tamaño de la imagen
docker images docs-frontend

# Ejecutar el contenedor
docker run \
  --name docs-frontend \
  -p 3000:3000 \
  -e VITE_STRAPI_URL=http://localhost:1337 \
  docs-frontend

# Ejecutar en segundo plano
docker run -d \
  --name docs-frontend \
  -p 3000:3000 \
  -e VITE_STRAPI_URL=http://strapi:1337 \
  docs-frontend

# Ver logs
docker logs docs-frontend
docker logs -f docs-frontend  # Modo follow (tiempo real)

# Detener y eliminar
docker stop docs-frontend
docker rm docs-frontend
```

---

## Variables de entorno en Docker

Las variables `VITE_*` tienen un comportamiento especial: **se hornean en el bundle durante el build**.

```typescript
// Código fuente
const url = import.meta.env.VITE_STRAPI_URL;

// Bundle producción (el valor queda literal en el JS)
const url = "http://mi-strapi.com";
```

**Consecuencia:** No puedes cambiar `VITE_STRAPI_URL` pasando `-e VITE_STRAPI_URL=otro-valor` al contenedor en runtime. El valor ya está fijo en el JavaScript compilado.

**¿Cómo cambiar la URL de Strapi en producción?**

Opción A — Recompilar con el valor correcto:
```bash
docker build \
  --build-arg VITE_STRAPI_URL=https://cms.tudominio.com \
  -t docs-frontend .
```

Configurar el `Dockerfile` para aceptar build args:
```dockerfile
ARG VITE_STRAPI_URL=http://localhost:1337
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL
```

Opción B — Reverse proxy (recomendada):  
Configura nginx para que tanto el frontend como el backend estén bajo el mismo dominio. Entonces `VITE_STRAPI_URL` puede ser una ruta relativa o el nombre del servicio de Docker. Ver [`despliegue.md`](./despliegue.md).

---

## Puertos

| Contexto | Puerto |
|---|---|
| Desarrollo (`npm run dev`) | `5173` |
| Producción (`node build/index.js`) | `3000` |
| Docker container | Expone `3000` |
| Con reverse proxy nginx | nginx en `80`/`443`, frontend en `3000` internamente |

El puerto del servidor de producción puede configurarse con la variable de entorno `PORT`:

```bash
docker run -e PORT=4000 -p 4000:4000 docs-frontend
```

---

## Limitaciones y consideraciones

### Variables `VITE_*` son públicas

Todo lo que pones en una variable `VITE_*` es visible en el JavaScript del navegador. **Nunca pongas secretos** (contraseñas, API keys privadas, tokens) en variables `VITE_*`.

```env
# ✅ Seguro en VITE_ — solo es la URL pública del API
VITE_STRAPI_URL=https://cms.tudominio.com

# ❌ NUNCA en VITE_ — sería visible en el bundle
VITE_DATABASE_PASSWORD=secreto123
VITE_STRIPE_SECRET_KEY=sk_live_...
```

### Sin sistema de archivos persistente

El contenedor Docker es efímero. No escribas archivos en el contenedor esperando que persistan. Los assets (imágenes, PDFs) van a Wasabi S3, no al servidor del frontend.

### Healthcheck

En producción con Docker Compose, agrega un healthcheck para que el orquestador sepa si el contenedor está sano:

```yaml
# docker-compose.yml
frontend:
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
    interval: 30s
    timeout: 10s
    retries: 3
```
