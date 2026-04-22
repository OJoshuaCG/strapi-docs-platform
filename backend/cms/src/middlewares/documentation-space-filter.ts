import type { Core } from '@strapi/strapi';

/**
 * Middleware que garantiza el aislamiento entre espacios de documentación.
 *
 * Aplica a: GET /api/documentation-categories[/:id]
 *            GET /api/documentation-articles[/:id]
 *
 * Requiere el query param ?space=<slug>. Si el espacio no existe o está
 * inactivo responde 400. Si el param está ausente también responde 400.
 * Inyecta automáticamente el filtro de espacio para que el controller
 * de Strapi solo devuelva registros del espacio solicitado.
 */

const FILTERED_PREFIXES = [
  '/api/documentation-categories',
  '/api/documentation-articles',
];

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const { method, path } = ctx.request as { method: string; path: string };

    const isFiltered = FILTERED_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (method !== 'GET' || !isFiltered) {
      return next();
    }

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
      ctx.body = {
        error: { message: 'El espacio de documentación no existe o está inactivo.' },
      };
      return;
    }

    // Inyectar filtro de espacio sin pisar filtros existentes del frontend
    if (!ctx.query.filters) {
      ctx.query.filters = {};
    }
    ctx.query.filters['documentation_space'] = {
      slug: { $eq: space },
    };

    // Eliminar el param space para que no interfiera con el query parser de Strapi
    delete ctx.query.space;

    return next();
  };
};
