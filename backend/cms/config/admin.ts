import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', false),
    promoteEE: env.bool('FLAG_PROMOTE_EE', false),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: [env('FRONTEND_URL', 'http://localhost:5173')],
      async handler(
        uid: string,
        { documentId, locale, status }: { documentId: string; locale: string; status: string },
      ) {
        const previewSecret = env('PREVIEW_SECRET', '');
        const frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        if (!previewSecret) {
          return null;
        }

        // Build the frontend preview URL with draft parameters
        const params = new URLSearchParams({
          secret: previewSecret,
          documentId,
          locale,
          status,
        });

        return `${frontendUrl}/api/preview?${params.toString()}`;
      },
    },
  },
});

export default config;
