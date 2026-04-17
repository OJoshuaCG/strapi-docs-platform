'use strict';

process.chdir(__dirname);

// Passenger (cPanel) no carga .env automáticamente.
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn('[server.js] .env no encontrado en:', envPath);
}

// Strapi usa el dist/ pre-compilado con `node_modules/.bin/tsc`
// Si dist/config/database.js no existe, ejecuta: node_modules/.bin/tsc
const distDir = path.join(__dirname, 'dist');

const { createStrapi } = require('@strapi/strapi');

(async () => {
  const app = createStrapi({ distDir });
  await app.start();
})().catch((err) => {
  console.error('Error al iniciar Strapi:', err);
  process.exit(1);
});