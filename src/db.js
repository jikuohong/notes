// src/db.js — D1 数据库 Schema 初始化

export const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS memos(
    id         TEXT    PRIMARY KEY,
    title      TEXT    DEFAULT '',
    content    TEXT    DEFAULT '',
    tags       TEXT    DEFAULT '[]',
    pinned     INTEGER DEFAULT 0,
    color      TEXT    DEFAULT '',
    card_style INTEGER DEFAULT 0,
    canvas_x   REAL,
    canvas_y   REAL,
    images     TEXT    DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shared_links(
    token      TEXT PRIMARY KEY,
    memo_id    TEXT NOT NULL,
    mode       TEXT DEFAULT 'styled',
    password   TEXT,
    expires_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_tokens(
    token      TEXT    PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mu ON memos(updated_at DESC)`,
];

// 旧库迁移补丁（ALTER TABLE 在列已存在时会报错，直接忽略）
export const MIGRATIONS = [
  `ALTER TABLE memos ADD COLUMN color TEXT DEFAULT ''`,
  `ALTER TABLE memos ADD COLUMN card_style INTEGER DEFAULT 0`,
  `ALTER TABLE shared_links ADD COLUMN mode TEXT DEFAULT 'styled'`,
  `ALTER TABLE shared_links ADD COLUMN expires_at INTEGER`,
  `ALTER TABLE shared_links ADD COLUMN password TEXT`,
  `ALTER TABLE memos ADD COLUMN images TEXT DEFAULT '[]'`,
];

export async function initSchema(env) {
  if (!env || !env.DB) return;
  try {
    for (const s of SCHEMA_STMTS) {
      try { await env.DB.prepare(s).run(); } catch (e) { /* already exists */ }
    }
    for (const s of MIGRATIONS) {
      try { await env.DB.prepare(s).run(); } catch (e) { /* column already exists */ }
    }
  } catch (e) { /* silently ignore */ }
}
