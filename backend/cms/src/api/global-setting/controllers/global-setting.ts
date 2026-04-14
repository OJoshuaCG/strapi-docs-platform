import { factories } from '@strapi/strapi';

// Use factory without type checking since content type is registered at runtime
export default factories.createCoreController(
  'api::global-setting.global-setting' as any
);
