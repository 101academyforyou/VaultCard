/* VaultCard 多語系：繁體中文（zh）與英文（en）
   - 預設跟隨裝置語言：中文裝置用中文，其他用英文；使用者在「設定」或首頁切換後會記住
   - 程式裡直接寫中文：t('中文 {0}', x)。中文介面原樣顯示；英文介面查下面的 EN 字典
   - 一次性的字用 L('中文', 'English')
   - 介紹頁、隱私權政策和 App 共用同一個設定（localStorage: vaultcard:lang） */
(function (global) {
  'use strict';
  const KEY = 'vaultcard:lang';

  function detect() {
    try { const s = localStorage.getItem(KEY); if (s === 'zh' || s === 'en') return s; } catch (e) { /* 私密模式 */ }
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    return /^zh/i.test(list[0] || '') ? 'zh' : 'en';
  }
  const lang = detect();
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';

  const EN = {
    // 外框與導覽
    '設定與資料': 'Settings & Data', '設定': 'Settings', '我的名片': 'My Card', '名片': 'Card', '人脈圖譜': 'Network', '圖譜': 'Graph', '人脈': 'Contacts',
    '功能區': 'Ribbon', '人脈就是你的 Vault': 'Your network is your vault', '返回': 'Back',
    'VaultCard · 用 Obsidian 的方式經營人脈': 'VaultCard · Your network, the Obsidian way',
    '👥 {0} 位人脈<br><span class="faint">資料只存在這台裝置</span>': '👥 {0} contact{s}<br><span class="faint">Data stays on this device</span>',
    // 歡迎頁
    '一張名片，就是一則 Obsidian 筆記。<br>交換名片、記下怎麼認識，用 [[連結]] 把人脈織成一張網。': 'Your business card is an Obsidian-style note.<br>Swap cards, note how you met, and weave your network together with [[links]].',
    '打開我的名片': 'Open my card', '建立我的名片': 'Create my card', '👀 看範例名片': '👀 View sample card',
    '1. 做一張名片': '1. Make your card', '30 秒填好，產生你的 QR Code 與分享連結。': 'Fill it in within 30 seconds and get your QR code and share link.',
    '2. 掃一下就交換': '2. Scan to swap', '對方打開連結，就能把你存成一則人脈筆記，再回傳他的名片。': 'They open your link, save you as a contact note, and send their card back.',
    '3. 長出你的人脈圖譜': '3. Grow your network graph', '寫筆記、加 #標籤、用 [[名字]] 連結，最後整包匯出成 Obsidian Vault。': 'Write notes, add #tags, link with [[names]], then export everything as an Obsidian vault.',
    '不用註冊、沒有伺服器。名片資料直接放在分享連結裡，人脈只存在你的裝置。': 'No sign-up, no servers. Your card lives in the share link and your contacts stay on your device.',
    '（尚未建立）': ' (not saved yet)', '📄「{0}」被提到了，但還沒存成人脈筆記': '📄 "{0}" is mentioned but not saved as a contact yet',
    'English': 'English', '中文': '中文',

    // 名片欄位
    '電話': 'Phone', '網站': 'Website', '：': ': ',
    '⚠️ 無法儲存（可能是私密瀏覽模式）': "⚠️ Couldn't save (private browsing?)",
    '我': 'Me', '名片 QR Code': 'Business card QR code', '你的名字': 'Your name', '職稱 · 公司 / 學校': 'Title · Company / School',
    '一句話介紹自己，讓對方記得你。': 'A one-line intro so people remember you.',
    '名字 *': 'Name *', '王小明': 'Alex Chen', '職稱': 'Title', '產品設計師': 'Product Designer', '公司 / 學校 / 社群': 'Company / School / Community', '晨光設計工作室': 'Acme Studio',
    '自我介紹': 'About', '我在做什麼、想認識什麼樣的人': "What you do and who you'd like to meet",
    '標籤（用空白或逗號分隔，會變成 #標籤）': 'Tags (separate with spaces or commas; they become #tags)', '設計 創業 Obsidian': 'design startup Obsidian',
    '主題色': 'Color', '聯絡方式與社群': 'Contact & social',

    // 我的名片
    '🪪 我的名片': '🪪 My Card',
    '名片就是一則 Obsidian 筆記。分享連結或 QR 給對方，對方打開就能把你存成人脈筆記——資料直接放在連結裡，不經過任何伺服器。': 'Your card is an Obsidian-style note. Share the link or QR code and they can save you as a contact note — the data lives in the link itself and never touches a server.',
    '先填上名字，就能產生你的分享連結與 QR Code。': 'Add your name to generate your share link and QR code.',
    '請對方用手機相機掃描，或直接傳連結': 'Have them scan it with their phone camera, or send the link',
    '📤 分享名片': '📤 Share card', '🔗 複製連結': '🔗 Copy link', 'QR 圖片': 'QR image',

    // 收到名片
    '收到名片': 'Received card', '正在讀取名片…': 'Loading card…', '{0} 的名片': "{0}'s card",
    '👀 這是<b>你自己的名片</b>，別人打開連結時會看到這個畫面。': '👀 This is <b>your own card</b> — it’s what others see when they open your link.',
    '回去編輯名片': 'Edit my card', '✅ <b>{0}</b> 已經在你的人脈裡了。': '✅ <b>{0}</b> is already in your contacts.',
    '打開人脈筆記': 'Open contact note', '🔄 更新成這張新名片': '🔄 Update to this card',
    '💎 存成人脈筆記': '💎 Save as a contact note',
    '記下在哪裡認識，之後在圖譜裡就能看到「同一場活動認識的人」。': 'Note where you met — your graph will then show everyone you met at the same event.',
    '在哪裡認識': 'Where you met', '例如：COSCUP 2026、朋友聚會': "e.g. Web Summit 2026, a friend's party", '日期': 'Date',
    '一句話備註（之後可以再寫更多）': 'Quick note (you can add more later)', '聊到想一起辦讀書會': 'Talked about starting a book club',
    '💎 存進我的人脈': '💎 Save to my contacts', '存到通訊錄（vCard）': 'Save to Contacts (vCard)', '下載 .md 筆記': 'Download .md note',
    '🪪 你也來做一張名片吧': '🪪 Make your own card',
    '用 30 秒建立你的 Obsidian 風格名片，再把連結回傳給 {0}，就完成交換了。': 'Create your Obsidian-style card in 30 seconds, then send the link back to {0} to complete the swap.',
    '🔄 已更新 {0} 的名片': "🔄 Updated {0}'s card", '💎 已把 {0} 存成人脈筆記': '💎 Saved {0} as a contact note',
    '讀不到這張名片': "Couldn't read this card",
    '你的瀏覽器版本太舊，無法解開這個連結。請更新瀏覽器後再試一次。': 'Your browser is too old to open this link. Please update it and try again.',
    '連結可能不完整或已損壞，請對方重新分享一次。': 'The link may be incomplete or damaged. Ask them to share it again.',
    '回到人脈': 'Back to contacts', '✅ 已存進人脈': '✅ Saved to contacts',
    '要不要把你的名片也傳給 {0}？這樣就完成交換了。': 'Send your card back to {0} to complete the swap?',
    '建立你自己的名片，就能回傳給 {0}。': 'Create your own card to send back to {0}.', '📤 回傳我的名片': '📤 Send my card back',

    // 人脈列表
    '👥 我的人脈': '👥 My Contacts',
    '每個人都是一則筆記。在筆記裡用 <code>[[名字]]</code> 連結彼此，用 <code>#標籤</code> 分類。': 'Every person is a note. Link people with <code>[[name]]</code> and organize them with <code>#tags</code>.',
    '📷 掃描名片': '📷 Scan card', '🔗 貼上名片連結': '🔗 Paste card link', '＋ 手動新增': '+ Add manually',
    '搜尋名字、公司、標籤、在哪認識…': 'Search names, companies, tags, where you met…',
    '💎 想在真正的 Obsidian 裡看人脈圖譜？到 <a href="#/settings">設定</a> 匯出成 Obsidian Vault。': '💎 Want to see your network in Obsidian itself? Export an Obsidian vault from <a href="#/settings">Settings</a>.',
    '還沒有任何人脈': 'No contacts yet',
    '請朋友打開他的 VaultCard 名片給你掃，或貼上他傳給你的連結。也可以先看看範例名片長什麼樣子。': 'Ask a friend to show you their VaultCard to scan, or paste a link they sent you. You can also check out a sample card first.',
    '先做我的名片': 'Make my card first', '沒有符合的人脈': 'No matching contacts', '對方的名字？': "What's their name?",

    // 設定
    '⚙️ 設定與資料': '⚙️ Settings & Data',
    'VaultCard 沒有帳號、沒有伺服器。你的名片與 {0} 位人脈只存在這台裝置上，記得定期備份。': 'VaultCard has no accounts and no servers. Your card and {0} contact{s} live only on this device — remember to back up regularly.',
    '🌐 語言': '🌐 Language',
    '💎 匯出成 Obsidian Vault': '💎 Export as an Obsidian vault',
    '下載一個 .zip：每位人脈一則筆記（<code>{0}/</code>）、每個活動一則（<code>{1}/</code>）、一份 <code>{2}</code> 和你的名片。解壓縮後，用 Obsidian「開啟資料夾作為 Vault」，打開關係圖譜就能看到你的人脈網路。': 'Downloads a .zip with one note per contact (<code>{0}/</code>), one per event (<code>{1}/</code>), a <code>{2}</code> and your card. Unzip it, choose “Open folder as vault” in Obsidian, then open the Graph view to see your network.',
    '匯出 Obsidian Vault (.zip)': 'Export Obsidian vault (.zip)', '🗄️ 備份與還原': '🗄️ Backup & restore',
    '換手機或清除瀏覽器資料前，先下載備份檔；之後在新裝置用「還原備份」匯入。': 'Before switching phones or clearing browser data, download a backup, then import it on the new device with “Restore backup”.',
    '下載備份 (JSON)': 'Download backup (JSON)', '📤 還原備份': '📤 Restore backup', '🔒 隱私': '🔒 Privacy',
    '分享名片時，名片內容會直接放在連結裡。拿到連結的人都能看到，所以只填你願意公開的資訊。': "When you share your card, its contents go directly into the link. Anyone with the link can see them, so only include what you're happy to share.",
    '閱讀隱私權政策 →': 'Read the privacy policy →', '🗑️ 清除所有資料': '🗑️ Delete all data',
    '刪除這台裝置上的名片與所有人脈筆記，無法復原。': 'Deletes your card and all contact notes on this device. This cannot be undone.',
    '清除所有資料': 'Delete all data',
    'VaultCard 為獨立專案，與 Obsidian（Dynalist Inc.）無隸屬關係。': 'VaultCard is an independent project and is not affiliated with Obsidian (Dynalist Inc.).',
    '確定要清除名片與全部 {0} 位人脈嗎？此動作無法復原。': 'Delete your card and {0} contact{s}? This cannot be undone.',
    '已清除所有資料': 'All data deleted', '還原會覆蓋目前的 {0} 位人脈，確定嗎？': 'Restoring will replace your current {0} contact{s}. Continue?',
    '✅ 已還原 {0} 位人脈': '✅ Restored {0} contact{s}', '❌ 檔案格式不正確': '❌ Invalid file format',
    '貼上對方傳給你的 VaultCard 名片連結：': 'Paste the VaultCard link they sent you:', '❌ 這不是 VaultCard 名片連結': "❌ That's not a VaultCard link",
    '掃描名片': 'Scan card', '把 QR Code 對準框框': 'Point your camera at the QR code', '關閉': 'Close',
    '📷 無法開啟相機，請改用「貼上名片連結」': "📷 Can't open the camera — use “Paste card link” instead",

    // 人脈筆記
    '屬性': 'Properties', '📍 在哪裡認識': '📍 Where you met', '活動、社群、朋友介紹…': 'Event, community, intro from a friend…', '📅 認識日期': '📅 Date met',
    '🏷️ 我給的標籤（只有你看得到）': '🏷️ My tags (only visible to you)', '合作夥伴 客戶 朋友': 'partner client friend',
    '筆記（Markdown）': 'Markdown notes', '[[ ]] 連結其他人': '[[ ]] = link', '人脈筆記': 'Contact note',
    '聊了什麼？之後想一起做什麼？\n例如：跟 [[{0}]] 一樣喜歡 #Obsidian ，是 [[某某某]] 介紹認識的。': 'What did you talk about? What might you do together?\ne.g. Loves #Obsidian like [[{0}]]; introduced by [[Someone]].',
    '預覽': 'Preview', '🔙 反向連結': '🔙 Backlinks', '還沒有其他人的筆記提到 {0}。': 'No other notes mention {0} yet.', '📍 同在「{0}」認識': '📍 Also met at “{0}”',
    '✏️ 編輯名片資料': '✏️ Edit card', '📤 傳我的名片給 TA': '📤 Send my card', '刪除': 'Delete', '儲存': 'Save', '取消': 'Cancel',
    '*（還沒有筆記）*': '*(No notes yet)*', '「{0}」還不在你的人脈裡。要建立這則人脈筆記嗎？': '“{0}” isn’t in your contacts yet. Create a contact note?',
    '名字不能是空的': "Name can't be empty", '已經有一位叫「{0}」的人脈了': 'You already have a contact named “{0}”', '✅ 已儲存': '✅ Saved',
    '確定要刪除「{0}」的人脈筆記嗎？': 'Delete the contact note for “{0}”?', '已刪除': 'Deleted',

    // 圖譜
    '🕸️ 人脈圖譜': '🕸️ Network Graph',
    '中心是你，每個點是一位人脈。筆記裡的 [[連結]]、共同的活動與標籤，會把人串在一起。': "You're at the center and each dot is a contact. [[Links]] in notes, shared events and tags connect people.",
    '全部': 'All', '只看人': 'People only', '活動': 'Events', '標籤': 'Tags', '提到但還沒存': 'Mentioned, not saved',
    '💡 圖譜還是空的': '💡 Your graph is empty', '先到「人脈」存幾張名片，或在筆記裡寫 [[名字]]，網路就會慢慢長出來。': 'Save a few cards in Contacts, or write [[name]] in a note, and your network will start to grow.',

    // 匯出與分享
    '未命名': 'Untitled', '## 聯絡方式': '## Contact', '*由 [VaultCard]({0}) 產生*': '*Made with [VaultCard]({0})*',
    '## 筆記': '## Notes', '## 怎麼認識的': '## How we met', '在這裡認識的人：': 'People I met here:', '我：': 'Me: ',
    '## 所有人脈（{0}）': '## All contacts ({0})', '## 依活動': '## By event', '、': ', ',
    '> 打開 Obsidian 的「關係圖譜」(Graph view) 看看你的人脈網路！': "> Open Obsidian's Graph view to see your network!",
    '📦 已匯出 {0} 則人脈筆記': '📦 Exported {0} contact note{s}', '🔗 已複製名片連結': '🔗 Link copied', '複製這個連結：': 'Copy this link:',
    '這是我的 VaultCard 名片，打開就能存成人脈筆記 👇': "Here's my VaultCard — open it to save me as a contact 👇",

    // Markdown 預覽
    '找不到「{0}」，Obsidian 會顯示可點擊建立的提示。': '“{0}” not found — Obsidian would offer to create it.', '屬性 PROPERTIES': 'PROPERTIES'
  };

  // {s}：英文複數，第一個參數不是 1 時變成 s（例如 '{0} contact{s}'）
  function fill(s, args) { if (!args.length) return s; return s.replace(/\{s\}/g, Number(args[0]) === 1 ? '' : 's').replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? String(args[i]) : m)); }
  function t(zh, ...args) { return fill(lang === 'en' && Object.prototype.hasOwnProperty.call(EN, zh) ? EN[zh] : zh, args); }
  function L(zh, en) { return lang === 'en' ? en : zh; }
  function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) { /* 私密模式 */ } location.reload(); }

  global.I18N = { lang, t, L, setLang, KEY };
})(window);
