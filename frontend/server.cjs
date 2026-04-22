'use strict';

/**
 * Wrapper CommonJS para Phusion Passenger (cPanel).
 *
 * Passenger usa require() para cargar el startup file, pero build/index.js
 * es un módulo ESM (generado por @sveltejs/adapter-node) con top-level await,
 * incompatible con require(). Este wrapper CJS usa import() dinámico para
 * cargarlo correctamente.
 *
 * Startup file en cPanel Setup Node.js App: server.cjs
 */

const path = require('path');
const fs   = require('fs');

// ── Cargar .env manualmente ────────────────────────────────────────────────
// Passenger no inyecta .env automáticamente. Las variables definidas aquí
// quedan disponibles en process.env antes de que arranque SvelteKit.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} else {
  console.warn('[server.cjs] .env no encontrado en:', envPath);
}

// ── Iniciar SvelteKit vía import() dinámico ────────────────────────────────
import('./build/index.js').catch(err => {
  console.error('[server.cjs] Error al iniciar la aplicación SvelteKit:', err);
  process.exit(1);
});
