// 在打包前先檢查 App Store Connect API 金鑰能不能用，失敗時說清楚是哪一個設定有問題。
// 不會印出任何 Secret 的內容。
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

const { ASC_KEY_ID = '', ASC_ISSUER_ID = '', APPLE_TEAM_ID = '', KEY_PATH = '' } = process.env;
const bundleId = JSON.parse(readFileSync(new URL('../capacitor.config.json', import.meta.url))).appId;
const problems = [];
const fail = (msg) => { console.log('::error::' + msg); problems.push(msg); };
const ok = (msg) => console.log('✅ ' + msg);

// 1. 格式檢查
if (/^[A-Z0-9]{10}$/.test(ASC_KEY_ID)) ok('ASC_KEY_ID 格式正確（10 碼英數字）');
else fail(`ASC_KEY_ID 格式不對：應該是 10 碼大寫英數字（目前長度 ${ASC_KEY_ID.length}${/\s/.test(ASC_KEY_ID) ? '，含有空白或換行' : ''}）`);

if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ASC_ISSUER_ID)) ok('ASC_ISSUER_ID 格式正確（UUID）');
else fail(`ASC_ISSUER_ID 格式不對：應該是 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 的 UUID（目前長度 ${ASC_ISSUER_ID.length}${/\s/.test(ASC_ISSUER_ID) ? '，含有空白或換行' : ''}）。注意不是 Team ID`);

if (/^[A-Z0-9]{10}$/.test(APPLE_TEAM_ID)) ok('APPLE_TEAM_ID 格式正確（10 碼英數字）');
else fail(`APPLE_TEAM_ID 格式不對：應該是 10 碼大寫英數字（目前長度 ${APPLE_TEAM_ID.length}）`);

let key = null;
const pem = KEY_PATH ? readFileSync(KEY_PATH, 'utf8') : '';
if (!pem.includes('-----BEGIN PRIVATE KEY-----') || !pem.includes('-----END PRIVATE KEY-----')) {
  fail('ASC_KEY_P8 內容不完整：要包含 -----BEGIN PRIVATE KEY----- 和 -----END PRIVATE KEY----- 兩行');
} else {
  try {
    key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== 'ec') { fail('ASC_KEY_P8 不是 App Store Connect 的金鑰（型別應為 EC）'); key = null; }
    else ok('ASC_KEY_P8 可以正常讀取');
  } catch (e) {
    fail('ASC_KEY_P8 讀不出來：內容可能被改動或少了幾行，請用文字編輯器重新整份複製');
  }
}

// 2. 真的向 Apple 驗證一次
if (key && !problems.length) {
  const b64u = (x) => Buffer.from(x).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  let res;
  try {
    res = await fetch('https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=' + encodeURIComponent(bundleId) + '&fields[apps]=bundleId,name', {
      headers: { Authorization: 'Bearer ' + head + '.' + body + '.' + sig }
    });
  } catch (e) {
    fail('連不到 App Store Connect（' + (e.cause && e.cause.code || e.message) + '），請稍後重新執行');
    process.exit(1);
  }
  const json = await res.json().catch(() => ({}));
  const err = (json.errors && json.errors[0]) || {};
  if (res.status === 200) {
    ok('Apple 接受這把 API 金鑰');
    const app = (json.data || [])[0];
    if (app) ok(`在 App Store Connect 找到 App：${app.attributes.name}（${bundleId}）`);
    else fail(`金鑰沒問題，但 App Store Connect 裡找不到套件 ID 為 ${bundleId} 的 App。請到 App Store Connect → App → ＋ 新增 App，套件 ID 選 ${bundleId}`);
  } else if (res.status === 401) {
    fail('Apple 拒絕這把金鑰（401 NOT_AUTHORIZED）。三個值彼此對不上，最常見原因：\n' +
      '  1. ASC_KEY_ID 和 .p8 不是同一把（.p8 檔名 AuthKey_XXXXXXXXXX.p8 的 X 就是金鑰 ID）\n' +
      '  2. ASC_ISSUER_ID 不是「整合 → App Store Connect API →「團隊金鑰」」頁面上方那串 Issuer ID\n' +
      '  3. 用的是「個人金鑰（Individual Keys）」——打包需要「團隊金鑰（Team Keys）」\n' +
      '  4. 這把金鑰已被撤銷');
  } else if (res.status === 403) {
    fail(`金鑰有效，但權限不足（403 ${err.code || ''}）。請建立存取權限為「管理（Admin）」的團隊金鑰`);
  } else {
    fail(`Apple 回應 ${res.status} ${err.code || ''} ${err.title || ''}`.trim());
  }
}

if (problems.length) {
  console.log('\n請到 Settings → Secrets and variables → Actions 修正上面的項目，再重新執行。');
  process.exit(1);
}
