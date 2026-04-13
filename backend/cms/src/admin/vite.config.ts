import { mergeConfig, type UserConfig } from 'vite';

/**
 * Custom Vite configuration for Strapi admin panel.
 * 
 * This fixes the WebSocket connection issue where Strapi's internal Vite
 * tries to connect to the wrong HMR server (frontend's port 5173).
 * 
 * Docs: https://docs.strapi.io/dev-docs/configuring-vite
 */
export default (config: UserConfig) => {
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      // HMR is disabled because Strapi runs inside Docker and the WebSocket
      // cannot reach the container from the browser on a different port.
      hmr: false,
    },
  });
};
