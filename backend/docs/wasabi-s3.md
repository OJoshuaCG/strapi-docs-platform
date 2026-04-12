# Wasabi S3 — Almacenamiento de archivos

Wasabi es el servicio externo de almacenamiento de objetos donde Strapi guarda las imágenes, PDFs y otros archivos subidos desde el panel admin.

---

## Tabla de contenidos

1. [¿Qué es Wasabi?](#1-qué-es-wasabi)
2. [Cómo funciona la integración con Strapi](#2-cómo-funciona-la-integración-con-strapi)
3. [Configuración del plugin](#3-configuración-del-plugin)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Configurar el bucket en Wasabi](#5-configurar-el-bucket-en-wasabi)
6. [Política de acceso público](#6-política-de-acceso-público)
7. [Configuración CORS](#7-configuración-cors)
8. [Regiones y endpoints](#8-regiones-y-endpoints)
9. [Desarrollo sin Wasabi](#9-desarrollo-sin-wasabi)
10. [Rotación de credenciales](#10-rotación-de-credenciales)

---

## 1. ¿Qué es Wasabi?

Wasabi es un servicio de almacenamiento de objetos en la nube (object storage) **100% compatible con la API de Amazon S3**. Esto significa que cualquier librería, SDK o herramienta que funcione con S3 funciona con Wasabi sin modificaciones.

**¿Por qué Wasabi y no AWS S3?**

| | Wasabi | AWS S3 |
|---|---|---|
| Precio por GB almacenado | ~$0.0059/GB/mes | ~$0.023/GB/mes |
| Cargos por transferencia (egress) | **Sin cargo** | ~$0.09/GB |
| Solicitudes GET | Sin cargo | $0.0004 / 10k |
| Mínimo de facturación | 30 días por objeto | Por objeto |

Para un portal de documentación donde la mayoría de operaciones son lecturas (imágenes visualizadas por usuarios), Wasabi es significativamente más económico.

---

## 2. Cómo funciona la integración con Strapi

Strapi usa el plugin oficial `@strapi/provider-upload-aws-s3`, configurado para apuntar a Wasabi.

**Flujo de subida:**
```
Editor sube imagen en panel admin
    → Strapi recibe el archivo
    → Strapi llama a la API S3 de Wasabi con el archivo
    → Wasabi retorna la URL pública del archivo
    → Strapi guarda la URL en MariaDB
    → Frontend renderiza la imagen usando la URL de Wasabi
```

**Flujo de lectura:**
```
Frontend necesita mostrar imagen
    → Lee la URL del objeto de Strapi API
    → Navegador del usuario hace GET directo a Wasabi
    (Strapi NO actúa como proxy de imágenes)
```

Los archivos se guardan bajo el prefijo configurado en `WASABI_UPLOAD_PREFIX` (por defecto `cms`):

```
bucket-name/
└── cms/
    ├── imagen-1.webp
    ├── diagrama-2.png
    └── documento.pdf
```

---

## 3. Configuración del plugin

```typescript
// cms/config/plugins.ts
{
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('WASABI_BASE_URL', undefined),    // CDN opcional
        rootPath: env('WASABI_UPLOAD_PREFIX', 'cms'),  // prefijo en el bucket
        s3Options: {
          region: env('WASABI_REGION', 'us-east-1'),
          endpoint: env('WASABI_ENDPOINT', 'https://s3.wasabisys.com'),
          forcePathStyle: true,                        // requerido por Wasabi
          credentials: {
            accessKeyId: env('WASABI_ACCESS_KEY'),
            secretAccessKey: env('WASABI_SECRET_KEY'),
          },
        },
      },
      actionOptions: {
        upload: { Bucket: env('WASABI_BUCKET') },
        uploadStream: { Bucket: env('WASABI_BUCKET') },
        delete: { Bucket: env('WASABI_BUCKET') },
      },
    },
  },
}
```

### ¿Qué es `forcePathStyle: true`?

AWS S3 acepta URLs en dos formatos:
- **Virtual-hosted style**: `https://bucket-name.s3.amazonaws.com/objeto`
- **Path-style**: `https://s3.amazonaws.com/bucket-name/objeto`

Wasabi **requiere path-style** — el nombre del bucket va en la ruta, no en el subdominio. Sin `forcePathStyle: true`, las requests fallarían con errores de DNS.

### ¿Qué es `baseUrl`?

Si tienes un CDN (como Cloudflare) en frente de tu bucket de Wasabi, configura `WASABI_BASE_URL` con la URL del CDN. Las URLs generadas por Strapi para las imágenes usarán el CDN en lugar de apuntar directamente a Wasabi.

```env
# Sin CDN (default)
WASABI_BASE_URL=   # vacío → URLs apuntan directamente a Wasabi

# Con CDN
WASABI_BASE_URL=https://cdn.tudominio.com
```

---

## 4. Variables de entorno

| Variable | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|
| `WASABI_ACCESS_KEY` | No* | Access key de la cuenta Wasabi | `ABCD1234...` |
| `WASABI_SECRET_KEY` | No* | Secret key correspondiente | `xyz789...` |
| `WASABI_BUCKET` | No* | Nombre del bucket | `mi-documentacion` |
| `WASABI_REGION` | No | Región del bucket | `us-east-1` |
| `WASABI_ENDPOINT` | No | Endpoint de la región | `https://s3.wasabisys.com` |
| `WASABI_UPLOAD_PREFIX` | No | Prefijo/carpeta en el bucket | `cms` |
| `WASABI_BASE_URL` | No | URL de CDN (si aplica) | `https://cdn.ejemplo.com` |

> `*` Si estas variables están vacías, los uploads van al disco local (`cms/public/uploads/`). Útil para desarrollo sin cuenta de Wasabi.

**Combinaciones región/endpoint:**

| Región | Endpoint |
|---|---|
| `us-east-1` (Virginia) | `https://s3.wasabisys.com` |
| `us-east-2` (Virginia N) | `https://s3.us-east-2.wasabisys.com` |
| `us-west-1` (Oregon) | `https://s3.us-west-1.wasabisys.com` |
| `eu-central-1` (Ámsterdam) | `https://s3.eu-central-1.wasabisys.com` |
| `eu-west-1` (Irlanda) | `https://s3.eu-west-1.wasabisys.com` |
| `ap-northeast-1` (Tokio) | `https://s3.ap-northeast-1.wasabisys.com` |

> Usa siempre el endpoint correspondiente a la región de tu bucket. Si hay mismatch, obtendrás errores `PermanentRedirect` o `NoSuchBucket`.

---

## 5. Configurar el bucket en Wasabi

### Crear el bucket

1. Entra a [console.wasabisys.com](https://console.wasabisys.com)
2. Ve a **Buckets** → **Create Bucket**
3. Nombre: el valor que pondrás en `WASABI_BUCKET`
4. Región: la que corresponda a tu zona geográfica (elige la más cercana a los usuarios)
5. **No habilites "Make bucket public"** — configura acceso público solo a la carpeta de uploads (ver sección siguiente)
6. Haz clic en **Create Bucket**

### Crear las credenciales de acceso

1. Ve a **Access Keys** en el menú lateral
2. Haz clic en **Create New Access Key**
3. Copia el **Access Key** y el **Secret Key** — el Secret solo se muestra una vez
4. Pega los valores en `WASABI_ACCESS_KEY` y `WASABI_SECRET_KEY` en `backend/.env`

---

## 6. Política de acceso público

Las imágenes y archivos en el bucket deben ser públicamente legibles para que el frontend pueda mostrarlos. Sin embargo, **no habilites acceso público a todo el bucket** — solo a la carpeta de uploads.

En la consola de Wasabi:
1. Selecciona tu bucket → **Policies** → **Bucket Policy**
2. Aplica esta política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE-DE-TU-BUCKET/cms/*"
    }
  ]
}
```

Reemplaza `NOMBRE-DE-TU-BUCKET` con el valor de `WASABI_BUCKET`.

Esta política permite que **cualquier persona** haga `GET` de objetos bajo el prefijo `cms/` (tu `WASABI_UPLOAD_PREFIX`), pero nadie puede listar el bucket ni subir/eliminar archivos sin las credenciales.

---

## 7. Configuración CORS

CORS es necesario si el navegador del usuario hace requests directamente al bucket (por ejemplo, al previsualizar un archivo). En el uso actual del proyecto, el navegador solo hace GET de URLs de imagen — CORS ya está permitido por la mayoría de configuraciones por defecto.

Si en el futuro se implementan uploads directos con **presigned URLs** (el navegador sube directamente a Wasabi sin pasar por Strapi), configura CORS:

En la consola de Wasabi → tu bucket → **CORS**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://tudominio.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 8. Regiones y endpoints

El endpoint en `WASABI_ENDPOINT` debe corresponder exactamente a la región donde está el bucket:

```bash
# Verificar que el endpoint es correcto
curl -I https://s3.wasabisys.com/NOMBRE-DE-TU-BUCKET/

# Si el bucket está en eu-central-1
curl -I https://s3.eu-central-1.wasabisys.com/NOMBRE-DE-TU-BUCKET/
```

Un endpoint incorrecto produce errores como:
```
PermanentRedirect: The bucket you are attempting to access must be addressed using the specified endpoint.
```

---

## 9. Desarrollo sin Wasabi

Durante el desarrollo local, puedes trabajar sin configurar Wasabi. Si `WASABI_ACCESS_KEY` está vacío en `.env`, Strapi usa el **proveedor local** y guarda los uploads en:

```
backend/cms/public/uploads/
```

Los archivos estarán accesibles en `http://localhost:1337/uploads/nombre-del-archivo`.

> Esta carpeta está en `.gitignore`. No committees archivos de upload al repositorio.

**Limitación:** Los uploads locales no persisten si reconstruyes el contenedor Docker sin bind mounts. En producción, siempre usa Wasabi.

---

## 10. Rotación de credenciales

Si necesitas rotar las access keys de Wasabi:

1. En la consola de Wasabi, crea un **nuevo par de keys** (no elimines las viejas aún)
2. Actualiza `WASABI_ACCESS_KEY` y `WASABI_SECRET_KEY` en `backend/.env`
3. Reinicia Strapi:
   ```bash
   docker compose restart strapi
   ```
4. Verifica que los uploads y las imágenes existentes cargan correctamente
5. Solo entonces elimina las keys antiguas en la consola de Wasabi

> Si eliminas las keys viejas antes de verificar, podrías interrumpir el servicio si algo falló en el paso 2 o 3.
