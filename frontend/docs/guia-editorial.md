# Guía editorial — Cómo gestionar la documentación

Esta guía está escrita para el equipo editorial: personas encargadas de crear, editar y publicar la documentación del sistema. No se requiere conocimiento técnico de programación.

---

## Tabla de contenidos

1. [Acceder al panel de administración](#acceder-al-panel-de-administración)
2. [Conocer la interfaz](#conocer-la-interfaz)
3. [Gestionar categorías](#gestionar-categorías)
4. [Crear y editar artículos](#crear-y-editar-artículos)
5. [El editor de bloques](#el-editor-de-bloques)
6. [Subir imágenes y archivos](#subir-imágenes-y-archivos)
7. [Gestión de idiomas (es / en)](#gestión-de-idiomas-es--en)
8. [Publicar, guardar como borrador, despublicar](#publicar-guardar-como-borrador-despublicar)
9. [Gestionar usuarios del panel](#gestionar-usuarios-del-panel)
10. [Buenas prácticas editoriales](#buenas-prácticas-editoriales)

---

## Acceder al panel de administración

La dirección del panel es:

```
https://tudominio.com/admin
```

> En desarrollo local: `http://localhost:1337/admin`

**Primera vez:** El primer acceso requiere crear una cuenta de superadministrador. Solo aparece una vez — si ya fue creado, verás directamente el formulario de inicio de sesión.

**Inicio de sesión:**
1. Escribe tu correo electrónico
2. Escribe tu contraseña
3. Haz clic en **"Login"**

Si olvidaste tu contraseña, haz clic en **"Forgot your password?"** y recibirás un correo para restablecerla.

---

## Conocer la interfaz

Una vez dentro, verás el panel principal con estas secciones en la barra lateral izquierda:

```
┌─────────────────────────────────────┐
│  CONTENT MANAGER                    │  ← Aquí gestionas el contenido
│    ├── Documentation Articles       │
│    └── Documentation Categories     │
│                                     │
│  MEDIA LIBRARY                      │  ← Aquí subes imágenes y archivos
│                                     │
│  SETTINGS                           │  ← Configuración del sistema
│    ├── Users & Permissions          │
│    ├── Internationalization         │
│    └── ...                          │
└─────────────────────────────────────┘
```

---

## Gestionar categorías

Las categorías organizan los artículos. Por ejemplo: "Instalación", "Configuración", "Preguntas frecuentes".

### Ver categorías existentes

1. En la barra lateral, haz clic en **Content Manager**
2. Selecciona **Documentation Categories**
3. Verás la lista de todas las categorías con su nombre, slug e idioma

### Crear una categoría

1. Haz clic en el botón **"+ Create new entry"** (arriba a la derecha)
2. Rellena los campos:
   - **Name** — Nombre de la categoría (ej: "Guías de inicio")
   - **Slug** — Identificador en la URL (ej: `guias-de-inicio`). Se genera automáticamente desde el nombre, pero puedes editarlo. Solo letras minúsculas, números y guiones.
   - **Description** — Descripción breve (opcional)
3. Selecciona el **idioma** del campo en la parte superior derecha (ej: "es")
4. Haz clic en **"Save"** para guardar como borrador
5. Haz clic en **"Publish"** para publicarla y que aparezca en el portal

> Las categorías deben existir antes de poder asignárselas a artículos.

### Editar una categoría

1. Haz clic en el nombre de la categoría en la lista
2. Modifica los campos necesarios
3. Haz clic en **"Save"**

### Eliminar una categoría

> Precaución: eliminar una categoría no elimina los artículos que tenía asignados, pero esos artículos quedarán sin categoría y podrían no mostrarse en el portal.

1. En la lista de categorías, selecciona la casilla de la categoría
2. Haz clic en **"Delete"** en el menú de acciones

---

## Crear y editar artículos

Los artículos son los documentos que los usuarios finales leen en el portal.

### Crear un artículo

1. En **Content Manager**, selecciona **Documentation Articles**
2. Haz clic en **"+ Create new entry"**
3. Rellena los campos del panel derecho:

| Campo | Descripción |
|---|---|
| **Title** | Título del artículo. Aparece en el portal y en la lista de artículos. |
| **Slug** | Identificador en la URL. Se genera desde el título. Solo minúsculas y guiones. |
| **Excerpt** | Resumen corto (1-2 frases). Aparece en la lista de artículos como descripción previa. |
| **Category** | Categoría a la que pertenece. Selecciona de la lista desplegable. |
| **Content** | Cuerpo del artículo. Usa el editor de bloques (ver sección siguiente). |

4. Haz clic en **"Save"** para guardar
5. Haz clic en **"Publish"** para publicar

### Editar un artículo existente

1. En la lista de artículos, haz clic en el título del artículo
2. Realiza tus cambios
3. Haz clic en **"Save"**

Los cambios se reflejan en el portal en un máximo de **30 segundos** (tiempo de caché del navegador). Si el usuario recarga la página, los cambios son inmediatos.

---

## El editor de bloques

El campo **Content** usa el editor de bloques de Strapi. Es diferente a Word o Google Docs — en lugar de formato visual libre, organizas el contenido en bloques con tipos definidos.

### Agregar un bloque

Haz clic en el símbolo **"+"** que aparece entre bloques o al final del contenido. Selecciona el tipo de bloque del menú.

### Tipos de bloque disponibles

#### Texto (Paragraph)

El bloque más común. Escribe texto normal. Dentro del texto puedes aplicar formato con los botones de la barra de herramientas que aparece al seleccionar texto:

- **B** → Negrita
- **I** → Cursiva
- **U** → Subrayado
- **S** → Tachado
- **{ }** → Código en línea (para nombres de variables, comandos cortos)
- **🔗** → Link/enlace (te pedirá la URL)

#### Encabezado (Heading)

Títulos y subtítulos que estructuran el artículo. Puedes elegir el nivel:
- **H1** — Título principal (usar solo uno por artículo)
- **H2** — Sección principal
- **H3** — Subsección
- **H4, H5, H6** — Niveles más profundos (usar con moderación)

Los encabezados H2 y H3 aparecen automáticamente en la tabla de contenidos del artículo en el portal.

#### Lista (List)

Listas de elementos:
- **Lista no ordenada (•)** — Para elementos sin orden específico
- **Lista ordenada (1. 2. 3.)** — Para pasos secuenciales

Presiona Enter para agregar un elemento nuevo. Presiona Tab para crear un subnivel.

#### Bloque de código (Code)

Para mostrar código de programación, comandos de terminal o configuraciones. Selecciona el lenguaje de programación del menú desplegable para que el código se muestre con el idioma correcto.

```
Ejemplos de lenguajes: javascript, typescript, python, bash, json, yaml, html, css, sql
```

#### Imagen (Image)

Inserta una imagen desde la **Media Library** (biblioteca de medios). Al hacer clic, se abrirá la biblioteca para que selecciones o subas una imagen.

Tras insertar la imagen, puedes agregar:
- **Alt text** — Descripción de la imagen para accesibilidad (lectores de pantalla)
- **Caption** — Texto de pie de imagen (aparece debajo)

#### Cita (Quote)

Para destacar una frase, definición o nota importante. El texto aparecerá visualmente diferenciado del resto del contenido.

### Reordenar bloques

Arrastra el ícono de seis puntos (⠿) que aparece a la izquierda de cada bloque para cambiar su posición.

### Eliminar un bloque

Haz clic en el menú de tres puntos (**...**) a la derecha del bloque y selecciona **"Delete"**.

---

## Subir imágenes y archivos

### Desde la Media Library

1. En la barra lateral, haz clic en **Media Library**
2. Haz clic en **"+ Add new assets"**
3. Arrastra los archivos o haz clic en **"Browse files"**
4. Haz clic en **"Upload assets"**

Los archivos se guardan en **Wasabi** (almacenamiento en la nube). Strapi guarda la URL del archivo.

### Formatos soportados

| Tipo | Formatos |
|---|---|
| Imágenes | PNG, JPG, JPEG, GIF, WebP, SVG |
| Documentos | PDF |
| Hojas de cálculo | XLS, XLSX |
| Otros | Cualquier archivo (se descargará, no se previsualiza) |

### Insertar imagen en un artículo

1. En el editor de bloques, agrega un bloque de tipo **Image**
2. Se abrirá la Media Library automáticamente
3. Selecciona una imagen existente o sube una nueva
4. Haz clic en **"Finish"**

### Tamaño recomendado para imágenes

- **Capturas de pantalla:** 1200px de ancho máximo, formato PNG
- **Diagramas:** SVG o PNG con fondo transparente
- **Fotografías:** JPG/WebP, comprimidas (menos de 500KB)

---

## Gestión de idiomas (es / en)

El portal soporta dos idiomas: **español (es)** y **inglés (en)**. Cada artículo y categoría tiene versiones independientes en cada idioma.

### Crear contenido en español

Cuando creas un artículo nuevo, por defecto está en el idioma **español (es)**.

Puedes verificar el idioma activo en el selector **"Locales"** en la esquina superior derecha de la pantalla de edición.

### Crear la versión en inglés de un artículo

1. Abre el artículo en español
2. En el selector de **"Locales"** (arriba a la derecha), cambia de **"es"** a **"en"**
3. Strapi preguntará si quieres:
   - **"Fill in from another locale"** — Copia el contenido del español como punto de partida (recomendado)
   - Empezar desde cero
4. Traduce todos los campos: título, slug, extracto, contenido
5. Guarda y publica

> El **slug en inglés** puede ser diferente al del español. Ejemplo:
> - Español: `/es/guias/como-instalar`
> - Inglés: `/en/guides/how-to-install`

### Ver solo un idioma en la lista

En la lista de artículos, usa el filtro **"Locale"** para mostrar solo los artículos en español o solo en inglés.

---

## Publicar, guardar como borrador, despublicar

Strapi tiene un sistema de estados para el contenido:

| Estado | Descripción | Visible en el portal |
|---|---|---|
| **Draft** (borrador) | Guardado pero no publicado | No |
| **Published** (publicado) | Visible para todos | Sí |
| **Modified** | Publicado con cambios sin publicar | Sí (versión antigua) |

### Guardar como borrador

Haz clic en **"Save"**. El contenido se guarda pero no aparece en el portal.

### Publicar

Haz clic en **"Publish"**. El contenido se hace visible en el portal inmediatamente (o en máximo 30 segundos por el caché).

### Publicar cambios de un artículo ya publicado

Si editas un artículo publicado y guardas con **"Save"**, queda en estado **"Modified"** — los cambios no son visibles aún. Para que aparezcan en el portal, haz clic en **"Publish"**.

### Despublicar (ocultar del portal)

1. Abre el artículo
2. Haz clic en el menú desplegable junto a **"Publish"**
3. Selecciona **"Unpublish"**

El artículo queda como borrador y desaparece del portal.

---

## Gestionar usuarios del panel

Solo los administradores pueden crear y gestionar usuarios del panel de Strapi.

### Crear un nuevo usuario

1. Ve a **Settings** en la barra lateral
2. Selecciona **Administration Panel → Users**
3. Haz clic en **"Invite new user"**
4. Ingresa nombre, correo y rol
5. El usuario recibirá un correo de invitación

### Roles disponibles

| Rol | Permisos |
|---|---|
| **Super Admin** | Acceso total al panel, incluyendo configuración |
| **Editor** | Crear y publicar contenido, gestionar Media Library |
| **Author** | Crear y editar su propio contenido (no puede publicar) |

> Para personal editorial regular, el rol **Editor** es el más apropiado. Para responsables del sistema, **Super Admin**.

---

## Buenas prácticas editoriales

### Slugs

- Usa siempre letras minúsculas, números y guiones (`-`)
- Evita espacios, tildes y caracteres especiales
- Sé descriptivo pero conciso: `como-instalar-el-sistema` no `instalacion-del-sistema-paso-a-paso-guia-completa`
- Una vez publicado, **no cambies el slug** — las URLs existentes dejarán de funcionar

### Estructura de artículos

Un artículo bien estructurado sigue este patrón:
1. **Un H2** para cada sección principal
2. **H3** para subsecciones dentro de una sección
3. Párrafos cortos (3-5 líneas máximo)
4. Listas para pasos o características
5. Bloques de código para comandos, configuraciones o ejemplos

### Extractos (Excerpt)

Escribe un extracto que describa claramente qué aprenderá el lector:
- **Malo:** "Este artículo habla sobre la instalación"
- **Bueno:** "Aprende a instalar el sistema en Windows y Linux en 5 pasos"

### Imágenes

- Siempre añade un **alt text** descriptivo para accesibilidad
- Las capturas de pantalla deben mostrar solo la parte relevante (no toda la pantalla)
- Si hay texto importante en la imagen, repítelo como texto en el artículo (los motores de búsqueda no leen imágenes)

### Contenido en dos idiomas

- El contenido en inglés no debe ser una traducción literal — adapta los ejemplos y referencias culturales cuando sea necesario
- Mantén los slugs en inglés coherentes con los en español (misma jerarquía)
- Si creas una categoría nueva en español, créala también en inglés antes de publicar artículos
