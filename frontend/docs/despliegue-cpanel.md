# Despliegue del Frontend en cPanel (sin Docker)

Guía paso a paso para desplegar únicamente el frontend (SvelteKit) en un servidor cPanel que ya tiene soporte para Node.js.

> Esta guía **no usa Docker**. SvelteKit se ejecuta directamente sobre Node.js mediante el selector de aplicaciones de cPanel (Passenger).
>
> El **backend (Strapi) debe estar ya desplegado y accesible desde una URL pública** antes de continuar. Consulta `backend/docs/despliegue-cpanel.md` para esa parte.

### Lo que cubre este despliegue

El frontend SvelteKit sirve el portal de documentación con SSR:

| Ruta | Propósito |
|---|---|
| `tudominio.com/` | Redirección a `/es` |
| `tudominio.com/es` o `/en` | Grid de categorías |
| `tudominio.com/es/[categoria]/[slug]` | Artículo individual |
| `tudominio.com/api/preview` | Endpoint interno de live preview |

### Proceso de compilación en cPanel

SvelteKit con `adapter-node` compila todo con un solo comando:

| Comando | Qué produce | Dónde |
|---|---|---|
| `npm run build` | Servidor Node.js + assets del cliente | `build/` |

El resultado es un servidor Node.js estándar. El punto de entrada es `build/index.js`.

### Por qué se necesita `server.cjs`

Phusion Passenger (el sistema Node.js de cPanel) carga el startup file usando `require()` de CommonJS. Sin embargo, `build/index.js` generado por adapter-node es un módulo ESM con top-level await — incompatible con `require()`.

La solución es un archivo `server.cjs` (`.cjs` fuerza CommonJS aunque `package.json` tenga `"type": "module"`) que usa `import()` dinámico para cargar el ESM:

```
Passenger → require('server.cjs') → import('./build/index.js')  ✓
Passenger → require('build/index.js')  ✗ ERR_REQUIRE_ASYNC_MODULE
```

El archivo `server.cjs` ya está incluido en el repositorio — se empaqueta automáticamente con `git archive`.

### Sobre `VITE_STRAPI_URL`

Esta variable se hornea en el bundle JavaScript durante el build — no es una variable de runtime. Debes tenerla en el `.env` del servidor **antes de compilar**. Si la URL del backend cambia en el futuro, tendrás que recompilar.

---

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear dominio o subdominio en cPanel](#2-crear-dominio-o-subdominio-en-cpanel)
3. [Preparar los archivos localmente](#3-preparar-los-archivos-localmente)
4. [Subir los archivos al servidor](#4-subir-los-archivos-al-servidor)
5. [Crear el archivo .env en el servidor](#5-crear-el-archivo-env-en-el-servidor)
6. [Configurar la aplicación Node.js en cPanel](#6-configurar-la-aplicación-nodejs-en-cpanel)
7. [Instalar dependencias y compilar](#7-instalar-dependencias-y-compilar)
8. [Iniciar la aplicación](#8-iniciar-la-aplicación)
9. [Verificación final](#9-verificación-final)
10. [Configurar Apache (.htaccess) — restricciones de acceso](#10-configurar-apache-htaccess--restricciones-de-acceso)
11. [Actualizar el frontend](#11-actualizar-el-frontend)
12. [Troubleshooting](#12-troubleshooting)

---

---

## 1. Requisitos previos

Verifica que tu hosting cPanel cumple con lo siguiente **antes de continuar**:

| Requisito | Valor requerido | Cómo verificarlo |
|---|---|---|
| Node.js disponible | Versión 22 | cPanel → Software → Setup Node.js App |
| Espacio en disco | Mínimo 500 MB libres | cPanel → Files → Disk Usage |
| Acceso SSH o Terminal | Necesario para npm y compilación | cPanel → Advanced → Terminal |
| Backend Strapi activo | URL pública accesible | `curl https://cms.tudominio.com/api/documentation-categories` |

> **Sin acceso SSH o Terminal**, no es posible ejecutar `npm install` ni compilar el proyecto. Si tu hosting no lo ofrece, contacta al soporte antes de continuar.

---

## 2. Crear dominio o subdominio en cPanel

El frontend puede vivir en el dominio raíz o en un subdominio dedicado. Se recomienda el dominio principal:

### Opción A — Dominio raíz (`tudominio.com`)

Si el dominio principal está disponible, el Document Root ya existe en `/home/tuusuario/public_html`. En ese caso, **no crees un subdominio** — despliega directamente allí o en un subdirectorio.

### Opción B — Subdominio (`app.tudominio.com`)

1. En cPanel, ve a **Domains** → **Subdomains** (o **Domains** → **Create A New Domain**).
2. Crea el subdominio:
   - **Subdomain:** `app`
   - **Domain:** `tudominio.com`
   - **Document Root:** `/home/tuusuario/app.tudominio.com` (cPanel lo sugiere automáticamente)
3. Haz clic en **Create**.

> El directorio raíz del dominio o subdominio será donde vivirá el código del frontend. En esta guía usaremos `~/app.tudominio.com/` como ejemplo.

---

## 3. Preparar los archivos localmente

Antes de subir al servidor, prepara un paquete limpio del código fuente.

### 3.1 Archivos que se deben subir

Solo necesitas la carpeta `frontend/`. **No incluyas**:
- `node_modules/` (se instala en el servidor)
- `build/` (se compila en el servidor)
- `.env` (se crea directamente en el servidor)

### 3.2 Crear el archivo comprimido con git

Usa `git archive` — incluye exactamente los archivos rastreados por git y omite automáticamente todo lo que está en `.gitignore` (`node_modules/`, `build/`, `.env`, etc.):

```bash
# Desde la raíz del repositorio (funciona en Windows, Mac y Linux)
git archive HEAD:frontend --output=frontend.zip
```

El archivo `frontend.zip` se crea en la raíz del repositorio con la estructura de `frontend/` como raíz del zip.

---

## 4. Subir los archivos al servidor

### Opción A — File Manager de cPanel

1. En cPanel, ve a **Files** → **File Manager**.
2. Navega a `/home/tuusuario/app.tudominio.com/`.
3. Haz clic en **Upload** y sube el archivo `frontend.zip`.
4. Una vez subido, haz clic derecho sobre el zip → **Extract**. Extrae en la misma carpeta.
5. Borra el archivo zip después de extraer.

### Opción B — FTP/SFTP (recomendado)

Usa un cliente FTP como FileZilla o WinSCP:

- **Host:** `tudominio.com`
- **Usuario:** tu usuario cPanel
- **Contraseña:** tu contraseña cPanel
- **Puerto:** 22 (SFTP — más seguro) o 21 (FTP)
- **Directorio remoto:** `/home/tuusuario/app.tudominio.com/`

### Verificar la estructura en el servidor

Después de subir, la estructura debe verse exactamente así:

```
app.tudominio.com/
├── src/
│   ├── app.css
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib/
│   └── routes/
├── static/
├── server.cjs          ← wrapper para Passenger (ya incluido en el zip)
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

> ⚠️ **Error común:** Si los archivos de configuración (`svelte.config.js`, `package.json`, etc.) aparecen dentro de una subcarpeta en lugar de en la raíz, la compilación fallará. Verifica que están en el nivel correcto.

---

## 5. Crear el archivo .env en el servidor

Abre la **Terminal** de cPanel (**Advanced** → **Terminal**) y ejecuta:

```bash
cd ~/app.tudominio.com
nano .env
```

Pega y edita el siguiente contenido con tus valores reales:

```env
# ─── URL del backend Strapi ────────────────────────────────────────────────────
# URL pública donde está el backend. Se hornea en el bundle durante el build.
# Si esta URL cambia, debes recompilar (npm run build) y reiniciar.
VITE_STRAPI_URL=https://cms.tudominio.com

# ─── Preview de artículos ──────────────────────────────────────────────────────
# Mismo valor que PREVIEW_SECRET en el backend (.env de Strapi).
# Deja en blanco si no usas la función de live preview.
PREVIEW_SECRET=

# ─── Servidor SvelteKit ────────────────────────────────────────────────────────
# Passenger gestiona el puerto internamente. 3000 es el valor estándar.
PORT=3000

# URL pública completa del frontend (sin trailing slash). Requerido por SvelteKit
# para construir URLs absolutas correctamente en el SSR.
ORIGIN=https://tudominio.com

# Escuchar en todas las interfaces de red
HOST=0.0.0.0
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 6. Configurar la aplicación Node.js en cPanel

1. En cPanel, ve a **Software** → **Setup Node.js App**.
2. Haz clic en **Create Application**.
3. Configura los campos:

| Campo | Valor |
|---|---|
| **Node.js version** | `22.x` (o la versión disponible más cercana) |
| **Application mode** | `Production` |
| **Application root** | `/home/tuusuario/app.tudominio.com` |
| **Application URL** | `app.tudominio.com` (o el dominio raíz) |
| **Application startup file** | `server.cjs` |

4. Haz clic en **Create**.

### Anotar el comando de entorno virtual

Tras crear la app, cPanel muestra un bloque como este:

```
source /home/tuusuario/nodevenv/app.tudominio.com/22/bin/activate && cd /home/tuusuario/app.tudominio.com
```

Copia ese comando exacto — lo necesitas en el siguiente paso.

> **Nota:** En este punto la app mostrará error si la arrancas, porque `build/index.js` aún no existe. Eso es normal — se crea en el paso siguiente.

---

## 7. Instalar dependencias y compilar

En la **Terminal de cPanel**, activa el entorno y ejecuta los comandos en orden:

```bash
# 1. Activar el entorno virtual (usa el comando copiado en el paso 6)
source /home/tuusuario/nodevenv/app.tudominio.com/22/bin/activate && cd /home/tuusuario/app.tudominio.com

# 2. Verificar versión de Node.js
node --version   # debe mostrar v22.x.x

# 3. Instalar dependencias
npm install --include=dev

# 4. Compilar: TypeScript + Vite + SvelteKit → crea build/
npm run build
```

La compilación puede tardar entre 1 y 3 minutos. Al finalizar debe mostrarse algo como:

```
vite v8.x.x building SSR bundle for production...
✓ built in Xs
```

### Verificar que la compilación fue exitosa

```bash
ls build/
# Debe mostrar: index.js  server/  client/  (y posiblemente prerendered/)

node build/index.js &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Debe retornar: 200  (o 302 por el redirect a /es)
kill %1
```

Si `build/index.js` no existe o `npm run build` muestra errores, revisa la sección [Troubleshooting](#12-troubleshooting).

---

## 8. Iniciar la aplicación

En cPanel → **Setup Node.js App**, busca tu aplicación y haz clic en **Start** (▶) o **Restart**.

Espera 10–20 segundos para que Passenger inicialice el proceso Node.js.

Abre en el navegador: `https://tudominio.com` (o el dominio/subdominio configurado).

Debe redirigir automáticamente a `https://tudominio.com/es` y mostrar la página principal del portal.

---

## 9. Verificación final

```bash
# 1. El frontend responde
curl -I https://tudominio.com
# → HTTP/2 302  con Location: /es

# 2. La página principal carga
curl -I https://tudominio.com/es
# → HTTP/2 200

# 3. El frontend se comunica con el backend
curl -s https://tudominio.com/es | grep -o 'categoria-slug' | head -1
# → debe mostrar slugs de categorías reales (si hay contenido publicado)
```

### Checklist de verificación

- [ ] `VITE_STRAPI_URL` apunta a la URL correcta del backend
- [ ] `ORIGIN` tiene la URL exacta del frontend (sin trailing slash)
- [ ] `build/index.js` existe (compilación completada sin errores)
- [ ] La app en cPanel muestra estado **Running**
- [ ] El frontend carga en el dominio configurado
- [ ] La redirección `/` → `/es` funciona
- [ ] Las categorías aparecen en la página principal (datos del backend visibles)
- [ ] Un artículo individual se renderiza correctamente
- [ ] Las imágenes cargan desde Wasabi (o disco local del backend)
- [ ] El modo oscuro funciona
- [ ] SSL activo (candado en el navegador)

---

## 10. Configurar Apache (.htaccess) — restricciones de acceso

### Document root y estructura protegida

```
app.tudominio.com/         ← document root = app root
├── .htaccess               ← aquí van las reglas de Apache
├── server.cjs              ← startup file de Passenger
├── build/                  ← generado, no editar
│   ├── index.js            ← app SvelteKit (cargada por server.cjs)
│   ├── server/             ← código SSR
│   └── client/             ← assets del navegador (JS, CSS, imágenes)
├── src/                    ← código fuente — bloquear acceso directo
├── node_modules/           ← bloquear acceso directo
├── package.json            ← bloquear
├── svelte.config.js        ← bloquear
└── vite.config.ts          ← bloquear
```

Con Passenger activo, Apache no sirve archivos directamente — todo pasa por Node.js. Sin embargo, si Passenger se detiene inesperadamente, Apache podría exponer el código fuente. Las reglas de `.htaccess` son la segunda capa de defensa.

### Crear o editar el .htaccess

cPanel coloca un `.htaccess` con la configuración de Passenger. **No lo borres** — agrega las reglas al principio del archivo existente:

```bash
nano ~/app.tudominio.com/.htaccess
```

Agrega estas reglas **al principio**, antes de cualquier directiva `Passenger*`:

```apache
# ══════════════════════════════════════════════════════════════════════════════
# RESTRICCIONES DE SEGURIDAD — ANTES de las directivas Passenger
# ══════════════════════════════════════════════════════════════════════════════

RewriteEngine On

# ── 1. Proteger archivos y directorios sensibles ──────────────────────────────

<FilesMatch "^(\.(env|git.*|htpasswd)|package(-lock)?\.json|svelte\.config\.(js|ts)|vite\.config\.(js|ts)|tsconfig\.json)$">
    Require all denied
</FilesMatch>

RewriteCond %{REQUEST_URI} ^/(src|node_modules|\.git)(/|$)
RewriteRule ^ - [F,L]

RewriteCond %{REQUEST_URI} /\.
RewriteRule ^ - [F,L]

# ── 2. Los assets del cliente (JS, CSS) deben ser accesibles ─────────────────
#    Passenger los sirve a través de Node.js en /client/.
#    No es necesario bloquear build/client/ — SvelteKit los sirve correctamente.

# ══════════════════════════════════════════════════════════════════════════════
# FIN DE RESTRICCIONES — configuración de Passenger a continuación
# ══════════════════════════════════════════════════════════════════════════════
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 11. Actualizar el frontend

### 11.1 Subir los cambios

1. Modifica los archivos en tu máquina local dentro de `frontend/`.
2. Genera un nuevo zip:
   ```bash
   git archive HEAD:frontend --output=frontend.zip
   ```
3. Sube solo los archivos modificados al servidor vía FTP/SFTP o File Manager.
   - **No** sobreescribas `.env` ni `node_modules/`.

### 11.2 Recompilar y reiniciar

En la Terminal de cPanel (con el entorno activado):

```bash
cd ~/app.tudominio.com

# Recompilar siempre que haya cambios en src/
npm run build
```

Luego reinicia desde cPanel → **Setup Node.js App** → **Restart**.

### 11.3 Si cambiaron las dependencias (`package.json`)

```bash
npm install
npm run build
```

Haz **Restart** de la aplicación en cPanel.

### 11.4 Si cambió la URL del backend (`VITE_STRAPI_URL`)

Esta variable se hornea en el build. Si cambia:

1. Edita `.env` en el servidor: `nano ~/app.tudominio.com/.env`
2. Actualiza `VITE_STRAPI_URL` con el nuevo valor
3. Recompila: `npm run build`
4. Haz **Restart** de la aplicación en cPanel

---

## 12. Troubleshooting

### La aplicación muestra error 500 o "Application Error"

```bash
# Ver los logs de Passenger/Apache
tail -50 ~/logs/app.tudominio.com.error.log
```

Busca el error específico de Node.js.

### Error: `ERR_REQUIRE_ASYNC_MODULE` — Passenger no puede cargar `build/index.js`

```
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph with top-level await.
  Requiring /home/.../build/index.js
```

Passenger intenta cargar el startup file con `require()` (CommonJS), pero `build/index.js` es un módulo ESM con top-level await — incompatible.

**Causa:** El startup file en cPanel está configurado como `build/index.js` en lugar de `server.cjs`.

**Solución:**

1. Verifica que `server.cjs` existe en la raíz de la app:
   ```bash
   ls ~/app.tudominio.com/server.cjs
   ```
   Si no existe, créalo:
   ```bash
   cat > ~/app.tudominio.com/server.cjs << 'EOF'
   'use strict';
   const path = require('path');
   const fs   = require('fs');
   const envPath = path.join(__dirname, '.env');
   if (fs.existsSync(envPath)) {
     const lines = fs.readFileSync(envPath, 'utf8').split('\n');
     for (const line of lines) {
       const trimmed = line.trim();
       if (!trimmed || trimmed.startsWith('#')) continue;
       const eqIdx = trimmed.indexOf('=');
       if (eqIdx === -1) continue;
       const key   = trimmed.slice(0, eqIdx).trim();
       const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
       if (!(key in process.env)) process.env[key] = value;
     }
   }
   import('./build/index.js').catch(err => { console.error(err); process.exit(1); });
   EOF
   ```

2. En cPanel → **Setup Node.js App** → **Edit** → cambia el startup file de `build/index.js` a `server.cjs` → **Save** → **Restart**.

### Error: `Cannot find module './build/index.js'` o similar

El build no existe o está incompleto. Verifica y recompila:

```bash
ls ~/app.tudominio.com/build/
# Si no existe index.js:
source /home/tuusuario/nodevenv/app.tudominio.com/22/bin/activate
cd ~/app.tudominio.com
npm run build
```

### Error: `ORIGIN` o URLs incorrectas en el HTML

Verifica que `ORIGIN` en `.env` tiene el protocolo correcto (`https://`) y no tiene trailing slash.

- Correcto: `ORIGIN=https://tudominio.com`
- Incorrecto: `ORIGIN=https://tudominio.com/`

Después de cambiar `.env`, recompila y reinicia.

### El frontend carga pero no hay datos (categorías vacías)

1. Abre las DevTools del navegador → pestaña **Network**
2. Verifica las peticiones a la URL del backend
3. Si hay errores CORS: verifica que `FRONTEND_URL` en el **backend** (.env de Strapi) tiene exactamente la URL del frontend sin trailing slash
4. Si hay errores 403 en la API: reinicia Strapi para que el bootstrap reconfigue permisos

### `npm run build` falla con errores TypeScript

```bash
# Ver el error completo
npm run check
```

Si hay errores de tipos, corrígelos en el código fuente antes de recompilar. SvelteKit tiene `strict: true`.

### Node.js 22 no está disponible en cPanel

Desde SSH, instala NVM y Node 22 manualmente:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version   # → v22.x.x
```

Si el entorno virtual de cPanel no usa la versión correcta, contacta al soporte del hosting para que habiliten Node 22 vía WHM.

### La terminal de cPanel no tiene el `node` correcto

```bash
# Activar el entorno virtual de la aplicación
source /home/tuusuario/nodevenv/app.tudominio.com/22/bin/activate
node --version  # debe mostrar v22.x.x
```

### El live preview no funciona

Verifica que:
- `PREVIEW_SECRET` en `.env` del frontend tiene el mismo valor que en el backend
- Tras editar `.env`, es suficiente con reiniciar la app (no es necesario recompilar — `PREVIEW_SECRET` es una variable de runtime, no se hornea en el build)
- La URL de preview en Strapi (`config/admin.ts`) apunta al dominio correcto del frontend

### Cambios en el código no aparecen después de reiniciar

Passenger cachea el proceso Node.js. Tras subir cambios y recompilar:
1. Haz **Restart** (no solo **Stop** + **Start**) desde cPanel → Setup Node.js App
2. Si persiste, espera 30 segundos y recarga la página con `Ctrl+Shift+R` (hard reload)
