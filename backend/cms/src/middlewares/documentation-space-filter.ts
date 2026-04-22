import type { Core } from '@strapi/strapi';

/**
 * Garantiza el aislamiento entre espacios de documentación filtrando
 * a través de la cadena de relaciones: space → section → category → article
 *
 * Endpoints protegidos (requieren ?space=<slug>):
 *   GET /api/documentation-sections        — filtra por section.documentation_space
 *   GET /api/documentation-categories      — filtra por category.documentation_section.documentation_space
 *   GET /api/documentation-articles        — filtra por article.category.documentation_section.documentation_space
 *   GET /api/documentation-space-settings  — filtra por setting.documentation_space
 *
 * Parámetro opcional ?section=<slug>:
 *   categories: filtra además por documentation_section.slug
 *   articles:   filtra además por category.documentation_section.slug
 */

const FILTERED_PREFIXES = [
  '/api/documentation-sections',
  '/api/documentation-categories',
  '/api/documentation-articles',
  '/api/documentation-space-settings',
];

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const { method, path } = ctx.request as { method: string; path: string };

    const isFiltered = FILTERED_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (method !== 'GET' || !isFiltered) return next();

    const space = ctx.query?.space as string | undefined;

    if (!space) {
      ctx.status = 400;
      ctx.body = { error: { message: 'El parámetro space es obligatorio.' } };
      return;
    }

    const spaceRecord = await strapi.db
      .query('api::documentation-space.documentation-space')
      .findOne({ where: { slug: space, is_active: true } });

    if (!spaceRecord) {
      ctx.status = 400;
      ctx.body = { error: { message: 'El espacio de documentación no existe o está inactivo.' } };
      return;
    }

    if (!ctx.query.filters) ctx.query.filters = {};

    const section = ctx.query?.section as string | undefined;

    if (path.startsWith('/api/documentation-sections')) {
      // Relación directa: section → space
      ctx.query.filters['documentation_space'] = { slug: { $eq: space } };

    } else if (path.startsWith('/api/documentation-space-settings')) {
      // Relación directa: space-setting → space
      ctx.query.filters['documentation_space'] = { slug: { $eq: space } };

    } else if (path.startsWith('/api/documentation-categories')) {
      // Cadena: category → section → space
      ctx.query.filters['documentation_section'] = {
        documentation_space: { slug: { $eq: space } },
        ...(section ? { slug: { $eq: section } } : {}),
      };

    } else if (path.startsWith('/api/documentation-articles')) {
      // Cadena: article → category → section → space
      ctx.query.filters['category'] = {
        ...(ctx.query.filters['category'] ?? {}),
        documentation_section: {
          documentation_space: { slug: { $eq: space } },
          ...(section ? { slug: { $eq: section } } : {}),
        },
      };
    }

    delete ctx.query.space;
    if (section) delete ctx.query.section;

    return next();
  };
};
