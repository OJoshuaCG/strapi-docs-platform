import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const wasabiAccessKey = env('WASABI_ACCESS_KEY', '');
  const wasabiSecretKey = env('WASABI_SECRET_KEY', '');
  const wasabiBucket = env('WASABI_BUCKET', '');

  // Use Wasabi S3 only if all required credentials are provided.
  // Otherwise, fall back to local storage.
  const useWasabi = wasabiAccessKey && wasabiSecretKey && wasabiBucket;

  return {
    // ─── Upload Provider (Wasabi S3 or Local) ──────────────────────────────
    upload: {
      config: useWasabi
        ? {
            provider: 'aws-s3',
            providerOptions: {
              baseUrl: env('WASABI_BASE_URL', undefined),
              rootPath: env('WASABI_UPLOAD_PREFIX', 'cms'),
              s3Options: {
                region: env('WASABI_REGION', 'us-east-1'),
                endpoint: env('WASABI_ENDPOINT', 'https://s3.wasabisys.com'),
                forcePathStyle: true,
                credentials: {
                  accessKeyId: wasabiAccessKey,
                  secretAccessKey: wasabiSecretKey,
                },
                params: {
                  Bucket: wasabiBucket,
                  ACL: 'public-read',
                },
              },
            },
          }
        : {
            provider: 'local',
          },
    },

    // ─── Email Provider (Nodemailer SMTP) ──────────────────────────────────
    email: {
      config: {
        provider: 'nodemailer',
        providerOptions: {
          host: env('SMTP_HOST', 'smtp.ejemplo.com'),
          port: env.int('SMTP_PORT', 587),
          secure: env.bool('SMTP_SECURE', false),
          auth: {
            user: env('SMTP_USER', ''),
            pass: env('SMTP_PASS', ''),
          },
        },
        settings: {
          defaultFrom: env('EMAIL_FROM', 'Doc Platform <notificaciones@tudominio.com>'),
          defaultReplyTo: env('EMAIL_REPLY_TO', 'admin@tudominio.com'),
        },
      },
    },

    // ─── Color Picker Plugin ──────────────────────────────────────────────
    'color-picker': {
      enabled: true,
      resolve: './node_modules/@strapi/plugin-color-picker',
    },
  };
};

export default config;
