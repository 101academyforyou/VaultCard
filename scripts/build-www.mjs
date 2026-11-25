// 把 App 的網頁檔案複製到 www/，給 Capacitor 打包成 iOS / Android App（網站部署請用 build-site.mjs）
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const files = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of files) cpSync(join(root, f), join(out, f), { recursive: true });
console.log('✔ 已輸出到 www/：' + files.join(', '));
