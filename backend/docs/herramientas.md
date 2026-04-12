# Herramientas del backend

Índice de toda la documentación técnica del backend. Cada herramienta tiene su propio archivo con documentación completa.

---

## Stack tecnológico

| Herramienta | Versión | Propósito | Documentación |
|---|---|---|---|
| **Strapi v5** | 5.42.0 | CMS headless + panel admin + REST API | [strapi-para-desarrolladores.md](./strapi-para-desarrolladores.md) |
| **MariaDB** | 10.11 | Base de datos relacional (driver `mysql2`) | [mariadb.md](./mariadb.md) |
| **Docker / Docker Compose** | Engine 24+ | Containerización y orquestación de servicios | [docker.md](./docker.md) |
| **Wasabi S3** | — | Almacenamiento de archivos en la nube (S3-compatible) | [wasabi-s3.md](./wasabi-s3.md) |
| **Meilisearch** | v1.12 | Motor de búsqueda full-text (Phase 2) | [meilisearch.md](./meilisearch.md) |
| **Node.js** | 20 – 24 | Runtime de JavaScript para Strapi | — |
| **TypeScript** | ^5 | Tipado estático en el CMS | — |

---

## Documentación adicional

| Documento | Descripción |
|---|---|
| [despliegue.md](./despliegue.md) | Guía paso a paso para llevar el backend a producción |
| [maintenance.md](./maintenance.md) | Operaciones del día a día: backups, actualizaciones, logs |
| [troubleshooting.md](./troubleshooting.md) | Resolución de problemas comunes agrupada por categoría |
| [strapi-for-dummies.md](./strapi-for-dummies.md) | Guía del panel admin para editores de contenido (sin conocimientos técnicos) |

---

## Por qué se eligió cada herramienta

**Strapi v5**
CMS headless con panel de administración generado automáticamente. El equipo editorial puede crear y publicar documentación sin tocar código. Strapi v5 eliminó el wrapper `attributes` de la API (respuesta más limpia), tiene soporte nativo de internacionalización, y su arquitectura de plugins permite extender funcionalidades sin modificar el core.

**MariaDB**
Compatible 100% con el protocolo MySQL, lo que lo hace intercambiable con MySQL sin cambiar el driver (`mysql2`). Tiene menor overhead de memoria que PostgreSQL para cargas pequeñas-medianas. Strapi soporta ambos motores; la elección es de familiaridad y costo operativo.

**Docker + Docker Compose**
Garantiza que el entorno de desarrollo sea idéntico al de producción. El `Dockerfile` multi-stage produce imágenes de producción compactas (~150 MB) sin incluir devDependencies ni herramientas de compilación. Docker Compose orquesta los 4 servicios con un solo comando.

**Wasabi S3**
Almacenamiento de objetos compatible con la API de Amazon S3. Sin cargos por transferencia de datos (egress) — significativamente más económico que AWS S3 para un portal de documentación donde la mayoría de las operaciones son lecturas. El plugin `@strapi/provider-upload-aws-s3` funciona con Wasabi sin modificaciones con solo configurar `forcePathStyle: true`.

**Meilisearch**
Motor de búsqueda open-source con tolerancia a errores tipográficos. Respuestas en <50ms incluso con miles de documentos. Se incluye desde Phase 1 para tenerlo disponible cuando se desarrolle la integración de búsqueda (Phase 2), sin necesidad de infraestructura adicional después.
