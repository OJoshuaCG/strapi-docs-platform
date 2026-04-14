import type { Core } from '@strapi/strapi';

// Actions the Public role must be able to perform on the REST API.
// This runs on every Strapi startup: safe to re-run (idempotent).
const PUBLIC_PERMISSIONS = [
  'api::documentation-article.documentation-article.find',
  'api::documentation-article.documentation-article.findOne',
  'api::documentation-category.documentation-category.find',
  'api::documentation-category.documentation-category.findOne',
  'api::global-setting.global-setting.find',
  'api::global-setting.global-setting.findOne',
];

async function configurePublicPermissions(strapi: Core.Strapi): Promise<void> {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[bootstrap] Public role not found — skipping permission setup');
    return;
  }

  for (const action of PUBLIC_PERMISSIONS) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id, enabled: true } });
      strapi.log.info(`[bootstrap] Granted public permission: ${action}`);
    } else if (!existing.enabled) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .update({ where: { id: existing.id }, data: { enabled: true } });
      strapi.log.info(`[bootstrap] Enabled public permission: ${action}`);
    }
  }
}

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await configurePublicPermissions(strapi);
  },
};
