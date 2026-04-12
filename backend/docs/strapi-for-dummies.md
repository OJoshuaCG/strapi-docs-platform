# Strapi para Principiantes

> Audiencia: editores de contenido, redactores técnicos, cualquier persona que usará el panel de administración para crear y gestionar documentación.
> No se necesitan conocimientos de programación.

---

## Tabla de contenidos

1. [¿Qué es Strapi?](#1-qué-es-strapi)
2. [Acceder al panel](#2-acceder-al-panel)
3. [Vista general del panel](#3-vista-general-del-panel)
4. [Gestionar categorías](#4-gestionar-categorías)
5. [Gestionar artículos](#5-gestionar-artículos)
6. [Trabajar con idiomas](#6-trabajar-con-idiomas)
7. [Borradores y publicación](#7-borradores-y-publicación)
8. [Biblioteca de medios](#8-biblioteca-de-medios)
9. [La API REST (para el equipo técnico)](#9-la-api-rest-para-el-equipo-técnico)
10. [Roles y permisos](#10-roles-y-permisos)
11. [Preguntas frecuentes](#11-preguntas-frecuentes)

---

## 1. ¿Qué es Strapi?

Strapi es un **CMS headless** (sistema de gestión de contenido sin cabeza). En términos simples:

- Tú creas y editas el contenido desde un panel web (este panel).
- El contenido se almacena en una base de datos.
- Un frontend (sitio web, app) consume ese contenido a través de una API.

La diferencia con un CMS tradicional como WordPress es que Strapi **no genera el sitio web por sí solo** — solo gestiona el contenido. Esto lo hace más flexible y permite que el mismo contenido aparezca en una web, una app móvil, o cualquier otro cliente.

### Glosario rápido

| Término | Significado |
|---|---|
| **Content Type** | Plantilla que define la estructura de un tipo de contenido (ej: "Artículo", "Categoría") |
| **Entrada (entry)** | Un registro concreto de un Content Type (ej: el artículo "Cómo instalar Docker") |
| **Draft** | Borrador — creado pero no visible en la API pública |
| **Published** | Publicado — visible en la API y por tanto en el frontend |
| **Locale** | Idioma/variante regional (ej: `es`, `en`) |
| **Slug** | Identificador de URL amigable (ej: `como-instalar-docker`) |
| **Relation** | Relación entre dos tipos de contenido (ej: un artículo pertenece a una categoría) |

---

## 2. Acceder al panel

### Primera vez

1. Navega a `http://localhost:1337/admin`
2. Verás un formulario de **registro** (solo la primera vez)
3. Crea tu cuenta de administrador: nombre, email, y contraseña segura
4. Haz clic en "Let's start"

> Esta cuenta tiene acceso total al sistema. Comparte las credenciales solo con personas de confianza.

### Accesos posteriores

1. Navega a `http://localhost:1337/admin`
2. Ingresa tu email y contraseña
3. Haz clic en "Login"

### Recuperar contraseña

En la pantalla de login → "Forgot your password?" → introduce tu email → revisa tu bandeja de entrada.

> Para que el envío de emails funcione se necesita configurar un proveedor de email en Strapi. Si no está configurado, pide al administrador del sistema que resetee la contraseña directamente.

---

## 3. Vista general del panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Barra lateral izquierda                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Content Manager      ← crear y editar contenido          │   │
│  │ Media Library        ← imágenes, archivos               │   │
│  │ ──────────────────                                       │   │
│  │ Settings             ← configuración, permisos, roles    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Content Manager

Tu área de trabajo principal. Aquí verás:
- **Documentation Articles** — todos los artículos
- **Documentation Categories** — todas las categorías

### Media Library

Gestiona imágenes, PDFs y otros archivos que puedes insertar en los artículos.

### Settings

Configuración del sistema: usuarios, roles, permisos de la API, idiomas. Normalmente solo lo toca el administrador técnico.

---

## 4. Gestionar categorías

Las categorías sirven para agrupar artículos relacionados (ej: "Instalación", "Configuración", "Referencia de API").

### Crear una categoría

1. **Content Manager** → **Documentation Categories** → **Create new entry**
2. Rellena los campos:

| Campo | Descripción |
|---|---|
| **Name** | Nombre visible de la categoría |
| **Slug** | Se genera automáticamente desde el nombre. Puedes editarlo si lo necesitas. |
| **Description** | Descripción opcional |
| **Order** | Número entero para ordenar categorías manualmente (1, 2, 3…) |

3. Haz clic en **Save** para guardar como borrador
4. Haz clic en **Publish** para que quede visible en la API

> Crea primero las categorías antes de crear artículos, así puedes asignarlas al crear el artículo.

### Editar una categoría

1. **Content Manager** → **Documentation Categories**
2. Haz clic sobre la categoría a editar
3. Modifica los campos y haz clic en **Save**
4. Si ya estaba publicada, los cambios se reflejan al guardar (no necesitas volver a publicar para cambios menores)

### Eliminar una categoría

1. En la lista de categorías, marca la casilla de la categoría
2. Clic en **Delete** en la barra de acciones superior

> Si eliminas una categoría, los artículos que le pertenecían quedan sin categoría asignada. No se eliminan los artículos.

---

## 5. Gestionar artículos

### Crear un artículo

1. **Content Manager** → **Documentation Articles** → **Create new entry**
2. Rellena los campos:

| Campo | Obligatorio | Descripción |
|---|---|---|
| **Title** | Sí | Título del artículo |
| **Slug** | Sí (auto) | Identificador URL. Se genera desde el título. Cámbialo si necesitas una URL específica. |
| **Content** | Sí | Cuerpo del artículo — editor de texto enriquecido |
| **Excerpt** | No | Resumen breve (máx. 300 caracteres) — para listados, vista previa |
| **Version** | No | Versión del producto que documenta (ej: `1.0.0`) |
| **Category** | No | Categoría a la que pertenece el artículo |

3. **Save** → guarda como borrador
4. **Publish** → publica y hace visible el artículo en la API

### Usar el editor de contenido

El editor de texto enriquecido permite:

- **Negrita** (`Ctrl+B`) / *Cursiva* (`Ctrl+I`)
- Encabezados: H1, H2, H3, H4…
- Listas numeradas y con viñetas
- Bloques de código
- Links
- Imágenes (desde la Media Library)
- Tablas
- Citas (blockquote)

Para insertar una imagen:
1. Coloca el cursor donde quieres la imagen
2. Clic en el ícono de imagen en la barra del editor
3. Se abre la Media Library → selecciona o sube el archivo
4. Confirma

### Editar un artículo existente

1. **Content Manager** → **Documentation Articles**
2. Haz clic sobre el artículo
3. Modifica el contenido → **Save**
4. Los cambios en un artículo ya publicado crean un **nuevo draft** automáticamente. Para que los cambios sean visibles en la API, debes hacer **Publish** nuevamente.

### Eliminar un artículo

1. Abre el artículo
2. Clic en el menú de tres puntos (⋯) → **Delete**

O desde la lista, marca la casilla → **Delete**.

---

## 6. Trabajar con idiomas

Este CMS soporta múltiples idiomas. Los configurados son:
- `es` — Español (idioma por defecto)
- `en` — English

### Agregar el locale "en" (inglés)

Esto solo se hace **una vez**:

1. **Settings** → **Internationalization** → **Add a locale**
2. Selecciona `en - English`
3. Marca la opción "Set as default locale" solo si quieres que inglés sea el idioma por defecto (recomendado dejarlo en español)
4. Haz clic en **Save**

### Crear contenido en un idioma adicional

1. Crea o abre un artículo/categoría en español (el idioma por defecto)
2. En la esquina superior derecha verás el selector de locale: `es`
3. Haz clic en él y selecciona `en`
4. Aparecerá un formulario **vacío** — introduce el contenido en inglés
5. Los campos marcados como "localizable" (title, slug, content, excerpt, description, name) son independientes por idioma
6. Los campos no localizables (version, order) se comparten entre todos los idiomas
7. **Save** y luego **Publish** para ese locale

> **Importante:** publicar en un locale no publica automáticamente en los otros. Cada locale tiene su propio estado de draft/published.

### Ver contenido en otro locale

En la lista de artículos, usa el selector de idioma en la parte superior para filtrar por locale.

### Agregar nuevos idiomas en el futuro

El proceso es el mismo: **Settings** → **Internationalization** → **Add a locale**. Strapi soporta cualquier locale estándar (fr, de, pt, zh, ar, etc.).

---

## 7. Borradores y publicación

Cada entrada puede estar en uno de dos estados:

```
[Draft] ──→ Publish ──→ [Published]
  ▲                           │
  └────── Unpublish ←─────────┘
```

| Estado | Visible en API pública | Editable |
|---|---|---|
| **Draft** | No | Sí |
| **Published** | Sí | Sí (los cambios crean un nuevo draft interno) |

### Flujo recomendado

1. **Crea** el artículo y trabaja en él como borrador
2. Cuando esté listo, haz clic en **Publish**
3. Para hacer correcciones a un artículo publicado: edita y guarda normalmente. Los cambios **no son visibles** hasta que hagas **Publish** de nuevo.
4. Para despublicar temporalmente un artículo: **Unpublish**

> Un artículo en draft no aparecerá en el sitio web aunque esté guardado con toda su información.

---

## 8. Biblioteca de medios

### Subir archivos

1. **Media Library** → **Add new assets** (esquina superior derecha)
2. Arrastra archivos o usa el selector de archivos
3. Los archivos se suben a Wasabi S3 (o al disco local si Wasabi no está configurado)

### Tipos de archivos soportados

- Imágenes: JPG, PNG, GIF, WebP, SVG
- Documentos: PDF
- Vídeos: MP4 (si el tamaño lo permite)
- Cualquier otro tipo de archivo

### Organizar archivos con carpetas

1. En la Media Library, haz clic en **Create folder**
2. Nombra la carpeta (ej: "capturas-de-pantalla", "diagramas")
3. Mueve archivos a la carpeta arrastrando o con la opción de "Move to folder"

### Editar metadatos de un archivo

Haz clic en el archivo → panel lateral derecho:
- **Alternative text (Alt text)** — importante para accesibilidad e SEO
- **Caption** — pie de foto
- **File name** — nombre del archivo

---

## 9. La API REST (para el equipo técnico)

La API es consumida por el frontend. Esta sección es referencia para desarrolladores.

### URL base

```
http://localhost:1337/api
```

### Endpoints disponibles

#### Artículos

```
GET /api/documentation-articles
GET /api/documentation-articles/:documentId
```

Solo devuelve artículos **publicados** por defecto.

#### Categorías

```
GET /api/documentation-categories
GET /api/documentation-categories/:documentId
```

### Parámetros útiles

**Filtrar por locale:**
```
GET /api/documentation-articles?locale=en
GET /api/documentation-articles?locale=es
```

**Incluir la categoría relacionada:**
```
GET /api/documentation-articles?populate[category][fields][0]=name&populate[category][fields][1]=slug
```

**Filtrar por slug:**
```
GET /api/documentation-articles?filters[slug][$eq]=mi-articulo
```

**Paginación:**
```
GET /api/documentation-articles?pagination[page]=1&pagination[pageSize]=10
```

**Ordenar:**
```
GET /api/documentation-articles?sort=createdAt:desc
GET /api/documentation-categories?sort=order:asc
```

**Combinar parámetros:**
```
GET /api/documentation-articles
  ?locale=en
  &populate[category]=true
  &pagination[pageSize]=20
  &sort=createdAt:desc
```

### Estructura de respuesta

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123xyz",
      "title": "Cómo instalar Docker",
      "slug": "como-instalar-docker",
      "excerpt": "Guía paso a paso para instalar Docker en Ubuntu.",
      "content": "...",
      "version": "1.0.0",
      "locale": "es",
      "publishedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-14T09:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "category": {
        "id": 1,
        "name": "Instalación",
        "slug": "instalacion"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 5
    }
  }
}
```

---

## 10. Roles y permisos

Strapi tiene tres roles por defecto:

| Rol | Quién | Qué puede hacer |
|---|---|---|
| **Super Admin** | Administrador técnico | Todo: contenido, configuración, usuarios, permisos |
| **Editor** | Redactor de contenido | Crear, editar y publicar contenido. Sin acceso a configuración técnica |
| **Author** | Colaborador | Crear y editar su propio contenido, no puede publicar |

### Permisos de la API pública

La API expone contenido **sin autenticación** para:
- `GET /api/documentation-articles` (solo publicados)
- `GET /api/documentation-categories` (solo publicadas)

Para verificar o modificar estos permisos:
1. **Settings** → **Roles** → **Public**
2. En "Documentation Article": verifica que `find` y `findOne` estén habilitados
3. En "Documentation Category": verifica que `find` y `findOne` estén habilitados

> No habilites `create`, `update`, o `delete` para el rol Public — cualquier persona podría modificar el contenido sin autenticación.

### Crear un usuario del panel

1. **Settings** → **Administration Panel** → **Invite new user**
2. Introduce el email del usuario
3. Selecciona el rol: Super Admin, Editor, o Author
4. El usuario recibirá un email con instrucciones (requiere proveedor de email configurado)

---

## 11. Preguntas frecuentes

**¿Por qué mi artículo no aparece en el sitio web?**
Verifica que el artículo esté en estado "Published". Un artículo guardado como draft no es visible en la API.

---

**Publiqué un artículo pero sigo viendo el contenido antiguo**
Los cambios guardados después de una publicación crean un nuevo draft interno. Debes hacer clic en "Publish" nuevamente para que los cambios sean visibles.

---

**¿Puedo eliminar un locale de un artículo?**
Sí. Abre el artículo, selecciona el locale que quieres eliminar en el selector de idioma, y usa la opción "Delete this locale" en el menú de tres puntos.

---

**¿Se pueden agregar más idiomas?**
Sí. **Settings** → **Internationalization** → **Add a locale**. Luego podrás crear traducciones para ese idioma en todos los artículos y categorías.

---

**¿Cómo sé la URL de un artículo publicado?**
La URL del API endpoint es:
```
GET /api/documentation-articles?filters[slug][$eq]=TU-SLUG&locale=es
```
La URL "amigable" del frontend depende de cómo esté implementado el frontend (no Strapi).

---

**Subí una imagen pero no aparece en los artículos existentes**
Subir una imagen a la Media Library no la inserta automáticamente en ningún artículo. Debes ir al artículo, editar el campo Content, posicionar el cursor donde quieres la imagen, y usar el ícono de imagen del editor.

---

**¿Puedo ver una vista previa del artículo antes de publicar?**
Strapi no tiene vista previa integrada. La preview depende de que el frontend implemente una ruta de preview. Esta funcionalidad es parte del roadmap del frontend (fuera del alcance actual).

---

**¿Dónde están guardadas las imágenes que subo?**
Si Wasabi está configurado: en el bucket S3 de Wasabi, bajo el prefijo `cms/`.
Si Wasabi no está configurado: en `backend/cms/public/uploads/` del servidor.
