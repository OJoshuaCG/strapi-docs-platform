# Portal de Documentación Técnica

Portal de documentación multidioma (es / en) construido con **Strapi v5** (backend CMS) y **SvelteKit 2 / Svelte 5** (frontend).

## Estructura del repositorio

```
├── backend/    CMS Strapi v5 + MariaDB + Meilisearch (Docker Compose)
├── frontend/   Portal SvelteKit 2 / Svelte 5
├── docs/       Guías para desarrolladores
└── CLAUDE.md   Contexto completo para agentes IA
```

## Documentación para desarrolladores

| Guía | Descripción |
|---|---|
| [Entorno de desarrollo local](docs/desarrollo-local.md) | Setup completo y flujo de trabajo diario sin rebuilds innecesarios |

## Quick start (resumen)

```bash
# 1. Backend — solo la primera vez
cd backend && cp .env.example .env   # rellenar valores
docker compose up --build -d         # ~60 s en inicializar

# 2. Frontend — desarrollo local (sin Docker)
cd frontend && cp .env.example .env
npm install
npm run dev                          # http://localhost:5173 con HMR
```

> Para el setup completo, primeros pasos en el panel admin y el flujo de trabajo
> diario (cuándo hacer rebuild y cuándo no), lee
> [docs/desarrollo-local.md](docs/desarrollo-local.md).

## Documentación técnica detallada

- Backend: `backend/docs/` (Docker, MariaDB, Wasabi S3, Meilisearch, despliegue…)
- Frontend: `frontend/docs/` (Svelte 5, SvelteKit 2, TailwindCSS v4, Vite, despliegue…)
- Contexto completo del proyecto: `CLAUDE.md`
