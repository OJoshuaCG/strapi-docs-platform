# Plan: Sistema de documentación múltiple en Strapi v5

## Contexto del proyecto

- **Strapi:** v5, instalado en producción, sin contenido real aún
- **Espacios de documentación estimados:** entre 5 y 10
- **Acceso:** público, sin autenticación en los frontends
- **Equipo:** único, acceso completo al Admin Panel sin restricciones por espacio
- **Contenido compartido entre espacios:** no existe. Referencias entre espacios son URLs públicas externas
- **Frontends:** uno por espacio de documentación, cualquier tecnología que consuma REST API
- **Roles y permisos granulares por espacio:** fuera del alcance de este plan

---

## ¿Es posible esta arquitectura en Strapi v5?

Sí, y es el uso natural de Strapi para este tipo de sistema. No se requieren plugins de pago, instancias múltiples ni bases de datos separadas.

La separación entre espacios se logra mediante tres mecanismos combinados:

1. Un Content Type `documentation-space` que actúa como registro discriminador
2. Una relación obligatoria desde `category` y `article` hacia su espacio correspondiente
3. Un middleware que filtra automáticamente todas las consultas públicas por espacio

---

## Fase 1: Modelo de datos

### Objetivo
Definir los tres Content Types que sostienen el sistema y sus relaciones.

---

### 1.1 Content Type: `documentation-space`

**Tipo:** Collection Type

Este es el registro raíz del sistema. Cada instancia representa un espacio de documentación independiente. Todos los demás registros deben apuntar a uno de estos.

| Campo | Tipo en Strapi | Obligatorio | Único | Notas |
|---|---|---|---|---|
| `name` | Short text | Sí | Sí | Nombre legible. Ej: "Documentación App1" |
| `slug` | UID — generado desde `name` | Sí | Sí | Identificador URL-safe. Ej: "documentacion-app1" |
| `description` | Long text | No | No | Descripción del propósito del espacio |
| `is_active` | Boolean | Sí | No | Default: `true`. Permite desactivar sin eliminar |

No se definen relaciones inversas en este Content Type. Las relaciones se declaran desde `category` y `article` apuntando hacia aquí.

---

### 1.2 Content Type: `category`

**Tipo:** Collection Type

Representa una sección o agrupación de artículos dentro de un espacio. Una categoría pertenece a un único espacio y no puede ser compartida entre espacios.

| Campo | Tipo en Strapi | Obligatorio | Único | Notas |
|---|---|---|---|---|
| `name` | Short text | Sí | No | Único dentro del espacio por convención, no técnicamente |
| `slug` | UID — generado desde `name` | Sí | Sí | Único global en la colección |
| `description` | Long text | No | No | |
| `order` | Integer | No | No | Para ordenamiento manual en la navegación lateral |
| `documentation_space` | Relation → `documentation-space` | Sí | No | Tipo: Many-to-One |

---

### 1.3 Content Type: `article`

**Tipo:** Collection Type

Unidad mínima de contenido. Cada artículo pertenece a un espacio y a una categoría. Ambas relaciones son obligatorias.

| Campo | Tipo en Strapi | Obligatorio | Único | Notas |
|---|---|---|---|---|
| `title` | Short text | Sí | No | |
| `slug` | UID — generado desde `title` | Sí | Sí | Único global en la colección |
| `content` | Blocks | Sí | No | Editor de bloques nativo de Strapi v5 |
| `excerpt` | Long text | No | No | Resumen para listados y metadatos SEO |
| `order` | Integer | No | No | Ordenamiento dentro de la categoría |
| `documentation_space` | Relation → `documentation-space` | Sí | No | Many-to-One |
| `category` | Relation → `category` | Sí | No | Many-to-One |

---

### 1.4 Advertencia sobre slugs únicos globalmente

Strapi genera slugs únicos a nivel de toda la colección, no por espacio. Esto significa que no pueden existir dos artículos con slug `introduccion` en espacios distintos. En la práctica, artículos de distintas aplicaciones raramente comparten el mismo título exacto. Si ocurre, el editor diferencia el slug manualmente al momento de crearlo, por ejemplo `introduccion-app1` frente a `introduccion-app2`. No se requiere configuración adicional para esto.

---

### 1.5 Integridad referencial entre `article` y `category`

Strapi no valida automáticamente que la `category` de un artículo pertenezca al mismo `documentation_space` que el artículo. Esta validación se implementa mediante un lifecycle hook en la Fase 3. Es un gap del modelo que debe ser compensado en la lógica de la aplicación.

---

## Fase 2: Configuración inicial en el Admin Panel

### Objetivo
Crear los registros base y los tokens de acceso para que los frontends puedan consumir la API.

---

### 2.1 Crear los registros de `documentation-space`

Una vez que los Content Types estén creados y desplegados, ingresar al Content Manager del Admin Panel y crear un registro por cada espacio. Ejemplo de los primeros registros:

- `name`: "Documentación App1" → `slug`: "documentacion-app1" → `is_active`: true
- `name`: "Documentación App2" → `slug`: "documentacion-app2" → `is_active`: true

Estos registros son la fuente de verdad del sistema. Ninguna categoría ni artículo debe crearse sin tener asignado su espacio.

---

### 2.2 Crear un token de API por espacio

En `Settings > API Tokens`, crear un token por cada espacio con las siguientes propiedades:

- **Token type:** Read-only
- **Token duration:** Unlimited
- **Nombre:** `frontend-[slug]` — por ejemplo `frontend-documentacion-app1`

Guardar cada token en el gestor de contraseñas del equipo en el momento de su creación. Strapi solo muestra el token una vez.

Estos tokens identifican de qué frontend proviene cada petición. Son de solo lectura porque los frontends son públicos y nunca deben escribir contenido.

---

### 2.3 Permisos públicos

En `Settings > Users & Permissions Plugin > Roles > Public`, habilitar únicamente las siguientes acciones:

| Content Type | Acciones permitidas |
|---|---|
| `documentation-space` | `find`, `findOne` |
| `category` | `find`, `findOne` |
| `article` | `find`, `findOne` |

No habilitar `create`, `update` ni `delete` en ningún Content Type para el rol Public.

---

## Fase 3: Middleware y validaciones en Strapi v5

### Objetivo
Garantizar a nivel de código que las peticiones públicas solo devuelvan datos del espacio solicitado, y que la integridad del modelo se mantenga en operaciones de escritura desde el Admin Panel.

---

### 3.1 Middleware de filtrado por espacio

Este es el componente de seguridad más importante del sistema. Sin él, una petición a `/api/articles` devuelve artículos de todos los espacios mezclados.

**Comportamiento esperado del middleware:**

El middleware intercepta todas las peticiones `GET` que lleguen a `/api/categories` y `/api/articles`. Lee el query param `space` de la URL de la petición. Verifica que el valor corresponda a un registro de `documentation-space` existente con `is_active: true`. Si la verificación es exitosa, inyecta automáticamente un filtro en la query de Strapi para que solo se devuelvan registros cuyo campo `documentation_space.slug` coincida con el valor recibido.

Si el parámetro `space` no está presente en la petición, el middleware responde con un error HTTP `400 Bad Request` y el mensaje `"El parámetro space es obligatorio."`.

Si el valor de `space` no corresponde a ningún espacio activo, el middleware responde con `400` y el mensaje `"El espacio de documentación no existe o está inactivo."`.

**Rutas donde aplica:**
- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/articles`
- `GET /api/articles/:id`

**Rutas donde NO aplica:**
- `GET /api/documentation-spaces` — este endpoint es público sin restricción
- Cualquier ruta del Admin Panel (`/admin/*`) — el panel usa rutas internas separadas

**Ubicación del archivo en el proyecto Strapi:**
`src/middlewares/documentation-space-filter.ts`

El middleware debe registrarse en `config/middlewares.ts` apuntando a las rutas mencionadas.

---

### 3.2 Lifecycle hook: validación de integridad artículo ↔ categoría

**Ubicación:** `src/api/article/content-types/article/lifecycles.ts`

**Comportamiento esperado:**

Antes de crear un artículo (`beforeCreate`) y antes de actualizarlo (`beforeUpdate`), el hook consulta el `documentation_space` de la `category` asignada al artículo y lo compara con el `documentation_space` del artículo. Si no coinciden, lanza un error de validación con el mensaje: `"La categoría seleccionada no pertenece al mismo espacio de documentación que el artículo."`.

Este hook protege la integridad del modelo tanto cuando se opera desde el Admin Panel como si en algún momento se habilita escritura vía API.

---

## Fase 4: Contrato de API para los frontends

### Objetivo
Definir de forma explícita los endpoints que cada frontend debe consumir. Este contrato es independiente del lenguaje o framework del frontend.

### Regla de uso del contrato

Todos los endpoints públicos requieren el query param `space=<slug>`, que el middleware de la Fase 3 intercepta e inyecta como filtro. El frontend nunca debe construir filtros manuales de Strapi. Debe delegar esta responsabilidad a una capa de servicio interna que inyecte el param `space` automáticamente en cada petición.

---

### 4.1 Obtener estructura de navegación completa

Usar este endpoint para construir el menú lateral o tabla de contenidos del frontend. Devuelve todas las categorías del espacio con sus artículos anidados (solo los campos necesarios para navegación).

```
GET /api/categories
  ?space=<slug>
  &populate[articles][fields][0]=title
  &populate[articles][fields][1]=slug
  &populate[articles][fields][2]=order
  &sort=order:asc
  &pagination[pageSize]=100
```

---

### 4.2 Obtener un artículo individual

Usar este endpoint al navegar a una URL de artículo. Devuelve el contenido completo junto con su categoría.

```
GET /api/articles
  ?space=<slug>
  &filters[slug][$eq]=<article-slug>
  &populate[category][fields][0]=name
  &populate[category][fields][1]=slug
```

---

### 4.3 Buscar artículos por texto

Usar este endpoint para la funcionalidad de búsqueda interna del frontend. Devuelve solo los campos necesarios para mostrar resultados, sin el contenido completo.

```
GET /api/articles
  ?space=<slug>
  &filters[$or][0][title][$containsi]=<query>
  &filters[$or][1][excerpt][$containsi]=<query>
  &fields[0]=title
  &fields[1]=slug
  &fields[2]=excerpt
  &pagination[pageSize]=20
```

---

### 4.4 Obtener lista de espacios disponibles

Endpoint opcional. Útil si existe una página índice que liste todas las documentaciones disponibles.

```
GET /api/documentation-spaces
  ?filters[is_active][$eq]=true
  &fields[0]=name
  &fields[1]=slug
  &fields[2]=description
```

---

### 4.5 Paginación

Los endpoints de `articles` y `categories` soportan paginación mediante:

```
&pagination[page]=1
&pagination[pageSize]=25
```

Para espacios con pocos artículos (menos de 200), se puede omitir la paginación y usar `pageSize=100` para obtener todo en una sola petición. Para espacios más grandes, implementar paginación en el frontend.

---

## Fase 5: Estructura de configuración de cada frontend

### Objetivo
Definir el contrato mínimo de configuración que cada proyecto frontend debe respetar para consumir correctamente la API de su espacio.

---

### 5.1 Variables de entorno mínimas

Cada proyecto frontend, independientemente del lenguaje, debe declarar estas tres variables de entorno:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `STRAPI_API_URL` | URL base de la instancia de Strapi | `https://cms.ejemplo.com` |
| `STRAPI_API_TOKEN` | Token de solo lectura del espacio | `abc123...` |
| `DOCUMENTATION_SPACE_SLUG` | Slug del espacio que consume este frontend | `documentacion-app1` |

Estas tres variables son la única diferencia de configuración entre un frontend y otro.

---

### 5.2 Capa de servicio interna (obligatoria)

En el frontend, todas las llamadas a la API de Strapi deben pasar por una capa de servicio centralizada. Esta capa es responsable de:

- Construir la URL base desde `STRAPI_API_URL`
- Añadir el header `Authorization: Bearer <STRAPI_API_TOKEN>` en cada petición
- Añadir automáticamente el query param `space=<DOCUMENTATION_SPACE_SLUG>` en cada petición
- Manejar errores de red, timeouts y respuestas vacías de forma consistente

Ningún componente de UI debe llamar directamente a Strapi. Si el contrato de la API cambia, solo se modifica esta capa.

---

### 5.3 Rutas mínimas recomendadas para el frontend

| Ruta | Contenido |
|---|---|
| `/` | Página de inicio de la documentación |
| `/[category-slug]` | Listado de artículos de una categoría |
| `/[category-slug]/[article-slug]` | Artículo individual completo |
| `/search?q=<query>` | Resultados de búsqueda |

---

### 5.4 Estrategia de caché recomendada

El contenido de documentación cambia con poca frecuencia. Se recomienda aplicar caché agresivo en el frontend:

- Navegación y listados de categorías: TTL de 10 a 15 minutos
- Artículos individuales: TTL de 5 a 10 minutos, o regeneración bajo demanda (ISR si el framework lo soporta)
- Resultados de búsqueda: sin caché, consulta en tiempo real

Esto reduce significativamente la carga sobre la instancia de Strapi y mejora los tiempos de respuesta del frontend.

---

## Fase 6: Consideraciones de producción

### Seguridad

- Los tokens de API de los frontends son de solo lectura. Nunca deben tener permisos de escritura.
- El Admin Panel de Strapi no debe estar expuesto sin protección adicional. Si el proveedor de hosting lo permite, restringir el acceso a `/admin` por IP o mediante autenticación básica a nivel de servidor web.
- Todos los tokens deben almacenarse en un gestor de contraseñas o sistema de secretos del equipo, nunca en el repositorio de código.
- Las peticiones entre frontends y Strapi deben realizarse siempre sobre HTTPS.

### Performance

- Crear índices de base de datos sobre los campos `slug` y `documentation_space` en las colecciones `category` y `article`. Sin estos índices, el middleware de filtrado genera full table scans en cada petición.
- En Strapi v5, los índices se definen en la configuración del Content Type dentro del archivo de esquema (`schema.json`) usando la propiedad `indexes`.
- Evaluar activar el plugin de caché de Strapi v5 si el tráfico combinado de todos los frontends supera las 500 peticiones por minuto.

### Monitoreo

- Registrar en los logs de Strapi el valor del param `space` en cada petición rechazada por el middleware. Esto permite detectar errores de configuración en los frontends.
- Si el hosting lo permite, configurar una alerta si la tasa de errores 400 supera el 5% de las peticiones en una ventana de 5 minutos.

---

## Procedimiento para agregar un nuevo espacio (repetible)

Este procedimiento debe poder ejecutarse en menos de 15 minutos una vez que el sistema está en producción.

1. Ingresar al Admin Panel y crear un nuevo registro en `documentation-space` con el nombre y slug del nuevo espacio. Verificar que `is_active` sea `true`.
2. En `Settings > API Tokens`, crear un nuevo token Read-only con el nombre `frontend-[slug]`. Copiar el token inmediatamente y guardarlo en el gestor de contraseñas del equipo.
3. Crear el nuevo proyecto frontend a partir del proyecto base existente. Configurar las tres variables de entorno con los valores del nuevo espacio.
4. Verificar que el frontend recibe artículos únicamente del nuevo espacio realizando una petición de prueba al endpoint de navegación.
5. Verificar que el frontend no recibe artículos de otros espacios manipulando el param `space` en la URL de prueba. El middleware debe rechazar cualquier slug que no sea el propio.

---

## Diagrama de relaciones del modelo de datos

```
documentation-space
    ├── categories (N) — cada categoría pertenece a un único espacio
    └── articles (N)   — cada artículo pertenece a un único espacio
                            └── category (1) — debe pertenecer al mismo espacio (validado por lifecycle hook)
```

La doble relación de `article` tanto hacia `documentation-space` como hacia `category` es intencional. Permite consultar artículos por espacio directamente en el endpoint de búsqueda sin necesidad de joins anidados, lo que mejora la performance de esas consultas.