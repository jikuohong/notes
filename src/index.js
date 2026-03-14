// MeowNote — Cloudflare Worker v5 (多文件版)
// Bindings: D1 → "DB" | Env: PASSWORD

import { initSchema, SCHEMA_STMTS, MIGRATIONS } from './db.js';
import { handleApi } from './api.js';
import { getHTML } from './html.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Init DB schema on every request (idempotent, uses IF NOT EXISTS)
    await initSchema(env);

    // Delegate to API handler
    const apiResponse = await handleApi(req, env, url, path, method);
    if (apiResponse) return apiResponse;

    // Fallback: serve the SPA HTML
    return new Response(getHTML(), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};
