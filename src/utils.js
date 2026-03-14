// src/utils.js — 共用工具函数

/** JSON 响应 */
export const J = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });

/** 生成随机 token */
export function genTok(n = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return [...arr].map(b => chars[b % chars.length]).join('');
}

/** 验证 Bearer token */
export async function authCheck(req, env) {
  const t = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!t) return null;
  const r = await env.DB
    .prepare('SELECT token FROM auth_tokens WHERE token=? AND expires_at>?')
    .bind(t, Date.now())
    .first();
  return r ? t : null;
}

/** 去除 HTML 标签，返回纯文本（用于纯文本分享） */
export function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
