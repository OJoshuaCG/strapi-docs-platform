import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [
      'es',
      'en',
    ],
  },
  bootstrap(app: StrapiApp) {
    console.log('[Admin] Bootstrap complete. Theme preview panel available at /preview/theme on frontend.');
  },
};
