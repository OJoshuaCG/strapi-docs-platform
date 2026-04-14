# Configuración de Webhook para Invalidación de Caché (F5d)

> Estado: Documentado - Pendiente de implementación en producción
> Fecha: 2026-04-13

---

## Propósito

En producción, cuando se publica o despublica un artículo, el frontend mantiene la caché de 30 segundos. Esto puede causar que los cambios no se reflejen inmediatamente. La solución es configurar un webhook en Strapi que notifique al frontend cuando debe invalidar su caché.

---

## Configuración en Strapi (sin código)

### Paso 1: Crear el webhook en Strapi

1. Ir al panel admin de Strapi: `http://tudominio.com/admin`
2. Navegar a **Settings** → **Webhooks** → **Create new webhook**
3. Configurar el webhook con los siguientes valores:

| Campo | Valor |
|---|---|
| **Name** | `Frontend Cache Invalidation` |
| **URL** | `http://frontend:3000/api/cache-invalidate` |
| **Events** | Seleccionar: `documentation-article.create`, `documentation-article.update`, `documentation-article.delete`, `documentation-article.publish`, `documentation-article.unpublish` |

### Paso 2: Crear el endpoint en el frontend (pendiente)

Crear la ruta `frontend/src/routes/api/cache-invalidate/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { invalidateCache } from '$lib/api/strapi';

export const POST: RequestHandler = async ({ request, env }) => {
  // Validate webhook secret (opcional pero recomendado)
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== env.CACHE_INVALIDATION_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Invalidar caché
  invalidateCache();

  return new Response('Cache invalidated', { status: 200 });
};
```

### Paso 3: Agregar variable de entorno

Agregar a `frontend/.env`:

```env
CACHE_INVALIDATION_SECRET=un_token_secreto_y_largo_aqui
```

Y agregar el mismo token a `backend/.env`:

```env
WEBHOOK_CACHE_SECRET=un_token_secreto_y_largo_aqui
```

---

## Payload del webhook

Strapi enviará un JSON con esta estructura:

```json
{
  "event": "entry.publish",
  "model": "documentation-article",
  "entry": {
    "id": 1,
    "documentId": "abc123",
    "slug": "mi-articulo",
    "locale": "es",
    "publishedAt": "2026-04-13T10:30:00.000Z"
  }
}
```

---

## Alternativa sin endpoint (polling)

Si no se desea implementar el webhook, una alternativa es reducir el tiempo de caché del frontend:

En `frontend/src/lib/api/strapi.ts`, cambiar:

```typescript
const CACHE_DURATION = 10 * 1000; // 10 segundos (en lugar de 30)
```

**Desventaja:** Más peticiones a Strapi, pero sin complejidad de webhooks.

---

## Notas de producción

- En producción, la URL del frontend debe ser accesible desde el contenedor de Strapi
- Si usan nginx/Caddy como reverse proxy, la URL del webhook debería ser `https://tudominio.com/api/cache-invalidate`
- Para pruebas locales, usar `http://host.docker.internal:5173/api/cache-invalidate` (macOS/Windows) o la IP local de la máquina host

---

## Verificación

Para verificar que el webhook funciona:

1. Publicar un artículo en Strapi
2. Revisar los logs de Strapi: `docker compose logs strapi | grep webhook`
3. Verificar que el frontend recibió la petición
4. Confirmar que el contenido se actualiza sin esperar los 30s de caché
