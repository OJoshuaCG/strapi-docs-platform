# Vite

Vite es el **bundler y servidor de desarrollo** del proyecto. Se encarga de compilar TypeScript, procesar archivos `.svelte`, transformar CSS, y servir la aplicación tanto en desarrollo como en producción.

---

## Tabla de contenidos

1. [¿Qué hace Vite?](#qué-hace-vite)
2. [Versión y configuración](#versión-y-configuración)
3. [Plugins usados](#plugins-usados)
4. [Servidor de desarrollo](#servidor-de-desarrollo)
5. [Variables de entorno](#variables-de-entorno)
6. [Build de producción](#build-de-producción)
7. [Importaciones y alias](#importaciones-y-alias)

---

## ¿Qué hace Vite?

Vite resuelve dos problemas:

**En desarrollo:** Sirve los archivos directamente usando módulos ES nativos del navegador. No empaqueta nada — el navegador carga cada módulo por separado. Esto hace que el servidor de desarrollo arranque en milisegundos y que los cambios se reflejen instantáneamente (HMR — Hot Module Replacement).

**En producción:** Empaqueta toda la aplicación con Rollup (incluido en Vite) en archivos optimizados: JS minificado, CSS extraído, assets con hash para caché perpetuo.

---

## Versión y configuración

**Versión:** `vite ^8.0.7`

**Archivo `vite.config.ts`:**

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),  // Procesa @import "tailwindcss" y @theme
    sveltekit()     // Compila .svelte, gestiona rutas, SSR
  ]
});
```

El orden de los plugins importa: `tailwindcss()` debe ir antes de `sveltekit()` para que el CSS sea procesado antes de que SvelteKit lo use.

---

## Plugins usados

### `@tailwindcss/vite`

Plugin oficial de TailwindCSS v4 para Vite. Reemplaza la configuración de PostCSS de versiones anteriores. Escanea todos los archivos del proyecto en busca de clases Tailwind usadas y genera solo el CSS necesario.

```typescript
import tailwindcss from '@tailwindcss/vite';
```

### `@sveltejs/vite-plugin-svelte`

Plugin de Svelte para Vite, incluido automáticamente por `sveltekit()`. Compila archivos `.svelte` a JavaScript, activa HMR para componentes Svelte, y gestiona los módulos virtuales de SvelteKit (`$app/navigation`, `$app/state`, etc.).

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
```

---

## Servidor de desarrollo

```bash
npm run dev          # Inicia en http://localhost:5173
npm run dev -- --open  # Inicia y abre el navegador automáticamente
```

**Características del servidor de desarrollo:**

- **HMR (Hot Module Replacement):** Los cambios en `.svelte`, `.ts`, y `.css` se reflejan sin recargar la página
- **Error overlay:** Los errores de compilación aparecen superpuestos en el navegador
- **TypeScript en tiempo real:** Los errores de tipo se muestran en la terminal
- **SSR:** El servidor de desarrollo también ejecuta el código de servidor (load functions, hooks)

**Puerto y host configurables con variables de entorno:**

```env
# .env
HOST=0.0.0.0  # 0.0.0.0 permite acceso desde la red local (necesario en Docker)
PORT=5173
```

---

## Variables de entorno

Vite tiene un sistema de variables de entorno integrado basado en archivos `.env`.

### Archivos `.env`

| Archivo | Cuándo se carga |
|---|---|
| `.env` | Siempre |
| `.env.local` | Siempre, ignorado por git |
| `.env.development` | Solo con `npm run dev` |
| `.env.production` | Solo con `npm run build` |

### Prefijo `VITE_`

**Solo las variables con el prefijo `VITE_` son accesibles en el código del navegador.**  
Variables sin el prefijo son privadas y solo accesibles en el servidor (SSR).

```env
# .env
VITE_STRAPI_URL=http://localhost:1337   # Accesible en cliente + servidor
DATABASE_PASSWORD=secreto              # Solo servidor (nunca llega al navegador)
```

**Acceso en el código:**

```typescript
// En cualquier archivo .ts o .svelte
const apiUrl = import.meta.env.VITE_STRAPI_URL;

// TypeScript — declarar el tipo en src/app.d.ts si quieres autocompletado
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_STRAPI_URL: string;
}
```

### Verificar el valor en runtime

```typescript
// En el servidor (hooks.server.ts, +page.server.ts)
console.log(import.meta.env.VITE_STRAPI_URL);  // http://localhost:1337

// En el cliente (navegador)
console.log(import.meta.env.VITE_STRAPI_URL);  // También disponible
```

### Variables "horneadas" en el build

Las variables `VITE_*` se reemplazan literalmente en el bundle durante el build:

```typescript
// Código fuente
const url = import.meta.env.VITE_STRAPI_URL;

// Resultado en el bundle de producción
const url = "http://mi-strapi.com";
```

**Consecuencia importante:** Si necesitas cambiar `VITE_STRAPI_URL` en producción, debes **recompilar** la imagen Docker. El valor queda fijo en el JavaScript.

---

## Build de producción

```bash
npm run build
```

Genera la carpeta `build/` con:

```
build/
├── index.js          ← Servidor Node.js (SSR)
├── client/           ← Assets del cliente (JS, CSS, imágenes)
│   ├── _app/
│   │   ├── immutable/ ← Archivos con hash — cacheados indefinidamente
│   │   └── version.json
└── prerendered/      ← Páginas pre-renderizadas (si las hay)
```

**Ejecutar el build de producción:**

```bash
node build/index.js
# Corre en http://localhost:3000
```

**Previsualizar localmente:**

```bash
npm run preview
# Similar a producción pero con algunas diferencias de desarrollo
```

**Diferencias entre dev y producción:**

| Aspecto | Desarrollo (`npm run dev`) | Producción (`npm run build`) |
|---|---|---|
| Puerto | 5173 | 3000 |
| Código | Sin minificar | Minificado |
| Source maps | Completos | Según configuración |
| Errores | Verbose con stack trace | Mensajes genéricos |
| HMR | Activo | No aplica |
| Velocidad | Más lento (SSR en cada request) | Optimizado |

---

## Importaciones y alias

### Alias `$lib`

Configurado automáticamente por SvelteKit en el `tsconfig.json` generado (`.svelte-kit/tsconfig.json`):

```typescript
// src/lib/api/strapi.ts → accesible como:
import { strapiRequest } from '$lib/api/strapi';

// src/lib/types/strapi.ts → accesible como:
import type { StrapiArticle } from '$lib/types/strapi';
```

### Importar assets estáticos

```typescript
// Imágenes en src/lib/assets/ — procesadas por Vite (hash en el nombre)
import favicon from '$lib/assets/favicon.svg';
// favicon → '/build/assets/favicon-AbCd1234.svg' (en producción)

// Archivos en static/ — servidos tal cual, sin procesamiento
// Acceder vía URL directa: '/robots.txt', '/favicon.ico'
```

### Importar JSON

`resolveJsonModule: true` en `tsconfig.json` permite importar JSON con tipado:

```typescript
import packageJson from '../package.json';
console.log(packageJson.version); // Tipado automático
```

### Módulos virtuales de SvelteKit

Vite + SvelteKit expone módulos que no existen como archivos reales pero están disponibles en el código:

```typescript
import { page } from '$app/state';          // Estado de la ruta actual
import { goto, invalidate } from '$app/navigation'; // Navegación
import { browser } from '$app/environment'; // Detectar si estás en el navegador
import { PUBLIC_API_URL } from '$env/static/public'; // Variables de entorno
```

Estos módulos son generados por `svelte-kit sync` (que corre automáticamente antes de `check` y `build`).
