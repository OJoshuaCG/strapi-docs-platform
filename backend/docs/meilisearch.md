# Meilisearch — Motor de búsqueda

Meilisearch es el motor de búsqueda incluido en el stack del backend. Actualmente está en Phase 1 (servicio corriendo, sin integración). La integración con Strapi se desarrollará en Phase 2.

---

## Tabla de contenidos

1. [¿Qué es Meilisearch?](#1-qué-es-meilisearch)
2. [Estado actual (Phase 1)](#2-estado-actual-phase-1)
3. [Roadmap Phase 2](#3-roadmap-phase-2)
4. [Configuración](#4-configuración)
5. [Variables de entorno](#5-variables-de-entorno)
6. [API básica](#6-api-básica)
7. [Rotación de la master key](#7-rotación-de-la-master-key)
8. [Persistencia de datos](#8-persistencia-de-datos)
9. [Preparación para Phase 2](#9-preparación-para-phase-2)

---

## 1. ¿Qué es Meilisearch?

Meilisearch es un motor de búsqueda **open-source, self-hosted** diseñado para ser:

- **Rápido**: respuestas en menos de 50ms incluso con miles de documentos
- **Tolerante a errores tipográficos**: buscar "instalcion" encuentra "instalación"
- **Relevante por defecto**: los resultados están ordenados por relevancia sin configuración extra
- **Fácil de integrar**: API REST simple, SDKs para JavaScript, Python, PHP, etc.

A diferencia de Elasticsearch, Meilisearch está optimizado para búsqueda de texto en interfaces de usuario (barra de búsqueda en tiempo real), no para análisis de logs ni queries complejos.

---

## 2. Estado actual (Phase 1)

El servicio Meilisearch **está corriendo** como parte del stack Docker Compose, pero **no hay integración con Strapi** todavía.

```yaml
# docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:v1.12
  ports:
    - "7700:7700"
  environment:
    MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
    MEILI_ENV: ${MEILI_ENV:-development}
  volumes:
    - meilisearch_data:/meili_data
```

Puedes acceder a la API en `http://localhost:7700`.

**¿Por qué incluirlo ahora si no está integrado?**

Incluirlo desde Phase 1 permite:
1. Familiarizarse con el servicio
2. Tenerlo disponible cuando se desarrolle la integración
3. No añadir complejidad de infraestructura después (el servicio ya está en el Compose)

---

## 3. Roadmap Phase 2

La integración planificada para Phase 2:

```
Strapi publica artículo
    → Webhook de Strapi dispara evento
        → Python API / Node script recibe el evento
            → Indexa el artículo en Meilisearch
                → Frontend usa la API de Meilisearch para búsquedas en tiempo real
```

Componentes de Phase 2:
- **Indexador**: un script que escucha webhooks de Strapi y sincroniza artículos con Meilisearch
- **Frontend**: barra de búsqueda conectada a Meilisearch (resultados mientras el usuario escribe)
- **Python RAG Agent** (opcional): recibe preguntas en lenguaje natural, busca en Meilisearch, genera respuestas con un LLM

El endpoint de Phase 2 en docker-compose.yml ya está preparado (comentado):

```yaml
# ─── Phase 2 placeholder ─────────────────────────────────
# python-api:
#   build: ./python-api
#   environment:
#     MEILISEARCH_HOST: http://meilisearch:7700
#     MEILISEARCH_API_KEY: ${MEILISEARCH_MASTER_KEY}
```

---

## 4. Configuración

Meilisearch tiene dos configuraciones de entorno:

| `MEILI_ENV` | Comportamiento |
|---|---|
| `development` | La master key es opcional. El endpoint `GET /health` es público. La interfaz de búsqueda integrada está accesible en `http://localhost:7700`. |
| `production` | La master key es **obligatoria**. Todos los endpoints requieren autenticación. La interfaz integrada está deshabilitada. |

En producción, configura `MEILI_ENV=production` en `docker-compose.prod.yml` (ya está configurado).

---

## 5. Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MEILISEARCH_MASTER_KEY` | Clave maestra del servicio. Requerida en producción; recomendada en dev. | genera con `openssl rand -base64 32` |
| `MEILI_ENV` | Entorno del servicio | `development` / `production` |

### Generar la master key

```bash
# Opción 1: con openssl
openssl rand -base64 32

# Opción 2: con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

La master key debe tener **mínimo 16 bytes** (22 caracteres en base64). Una clave de 32 bytes es más que suficiente.

---

## 6. API básica

Todos los requests de administración requieren el header `Authorization: Bearer MASTER_KEY`.

### Health check

```bash
# Verifica que el servicio está disponible (sin autenticación en dev)
curl http://localhost:7700/health
# {"status":"available"}
```

### Listar índices

```bash
curl -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  http://localhost:7700/indexes
```

En Phase 1 (sin integración), el resultado es `{"results":[],"offset":0,"limit":20,"total":0}` — no hay índices creados.

### Información del servidor

```bash
curl -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  http://localhost:7700/version
```

### Crear un índice (manual, para pruebas)

```bash
curl -X POST http://localhost:7700/indexes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  -d '{"uid": "articles", "primaryKey": "id"}'
```

### Buscar en un índice

```bash
curl -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}" \
  "http://localhost:7700/indexes/articles/search?q=instalacion"
```

---

## 7. Rotación de la master key

Cambiar la master key **invalida todos los API keys derivados** de la master key anterior. Cualquier cliente que use esas keys derivadas dejará de funcionar.

Proceso seguro:

1. Genera una nueva master key
2. Actualiza `MEILISEARCH_MASTER_KEY` en `backend/.env`
3. Actualiza cualquier cliente que use la master key directamente
4. Reinicia el servicio:
   ```bash
   docker compose restart meilisearch
   ```
5. Verifica que el health check responde:
   ```bash
   curl http://localhost:7700/health
   ```

---

## 8. Persistencia de datos

Los índices y documentos de Meilisearch están en el volume Docker `meilisearch_data` → `/meili_data`.

### Backup de índices

Meilisearch soporta snapshots:

```bash
# Crear un snapshot (requiere MEILI_ENV=development o auth header)
curl -X POST http://localhost:7700/snapshots \
  -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}"
```

El snapshot se guarda en `/meili_data/snapshots/` dentro del volume.

### Backup del volume

Alternativa más simple — backup directo del volume:

```bash
# Backup
docker run --rm \
  -v backend_meilisearch_data:/data \
  -v $(pwd)/backups:/backups \
  alpine tar czf /backups/meilisearch_$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm \
  -v backend_meilisearch_data:/data \
  -v $(pwd)/backups:/backups \
  alpine tar xzf /backups/meilisearch_20250101.tar.gz -C /
```

> En Phase 1, los índices están vacíos. El backup de Meilisearch solo es crítico en Phase 2 cuando los artículos estén indexados. Sin datos en los índices, simplemente reindexa desde Strapi.

---

## 9. Preparación para Phase 2

Para implementar la integración, los pasos serán:

### Configurar un webhook en Strapi

```
Panel admin → Settings → Webhooks → Create new webhook
URL: http://python-api:8000/webhook/strapi   (o el indexador que se implemente)
Eventos: entry.publish, entry.unpublish, entry.delete
Content Types: Documentation Article
```

### Crear el índice en Meilisearch

```javascript
// Al iniciar el indexador
const client = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY
});

await client.createIndex('articles', { primaryKey: 'documentId' });

// Configurar campos searchables
await client.index('articles').updateSearchableAttributes([
  'title', 'excerpt', 'content'
]);

// Configurar campos filtrables
await client.index('articles').updateFilterableAttributes([
  'locale', 'category'
]);
```

### Estructura del documento indexado

```json
{
  "documentId": "abc123",
  "title": "Cómo instalar el sistema",
  "excerpt": "Guía paso a paso para la instalación en Ubuntu.",
  "locale": "es",
  "slug": "como-instalar-el-sistema",
  "category": "instalacion",
  "publishedAt": "2025-01-15T10:00:00.000Z"
}
```

> El campo `content` puede incluirse para búsqueda en el cuerpo del artículo, pero considera que el contenido de Strapi es en formato de bloques JSON — necesitarás extraer el texto plano antes de indexar.
