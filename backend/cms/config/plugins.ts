import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const wasabiAccessKey = env('WASABI_ACCESS_KEY', '');
  const wasabiSecretKey = env('WASABI_SECRET_KEY', '');
  const wasabiBucket = env('WASABI_BUCKET', '');

  // Use Wasabi S3 only if all required credentials are provided.
  // Otherwise, fall back to local storage.
  const useWasabi = wasabiAccessKey && wasabiSecretKey && wasabiBucket;

  if (useWasabi) {
    return {
      upload: {
        config: {
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
            },
          },
          actionOptions: {
            upload: { Bucket: wasabiBucket },
            uploadStream: { Bucket: wasabiBucket },
            delete: { Bucket: wasabiBucket },
          },
        },
      },
    };
  }

  // Fall back to local filesystem storage
  return {
    upload: {
      config: {
        provider: 'local',
      },
    },
  };
};

export default config;
