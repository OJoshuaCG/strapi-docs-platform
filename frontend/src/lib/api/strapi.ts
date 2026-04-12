/**
 * Base Strapi v5 HTTP client.
 *
 * - Reads VITE_STRAPI_URL from the environment (defaults to localhost:1337).
 * - All requests go through `strapiRequest()`, which normalises errors into a
 *   typed StrapiError so callers never deal with raw fetch exceptions.
 * - Basic in-memory cache (Map) with a configurable TTL avoids hammering the
 *   API on repeated navigations. Cache is keyed on the full URL string.
 */

import type { StrapiErrorResponse } from '$lib/types/strapi';
import { browser } from '$app/environment';

// ─── Config ──────────────────────────────────────────────────────────────────

const STRAPI_URL = (import.meta.env.VITE_STRAPI_URL as string) ?? 'http://localhost:1337';

/**
 * Cache TTL in milliseconds.
 * Browser-side only — avoids re-fetching on rapid client navigations.
 * SSR never uses cache (getFromCache returns null when !browser).
 * Keep this short so content published in Strapi admin appears quickly.
 */
const CACHE_TTL = 30 * 1000; // 30 seconds

// ─── In-memory cache (browser-side only) ─────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): T | null {
  if (!browser) return null;
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(key: string, data: T): void {
  if (!browser) return;
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

export function invalidateCache(): void {
  cache.clear();
}

// ─── Core request function ────────────────────────────────────────────────────

export class StrapiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly strapiError: StrapiErrorResponse['error'],
  ) {
    super(strapiError.message);
    this.name = 'StrapiRequestError';
  }
}

export async function strapiRequest<T>(
  path: string,
  options: RequestInit = {},
  fetchFn: typeof fetch = globalThis.fetch,
  useCache = true,
): Promise<T> {
  const url = `${STRAPI_URL}/api${path}`;

  if (useCache && (!options.method || options.method === 'GET')) {
    const cached = getFromCache<T>(url);
    if (cached !== null) return cached;
  }

  const res = await fetchFn(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let errorBody: StrapiErrorResponse;
    try {
      errorBody = await res.json();
    } catch {
      throw new StrapiRequestError(res.status, {
        status: res.status,
        name: 'FetchError',
        message: res.statusText,
      });
    }
    throw new StrapiRequestError(res.status, errorBody.error);
  }

  const data: T = await res.json();

  if (useCache && (!options.method || options.method === 'GET')) {
    setInCache(url, data);
  }

  return data;
}

// ─── URL builder ─────────────────────────────────────────────────────────────

/**
 * Builds a query string from a plain object.
 * Arrays are serialised as `key[0]=a&key[1]=b` (Strapi / qs style).
 */
export function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];

  function encode(key: string, value: unknown) {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => encode(`${key}[${i}]`, v));
    } else if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
        encode(`${key}[${k}]`, v),
      );
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  Object.entries(params).forEach(([k, v]) => encode(k, v));
  return parts.length ? `?${parts.join('&')}` : '';
}

export { STRAPI_URL };
