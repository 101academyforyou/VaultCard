// 組出 GitHub Pages 要發布的網站到 _site/：
//   /            介紹頁（site/）
//   /app/        VaultCard 網頁版 App
//   /privacy.html 隱私權政策（App Store 填的網址）
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const app = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'app'), { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
for (const f of app) cpSync(join(root, f), join(out, 'app', f), { recursive: true });
for (const f of ['privacy.html', 'CNAME', '.nojekyll']) cpSync(join(root, f), join(out, f));
console.log('✔ 已輸出到 _site/：介紹頁、app/、privacy.html');
