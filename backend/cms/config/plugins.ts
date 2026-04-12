import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        // Optional: override the public URL base (e.g. a CDN in front of Wasabi).
        // If omitted, Strapi returns the raw S3/Wasabi URL.
        baseUrl: env('WASABI_BASE_URL', undefined),
        // All uploads land under this prefix inside the bucket.
        rootPath: env('WASABI_UPLOAD_PREFIX', 'cms'),
        s3Options: {
          region: env('WASABI_REGION', 'us-east-1'),
          endpoint: env('WASABI_ENDPOINT', 'https://s3.wasabisys.com'),
          // Wasabi requires path-style URLs (bucket in path, not subdomain).
          forcePathStyle: true,
          credentials: {
            accessKeyId: env('WASABI_ACCESS_KEY'),
            secretAccessKey: env('WASABI_SECRET_KEY'),
          },
        },
      },
      actionOptions: {
        upload: { Bucket: env('WASABI_BUCKET') },
        uploadStream: { Bucket: env('WASABI_BUCKET') },
        delete: { Bucket: env('WASABI_BUCKET') },
      },
    },
  },
});

export default config;
