# 不用 Xcode：用 GitHub 雲端 Mac 上架 App Store

`.github/workflows/ios-testflight.yml` 會在 GitHub 的雲端 Mac 上幫你打包 iOS App，並自動上傳到 App Store Connect。
公開 repo 使用 GitHub 雲端 Mac **免費、不限分鐘數**；私人 repo 會扣每月免費額度（macOS 分鐘數以 10 倍計算）。

只要先完成下面 4 個一次性設定，之後每次上架都是「按一下 Run workflow」。

---

## 設定 1：註冊 Bundle ID

1. 打開 https://developer.apple.com/account/resources/identifiers/list
2. 按藍色 **＋** → 選 **App IDs** → **Continue** → 選 **App** → **Continue**
3. 填寫：
   - **Description**：`VaultCard`
   - **Bundle ID**：選 **Explicit**，填 `app.vaultcard.card`
4. 下方 Capabilities 不用勾任何項目 → **Continue** → **Register**

> 如果出現「已被使用」，代表這個 ID 被別人註冊了，請告訴 Claude 換一個。

## 設定 2：在 App Store Connect 建立 App

1. 打開 https://appstoreconnect.apple.com/apps
2. 左上角 **＋** → **新增 App**
3. 填寫：
   - 平台：勾 **iOS**
   - 名稱：`VaultCard 人脈名片`
   - 主要語言：**繁體中文**
   - 套件 ID：選剛剛註冊的 `app.vaultcard.card`
   - SKU：`vaultcard-001`
   - 使用者存取權限：**完整存取權限**
4. 按 **建立**

## 設定 3：建立 App Store Connect API 金鑰

1. 打開 https://appstoreconnect.apple.com/access/integrations/api
2. 第一次使用時按 **要求存取權限**，同意條款
3. 按 **＋**（產生 API 金鑰）：
   - 名稱：`GitHub Actions`
   - 存取權限：選 **管理（Admin）**（雲端自動簽署憑證需要這個權限）
4. 按 **產生**，畫面上會出現：
   - **Issuer ID**（表格上方，格式像 `69a6de7e-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
   - **金鑰 ID**（表格中的 Key ID，10 碼，例如 `2X9R4HXF34`）
5. 按該列的 **下載 API 金鑰**，會下載一個 `AuthKey_XXXXXXXXXX.p8` 檔
   ⚠️ **這個檔案只能下載一次**，請妥善保存。

再找出你的 **Team ID**：打開 https://developer.apple.com/account ，往下捲到 **Membership details**，**Team ID** 是 10 碼英數字。

## 設定 4：把資料存進 GitHub Secrets

1. 打開 https://github.com/101academyforyou/vaultcard/settings/secrets/actions
2. 按綠色 **New repository secret**，新增以下 4 個（名稱要完全一樣）：

| Name | Secret（值） |
| --- | --- |
| `APPLE_TEAM_ID` | 你的 Team ID |
| `ASC_KEY_ID` | 金鑰 ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8` | 用文字編輯器打開 `.p8` 檔，**全部內容**複製貼上（包含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----` 兩行） |

> 🔒 Secrets 會加密儲存，設定後任何人（包括你自己）都看不到內容，只有打包流程能使用。**不要把這些值貼到聊天室、Issue 或程式碼裡。**

---

## 開始打包上傳

1. 打開 https://github.com/101academyforyou/vaultcard/actions
2. 左側點 **iOS 打包上傳 TestFlight**
3. 右側按 **Run workflow** → 版本號保持 `1.0.0` → 綠色 **Run workflow**
4. 大約 10–15 分鐘後出現綠色勾勾 ✅ 就是上傳成功
5. 再等 15–30 分鐘，App Store Connect → 你的 App → **TestFlight** 會出現這個建置版本

## 之後的流程

- **自己先測試**：在 iPhone 安裝 **TestFlight** App，在 App Store Connect 的 TestFlight →「內部測試」把自己加進去，就能在手機上安裝測試
- **送審**：App Store Connect → App Store 分頁 → 貼上 [商店文案](APP_STORE_LISTING.md)、上傳 `assets/appstore/iphone-6.9/` 的 6 張截圖 → 「建置版本」選剛上傳的版本 → **提交以供審查**
- **更新版本**：修改內容並合併到 `main` 後，再按一次 Run workflow，版本號改成 `1.0.1`、`1.1.0` 等；建置號碼會自動遞增

## 常見錯誤

| 錯誤訊息 | 解法 |
| --- | --- |
| `缺少 Secrets：…` | 設定 4 有漏掉的 Secret，名稱要完全一樣 |
| `No profiles for 'app.vaultcard.card' were found` / 憑證相關錯誤 | API 金鑰權限要選 **管理（Admin）**；確認設定 1 的 Bundle ID 已註冊 |
| `Error Downloading App Information` / 找不到 App | 設定 2 的 App 還沒建立，或套件 ID 選錯 |
| `The bundle version must be higher` | 重新 Run 一次即可（建置號碼會自動 +1） |
| `Invalid Pre-Release Train` / 版本已關閉 | 該版本號已經上架過，Run 時改用更大的版本號 |

遇到其他錯誤：點進失敗的那次執行 → 點紅色 ❌ 的步驟 → 把錯誤訊息複製給 Claude。
