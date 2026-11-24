# 網頁版部署（GitHub Pages）

網頁版用 **GitHub Pages** 自動發布。推送到 `main` 後，`.github/workflows/pages.yml` 會把網頁檔案複製到 `www/` 並部署。

## 步驟 1：開啟 GitHub Pages

到 repo **101academyforyou/vaultcard** → **Settings → Pages**：

- **Source**：選 **GitHub Actions**

## 步驟 2：合併到 main

把開發分支合併到 `main`，到 **Actions** 分頁看部署進度。完成後網址是：

**https://101academyforyou.github.io/vaultcard/**

> ⚠️ 如果 repo 是私人的，GitHub Pages 需要付費方案（Pro / Team）。免費方案請把 repo 設成公開。

## （選用）步驟 3：使用自訂網域

例如想用 `vaultcard.onepointzeroone.org`：

1. 在管理網域的地方新增 DNS 紀錄：

   | 類型 | 名稱 | 值 |
   | --- | --- | --- |
   | `CNAME` | `vaultcard` | `101academyforyou.github.io` |

2. **Settings → Pages → Custom domain** 填 `vaultcard.onepointzeroone.org` → **Save**，等憑證發好後勾 **Enforce HTTPS**
3. 在 repo 根目錄新增一個 `CNAME` 檔，內容就是網域，並把它加進 `scripts/build-www.mjs` 的 `files` 清單
4. **重要**：把 `js/config.js` 的 `VAULTCARD_SITE` 改成新網址（結尾要有 `/`）。App 分享名片時用的就是這個網址

## 上架會用到的網址

- 隱私權政策網址：`<網頁版網址>privacy.html`
- 支援網址 / 行銷網址：`<網頁版網址>`
