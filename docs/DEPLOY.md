# 網頁版部署：vaultcard.onepointzeroone.org

網頁版用 **GitHub Pages** 發布到 **https://vaultcard.onepointzeroone.org/**。推送到 `main` 後，`.github/workflows/pages.yml` 會把網頁檔案（含 `CNAME`）複製到 `www/` 並自動部署。

只需要做一次下面的設定。

## 步驟 1：設定 DNS（在管理 onepointzeroone.org 的地方）

新增一筆紀錄：

| 類型 | 名稱 / 主機 | 值 / 指向 | TTL |
| --- | --- | --- | --- |
| `CNAME` | `vaultcard` | `101academyforyou.github.io` | 自動 |

> 值的結尾**不要**加 repo 名稱（不是 `101academyforyou.github.io/vaultcard`）。
> 如果你的 DNS 在 Cloudflare，請把這筆紀錄的 Proxy 設成 **DNS only（灰色雲）**，否則 GitHub 發不了 HTTPS 憑證。

設定後幾分鐘到幾小時內生效，可以用這個指令確認：

```bash
nslookup vaultcard.onepointzeroone.org
```

看到指向 `101academyforyou.github.io` 就代表生效了。

## 步驟 2：開啟 GitHub Pages

到 repo **101academyforyou/vaultcard** → **Settings → Pages**：

1. **Source**：選 **GitHub Actions**
2. **Custom domain**：填 `vaultcard.onepointzeroone.org` → **Save**
3. 等 DNS 檢查通過、憑證發好後（最多約 1 小時），勾選 **Enforce HTTPS**

> ⚠️ 如果 repo 是私人的，GitHub Pages 需要付費方案（Pro / Team）。免費方案請把 repo 設成公開。

> **建議**：到 GitHub **組織（101academyforyou）→ Settings → Pages → Verified domains** 驗證 `onepointzeroone.org`，防止別人拿你的子網域去掛他們的 GitHub Pages（子網域接管）。

## 步驟 3：部署

把開發分支合併到 `main`，到 repo 的 **Actions** 分頁看部署進度，完成後打開 https://vaultcard.onepointzeroone.org/ 確認。

## 常見問題

| 狀況 | 解法 |
| --- | --- |
| 「DNS check unsuccessful」 | DNS 還沒生效，或 CNAME 值打錯 |
| 無法勾選 Enforce HTTPS | 憑證還在發，等一下再試；Cloudflare 請改成 DNS only |
| 404 | 確認 Source 是 GitHub Actions，且 Actions 裡的部署成功 |

## 網址寫在哪裡

- `CNAME`：GitHub Pages 自訂網域
- `js/config.js` 的 `VAULTCARD_SITE`：App 內分享名片時產生的連結
- `index.html` 的 canonical / og 標籤

換網域時這三個地方都要改。

## 上架會用到的網址

- 隱私權政策網址：`https://vaultcard.onepointzeroone.org/privacy.html`
- 支援網址 / 行銷網址：`https://vaultcard.onepointzeroone.org/`
