#!/usr/bin/env node
// scripts/build-html.js
// 将 public/index.html 转换为 src/html.js 中可导出的 JS 模块
// 用法：node scripts/build-html.js

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const htmlPath = resolve(root, 'public', 'index.html');
const outPath  = resolve(root, 'src', 'html.js');

const html = readFileSync(htmlPath, 'utf-8');
const jsonStr = JSON.stringify(html);

const output = `// src/html.js — 前端 SPA HTML
// ⚠️  此文件由 scripts/build-html.js 自动生成，请勿手动编辑
// 如需修改界面，请编辑 public/index.html，然后运行：npm run build:html

export function getHTML() {
  return ${jsonStr};
}
`;

writeFileSync(outPath, output, 'utf-8');
console.log(`✓ src/html.js 已更新 (${html.length} bytes → ${output.length} bytes)`);
