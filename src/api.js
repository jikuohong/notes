// src/api.js — API 路由处理

import { J, genTok, authCheck, stripHtml } from './utils.js';
import { getHTML } from './html.js';

/**
 * 处理所有 API 请求。
 * 返回 Response 对象，或返回 null 表示交由上层处理（回落到 SPA HTML）。
 */
export async function handleApi(req, env, url, path, method) {

  // ── 公开：GET /api/share/:token ──
  if (path.match(/^\/api\/share\/[\w-]+$/) && method === 'GET') {
    const tok = path.split('/').pop();
    const link = await env.DB.prepare('SELECT * FROM shared_links WHERE token=?').bind(tok).first();
    if (!link) return J({ error: 'not found' }, 404);
    if (link.expires_at && link.expires_at < Date.now()) return J({ error: 'expired' }, 410);

    if (link.password) {
      const provided = url.searchParams.get('pw') || '';
      if (provided !== link.password) return J({ error: 'password_required', hint: '需要密码访问此链接' }, 403);
    }

    const memo = await env.DB.prepare('SELECT * FROM memos WHERE id=?').bind(link.memo_id).first();
    if (!memo) return J({ error: 'deleted' }, 404);
    return J({ ...memo, expires_at: link.expires_at || null, mode: link.mode || 'styled', has_password: !!link.password });
  }

  // ── 公开：/share/:token 页面 ──
  if (path.match(/^\/share\/[\w-]+$/) && method === 'GET') {
    const tok = path.split('/').pop();
    const link = await env.DB.prepare('SELECT * FROM shared_links WHERE token=?').bind(tok).first();
    if (!link) return new Response('链接不存在', { status: 404, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (link.expires_at && link.expires_at < Date.now()) return new Response('该分享链接已过期', { status: 410, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });

    if ((link.mode || 'styled') === 'plain') {
      const memo = await env.DB.prepare('SELECT * FROM memos WHERE id=?').bind(link.memo_id).first();
      if (!memo) return new Response('内容已删除', { status: 404, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      const tags = JSON.parse(memo.tags || '[]');
      const lines = [
        memo.title ? memo.title + '\n' + '='.repeat(Math.min(memo.title.length, 60)) : '',
        tags.length ? 'Tags: ' + tags.map(t => '#' + t).join(' ') : '',
        '',
        stripHtml(memo.content || ''),
        '',
        '---',
        'Updated: ' + new Date(memo.updated_at).toISOString(),
        'Shared via Meow',
      ];
      return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    }

    // 样式化分享页：返回 SPA，由前端渲染
    return new Response(getHTML(), { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }

  // ── 认证：POST /api/auth ──
  if (path === '/api/auth' && method === 'POST') {
    const b = await req.json().catch(() => ({}));
    if (b.password !== (env.PASSWORD || 'meow')) return J({ ok: false }, 401);
    const tok = genTok(48);
    const now = Date.now();
    await env.DB
      .prepare('INSERT INTO auth_tokens(token,created_at,expires_at)VALUES(?,?,?)')
      .bind(tok, now, now + 30 * 86400 * 1000)
      .run();
    return J({ ok: true, token: tok });
  }

  // ── 受保护路由：验证 token ──
  if (path.startsWith('/api/')) {
    const at = await authCheck(req, env);
    if (!at) return J({ error: 'Unauthorized' }, 401);

    // GET /api/memos
    if (path === '/api/memos' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT * FROM memos ORDER BY pinned DESC,updated_at DESC')
        .all();
      return J(results || []);
    }

    // POST /api/memos
    if (path === '/api/memos' && method === 'POST') {
      const b = await req.json();
      await env.DB
        .prepare('INSERT INTO memos(id,title,content,tags,pinned,color,card_style,images,canvas_x,canvas_y,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(
          b.id, b.title || '', b.content || '', b.tags || '[]',
          b.pinned || 0, b.color || '', b.card_style || 0, b.images || '[]',
          b.canvas_x ?? null, b.canvas_y ?? null,
          b.created_at || Date.now(), b.updated_at || Date.now()
        )
        .run();
      return J({ ok: true });
    }

    // PUT /api/memos/:id
    if (path.match(/^\/api\/memos\/[\w-]+$/) && method === 'PUT') {
      const id = path.split('/').pop();
      const b = await req.json();
      await env.DB
        .prepare('UPDATE memos SET title=?,content=?,tags=?,pinned=?,color=?,card_style=?,images=?,canvas_x=?,canvas_y=?,updated_at=? WHERE id=?')
        .bind(
          b.title || '', b.content || '', b.tags || '[]', b.pinned || 0,
          b.color || '', b.card_style || 0, b.images || '[]',
          b.canvas_x ?? null, b.canvas_y ?? null,
          Date.now(), id
        )
        .run();
      return J({ ok: true });
    }

    // DELETE /api/memos/:id
    if (path.match(/^\/api\/memos\/[\w-]+$/) && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM memos WHERE id=?').bind(path.split('/').pop()).run();
      return J({ ok: true });
    }

    // POST /api/share
    if (path === '/api/share' && method === 'POST') {
      const b = await req.json();
      const memo = await env.DB.prepare('SELECT id FROM memos WHERE id=?').bind(b.memo_id).first();
      if (!memo) return J({ error: 'memo not found' }, 404);
      const expSecs = b.expire_secs || 0;
      const expiresAt = expSecs ? Date.now() + expSecs * 1000 : null;
      const mode = b.mode || 'styled';
      const tok = genTok(16);
      const pw = b.password || null;
      await env.DB
        .prepare('INSERT INTO shared_links(token,memo_id,mode,password,expires_at,created_at)VALUES(?,?,?,?,?,?)')
        .bind(tok, b.memo_id, mode, pw, expiresAt, Date.now())
        .run();
      return J({ ok: true, token: tok });
    }

    // 未匹配的 /api/* 路由
    return J({ error: 'Not Found' }, 404);
  }

  // 非 API 路由，交由上层处理
  return null;
}
