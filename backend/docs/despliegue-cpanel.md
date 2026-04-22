# Despliegue del Backend en cPanel (sin Docker)

Guía paso a paso para desplegar únicamente el backend (Strapi v5) en un servidor cPanel que ya tiene soporte para Node.js y MySQL/MariaDB.

> Esta guía **no usa Docker**. Strapi se ejecuta directamente sobre Node.js mediante el selector de aplicaciones de cPanel (Passenger).

### Lo que cubre este despliegue

Un solo proceso Strapi sirve **tanto la REST API como el panel admin**:

| Ruta | Propósito |
|---|---|
| `cms.tudominio.com/api/*` | API REST consumida por el frontend |
| `cms.tudominio.com/admin` | Panel de administración para editores |

No hay un despliegue separado para cada uno — todo sale del mismo proceso Node.js.

### Almacenamiento de archivos

El backend soporta **dos modos**, configurados automáticamente según las variables de entorno:

| Modo | Cuándo se activa | Dónde se guardan los archivos |
|---|---|---|
| **Disco local** | `WASABI_ACCESS_KEY` vacía | `public/uploads/` en el servidor cPanel |
| **Wasabi S3** | `WASABI_ACCESS_KEY` configurada | Bucket externo de Wasabi |

Para un despliegue sencillo en cPanel, el **disco local es perfectamente válido**. Los archivos se sirven en `cms.tudominio.com/uploads/archivo.jpg`.

### Proceso de compilación en cPanel

En Strapi v5 **un solo comando** compila todo:

| Comando | Qué produce | Dónde |
|---|---|---|
| `npm run build` | TypeScript del servidor + Admin panel (React/Vite) | `dist/` |

`strapi build` ejecuta internamente dos pasos: compilación TypeScript (`Compiling TS`) y compilación del admin panel (`Building admin panel`). Todo el resultado queda en `dist/`. No existe una carpeta `build/` separada en Strapi v5.

---

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear subdominio en cPanel](#2-crear-subdominio-en-cpanel)
3. [Crear la base de datos en cPanel](#3-crear-la-base-de-datos-en-cpanel)
4. [Preparar los archivos localmente](#4-preparar-los-archivos-localmente)
5. [Subir los archivos al servidor](#5-subir-los-archivos-al-servidor)
6. [Crear el archivo .env en el servidor](#6-crear-el-archivo-env-en-el-servidor)
7. [Crear el archivo de inicio (server.js)](#7-crear-el-archivo-de-inicio-serverjs)
8. [Configurar la aplicación Node.js en cPanel](#8-configurar-la-aplicación-nodejs-en-cpanel)
9. [Instalar dependencias y compilar](#9-instalar-dependencias-y-compilar)
10. [Iniciar la aplicación](#10-iniciar-la-aplicación)
11. [Configuración inicial de Strapi](#11-configuración-inicial-de-strapi)
12. [Verificación final](#12-verificación-final)
13. [Configurar Apache (.htaccess) — restricciones de acceso](#13-configurar-apache-htaccess--restricciones-de-acceso)
14. [Actualizar el backend](#14-actualizar-el-backend)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Requisitos previos

Verifica que tu hosting cPanel cumple con lo siguiente **antes de continuar**:

| Requisito | Valor requerido | Cómo verificarlo |
|---|---|---|
| Node.js disponible | Versión 20, 22 o 24 | cPanel → Software → Setup Node.js App |
| MySQL / MariaDB | Cualquier versión reciente | cPanel → Databases → MySQL Databases |
| Espacio en disco | Mínimo 1 GB libre | cPanel → Files → Disk Usage |
| Acceso SSH o Terminal | Necesario para npm y compilación | cPanel → Advanced → Terminal |

> **Sin acceso SSH o Terminal**, no es posible ejecutar `npm install` ni compilar el proyecto. Si tu hosting no lo ofrece, contacta al soporte antes de continuar.

---

## 2. Crear subdominio en cPanel

Strapi necesita un dominio o subdominio propio. Se recomienda usar un subdominio dedicado, por ejemplo `cms.tudominio.com`.

1. En cPanel, ve a **Domains** → **Subdomains** (o **Domains** → **Create A New Domain** en versiones recientes).
2. Crea el subdominio:
   - **Subdomain:** `cms`
   - **Domain:** `tudominio.com`
   - **Document Root:** `/home/tuusuario/cms.tudominio.com` (cPanel lo sugiere automáticamente)
3. Haz clic en **Create**.

> El directorio raíz del subdominio (`/home/tuusuario/cms.tudominio.com`) será donde vivirá el código de Strapi.

---

## 3. Crear la base de datos en cPanel

### 3.1 Crear la base de datos

1. En cPanel, ve a **Databases** → **MySQL Databases**.
2. En la sección **Create New Database**, escribe el nombre (solo el sufijo, cPanel añade tu usuario automáticamente):
   - Ejemplo: `strapi` → resultará en `tuusuario_strapi`
3. Haz clic en **Create Database**.

### 3.2 Crear un usuario de base de datos

1. En la misma página, baja a **MySQL Users** → **Add New User**.
2. Rellena:
   - **Username:** `strapi` → resultará en `tuusuario_strapi`
   - **Password:** genera uno fuerte (usa el botón **Password Generator**)
   - ⚠️ **Anota el password**, lo necesitarás en el `.env`
3. Haz clic en **Create User**.

### 3.3 Asignar el usuario a la base de datos

1. En la sección **Add User To Database**:
   - **User:** `tuusuario_strapi`
   - **Database:** `tuusuario_strapi`
2. Haz clic en **Add**.
3. En la pantalla de privilegios, selecciona **ALL PRIVILEGES** y haz clic en **Make Changes**.

> **Importante:** Los nombres reales de tu base de datos y usuario tienen el prefijo `tuusuario_`. Usa esos nombres completos en el `.env`.

---

## 4. Preparar los archivos localmente

Antes de subir al servidor, prepara un paquete limpio del código fuente.

### 4.1 Archivos que se deben subir

Solo necesitas la carpeta `backend/cms/`. **No incluyas**:
- `node_modules/` (se instala en el servidor)
- `build/` (se compila en el servidor)
- `dist/` (se compila en el servidor)
- `.tmp/`
- `.env` (se crea directamente en el servidor)

### 4.2 Crear el archivo comprimido con git

Usa `git archive` — incluye exactamente los archivos rastreados por git y omite automáticamente todo lo que está en `.gitignore` (`node_modules/`, `dist/`, `build/`, `.env`, `.tmp/`, etc.):

```bash
# Desde la raíz del repositorio (funciona en Windows, Mac y Linux)
git archive HEAD:backend/cms --output=strapi-cms.zip
```

El archivo `strapi-cms.zip` se crea en la raíz del repositorio con la estructura correcta de `backend/cms/` como raíz del zip.

---

## 5. Subir los archivos al servidor

### Opción A — File Manager de cPanel

1. En cPanel, ve a **Files** → **File Manager**.
2. Navega a `/home/tuusuario/cms.tudominio.com/`.
3. Haz clic en **Upload** y sube el archivo `strapi-cms.zip`.
4. Una vez subido, haz clic derecho sobre el zip → **Extract**. Extrae en la misma carpeta.
5. Borra el archivo zip después de extraer.

### Opción B — FTP/SFTP (recomendado)

Usa un cliente FTP como FileZilla o WinSCP:

- **Host:** `tudominio.com`
- **Usuario:** tu usuario cPanel
- **Contraseña:** tu contraseña cPanel
- **Puerto:** 22 (SFTP — más seguro) o 21 (FTP)
- **Directorio remoto:** `/home/tuusuario/cms.tudominio.com/`

### Verificar la estructura en el servidor

Después de subir, la estructura debe verse exactamente así:

```
cms.tudominio.com/
├── config/               ← DEBE ser una subcarpeta, no archivos sueltos en raíz
│   ├── admin.ts
│   ├── api.ts
│   ├── database.ts
│   ├── middlewares.ts
│   ├── plugins.ts
│   └── server.ts
├── database/
│   └── migrations/
├── public/
├── src/
├── package.json
├── tsconfig.json
└── types/
```

> ⚠️ **Error común:** Si los archivos `.ts` de configuración aparecen sueltos en la raíz (en lugar de dentro de `config/`), Strapi no los encontrará. Verifica que la carpeta `config/` exista como subdirectorio.

---

## 6. Crear el archivo .env en el servidor

Abre la **Terminal** de cPanel (**Advanced** → **Terminal**) y ejecuta:

```bash
cd ~/cms.tudominio.com
nano .env
```

Pega y edita el siguiente contenido con tus valores reales:

```env
# ─── Servidor ──────────────────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=1337
NODE_ENV=production

# ─── Base de datos (MySQL de cPanel) ───────────────────────────────────────────
# IMPORTANTE: el cliente debe ser "mysql" (no "mysql2")
DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=tuusuario_strapi
DATABASE_USERNAME=tuusuario_strapi
DATABASE_PASSWORD=tu_password_seguro
DATABASE_SSL=false

# ─── Strapi secrets ────────────────────────────────────────────────────────────
# Genera APP_KEYS con:
#   node -e "const c=require('crypto');console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"
# Genera el resto con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_KEYS=clave1base64==,clave2base64==
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
JWT_SECRET=
TRANSFER_TOKEN_SALT=
ENCRYPTION_KEY=

# ─── CORS — URL del frontend ────────────────────────────────────────────────────
# Sin trailing slash
FRONTEND_URL=https://tudominio.com

# ─── Wasabi S3 (almacenamiento de medios) ──────────────────────────────────────
# Deja en blanco para usar disco local
WASABI_ACCESS_KEY=
WASABI_SECRET_KEY=
WASABI_BUCKET=
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_UPLOAD_PREFIX=cms

# ─── Email (SMTP) ───────────────────────────────────────────────────────────────
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notificaciones@tudominio.com
SMTP_PASS=
EMAIL_FROM="Doc Platform <notificaciones@tudominio.com>"
EMAIL_REPLY_TO=admin@tudominio.com

# ─── Preview (Live Preview) ─────────────────────────────────────────────────────
PREVIEW_SECRET=
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

### Generar los secrets de Strapi

```bash
# APP_KEYS (2 claves separadas por coma)
node -e "const c=require('crypto');console.log([1,2].map(()=>c.randomBytes(32).toString('base64')).join(','))"

# Ejecuta una vez por cada variable restante: API_TOKEN_SALT, ADMIN_JWT_SECRET, JWT_SECRET, TRANSFER_TOKEN_SALT, ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 7. Crear el archivo de inicio (server.js)

Crea `server.js` en la raíz de la aplicación:

```bash
nano ~/cms.tudominio.com/server.js
```

Pega exactamente este contenido:

```js
'use strict';

process.chdir(__dirname);

// Passenger (cPanel) no carga .env automáticamente.
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn('[server.js] .env no encontrado en:', envPath);
}

// Strapi usa el dist/ pre-compilado con `node_modules/.bin/tsc`
// Si dist/ no existe, ejecuta primero: node_modules/.bin/tsc
const distDir = path.join(__dirname, 'dist');

const { createStrapi } = require('@strapi/strapi');

(async () => {
  const app = createStrapi({ distDir });
  await app.start();
})().catch((err) => {
  console.error('Error al iniciar Strapi:', err);
  process.exit(1);
});
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 8. Configurar la aplicación Node.js en cPanel

1. En cPanel, ve a **Software** → **Setup Node.js App**.
2. Haz clic en **Create Application**.
3. Configura los campos:

| Campo | Valor |
|---|---|
| **Node.js version** | 22.x (o la versión 20/24 disponible en tu host) |
| **Application mode** | Production |
| **Application root** | `/home/tuusuario/cms.tudominio.com` |
| **Application URL** | `cms.tudominio.com` |
| **Application startup file** | `server.js` |

4. Haz clic en **Create**.

### Anotar el comando de entorno virtual

Tras crear la app, cPanel muestra un bloque como este:

```
source /home/tuusuario/nodevenv/cms.tudominio.com/22/bin/activate && cd /home/tuusuario/cms.tudominio.com
```

Copia ese comando exacto — lo necesitas en el siguiente paso.

---

## 9. Instalar dependencias y compilar

En la **Terminal de cPanel**, activa el entorno y ejecuta los comandos en orden:

```bash
# 1. Activar el entorno virtual (usa el comando copiado en el paso 8)
source /home/tuusuario/nodevenv/cms.tudominio.com/22/bin/activate && cd /home/tuusuario/cms.tudominio.com

# 2. Verificar versión de Node.js
node --version   # debe mostrar v22.x.x

# 3. Instalar dependencias de producción
npm install --omit=dev

# 4. Compilar todo: TypeScript del servidor + admin panel → crea dist/
npm run build
```

La compilación puede tardar entre 1 y 2 minutos. El log debe mostrar:
```
✔ Compiling TS
✔ Building build context
✔ Building admin panel
```

### Verificar que la compilación fue exitosa

```bash
ls dist/config/
# Debe mostrar: admin.js  api.js  database.js  middlewares.js  plugins.js  server.js
```

Si `dist/config/` no aparece o `tsc` muestra errores TypeScript, revisa la sección [Troubleshooting](#15-troubleshooting).

---

## 10. Iniciar la aplicación

En cPanel → **Setup Node.js App**, busca tu aplicación y haz clic en **Start** (▶).

Espera 30–60 segundos para que Strapi termine de inicializar y aplicar migraciones de base de datos.

---

## 11. Configuración inicial de Strapi

Estos pasos se hacen **una sola vez** en el primer despliegue.

### 11.1 Crear el superadministrador

Abre en tu navegador: `http://cms.tudominio.com/admin`

Completa el formulario de registro:
- **First name**, **Last name**
- **Email** — será tu usuario de acceso permanente
- **Password** — mínimo 8 caracteres, con mayúsculas, minúsculas y números

### 11.2 Agregar el locale inglés

```
Settings → Internationalization → Add a locale → English (en) → Save
```

### 11.3 Verificar permisos de la API pública

El bootstrap de Strapi configura los permisos automáticamente al arrancar. Verifica desde el navegador o desde la Terminal:

```bash
curl http://cms.tudominio.com/api/documentation-categories
# Esperado: {"data":[],"meta":{"pagination":{"page":1,...}}}
```

Si retorna `403 Forbidden`, reinicia la aplicación desde cPanel → **Setup Node.js App** → **Restart** y espera 30 segundos.

### 11.4 Verificar el almacenamiento de archivos

En el panel admin, ve a **Media Library** y sube una imagen de prueba.

**Si usas disco local** (variables `WASABI_*` vacías en `.env`):
- El archivo se guarda en `public/uploads/` en el servidor.
- La URL será: `http://cms.tudominio.com/uploads/nombre-imagen.jpg`

**Si usas Wasabi** (variables `WASABI_*` configuradas):
- La URL será: `https://s3.wasabisys.com/BUCKET/cms/nombre-imagen.jpg`

---

## 12. Verificación final

**Checklist de producción:**

- [ ] `NODE_ENV=production` en el `.env`
- [ ] `DATABASE_CLIENT=mysql` (no `mysql2`) en el `.env`
- [ ] Todos los secrets en `.env` son valores únicos y seguros
- [ ] `FRONTEND_URL` tiene la URL exacta del frontend (sin trailing slash)
- [ ] `dist/config/database.js` existe (`npm run build` completado sin errores)
- [ ] Base de datos conecta correctamente (sin errores en logs de Passenger)
- [ ] Superadministrador de Strapi creado
- [ ] Locale `en` agregado en Settings → Internationalization
- [ ] Permisos de API pública verificados
- [ ] Uploads funcionando (disco local o Wasabi según configuración)

---

## 13. Configurar Apache (.htaccess) — restricciones de acceso

### Document root y estructura protegida

El **document root** del subdominio es el directorio raíz de la aplicación:

```
/home/tuusuario/cms.tudominio.com/   ← document root = app root
├── .htaccess                         ← aquí van las reglas de Apache
├── server.js
├── package.json
├── config/                           ← bloqueado
├── src/                              ← bloqueado
├── dist/                             ← bloqueado
├── build/                            ← bloqueado (Strapi lo sirve internamente)
├── node_modules/                     ← bloqueado
└── public/uploads/                   ← accesible (imágenes)
```

cPanel coloca un `.htaccess` con la configuración de Passenger. **No lo borres** — agrega las reglas al principio del archivo.

### Análisis de acceso por ruta

| Ruta | ¿Quién accede? | Política |
|---|---|---|
| `/api/documentation-*` | Frontend público | Abierto |
| `/api/documentation-space-settings` | Frontend (tema/colores por espacio) | Abierto |
| `/uploads/*` | Navegadores (imágenes) | Abierto |
| `/api/auth/local` | Admin al hacer login | Abierto (requiere credenciales) |
| **`/admin`** | **Solo editores internos** | **Restringir por IP** |
| **`/api/auth/local/register`** | **Nadie — invitación only** | **Bloquear completamente** |

### ¿Es seguro tener el código fuente en el document root?

Con Passenger activo, todo pasa por Node.js y Apache no sirve archivos directamente. Sin embargo, si Passenger se detiene inesperadamente, Apache podría exponer `.env`, `package.json` o código fuente. Las reglas de `.htaccess` son la segunda capa de defensa.

### Crear o editar el .htaccess

```bash
nano ~/cms.tudominio.com/.htaccess
```

Agrega estas reglas **al principio**, antes de cualquier directiva `Passenger*`:

```apache
# ══════════════════════════════════════════════════════════════════════════════
# RESTRICCIONES DE SEGURIDAD — ANTES de las directivas Passenger
# ══════════════════════════════════════════════════════════════════════════════

RewriteEngine On

# ── 1. Proteger archivos y directorios sensibles ──────────────────────────────

<FilesMatch "^(\.(env|git.*|htpasswd)|package(-lock)?\.json|tsconfig\.json|server\.js|yarn\.lock)$">
    Require all denied
</FilesMatch>

RewriteCond %{REQUEST_URI} ^/(src|config|database|node_modules|dist|build|\.git)(/|$)
RewriteRule ^ - [F,L]

RewriteCond %{REQUEST_URI} /\.
RewriteRule ^ - [F,L]

# ── 2. Restringir /admin a IPs autorizadas ────────────────────────────────────
#    Una línea SetEnvIf por cada IP permitida.

SetEnvIf Remote_Addr "^203\.0\.113\.10$"   admin_ok
SetEnvIf Remote_Addr "^198\.51\.100\.25$"  admin_ok
# SetEnvIf Remote_Addr "^10\.0\.0\."       admin_ok   ← subred /24

RewriteCond %{REQUEST_URI} ^/admin(/.*)?$
RewriteCond %{ENV:admin_ok} !^1$
RewriteRule ^ - [F,L]

# ── 3. Bloquear auto-registro de usuarios ─────────────────────────────────────

RewriteCond %{REQUEST_METHOD} ^POST$
RewriteCond %{REQUEST_URI} ^/api/auth/local/register$
RewriteRule ^ - [F,L]

# ══════════════════════════════════════════════════════════════════════════════
# FIN DE RESTRICCIONES — configuración de Passenger a continuación
# ══════════════════════════════════════════════════════════════════════════════
```

> Reemplaza las IPs de ejemplo con las IPs reales de los editores.

### Deshabilitar el registro también desde Strapi

```
Settings → Users & Permissions Plugin → Advanced Settings → Enable sign-ups: OFF → Save
```

---

## 14. Actualizar el backend

### 14.1 Subir los cambios

1. Modifica los archivos en tu máquina local dentro de `backend/cms/`.
2. Sube solo los archivos modificados al servidor vía FTP/SFTP o File Manager.
   - **No** sobreescribas `.env`, `node_modules/`, `dist/` ni `build/`.

### 14.2 Recompilar y reiniciar

En la Terminal de cPanel (con el entorno activado):

```bash
cd ~/cms.tudominio.com

# Recompilar siempre que haya cambios en src/ o config/
npm run build

# Solo si agregaste nuevas dependencias en package.json
npm install --omit=dev
```

Luego reinicia desde cPanel → **Setup Node.js App** → **Restart**.

### 14.3 Backup antes de cambios de schema

Siempre haz un backup de MySQL antes de modificar Content Types:

```bash
mysqldump -u tuusuario_strapi -p tuusuario_strapi > ~/backups/strapi_$(date +%Y%m%d_%H%M%S).sql
```

---

## 15. Troubleshooting

### Error: `Cannot destructure property 'client' of 'db.config.connection'`

**Causa más común:** `dist/config/database.js` no existe — TypeScript no fue compilado.

```bash
# Verificar si existe
ls dist/config/database.js

# Si no existe, compilar TypeScript:
node_modules/.bin/tsc

# Si tsc muestra errores TypeScript, corregirlos antes de continuar.
```

### Error: TypeScript no compila (`noEmitOnError`)

El proyecto tiene `"noEmitOnError": true` en `tsconfig.json`. Cualquier error de TypeScript en **cualquier archivo** bloquea la generación de `dist/`. Ejecuta `tsc` y corrige todos los errores que muestre antes de reiniciar.

### `dist/` desaparece al reiniciar

`dist/` no se regenera automáticamente al reiniciar — es una compilación que persiste en disco. Si la carpeta se pierde, vuelve a ejecutar `node_modules/.bin/tsc`.

### Error: `DATABASE_CLIENT` incorrecto

El cliente debe ser `mysql`, no `mysql2`. Aunque el paquete npm se llama `mysql2`, el nombre del cliente en la configuración de Strapi/Knex es `mysql`.

```env
DATABASE_CLIENT=mysql   ← correcto
DATABASE_CLIENT=mysql2  ← incorrecto, causa crash al arrancar
```

### Los archivos de `config/` están en la raíz en vez de en `config/`

Si los archivos `admin.ts`, `database.ts`, etc. aparecen sueltos en la raíz del proyecto (en vez de dentro de `config/`), el TypeScript compilará a rutas incorrectas y Strapi no cargará la configuración.

```bash
# Verificar dónde están los archivos
ls config/
# Debe mostrar: admin.ts  api.ts  database.ts  middlewares.ts  plugins.ts  server.ts

# Si no existe config/, crear y mover:
mkdir -p config
mv admin.ts database.ts server.ts plugins.ts middlewares.ts api.ts config/
```

### Error: `.env` no encontrado

El archivo `.env` debe estar en la raíz de la aplicación. En File Manager activa "Show Hidden Files" para verlo. Si no existe:

```bash
nano ~/cms.tudominio.com/.env
# Pega el contenido del paso 6 y guarda.
```

### Error: `403 Forbidden` en `/api/...`

El bootstrap de permisos no se ejecutó. Reinicia la aplicación desde cPanel → **Setup Node.js App** → **Restart** y espera 30 segundos.

### Error: `CORS` en el navegador

- `FRONTEND_URL` en `.env` debe ser la URL exacta sin trailing slash.
- Correcto: `https://tudominio.com`
- Incorrecto: `https://tudominio.com/`
- Después de cambiar `.env`, reiniciar la app.

### La terminal de cPanel no tiene el `node` correcto

```bash
# Activar el entorno virtual de la aplicación
source /home/tuusuario/nodevenv/cms.tudominio.com/22/bin/activate
node --version  # debe mostrar v22.x.x
```

---

## Notas adicionales

### Puerto de Strapi con cPanel/Passenger

Passenger redirige las peticiones externas del puerto 80/443 hacia el proceso Node.js interno. No necesitas exponer el puerto 1337 públicamente.

### Archivos de medios en disco local

Si no usas Wasabi, los uploads se guardan en `public/uploads/`. Monitorea el uso en cPanel → Files → Disk Usage e inclúyelos en los backups periódicos de cPanel.

### Acceso al panel admin

El panel admin de Strapi estará en: `http://cms.tudominio.com/admin`

API y admin comparten el mismo proceso — no necesitas configuración adicional para que ambos funcionen.
