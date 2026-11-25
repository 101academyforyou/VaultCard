# VaultCard 🪪💎

**一張名片，就是一則 Obsidian 筆記。**

VaultCard 是 Obsidian 風格的社交名片 App + 網頁：掃 QR 交換名片，把認識的人存成 Markdown 人脈筆記，用 `[[雙向連結]]`、`#標籤` 和關係圖譜看見你的人際網路，最後整包匯出成 Obsidian Vault。

- 🌐 介紹頁：https://vaultcard.onepointzeroone.org/ ・網頁版 App：https://vaultcard.onepointzeroone.org/app/
- 📱 同一份程式碼用 Capacitor 打包成 **iOS / Android App**
- 🔒 不用註冊、沒有伺服器：名片資料直接放在分享連結裡，人脈只存在你的裝置

## 功能

| 頁面 | 網址 | 說明 |
| --- | --- | --- |
| 👋 歡迎 | `#/welcome` | 第一次打開時的介紹頁；建立名片後首頁直接是「我的名片」 |
| 🪪 我的名片 | `#/card` | 填名字、職稱、公司、自介、標籤、主題色、電話 / Email / 網站 / LINE / IG / Threads / LinkedIn / GitHub，即時預覽，自動產生 **QR Code 與分享連結**，可下載 QR 圖片、`.md`、vCard |
| 🤝 收到名片 | `#/c/<資料>` | 對方打開連結看到名片 → 填「在哪認識」→ 存成人脈筆記 → 一鍵回傳自己的名片完成交換；也能存到通訊錄（vCard） |
| 👥 人脈 | `#/people` | 搜尋、標籤篩選；掃描 QR（支援 `BarcodeDetector` 的瀏覽器）、貼上名片連結、手動新增 |
| 📄 人脈筆記 | `#/people/<id>` | 屬性（在哪認識、日期、私人標籤）＋ Markdown 筆記，支援 `[[連結]]`、`#標籤`、Callout；顯示**反向連結**與「同場認識」的人；點未建立的連結可直接新增那個人；改名會自動更新其他筆記裡的連結 |
| 🕸️ 人脈圖譜 | `#/network` | 力導向圖：我 → 人脈 → 活動 / 標籤，筆記裡的 `[[連結]]` 會把人串起來，可拖曳、縮放、點擊開啟 |
| ⚙️ 設定與資料 | `#/settings` | **匯出 Obsidian Vault (.zip)**、備份 / 還原 JSON、清除資料 |

### 匯出的 Vault 長這樣

```
VaultCard 人脈 Vault 2026-11-24.zip
├── 你的名字.md          ← 你的名片
├── 人脈 MOC.md          ← 所有人脈、依活動分組
├── 人脈/
│   ├── 林小晶.md        ← 屬性（title、org、email、met、where…）+ 聯絡方式 + 你的筆記
│   └── 阿明.md
└── 活動/
    └── COSCUP 2026.md   ← 在這裡認識的人
```

解壓縮後在 Obsidian 選「開啟資料夾作為 Vault」，打開關係圖譜就能看到人脈網路。

### 名片連結怎麼運作

名片資料 → JSON → `deflate-raw` 壓縮 → base64url，放在網址 `#/c/` 後面。`#` 之後的內容瀏覽器不會送到伺服器，所以名片不經過任何後端。打開連結時會驗證、清理所有欄位（長度、型別、只允許安全的連結格式）。

## 語言（繁體中文 / English）

介紹頁、App、隱私權政策都支援中英文：

- 預設跟隨裝置語言：中文裝置顯示中文，其他語言顯示英文
- 使用者可以在 App 的「設定與資料 → 語言」、歡迎頁或介紹頁右上角切換，選擇會記住，三個頁面共用（`localStorage: vaultcard:lang`）
- App 的文字在 `js/i18n.js`：程式裡直接寫中文 `t('中文 {0}', x)`，英文翻譯放在同一個檔案的 `EN` 字典；`{s}` 會在數量不是 1 時變成英文複數的 s
- 介紹頁的英文寫在各元素的 `data-en` 屬性；英文版手機截圖在 `site/img/en/`
- 匯出的 Vault 也會依語言使用英文資料夾與標籤（`People/`、`Events/`、`People MOC`）
- iOS 的 `Info.plist` 宣告了 `en`、`zh-Hant` 兩種語言，App Store 會顯示這兩種語言，App 內也能正確判斷裝置語言

## 介紹頁與使用人數

網站首頁是介紹頁（`site/`），App 在 `/app/`。舊的名片連結（`/#/c/…`）會自動轉到 `/app/`，不會失效。

首頁的「已有 N 人在用」和 App Store 按鈕讀取 `site/stats.json`，**手動維護**（App 本身不蒐集任何資料）：

```json
{ "users": 1280, "appStoreUrl": "https://apps.apple.com/app/id0000000000", "updated": "2026-12-01" }
```

- `users` 是 0 時顯示「剛上線，歡迎成為第一批使用者」
- `appStoreUrl` 是空字串時顯示「App Store 即將上架」（只接受 `https://apps.apple.com/` 開頭的網址）
- 數字可以參考 App Store Connect →「分析」的下載數；改完合併到 `main` 就會自動部署

## 本機執行

純 HTML / CSS / JavaScript，不需要建置：

```bash
python3 -m http.server 8000
```

打開 <http://localhost:8000> 是 App 本身。要預覽整個網站（介紹頁＋`/app/`）：

```bash
node scripts/build-site.mjs
```

```bash
python3 -m http.server 8000 -d _site
```

## 打包成 App

```bash
npm install
```

```bash
npm run ios       # 需要 Mac + Xcode
```

```bash
npm run android   # 需要 Android Studio
```

沒有 Mac 也可以：用 GitHub 雲端 Mac 一鍵打包上傳 TestFlight，見 [docs/IOS_CLOUD_BUILD.md](docs/IOS_CLOUD_BUILD.md)。

- App ID：`app.vaultcard.card`（iPhone 專用、直向）
- App 內分享名片時，連結會指向 `js/config.js` 的 `VAULTCARD_SITE`。換網域時記得改這裡

## 網頁版部署

推送到 `main` 後，GitHub Actions 用 `scripts/build-site.mjs` 組出介紹頁＋`/app/`，自動部署到 GitHub Pages（自訂網域 `vaultcard.onepointzeroone.org`）。第一次設定（DNS、HTTPS）請看 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 專案結構

```
index.html             App 入口（網站上在 /app/，也是 iOS / Android App 的內容）
site/                  介紹頁：index.html、stats.json（使用人數）、img/、sw.js（清除舊版快取）
privacy.html           隱私權政策（上架必填）
manifest.webmanifest   PWA 設定
sw.js                  離線快取
css/style.css          Obsidian 風格紫黑色主題與響應式版面
js/config.js           網頁版正式網址（分享連結用）
js/i18n.js             中英文切換與英文翻譯字典
CNAME                  GitHub Pages 自訂網域
js/markdown.js         支援 Obsidian 語法的輕量 Markdown 轉換器
js/vaultcard.js        名片編碼 / QR、人脈筆記、圖譜資料、Vault / vCard / .md 匯出
js/app.js              外框、路由、歡迎頁、力導向圖譜引擎
js/vendor/qrcode.js    QR Code 產生器（Kazuhiko Arase，MIT）
icons/  assets/        網頁 / App 圖示、商店圖示、啟動畫面
capacitor.config.json  App 設定（App ID、名稱）
scripts/build-www.mjs  把 App 複製到 www/ 給 Capacitor 打包
scripts/build-site.mjs 組出網站到 _site/（介紹頁 + /app/ + privacy.html）給 Pages 部署
scripts/check-asc-key.mjs  iOS 打包前檢查 App Store Connect API 金鑰
ios/  android/         原生 App 專案（Capacitor 產生）
```

---

VaultCard 為獨立專案，與 Obsidian（Dynalist Inc.）無隸屬關係。
