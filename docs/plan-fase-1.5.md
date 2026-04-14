# Plan de Mejoras — Admin Strapi (Fase 1.5)

> Creado: 2026-04-13  
> Estado: Pendiente de aprobación  
> Alcance: Mejoras al panel admin de Strapi y ajustes relacionados en el frontend

---

## Contexto del análisis

El backend tiene **3 Content Types** funcionales: `documentation-article`, `documentation-category` y `global-setting`. El frontend consume los Global Settings y los convierte en **26 variables CSS** de color + tipografía + espaciado + layout. Actualmente no hay Live Preview, email configurado, ni selector de color visual.

---

## Feature 1 — Live Preview de Artículos

**Qué es:** Al editar un artículo en el admin, aparece un botón "Open preview" que abre el frontend renderizando esa entrada **incluyendo borradores**, sin necesidad de publicar.

**Cómo funciona en Strapi v5:**

1. Se habilita `previewable: true` en el `schema.json` del artículo.
2. En `config/admin.ts` se define la URL de preview: `http://localhost:5173/api/preview?secret=TOKEN&documentId={documentId}&locale={locale}`.
3. El frontend expone una ruta `+server.ts` en `/api/preview` que:
   - Valida el `secret` (token compartido vía `.env`)
   - Llama a Strapi con un **API Token de tipo Draft** (permite leer borradores)
   - Redirige a la URL real del artículo en modo preview
4. La ruta de artículo detecta el modo preview y omite el filtro de publicados.

**Archivos a modificar/crear:**

| Archivo | Cambio |
|---|---|
| `backend/cms/src/api/documentation-article/content-types/.../schema.json` | Agregar `"options": { "previewable": true }` |
| `backend/cms/config/admin.ts` | Agregar bloque `contentManager.preview` con la URL |
| `backend/.env.example` | Agregar `PREVIEW_SECRET=` |
| `frontend/src/routes/api/preview/+server.ts` | Nuevo endpoint de validación |
| `frontend/src/routes/[locale]/[category]/[slug]/+page.ts` | Soportar modo preview (leer borradores) |

**Resultado esperado:** Botón "Open preview" en la barra superior del editor de artículos. Click → nueva pestaña con el artículo en el frontend tal como se verá al publicar.

---

## Feature 2 — Live Preview de Global Settings

**Qué es:** Al editar Global Settings (colores, fuentes, espaciado), el editor puede ver **en tiempo real** cómo quedaría el sitio antes de guardar.

**El desafío:** Global Setting no es un artículo, es un singleton de configuración. El sistema de preview estándar de Strapi v5 no aplica directamente.

**Solución propuesta — iframe con postMessage:**

1. Se crea una **página de preview dedicada** en el frontend: `/preview/theme` que carga el layout completo con contenido de ejemplo.
2. Se desarrolla una **customización en `src/admin/app.ts`** que:
   - Inyecta un panel lateral en la vista de Global Setting con un `<iframe>` apuntando a `/preview/theme`
   - Cada vez que el editor modifica un campo de color/tipografía, envía los valores al iframe vía `postMessage`
3. El iframe escucha el mensaje y aplica las CSS variables en tiempo real sin recargar la página.

**Archivos a crear:**

| Archivo | Propósito |
|---|---|
| `backend/cms/src/admin/app.ts` | Registrar el panel de preview en la vista de Global Setting |
| `frontend/src/routes/preview/theme/+page.svelte` | Página de preview con mock content |

**Resultado esperado:** Panel derecho en la pantalla de Global Settings con una mini-preview del sitio que se actualiza en vivo mientras se editan colores y fuentes.

---

## Feature 3 — Servidor de Correo (Invitación de Usuarios)

**Qué es:** Configurar el proveedor de email de Strapi para que el panel admin pueda enviar invitaciones a nuevos administradores/editores y recuperación de contraseñas.

**Cómo funciona:** Strapi incluye soporte para `@strapi/provider-email-nodemailer` como proveedor estándar SMTP. Solo requiere instalar el paquete, configurar `plugins.ts` y agregar variables al `.env`.

**Variables de entorno a agregar:**

```env
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notificaciones@tudominio.com
SMTP_PASS=...
EMAIL_FROM="Doc Platform <notificaciones@tudominio.com>"
EMAIL_REPLY_TO=admin@tudominio.com
```

**Compatibilidad:** Funciona con cualquier proveedor SMTP — Gmail (App Password), Outlook, Sendgrid, Mailgun, Resend, o servidor propio.

**Archivos a modificar:**

| Archivo | Cambio |
|---|---|
| `backend/cms/package.json` | Agregar `@strapi/provider-email-nodemailer` |
| `backend/cms/config/plugins.ts` | Agregar bloque `email` con nodemailer |
| `backend/.env.example` | Agregar variables `SMTP_*` y `EMAIL_*` |

**Resultado esperado:** En Settings → Administration → Invite new administrator, el botón de invitación envía un correo con link temporal. La funcionalidad "Forgot password" también queda operativa.

---

## Feature 4 — Selector de Color Visual en Global Settings

**El problema actual:** Los 26 campos de color son campos de texto plano. El editor ve `#3b82f6` y no sabe qué parte del sitio afecta ni cómo luce ese color.

### 4a. Plugin Color Picker (selector visual)

Strapi tiene el plugin oficial `@strapi/plugin-color-picker` que convierte campos `string` en selectores de color con previsualización del color actual + selector visual tipo colorwheel/hex.

- Instalar `@strapi/plugin-color-picker` en el CMS
- Habilitar en `config/plugins.ts`
- Cambiar el tipo de campo en `src/components/theme/colors.json` de `string` a `customField: "plugin::color-picker.color"`

### 4b. Etiquetas descriptivas en los campos de color

Agregar `pluginOptions.description` en el schema de cada campo para que aparezca como tooltip/ayuda en el admin:

| Campo | Descripción |
|---|---|
| `lightBgPrimary` | Fondo principal de la página (modo claro). Afecta el área de contenido |
| `lightBgSecondary` | Fondo de elementos secundarios: tablas, hover states (modo claro) |
| `lightBgSidebar` | Fondo del menú lateral izquierdo (modo claro) |
| `lightTextPrimary` | Color del texto principal de artículos (modo claro) |
| `lightTextSecondary` | Texto secundario: subtítulos, descripciones (modo claro) |
| `lightTextMuted` | Texto tenue: fechas, metadatos, paginación (modo claro) |
| `lightBorderColor` | Líneas divisoras, bordes de cards y tablas (modo claro) |
| `lightCodeBg` | Fondo de bloques de código inline y en bloque (modo claro) |
| `lightCodeText` | Color del texto dentro de bloques de código (modo claro) |
| `lightCalloutBg` | Fondo de notas/callouts informativos (modo claro) |
| `lightCalloutBorder` | Borde izquierdo de callouts — color de acento visual (modo claro) |
| `darkBgPrimary` | Fondo principal de la página (modo oscuro) |
| `darkBgSecondary` | Fondo de elementos secundarios (modo oscuro) |
| `darkBgSidebar` | Fondo del menú lateral izquierdo (modo oscuro) |
| `darkTextPrimary` | Color del texto principal de artículos (modo oscuro) |
| `darkTextSecondary` | Texto secundario (modo oscuro) |
| `darkTextMuted` | Texto tenue: fechas, metadatos (modo oscuro) |
| `darkBorderColor` | Líneas divisoras y bordes (modo oscuro) |
| `darkCodeBg` | Fondo de bloques de código (modo oscuro) |
| `darkCodeText` | Color del texto dentro de código (modo oscuro) |
| `darkCalloutBg` | Fondo de callouts (modo oscuro) |
| `darkCalloutBorder` | Borde izquierdo de callouts (modo oscuro) |
| `brand50` | Versión muy clara del color de marca — fondos hover, highlights suaves |
| `brand500` | **Color principal de marca** — links, botones activos, ítem activo en sidebar |
| `brand900` | Versión oscura del color de marca — callouts y acentos en modo oscuro |

**Archivos a modificar:**

| Archivo | Cambio |
|---|---|
| `backend/cms/package.json` | Agregar `@strapi/plugin-color-picker` |
| `backend/cms/config/plugins.ts` | Habilitar plugin color-picker |
| `backend/cms/src/components/theme/colors.json` | Cambiar tipo de campos a `customField` + agregar `description` por campo |

---

## Feature 5 — Funcionalidades Adicionales Recomendadas

### 5a. Campos SEO en Artículos *(alta prioridad)*

Los artículos actualmente no tienen metadatos propios para SEO. El frontend hace SSR pero usa el título del artículo como único `<title>`.

**Campos a agregar en `documentation-article`:**

| Campo | Tipo | Propósito |
|---|---|---|
| `seoTitle` | string (opcional) | Título alternativo para `<title>` y `og:title` |
| `seoDescription` | text, max 160 | Para `<meta name="description">` y `og:description` |
| `ogImage` | media (imagen) | Imagen para compartir en redes sociales (`og:image`) |

### 5b. Roles Diferenciados *(recomendado antes de invitar usuarios)*

Antes de invitar colaboradores, definir roles para controlar qué puede hacer cada uno. **No requiere código** — se configura desde Settings → Roles en el panel admin.

| Rol sugerido | Permisos |
|---|---|
| **Super Admin** | Todo (ya existe) |
| **Editor** | Crear, editar y publicar artículos y categorías. Sin acceso a Global Settings ni gestión de usuarios |
| **Redactor** | Solo crear y editar artículos (sin publicar). Un Editor los revisa y publica |

### 5c. Orden de Artículos dentro de Categoría

El campo `order` existe en `documentation-category`, pero los artículos se ordenan por `createdAt` ascendente. No hay forma de controlar el orden manualmente.

**Mejora:** Agregar campo `order` (integer) a `documentation-article` y ajustar el frontend para ordenar por ese campo en el sidebar.

### 5d. Webhook de Invalidación de Caché

En producción, cuando se publica o despublica un artículo, el frontend mantiene la caché 30 segundos. Puede causar confusión.

**Solución sin código:** Configurar un webhook en Strapi (Settings → Webhooks) que llame a un endpoint del frontend al publicar/despublicar. El frontend invalida su caché al recibirlo.

### 5e. Datos del Sitio en Global Settings

Agregar campos al singleton `global-setting` para que el sitio sea completamente configurable desde el admin sin tocar código:

| Campo | Tipo | Propósito |
|---|---|---|
| `favicon` | media (imagen) | Favicon del sitio |
| `ogDefaultImage` | media (imagen) | Imagen por defecto para redes sociales cuando el artículo no tiene imagen propia |
| `siteDescription` | text | Descripción del sitio para la página principal y SEO |
| `footerText` | string | Texto del footer (ej: "© 2026 Mi Empresa") |

---

## Resumen y orden de implementación sugerido

| Prioridad | Feature | Esfuerzo estimado | Impacto |
|---|---|---|---|
| 1 | **F3 — Email / Invitaciones** | Bajo — config + 1 paquete | Alto — desbloquea colaboradores |
| 2 | **F4 — Color Picker visual** | Bajo-Medio — plugin + schema | Alto — UX admin inmediata |
| 3 | **F1 — Live Preview artículos** | Medio — backend + frontend | Alto — workflow editorial |
| 4 | **F5a — Campos SEO** | Bajo — schema + frontend | Alto — SEO en producción |
| 5 | **F5e — Datos del sitio en Settings** | Bajo — schema + frontend | Medio |
| 6 | **F2 — Live Preview Global Settings** | Alto — plugin admin custom | Medio |
| 7 | **F5c — Orden artículos** | Bajo — schema + frontend | Medio |
| 8 | **F5d — Webhook invalidación caché** | Bajo — solo config Strapi | Medio (producción) |
| 9 | **F5b — Roles diferenciados** | Sin código — config admin | Medio-Alto |

---

## Notas técnicas

- Las Features 1, 3, 4 y 5a/5e son **independientes entre sí** y pueden implementarse en paralelo.
- La Feature 2 (Live Preview Global Settings) depende de que el frontend ya tenga la ruta `/preview/theme`, lo cual puede construirse como parte de F1.
- La Feature 5b (Roles) debe hacerse **antes** de ejecutar F3 para no dar permisos excesivos a los primeros invitados.
- Al agregar campos nuevos al schema de Strapi, **Strapi auto-genera la migración** de base de datos. No es necesario escribir SQL manual.
- Antes de cualquier cambio en schema en producción: hacer backup de MariaDB.
