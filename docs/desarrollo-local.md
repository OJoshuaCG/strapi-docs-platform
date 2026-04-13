# Entorno de desarrollo local

Guía para correr el proyecto localmente y hacer cambios de forma eficiente,
sin necesidad de reconstruir imágenes Docker en cada iteración.

---

## Arquitectura del entorno de desarrollo

La clave para un ciclo de desarrollo rápido es dividir responsabilidades:

```
Docker Compose                    Tu máquina (proceso local)
──────────────────────────────    ──────────────────────────
MariaDB   (base de datos)         Frontend SvelteKit
Strapi    (CMS + API REST)          → npm run dev
Meilisearch (búsqueda)              → HMR instantáneo
                                    → puerto 5173
```

- **Los servicios de backend** (MariaDB, Strapi, Meilisearch) corren en Docker
  porque necesitan Linux y dependencias nativas.
- **El frontend** corre directamente en tu máquina con `npm run dev`, lo que
  habilita Hot Module Replacement (HMR): cada cambio en `.svelte` o `.ts` se
  refleja en el navegador en milisegundos, sin reiniciar nada.

---

## Setup inicial (solo una vez)

### Requisitos previos

- **Docker Desktop** en ejecución
- **Node.js 22** (`node -v` debe mostrar `v22.x.x`)
  - Si usas nvm: `nvm install 22 && nvm use 22`

### 1. Backend — primera vez

```bash
cd backend

# Copiar plantilla de variables de entorno
cp .env.example .env
```

Editar `backend/.env` y rellenar los valores vacíos:

```bash
# Contraseñas de base de datos (inventa cualquier valor seguro)
DATABASE_ROOT_PASSWORD=root_seguro_123
DATABASE_PASSWORD=strapi_seguro_456

# Secrets de Strapi — generar con:
node -e "const c=require('crypto'); console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"
# ↑ pegar resultado en APP_KEYS

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# ↑ repetir para API_TOKEN_SALT, ADMIN_JWT_SECRET, JWT_SECRET, TRANSFER_TOKEN_SALT, ENCRYPTION_KEY

# Meilisearch — cualquier string largo
MEILISEARCH_MASTER_KEY=cualquier_clave_larga_aqui

# Wasabi — dejar en blanco durante desarrollo (usa disco local)
# FRONTEND_URL ya tiene el valor correcto por defecto
```

Arrancar el stack:

```bash
docker compose up --build -d
```

La primera vez tarda ~60 s porque:
1. Descarga las imágenes base
2. Instala `node_modules` dentro del contenedor de Strapi
3. Pre-compila el panel admin

> Puedes ver el progreso con `docker compose logs -f strapi`

### 2. Configurar Strapi (solo la primera vez)

Una vez que el healthcheck de Strapi pase (verde en Docker Desktop o `docker compose ps`):

1. Abre `http://localhost:1337/admin`
2. Crea tu cuenta de superadministrador
3. Agrega el locale inglés:
   **Settings → Internationalization → Add a locale → English (en)**
4. Verifica que la API pública funciona:
   ```bash
   curl http://localhost:1337/api/documentation-categories
   # Debe retornar {"data":[],...} sin error 403
   ```
   Si retorna 403: `docker compose restart strapi` aplica los permisos automáticamente.

### 3. Frontend — primera vez

```bash
cd frontend

cp .env.example .env
# El archivo ya tiene VITE_STRAPI_URL=http://localhost:1337, no hace falta cambiarlo

npm install
npm run dev
# Abre http://localhost:5173
```

---

## Flujo de trabajo diario

### Arrancar el entorno

```bash
# Terminal 1 — backend (desde backend/)
docker compose up -d

# Terminal 2 — frontend (desde frontend/)
npm run dev
```

Los contenedores tienen `restart: unless-stopped`, así que si reiniciaste Docker
Desktop también se levantan solos; solo necesitas arrancar el frontend local.

### Verificar que todo está corriendo

```bash
docker compose ps          # todos los servicios deben estar "healthy" o "running"
docker compose logs strapi # ver logs de Strapi si algo falla
```

---

## Cuándo NO necesitas reconstruir Docker

La mayoría de los cambios en Strapi **no requieren rebuild**. El `docker-compose.yml`
monta estas carpetas directamente desde tu disco al contenedor:

```
./cms/src/      →  /app/src/
./cms/config/   →  /app/config/
./cms/public/   →  /app/public/
```

Strapi corre en modo `develop` dentro del contenedor, lo que significa que
**observa cambios en `src/` y `config/` y se reinicia solo**.

| Tipo de cambio en Strapi | Acción necesaria |
|---|---|
| Editar un controller, service o policy en `src/` | Nada — Strapi detecta el cambio automáticamente |
| Editar un archivo en `config/` | Nada — Strapi detecta el cambio automáticamente |
| Agregar / modificar un Content Type desde el panel admin | Nada — Strapi regenera las migraciones y reinicia |
| Cambiar una variable en `backend/.env` | `docker compose restart strapi` |
| Agregar un paquete npm al CMS (`npm install X`) | Ver sección siguiente |

Para el frontend, **todos los cambios** (`.svelte`, `.ts`, `.css`) se aplican
instantáneamente por HMR mientras corre `npm run dev` — no hay Docker de por medio.

---

## Cuándo SÍ necesitas reconstruir

Solo en estos casos específicos:

### Nuevo paquete npm en Strapi

```bash
# Opción A — reconstruir solo el contenedor de Strapi (más rápido)
docker compose up --build strapi -d

# Opción B — si el volume de node_modules quedó corrupto
docker compose down
docker volume rm backend_cms_node_modules
docker compose up --build -d
```

> El volume `cms_node_modules` existe precisamente para NO reinstalar paquetes
> en cada arranque. Solo se invalida si `package.json` cambia.

### Cambia el `Dockerfile` del CMS o del frontend

```bash
docker compose up --build -d
```

### Primera vez en una máquina nueva o después de `docker compose down -v`

```bash
docker compose up --build -d
```

---

## Comandos de uso frecuente

```bash
# ── Ver logs ──────────────────────────────────────────────────────────────────
docker compose logs -f strapi         # solo Strapi
docker compose logs -f                # todos los servicios

# ── Reiniciar un servicio (aplica cambios de .env) ────────────────────────────
docker compose restart strapi

# ── Acceder al shell del contenedor ───────────────────────────────────────────
docker compose exec strapi sh
docker compose exec mariadb mysql -u strapi -p strapi_docs

# ── Regenerar tipos TypeScript desde el schema de Strapi ─────────────────────
docker compose exec strapi npm run strapi ts:generate-types

# ── Parar sin borrar datos ────────────────────────────────────────────────────
docker compose down

# ── Frontend ──────────────────────────────────────────────────────────────────
npm run check        # verificar tipos TypeScript
npm run build        # build de producción
```

---

## Reconstruir solo un servicio (sin tocar los demás)

Si solo cambia el código del frontend dockerizado o el CMS, puedes reconstruir
un único servicio sin bajar el stack completo:

```bash
# Solo Strapi
docker compose up --build strapi -d

# Solo el frontend Docker (si lo usas en vez del dev server local)
docker compose up --build frontend -d
```

---

## Troubleshooting rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| `403 Forbidden` en `/api/...` | Permisos del rol Public sin configurar | `docker compose restart strapi` |
| Strapi no arranca, error de conexión a DB | MariaDB aún inicializando | Esperar 30 s o `docker compose restart strapi` |
| Cambios en `src/` de Strapi no se reflejan | El volume de bind mount no está activo | Verificar con `docker compose ps` que Strapi está corriendo |
| `cms_node_modules` desactualizado tras cambio en `package.json` | El volume tiene los módulos viejos | `docker compose down && docker volume rm backend_cms_node_modules && docker compose up --build -d` |
| HMR del frontend no funciona | Frontend no corre localmente | Asegurarse de correr `npm run dev` en `frontend/`, no usar el contenedor Docker del frontend |
| `node: command not found` en frontend | Node 22 no activo | `nvm use 22` |
| CORS error en el navegador | `FRONTEND_URL` en `.env` incorrecto | Verificar que sea `http://localhost:5173` sin trailing slash, luego `docker compose restart strapi` |

---

## Flujo completo resumido

```
Arranque diario
───────────────
docker compose up -d          (desde backend/)
npm run dev                   (desde frontend/)

Cambio en código Strapi (src/ o config/)
─────────────────────────────────────────
Editar archivo → guardar → Strapi se recarga solo

Cambio en frontend
───────────────────
Editar archivo → guardar → navegador se actualiza por HMR

Nuevo paquete npm en Strapi
────────────────────────────
Editar package.json → docker compose up --build strapi -d

Al terminar el día
───────────────────
docker compose down           (datos se conservan en volumes)
```
