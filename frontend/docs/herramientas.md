# Herramientas del proyecto

Índice de toda la documentación técnica del frontend. Cada herramienta tiene su propio archivo con documentación completa.

---

## Stack tecnológico

| Herramienta | Versión | Propósito | Documentación |
|---|---|---|---|
| **Svelte 5** | ^5.55.2 | Framework de UI con runes mode | [svelte-para-principiantes.md](./svelte-para-principiantes.md) |
| **SvelteKit 2** | ^2.57.0 | Framework full-stack (routing, SSR, load functions) | [sveltekit-para-principiantes.md](./sveltekit-para-principiantes.md) |
| **TypeScript** | ^6.0.2 | Tipado estático para JavaScript | [typescript.md](./typescript.md) |
| **TailwindCSS v4** | ^4.2.2 | Framework CSS utility-first | [tailwindcss.md](./tailwindcss.md) |
| **Vite 8** | ^8.0.7 | Bundler y servidor de desarrollo | [vite.md](./vite.md) |
| **Strapi v5** | — | CMS headless (API + Admin) | [strapi-api.md](./strapi-api.md) |
| **adapter-node / Docker** | ^5.5.4 | Despliegue en producción | [docker.md](./docker.md) |

---

## Documentación adicional

| Documento | Descripción |
|---|---|
| [arquitectura.md](./arquitectura.md) | Visión general del sistema completo (frontend + backend + bases de datos) |
| [despliegue.md](./despliegue.md) | Guía paso a paso para llevar el sistema a producción con Docker Compose y nginx |
| [guia-editorial.md](./guia-editorial.md) | Cómo usar el panel de Strapi para crear y publicar documentación (para editores no técnicos) |

---

## Por qué se eligió cada herramienta

**Svelte 5 + SvelteKit 2**  
Svelte compila los componentes a JavaScript puro — sin runtime de framework en el bundle. El resultado es más rápido y ligero que React o Vue. SvelteKit añade SSR, enrutamiento y carga de datos integrada. Runes mode (Svelte 5) es la API de reactividad moderna y más predecible que el sistema de `$:` de Svelte 4.

**TypeScript**  
La API de Strapi retorna objetos con una estructura definida. Sin TypeScript, un campo renombrado en el CMS pasaría desapercibido hasta que el portal fallara en producción. Con TypeScript, el error aparece en el editor al instante.

**TailwindCSS v4**  
Elimina el problema de nombrar clases CSS y de mantener hojas de estilo que crecen sin control. La v4 con el plugin de Vite es más rápida y no requiere `tailwind.config.js`. La integración de variables CSS con el sistema de temas (dark/light) es natural.

**Vite 8**  
Servidor de desarrollo que arranca en milisegundos y refleja los cambios sin recargar la página (HMR). En producción, genera bundles optimizados con Rollup.

**Strapi v5**  
CMS headless con panel de administración generado automáticamente. El equipo editorial puede crear y publicar documentación sin tocar código. Strapi v5 usa una estructura de datos simplificada (sin `attributes`) y tiene soporte nativo de internacionalización.

**adapter-node**  
El proyecto necesita SSR para SEO. `adapter-node` compila SvelteKit a un servidor Node.js standalone que corre en Docker sin dependencias adicionales.
