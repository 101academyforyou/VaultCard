/* VaultCard 核心：用 Obsidian 的方式經營人脈
   - 我的名片：編輯 → 產生分享連結 / QR（名片資料直接編碼在連結裡，不經過伺服器）
   - 收到名片：開啟連結 → 存成一則「人脈筆記」（Markdown + 屬性）
   - 人脈：每個人是一則筆記，可以寫 [[雙向連結]] 與 #標籤，看反向連結
   - 人脈圖譜：像 Obsidian Graph View 一樣看見你的人際網路
   - 匯出：整包下載成 Obsidian Vault（.zip），直接用 Obsidian 開啟
*/
(function (global) {
  'use strict';

  global.Connect = function (api) {
    const { $, $$, esc, icon, toast, haptic, setTitle, makeGraph, setCleanup, native } = api;
    const { t, L } = global.I18N;
    const KEY = 'vaultcard:v1';
    const SITE = global.VAULTCARD_SITE || 'https://vaultcard.onepointzeroone.org/app/';
    const COLORS = ['#8a5cf5', '#60a5fa', '#4ade80', '#f59e0b', '#f472b6'];
    const MAX = { n: 40, t: 40, o: 60, b: 200, tag: 24, tags: 8, link: 120 };

    // 名片欄位（短鍵名，讓分享連結 / QR 更短）
    const LINKS = [
      { k: 'p', label: '電話', ico: '📞', ph: '0912-345-678', type: 'tel', href: (v) => 'tel:' + v.replace(/[^\d+]/g, '') },
      { k: 'e', label: 'Email', ico: '✉️', ph: 'you@example.com', type: 'email', href: (v) => 'mailto:' + v },
      { k: 'w', label: '網站', ico: '🌐', ph: 'example.com', href: (v) => url(v) },
      { k: 'line', label: 'LINE ID', ico: '💬', ph: 'your-line-id', href: (v) => 'https://line.me/ti/p/~' + encodeURIComponent(handle(v)) },
      { k: 'ig', label: 'Instagram', ico: '📷', ph: '@username', href: (v) => isUrl(v) ? url(v) : 'https://instagram.com/' + encodeURIComponent(handle(v)) },
      { k: 'th', label: 'Threads', ico: '🧵', ph: '@username', href: (v) => isUrl(v) ? url(v) : 'https://www.threads.net/@' + encodeURIComponent(handle(v)) },
      { k: 'in', label: 'LinkedIn', ico: '💼', ph: 'linkedin.com/in/…', href: (v) => isUrl(v) ? url(v) : 'https://www.linkedin.com/in/' + encodeURIComponent(handle(v)) },
      { k: 'gh', label: 'GitHub', ico: '🐙', ph: 'username', href: (v) => isUrl(v) ? url(v) : 'https://github.com/' + encodeURIComponent(handle(v)) }
    ];
    const isUrl = (v) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\//i.test(v) || /^https?:\/\//i.test(v);
    const url = (v) => (/^https?:\/\//i.test(v) ? v : 'https://' + v);
    const handle = (v) => v.replace(/^@/, '').trim();

    /* ---------------- 儲存 ---------------- */
    const blank = () => ({ me: null, people: [] });
    let db = load();
    function load() {
      try { const d = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); d.people = (d.people || []).filter((p) => p && p.card); return d; }
      catch (e) { return blank(); }
    }
    // App 內：另外存一份到原生儲存（iOS 的 UserDefaults），避免系統清掉 WebView 的 localStorage 時資料不見
    const plugin = (name) => (native && global.Capacitor ? (global.Capacitor.registerPlugin ? global.Capacitor.registerPlugin(name) : (global.Capacitor.Plugins || {})[name]) : null);
    const Prefs = plugin('Preferences');
    const hasData = (d) => !!(d && (d.me || (d.people && d.people.length)));
    function save() {
      const json = JSON.stringify(db);
      let ok = true;
      try { localStorage.setItem(KEY, json); } catch (e) { ok = false; }
      if (Prefs) Prefs.set({ key: KEY, value: json }).catch(() => {});
      else if (!ok) toast(t('⚠️ 無法儲存（可能是私密瀏覽模式）'));
    }
    // 啟動時：本機沒有資料但原生儲存有 → 還原；本機有資料但原生沒有 → 補存一份
    const ready = (async () => {
      if (!native && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      if (!Prefs) return;
      try {
        const { value } = await Prefs.get({ key: KEY });
        const saved = value ? Object.assign(blank(), JSON.parse(value)) : null;
        if (!hasData(db) && hasData(saved)) { saved.people = (saved.people || []).filter((p) => p && p.card); db = saved; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 只存在原生儲存也可以 */ } }
        else if (hasData(db) && !value) await Prefs.set({ key: KEY, value: JSON.stringify(db) });
      } catch (e) { /* 原生儲存不可用時就只用 localStorage */ }
    })();

    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const byId = (id) => db.people.find((p) => p.id === id);
    const byName = (n) => db.people.find((p) => p.card.n === n);
    const meName = () => (db.me && db.me.n) || t('我');

    /* ---------------- 名片資料清理（分享連結是外部輸入，一律驗證）---------------- */
    function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : ''; }
    function cleanTag(t) { return str(t, MAX.tag).replace(/^#/, '').replace(/[\s,#[\]{}|]+/g, '-').replace(/^-+|-+$/g, ''); }
    function clean(c) {
      c = c && typeof c === 'object' ? c : {};
      const out = { n: str(c.n, MAX.n), t: str(c.t, MAX.t), o: str(c.o, MAX.o) };
      const b = typeof c.b === 'string' ? c.b.replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, MAX.b) : '';
      if (b) out.b = b;
      const tags = (Array.isArray(c.g) ? c.g : []).map(cleanTag).filter(Boolean);
      if (tags.length) out.g = Array.from(new Set(tags)).slice(0, MAX.tags);
      LINKS.forEach((l) => { const v = str(c[l.k], MAX.link); if (v) out[l.k] = v; });
      const col = Number(c.c); if (col > 0 && col < COLORS.length) out.c = col | 0;
      if (!out.t) delete out.t; if (!out.o) delete out.o;
      return out;
    }

    /* ---------------- 編碼：JSON → (deflate) → base64url ---------------- */
    const b64u = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    const unb64u = (s) => { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(bin, (ch) => ch.charCodeAt(0)); };
    async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
    async function encode(card) {
      const raw = new TextEncoder().encode(JSON.stringify(clean(card)));
      let best = 'j' + b64u(raw);
      if (global.CompressionStream) {
        try { const z = 'z' + b64u(await pipe(raw, new CompressionStream('deflate-raw'))); if (z.length < best.length) best = z; } catch (e) { /* 用未壓縮版 */ }
      }
      return best;
    }
    async function decode(s) {
      s = String(s || '').trim();
      if (!/^[jz][\w-]+$/.test(s) || s.length > 3000) throw new Error('bad');
      let bytes = unb64u(s.slice(1));
      if (s[0] === 'z') {
        if (!global.DecompressionStream) throw new Error('old-browser');
        bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
      }
      const c = clean(JSON.parse(new TextDecoder().decode(bytes)));
      if (!c.n) throw new Error('bad');
      return c;
    }
    function base() {
      if (!native && /^https?:$/.test(location.protocol)) return location.origin + location.pathname;
      return SITE;
    }
    const shareUrl = (payload) => base() + '#/c/' + payload;
    function extractPayload(text) {
      const m = String(text || '').match(/#\/c\/([jz][\w-]+)/);
      return m ? m[1] : (/^[jz][\w-]{8,}$/.test(String(text).trim()) ? String(text).trim() : null);
    }

    /* ---------------- QR ---------------- */
    function qrSVG(text) {
      const qr = global.qrcode(0, 'M'); qr.addData(text); qr.make();
      const n = qr.getModuleCount(); const m = 3; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
      return { n: n + m * 2, svg: `<svg viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges" role="img" aria-label="${t('名片 QR Code')}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1a1a1a"/></svg>`, qr, m };
    }
    function qrPNG(text, name) {
      const { qr, m } = qrSVG(text); const n = qr.getModuleCount(); const s = 12; const size = (n + m * 2) * s;
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size + 70;
      const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#1a1a1a';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect((c + m) * s, (r + m) * s, s, s);
      x.font = '600 28px ' + getComputedStyle(document.body).fontFamily; x.textAlign = 'center'; x.fillText(name + ' · VaultCard', size / 2, size + 30);
      cv.toBlob((b) => download(b, safeFile(name) + L('-名片QR.png', '-card-QR.png')));
    }

    /* ---------------- 名片外觀 ---------------- */
    const initial = (n) => (n || '?').trim().slice(0, 1).toUpperCase();
    function cardHTML(c, opts) {
      opts = opts || {};
      const col = COLORS[c.c || 0];
      const links = LINKS.filter((l) => c[l.k]).map((l) => `<a class="bc-link" href="${esc(l.href(c[l.k]))}" target="_blank" rel="noopener noreferrer"><span>${l.ico}</span><span class="bc-lk">${t(l.label)}</span><span class="bc-lv">${esc(c[l.k])}</span></a>`).join('');
      return `<article class="bcard" style="--bc:${col}">
  <div class="bc-file"><span>📄 ${esc(c.n || t('你的名字'))}.md</span><span class="bc-gem">💎</span></div>
  <div class="bc-body">
    <div class="bc-top"><div class="bc-avatar">${esc(initial(c.n))}</div><div class="bc-id"><div class="bc-name">${esc(c.n || t('你的名字'))}</div><div class="bc-role">${esc([c.t, c.o].filter(Boolean).join(' · ') || (opts.placeholder ? t('職稱 · 公司 / 學校') : ''))}</div></div></div>
    ${c.b ? `<p class="bc-bio">${esc(c.b).replace(/\n/g, '<br>')}</p>` : opts.placeholder ? '<p class="bc-bio faint">' + t('一句話介紹自己，讓對方記得你。') + '</p>' : ''}
    ${c.g && c.g.length ? `<div class="bc-tags">${c.g.map((t) => `<span class="bc-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    ${links ? `<div class="bc-links">${links}</div>` : ''}
  </div>
</article>`;
    }

    function formHTML(c, extra) {
      return `<form class="cx-form" autocomplete="off" onsubmit="return false">
  <div class="cx-row2"><label class="cx-field"><span>${t('名字 *')}</span><input class="cx-input" name="n" maxlength="${MAX.n}" value="${esc(c.n || '')}" placeholder="${t('王小明')}" required></label>
  <label class="cx-field"><span>${t('職稱')}</span><input class="cx-input" name="t" maxlength="${MAX.t}" value="${esc(c.t || '')}" placeholder="${t('產品設計師')}"></label></div>
  <label class="cx-field"><span>${t('公司 / 學校 / 社群')}</span><input class="cx-input" name="o" maxlength="${MAX.o}" value="${esc(c.o || '')}" placeholder="${t('晨光設計工作室')}"></label>
  <label class="cx-field"><span>${t('自我介紹')} <small class="faint" data-count="b"></small></span><textarea class="cx-input" name="b" maxlength="${MAX.b}" rows="3" placeholder="${t('我在做什麼、想認識什麼樣的人')}">${esc(c.b || '')}</textarea></label>
  <label class="cx-field"><span>${t('標籤（用空白或逗號分隔，會變成 #標籤）')}</span><input class="cx-input" name="g" value="${esc((c.g || []).join(' '))}" placeholder="${t('設計 創業 Obsidian')}"></label>
  <div class="cx-field"><span>${t('主題色')}</span><div class="cx-colors">${COLORS.map((col, i) => `<label><input type="radio" name="c" value="${i}" ${(c.c || 0) === i ? 'checked' : ''}><i style="background:${col}"></i></label>`).join('')}</div></div>
  <details class="cx-more" ${LINKS.some((l) => c[l.k]) || !c.n ? 'open' : ''}><summary>${t('聯絡方式與社群')}</summary>
  <div class="cx-row2">${LINKS.map((l) => `<label class="cx-field"><span>${l.ico} ${t(l.label)}</span><input class="cx-input" name="${l.k}" type="${l.type || 'text'}" maxlength="${MAX.link}" value="${esc(c[l.k] || '')}" placeholder="${esc(l.ph)}"></label>`).join('')}</div></details>
  ${extra || ''}
</form>`;
    }
    function readForm(f) {
      const g = (k) => (f.elements[k] ? f.elements[k].value : '');
      const c = { n: g('n'), t: g('t'), o: g('o'), b: g('b'), g: g('g').split(/[\s,，、]+/), c: Number((f.querySelector('input[name="c"]:checked') || {}).value || 0) };
      LINKS.forEach((l) => { c[l.k] = g(l.k); });
      return clean(c);
    }

    /* ---------------- 我的名片 ---------------- */
    function cardView(v) {
      setTitle(t('我的名片'));
      v.className = 'view wide';
      const me = db.me || {};
      v.innerHTML = `<div class="cx-head"><h1>${t('🪪 我的名片')}</h1><p class="muted">${t('名片就是一則 Obsidian 筆記。分享連結或 QR 給對方，對方打開就能把你存成人脈筆記——資料直接放在連結裡，不經過任何伺服器。')}</p></div>
<div class="cx-layout">
  <div class="card">${formHTML(me)}</div>
  <div class="cx-side">
    <div id="cx-preview"></div>
    <div class="card cx-share" id="cx-share"></div>
  </div>
</div>`;
      const f = $('.cx-form', v);
      let timer = 0; let seq = 0;
      const upd = () => {
        const c = readForm(f);
        $('#cx-preview').innerHTML = cardHTML(c, { placeholder: true });
        const cnt = $('[data-count="b"]', f); if (cnt) cnt.textContent = (f.elements.b.value.length) + '/' + MAX.b;
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const prev = db.me && db.me.n;
          if (prev && c.n && prev !== c.n) renameLinks(prev, c.n);
          db.me = c.n ? c : null; save();
          const mySeq = ++seq;
          const box = $('#cx-share'); if (!box) return;
          if (!c.n) {
            box.innerHTML = '<p class="muted" style="margin:0">' + t('先填上名字，就能產生你的分享連結與 QR Code。') + '</p>' + (canScan() ? '<button class="btn cx-scan-btn" data-a="scan">' + t('📷 掃描對方名片') + '</button>' : '');
            box.onclick = (e) => { if (e.target.closest('[data-a="scan"]')) scan(); };
            return;
          }
          const link = shareUrl(await encode(c));
          if (mySeq !== seq || !$('#cx-share')) return;
          box.innerHTML = `<div class="cx-qr">${qrSVG(link).svg}</div>
<p class="faint cx-qr-hint">${t('請對方用手機相機掃描，或直接傳連結')}</p>
<div class="cx-actions">
  <button class="btn primary" data-a="share">${t('📤 分享名片')}</button>
  <button class="btn" data-a="copy">${t('🔗 複製連結')}</button>
  <button class="btn" data-a="png">${icon('download')}${t('QR 圖片')}</button>
  <button class="btn" data-a="md">${icon('download')}.md</button>
  <button class="btn" data-a="vcf">${icon('download')}vCard</button>
</div>
${canScan() ? `<button class="btn cx-scan-btn" data-a="scan">${t('📷 掃描對方名片')}</button>` : ''}`;
          box.onclick = (e) => {
            const a = e.target.closest('[data-a]'); if (!a) return;
            const k = a.dataset.a;
            if (k === 'scan') scan();
            else if (k === 'share') shareLink(link, c.n);
            else if (k === 'copy') copy(link);
            else if (k === 'png') qrPNG(link, c.n);
            else if (k === 'md') download(new Blob([meMD(c)], { type: 'text/markdown;charset=utf-8' }), safeFile(c.n) + '.md');
            else if (k === 'vcf') download(new Blob([vcard(c)], { type: 'text/vcard;charset=utf-8' }), safeFile(c.n) + '.vcf');
          };
        }, 250);
      };
      f.addEventListener('input', upd);
      f.addEventListener('change', upd);
      upd();
      setCleanup(() => { clearTimeout(timer); const c = readForm(f); const prev = db.me && db.me.n; if (prev && c.n && prev !== c.n) renameLinks(prev, c.n); db.me = c.n ? c : null; save(); });
    }

    /* ---------------- 收到名片 ---------------- */
    function receiveView(v, payload) {
      setTitle(t('收到名片'), '#/people');
      v.className = 'view';
      v.innerHTML = '<p class="muted">' + t('正在讀取名片…') + '</p>';
      decode(payload).then((c) => {
        if (!document.body.contains(v)) return;
        setTitle(t('{0} 的名片', c.n), '#/people');
        const mine = db.me && db.me.n === c.n && JSON.stringify(clean(db.me)) === JSON.stringify(c);
        const ex = findMatch(c);
        const wheres = Array.from(new Set(db.people.map((p) => p.met && p.met.w).filter(Boolean)));
        v.innerHTML = `
<div class="cx-receive">
  ${cardHTML(c)}
  <div class="card" id="cx-save">
  ${mine ? `<p style="margin:0 0 10px">${t('👀 這是<b>你自己的名片</b>，別人打開連結時會看到這個畫面。')}</p><a class="btn" href="#/card">${t('回去編輯名片')}</a>`
    : ex ? `<p style="margin:0 0 10px">${t('✅ <b>{0}</b> 已經在你的人脈裡了。', esc(c.n))}</p><div class="cx-actions"><a class="btn primary" href="#/people/${encodeURIComponent(ex.id)}">${t('打開人脈筆記')}</a>${JSON.stringify(ex.card) !== JSON.stringify(c) ? '<button class="btn" id="cx-upd">' + t('🔄 更新成這張新名片') + '</button>' : ''}</div>`
    : `<h3 style="margin:0 0 4px">${t('💎 存成人脈筆記')}</h3><p class="muted" style="margin:0 0 12px;font-size:14px">${t('記下在哪裡認識，之後在圖譜裡就能看到「同一場活動認識的人」。')}</p>
    <div class="cx-row2"><label class="cx-field"><span>${t('在哪裡認識')}</span><input class="cx-input" id="cx-where" list="cx-wheres" placeholder="${t('例如：COSCUP 2026、朋友聚會')}"></label>
    <label class="cx-field"><span>${t('日期')}</span><input class="cx-input" id="cx-date" type="date" value="${today()}"></label></div>
    <datalist id="cx-wheres">${wheres.map((w) => `<option value="${esc(w)}">`).join('')}</datalist>
    <label class="cx-field"><span>${t('一句話備註（之後可以再寫更多）')}</span><input class="cx-input" id="cx-note" placeholder="${t('聊到想一起辦讀書會')}"></label>
    <button class="btn primary" id="cx-add" style="width:100%;justify-content:center;margin-top:6px">${t('💎 存進我的人脈')}</button>`}
  </div>
  <div class="cx-actions" style="justify-content:center">
    <button class="btn" data-dl="vcf">${icon('download')}${t('存到通訊錄（vCard）')}</button>
    <button class="btn" data-dl="md">${icon('download')}${t('下載 .md 筆記')}</button>
  </div>
  ${!db.me ? `<div class="tip"><span class="tip-title">${t('🪪 你也來做一張名片吧')}</span>${t('用 30 秒建立你的 Obsidian 風格名片，再把連結回傳給 {0}，就完成交換了。', esc(c.n))}<div style="margin-top:10px"><a class="btn primary" href="#/card">${t('建立我的名片')}</a></div></div>` : ''}
</div>`;
        $$('[data-dl]', v).forEach((b) => b.addEventListener('click', () => {
          const p = ex || { card: c, met: {}, note: '' };
          if (b.dataset.dl === 'vcf') download(new Blob([vcard(c)], { type: 'text/vcard;charset=utf-8' }), safeFile(c.n) + '.vcf');
          else download(new Blob([personMD(p)], { type: 'text/markdown;charset=utf-8' }), safeFile(c.n) + '.md');
        }));
        const upd = $('#cx-upd');
        if (upd) upd.addEventListener('click', () => { renamePerson(ex, c.n); ex.card = c; ex.upd = Date.now(); save(); toast(t('🔄 已更新 {0} 的名片', c.n)); location.hash = '#/people/' + encodeURIComponent(ex.id); });
        const add = $('#cx-add');
        if (add) add.addEventListener('click', () => {
          const w = str($('#cx-where').value, 60); const note = str($('#cx-note').value, 500);
          const p = { id: uid(), card: c, met: { d: $('#cx-date').value || today(), w }, tags: [], note: note ? note + '\n' : '', added: Date.now(), upd: Date.now() };
          db.people.unshift(p); save();
          haptic('success'); toast(t('💎 已把 {0} 存成人脈筆記', c.n));
          exchangePrompt(c.n, p.id);
        });
      }).catch((e) => {
        v.innerHTML = `<div class="card" style="text-align:center;padding:32px"><div style="font-size:40px">🫥</div><h2>${t('讀不到這張名片')}</h2><p class="muted">${e && e.message === 'old-browser' ? t('你的瀏覽器版本太舊，無法解開這個連結。請更新瀏覽器後再試一次。') : t('連結可能不完整或已損壞，請對方重新分享一次。')}</p><a class="btn" href="#/people">${t('回到人脈')}</a></div>`;
      });
    }
    function findMatch(c) {
      return db.people.find((p) => p.card.n === c.n && ((c.e && p.card.e === c.e) || (c.p && p.card.p === c.p) || (!c.e && !c.p)));
    }
    function exchangePrompt(name, id) {
      const box = $('#cx-save'); if (!box) { location.hash = '#/people/' + encodeURIComponent(id); return; }
      box.innerHTML = `<h3 style="margin:0 0 6px">${t('✅ 已存進人脈')}</h3>
<p class="muted" style="margin:0 0 12px;font-size:14px">${db.me ? t('要不要把你的名片也傳給 {0}？這樣就完成交換了。', esc(name)) : t('建立你自己的名片，就能回傳給 {0}。', esc(name))}</p>
<div class="cx-actions">${db.me ? '<button class="btn primary" id="cx-back">' + t('📤 回傳我的名片') + '</button>' : '<a class="btn primary" href="#/card">' + t('建立我的名片') + '</a>'}<a class="btn" href="#/people/${encodeURIComponent(id)}">${t('打開人脈筆記')}</a></div>`;
      const b = $('#cx-back');
      if (b) b.addEventListener('click', async () => shareLink(shareUrl(await encode(db.me)), db.me.n));
    }

    /* ---------------- 人脈列表 ---------------- */
    let filter = { q: '', tag: '' };
    function peopleView(v) {
      setTitle(t('人脈'));
      v.className = 'view';
      const tags = {};
      db.people.forEach((p) => allTags(p).forEach((t) => { tags[t] = (tags[t] || 0) + 1; }));
      v.innerHTML = `<div class="cx-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
  <div><h1>${t('👥 我的人脈')}</h1><p class="muted" style="margin:0">${t('每個人都是一則筆記。在筆記裡用 <code>[[名字]]</code> 連結彼此，用 <code>#標籤</code> 分類。')}</p></div>
  <div class="cx-actions">
    ${canScan() ? '<button class="btn primary" id="cx-scan">' + t('📷 掃描名片') + '</button>' : ''}
    <button class="btn ${canScan() ? '' : 'primary'}" id="cx-paste">${t('🔗 貼上名片連結')}</button>
    <button class="btn" id="cx-new">${t('＋ 手動新增')}</button>
  </div>
</div>
${db.people.length ? `
<input class="search-input" id="cx-q" placeholder="${t('搜尋名字、公司、標籤、在哪認識…')}" value="${esc(filter.q)}" style="margin-bottom:10px">
${Object.keys(tags).length ? `<div class="cx-chips">${Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<button class="bc-tag ${filter.tag === t ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)} <small>${n}</small></button>`).join('')}</div>` : ''}
<div class="item-list" id="cx-list"></div>
<p class="faint" style="font-size:13.5px;margin-top:18px">${t('💎 想在真正的 Obsidian 裡看人脈圖譜？到 <a href="#/settings">設定</a> 匯出成 Obsidian Vault。')}</p>`
  : `<div class="card cx-empty"><div style="font-size:46px">🕸️</div><h2 style="margin-top:6px">${t('還沒有任何人脈')}</h2>
  <p class="muted">${t('請朋友打開他的 VaultCard 名片給你掃，或貼上他傳給你的連結。也可以先看看範例名片長什麼樣子。')}</p>
  <div class="cx-actions" style="justify-content:center"><button class="btn primary" id="cx-demo">${t('👀 看範例名片')}</button><a class="btn" href="#/card">${t('先做我的名片')}</a></div></div>`}`;

      const list = $('#cx-list');
      const draw = () => {
        if (!list) return;
        const q = filter.q.toLowerCase();
        const ps = db.people.filter((p) => (!filter.tag || allTags(p).includes(filter.tag)) &&
          (!q || [p.card.n, p.card.t, p.card.o, p.card.b, p.met && p.met.w, p.note, allTags(p).join(' ')].join(' ').toLowerCase().includes(q)));
        list.innerHTML = ps.map((p) => `<a class="list-item cx-person" href="#/people/${encodeURIComponent(p.id)}">
  <div class="cx-av" style="background:${COLORS[p.card.c || 0]}">${esc(initial(p.card.n))}</div>
  <div class="meta"><div class="t">${esc(p.card.n)}</div><div class="d">${esc([p.card.t, p.card.o].filter(Boolean).join(' · ') || '—')}</div></div>
  <div class="right">${p.met && p.met.w ? `<span class="pill">📍 ${esc(p.met.w)}</span>` : ''}</div></a>`).join('') || '<p class="faint">' + t('沒有符合的人脈') + '</p>';
      };
      draw();
      const q = $('#cx-q'); if (q) q.addEventListener('input', () => { filter.q = q.value; draw(); });
      $$('.cx-chips [data-tag]', v).forEach((b) => b.addEventListener('click', () => { filter.tag = filter.tag === b.dataset.tag ? '' : b.dataset.tag; peopleView(v); }));
      $('#cx-paste').addEventListener('click', pasteLink);
      $('#cx-new').addEventListener('click', () => {
        const n = str(prompt(t('對方的名字？')) || '', MAX.n); if (!n) return;
        const p = newPerson(n); location.hash = '#/people/' + encodeURIComponent(p.id) + '/edit';
      });
      const sc = $('#cx-scan'); if (sc) sc.addEventListener('click', scan);
      const demo = $('#cx-demo'); if (demo) demo.addEventListener('click', openDemo);
    }
    async function openDemo() { location.hash = '#/c/' + await encode(L(DEMO, DEMO_EN)); }

    /* ---------------- 設定與資料 ---------------- */
    function settingsView(v) {
      setTitle(t('設定與資料'));
      v.className = 'view';
      v.innerHTML = `<div class="cx-head"><h1>${t('⚙️ 設定與資料')}</h1><p class="muted">${t('VaultCard 沒有帳號、沒有伺服器。你的名片與 {0} 位人脈只存在這台裝置上，記得定期備份。', db.people.length)}</p></div>
<div class="settings-list">
  <div class="card"><h3 style="margin-top:0">${t('🌐 語言')}</h3>
    <div class="segmented" role="radiogroup" aria-label="Language" id="cx-lang"><button data-lang="zh" class="${L('on', '')}">中文</button><button data-lang="en" class="${L('', 'on')}">English</button></div></div>
  <div class="card"><h3 style="margin-top:0">${t('💎 匯出成 Obsidian Vault')}</h3>
    <p class="muted" style="font-size:14px">${t('下載一個 .zip：每位人脈一則筆記（<code>{0}/</code>）、每個活動一則（<code>{1}/</code>）、一份 <code>{2}</code> 和你的名片。解壓縮後，用 Obsidian「開啟資料夾作為 Vault」，打開關係圖譜就能看到你的人脈網路。', DIR.people, DIR.events, DIR.moc)}</p>
    <button class="btn primary" id="cx-vault" ${db.people.length || db.me ? '' : 'disabled'}>${icon('download')}${t('匯出 Obsidian Vault (.zip)')}</button></div>
  <div class="card"><h3 style="margin-top:0">${t('🗄️ 備份與還原')}</h3>
    <p class="muted" style="font-size:14px">${t('換手機或清除瀏覽器資料前，先下載備份檔；之後在新裝置用「還原備份」匯入。')}</p>
    <div class="cx-actions"><button class="btn" id="cx-backup">${icon('download')}${t('下載備份 (JSON)')}</button>
    <label class="btn" style="cursor:pointer">${t('📤 還原備份')}<input type="file" id="cx-restore" accept="application/json" hidden></label></div></div>
  <div class="card"><h3 style="margin-top:0">${t('🔒 隱私')}</h3>
    <p class="muted" style="font-size:14px;margin-bottom:8px">${t('分享名片時，名片內容會直接放在連結裡。拿到連結的人都能看到，所以只填你願意公開的資訊。')}</p>
    <a href="privacy.html">${t('閱讀隱私權政策 →')}</a></div>
  <div class="card"><h3 style="margin-top:0;color:var(--red)">${t('🗑️ 清除所有資料')}</h3>
    <p class="muted" style="font-size:14px">${t('刪除這台裝置上的名片與所有人脈筆記，無法復原。')}</p>
    <button class="btn" id="cx-wipe" style="color:var(--red)">${t('清除所有資料')}</button></div>
</div>
<p class="faint" style="font-size:12.5px;margin-top:24px">${t('VaultCard 為獨立專案，與 Obsidian（Dynalist Inc.）無隸屬關係。')}</p>`;
      $$('#cx-lang [data-lang]', v).forEach((b) => b.addEventListener('click', () => { if (b.dataset.lang !== global.I18N.lang) global.I18N.setLang(b.dataset.lang); }));
      $('#cx-vault').addEventListener('click', exportVault);
      $('#cx-backup').addEventListener('click', () => download(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), L('vaultcard-備份-', 'vaultcard-backup-') + today() + '.json'));
      $('#cx-wipe').addEventListener('click', () => {
        if (!confirm(t('確定要清除名片與全部 {0} 位人脈嗎？此動作無法復原。', db.people.length))) return;
        db = blank(); save(); toast(t('已清除所有資料')); location.hash = '#/welcome';
      });
      $('#cx-restore').addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return;
        f.text().then((txt) => {
          const d = JSON.parse(txt); if (!d || !Array.isArray(d.people)) throw new Error('bad');
          if (db.people.length && !confirm(t('還原會覆蓋目前的 {0} 位人脈，確定嗎？', db.people.length))) return;
          db = { me: d.me ? clean(d.me) : null, people: d.people.filter((p) => p && p.card).map((p) => ({ id: str(p.id, 40) || uid(), card: clean(p.card), met: { d: str(p.met && p.met.d, 10), w: str(p.met && p.met.w, 60) }, tags: (p.tags || []).map(cleanTag).filter(Boolean), note: typeof p.note === 'string' ? p.note.slice(0, 20000) : '', added: +p.added || Date.now(), upd: +p.upd || Date.now() })) };
          save(); toast(t('✅ 已還原 {0} 位人脈', db.people.length)); settingsView(v);
        }).catch(() => toast(t('❌ 檔案格式不正確')));
      });
    }
    function newPerson(n) {
      const p = { id: uid(), card: clean({ n }), met: { d: today(), w: '' }, tags: [], note: '', added: Date.now(), upd: Date.now() };
      db.people.unshift(p); save(); return p;
    }
    const allTags = (p) => Array.from(new Set([...(p.card.g || []), ...(p.tags || []), ...((p.note || '').match(/#[\p{L}\p{N}_/-]+/gu) || []).filter((t) => !/^#\d+$/.test(t)).map((t) => t.slice(1))]));

    function pasteLink() {
      const input = prompt(t('貼上對方傳給你的 VaultCard 名片連結：'));
      if (input == null) return;
      const p = extractPayload(input);
      if (p) location.hash = '#/c/' + p; else toast(t('❌ 這不是 VaultCard 名片連結'));
    }

    const canScan = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    function loadScript(src) {
      return new Promise((res, rej) => {
        if (global.jsQR) return res();
        const el = document.createElement('script'); el.src = src; el.onload = () => res(); el.onerror = rej; document.head.appendChild(el);
      });
    }
    async function makeDetector(video) {
      if ('BarcodeDetector' in global) {
        try {
          const fmts = await global.BarcodeDetector.getSupportedFormats();
          if (fmts.includes('qr_code')) { const det = new global.BarcodeDetector({ formats: ['qr_code'] }); return async () => (await det.detect(video)).map((c) => c.rawValue); }
        } catch (e) { /* 改用 jsQR */ }
      }
      await loadScript('js/vendor/jsQR.js');
      const cv = document.createElement('canvas'); const cx = cv.getContext('2d', { willReadFrequently: true });
      return async () => {
        const w = video.videoWidth, h = video.videoHeight; if (!w || !h) return [];
        const k = Math.min(1, 800 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cx.drawImage(video, 0, 0, cv.width, cv.height);
        const r = global.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
        return r && r.data ? [r.data] : [];
      };
    }
    function scan() {
      if (!canScan()) { pasteLink(); return; }
      const back = document.createElement('div');
      back.className = 'palette-backdrop';
      back.innerHTML = '<div class="palette cx-scan" role="dialog" aria-label="' + t('掃描名片') + '"><div class="cx-scan-view"><video playsinline muted autoplay></video><i class="cx-scan-frame"></i></div><div class="cx-scan-bar"><span id="cx-scan-msg">' + t('正在開啟相機…') + '</span><button class="btn" data-x="paste">' + t('🔗 貼上名片連結') + '</button><button class="btn" data-x="close">' + t('關閉') + '</button></div></div>';
      document.body.appendChild(back);
      const video = $('video', back); const msg = $('#cx-scan-msg', back); let stream = null; let stop = false;
      const close = () => { stop = true; if (stream) stream.getTracks().forEach((tr) => tr.stop()); if (back.parentNode) back.parentNode.removeChild(back); };
      $('[data-x="close"]', back).addEventListener('click', close);
      $('[data-x="paste"]', back).addEventListener('click', () => { close(); pasteLink(); });
      back.addEventListener('click', (e) => { if (e.target === back) close(); });
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(async (st) => {
        stream = st; if (stop) { close(); return; }
        video.srcObject = st; await video.play().catch(() => {});
        msg.textContent = t('對準對方的 VaultCard QR Code');
        const detect = await makeDetector(video);
        let warned = false;
        (async function loop() {
          if (stop) return;
          let codes = [];
          try { codes = await detect(); } catch (e) { /* 這一格辨識失敗，繼續 */ }
          const hit = codes.map((c) => extractPayload(c)).find(Boolean);
          if (hit) { haptic('success'); close(); location.hash = '#/c/' + hit; return; }
          if (codes.length && !warned) { warned = true; msg.textContent = t('這個 QR Code 不是 VaultCard 名片'); }
          setTimeout(loop, 180);
        })();
      }).catch(() => { close(); toast(t('📷 無法開啟相機。請到設定允許 VaultCard 使用相機，或改用「貼上名片連結」。')); });
    }

    /* ---------------- 人脈筆記 ---------------- */
    const linkRe = (name) => new RegExp('\\[\\[' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\]\\]|\\||#)');
    function backlinks(p) {
      const re = linkRe(p.card.n);
      return db.people.filter((o) => o !== p && re.test(o.note || ''));
    }
    function mdOpts() {
      const names = new Set(db.people.map((p) => p.card.n)); if (db.me) names.add(db.me.n);
      return { resolve: (n) => names.has(n), embed: () => null };
    }
    function renamePerson(p, n) { renameLinks(p.card.n, n); }
    function renameLinks(old, n) {
      if (!old || !n || n === old) return;
      const re = new RegExp('\\[\\[' + old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\]\\]|\\||#)', 'g');
      db.people.forEach((o) => { if (o.note) o.note = o.note.replace(re, '[[' + n + '$1'); });
    }

    function personView(v, id, edit) {
      const p = byId(id);
      if (!p) { location.hash = '#/people'; return; }
      setTitle(p.card.n, '#/people');
      v.className = 'view wide';
      const bl = backlinks(p);
      const same = p.met && p.met.w ? db.people.filter((o) => o !== p && o.met && o.met.w === p.met.w) : [];
      v.innerHTML = `<div class="crumbs"><a href="#/people">${t('人脈')}</a><span>›</span><span>${esc(p.card.n)}.md</span></div>
<div class="cx-layout">
  <div>
    <div class="card cx-props">
      <div class="cx-props-h">${t('屬性')}</div>
      <div class="cx-row2">
        <label class="cx-field"><span>${t('📍 在哪裡認識')}</span><input class="cx-input" id="pp-where" value="${esc((p.met && p.met.w) || '')}" placeholder="${t('活動、社群、朋友介紹…')}"></label>
        <label class="cx-field"><span>${t('📅 認識日期')}</span><input class="cx-input" id="pp-date" type="date" value="${esc((p.met && p.met.d) || '')}"></label>
      </div>
      <label class="cx-field"><span>${t('🏷️ 我給的標籤（只有你看得到）')}</span><input class="cx-input" id="pp-tags" value="${esc((p.tags || []).join(' '))}" placeholder="${t('合作夥伴 客戶 朋友')}"></label>
    </div>
    <div class="editor-split cx-editor">
      <div class="pane"><div class="pane-label"><span>${t('筆記（Markdown）')}</span><span class="faint">${t('[[ ]] 連結其他人')}</span></div><textarea class="md-input" id="pp-note" spellcheck="false" aria-label="${t('人脈筆記')}" placeholder="${esc(t('聊了什麼？之後想一起做什麼？\n例如：跟 [[{0}]] 一樣喜歡 #Obsidian ，是 [[某某某]] 介紹認識的。', meName()))}"></textarea></div>
      <div class="pane"><div class="pane-label"><span>${t('預覽')}</span></div><div class="md-preview md" id="pp-prev"></div></div>
    </div>
    <div class="cx-links-box">
      <div><h3>${t('🔙 反向連結')} <small class="faint">${bl.length}</small></h3>${bl.length ? bl.map((o) => `<a class="cx-mini" href="#/people/${encodeURIComponent(o.id)}">${esc(o.card.n)}</a>`).join('') : '<p class="faint">' + t('還沒有其他人的筆記提到 {0}。', esc(p.card.n)) + '</p>'}</div>
      ${same.length ? `<div><h3>${t('📍 同在「{0}」認識', esc(p.met.w))}</h3>${same.map((o) => `<a class="cx-mini" href="#/people/${encodeURIComponent(o.id)}">${esc(o.card.n)}</a>`).join('')}</div>` : ''}
    </div>
  </div>
  <div class="cx-side">
    <div id="pp-card">${cardHTML(p.card)}</div>
    <div class="cx-actions">
      <button class="btn" id="pp-edit">${t('✏️ 編輯名片資料')}</button>
      <button class="btn" id="pp-md">${icon('download')}.md</button>
      <button class="btn" id="pp-vcf">${icon('download')}vCard</button>
      ${db.me ? '<button class="btn" id="pp-send">' + t('📤 傳我的名片給 TA') + '</button>' : ''}
      <button class="btn" id="pp-del" style="color:var(--red)">${t('刪除')}</button>
    </div>
    <div class="card" id="pp-form" ${edit ? '' : 'hidden'}>${formHTML(p.card, '<div class="cx-actions" style="margin-top:12px"><button class="btn primary" id="pp-save">' + t('儲存') + '</button><button class="btn" id="pp-cancel">' + t('取消') + '</button></div>')}</div>
  </div>
</div>`;
      const ta = $('#pp-note'); const pv = $('#pp-prev');
      ta.value = p.note || '';
      let timer = 0;
      const persist = () => {
        p.note = ta.value; p.met = { d: $('#pp-date').value, w: str($('#pp-where').value, 60) };
        p.tags = $('#pp-tags').value.split(/[\s,，、]+/).map(cleanTag).filter(Boolean); p.upd = Date.now(); save();
      };
      const upd = () => { pv.innerHTML = global.MD.render(ta.value || t('*（還沒有筆記）*'), mdOpts()); clearTimeout(timer); timer = setTimeout(persist, 300); };
      ta.addEventListener('input', upd);
      ['#pp-where', '#pp-date', '#pp-tags'].forEach((s) => $(s).addEventListener('change', () => { clearTimeout(timer); persist(); }));
      upd();
      pv.addEventListener('click', (e) => {
        const a = e.target.closest('.internal-link'); if (!a) return;
        const n = a.dataset.note;
        persist();
        if (db.me && n === db.me.n) { location.hash = '#/card'; return; }
        const o = byName(n);
        if (o) location.hash = '#/people/' + encodeURIComponent(o.id);
        else if (confirm(t('「{0}」還不在你的人脈裡。要建立這則人脈筆記嗎？', n))) { const np = newPerson(n); location.hash = '#/people/' + encodeURIComponent(np.id) + '/edit'; }
      });
      const fm = $('#pp-form');
      $('#pp-edit').addEventListener('click', () => { fm.hidden = !fm.hidden; if (!fm.hidden) fm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      $('#pp-cancel').addEventListener('click', () => { fm.hidden = true; });
      const f = $('.cx-form', fm);
      f.addEventListener('input', () => { $('#pp-card').innerHTML = cardHTML(readForm(f), { placeholder: true }); });
      $('#pp-save').addEventListener('click', () => {
        const c = readForm(f);
        if (!c.n) return toast(t('名字不能是空的'));
        if (c.n !== p.card.n && byName(c.n)) return toast(t('已經有一位叫「{0}」的人脈了', c.n));
        persist(); renamePerson(p, c.n); p.card = c; p.upd = Date.now(); save();
        toast(t('✅ 已儲存')); location.hash = '#/people/' + encodeURIComponent(p.id);
        if (!edit) personView(v, id);
      });
      $('#pp-md').addEventListener('click', () => { persist(); download(new Blob([personMD(p)], { type: 'text/markdown;charset=utf-8' }), safeFile(p.card.n) + '.md'); });
      $('#pp-vcf').addEventListener('click', () => download(new Blob([vcard(p.card)], { type: 'text/vcard;charset=utf-8' }), safeFile(p.card.n) + '.vcf'));
      const send = $('#pp-send'); if (send) send.addEventListener('click', async () => shareLink(shareUrl(await encode(db.me)), db.me.n));
      $('#pp-del').addEventListener('click', () => {
        if (!confirm(t('確定要刪除「{0}」的人脈筆記嗎？', p.card.n))) return;
        clearTimeout(timer); db.people = db.people.filter((o) => o !== p); save(); setCleanup(null); toast(t('已刪除')); location.hash = '#/people';
      });
      setCleanup(() => { clearTimeout(timer); if (byId(p.id)) persist(); });
    }

    /* ---------------- 人脈圖譜 ---------------- */
    function networkView(v) {
      setTitle(t('人脈圖譜'));
      v.className = 'view wide';
      v.innerHTML = `<div class="cx-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
  <div><h1>${t('🕸️ 人脈圖譜')}</h1><p class="muted" style="margin:0">${t('中心是你，每個點是一位人脈。筆記裡的 [[連結]]、共同的活動與標籤，會把人串在一起。')}</p></div>
  <div class="segmented" role="tablist"><button class="on" data-m="all">${t('全部')}</button><button data-m="people">${t('只看人')}</button></div>
</div>
<div class="graph-wrap"><canvas id="graph"></canvas>
  <div class="graph-legend"><span><i style="background:#c4b5fd"></i>${t('我')}</span><span><i style="background:#8a5cf5;box-shadow:0 0 6px #8a5cf5"></i>${t('人脈')}</span><span data-k="all"><i style="background:#facc15"></i>${t('活動')}</span><span data-k="all"><i style="background:#60a5fa"></i>${t('公司 / 組織')}</span><span data-k="all"><i style="background:#4ade80"></i>${t('標籤')}</span><span data-k="people" hidden><i class="lg-dash"></i>${t('有共同點')}</span><span><i style="background:#555;border:1px dashed #888"></i>${t('提到但還沒存')}</span></div>
  <div class="graph-tip" id="graph-hover"></div>
</div>
<p class="faint graph-hint" id="graph-hint"></p>
${db.people.length ? '' : '<div class="tip" style="margin-top:16px"><span class="tip-title">' + t('💡 圖譜還是空的') + '</span>' + t('先到「人脈」存幾張名片，或在筆記裡寫 [[名字]]，網路就會慢慢長出來。') + '</div>'}`;
      const g = makeGraph($('#graph'));
      const setMode = (m) => {
        $$('.segmented button', v).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
        const data = networkGraph(m === 'all'); g.load(data);
        $$('.graph-legend [data-k]', v).forEach((el) => { el.hidden = el.dataset.k !== m; });
        let hint = '';
        if (m === 'people') hint = t('「只看人」只顯示人：實線是你和人脈、以及筆記裡的 [[連結]]；虛線代表兩個人有共同的活動、標籤或公司。') + (db.people.length > 1 && !data.shared ? ' ' + t('目前人脈之間還沒有共同點。') : '');
        else if (db.people.length && !data.attrs) hint = t('「全部」會另外顯示活動、標籤和公司，但目前你的名片和人脈都還沒有這些資料。在人脈筆記填「在哪裡認識」、加上 #標籤，或在名片填上公司，就會出現在這裡。');
        $('#graph-hint').textContent = hint;
      };
      $$('.segmented button', v).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
      setMode('all');
      setCleanup(g.destroy);
    }
    function networkGraph(full) {
      const nodes = new Map(); const links = []; const seen = new Set();
      const add = (id, n) => { if (!nodes.has(id)) nodes.set(id, Object.assign({ id, r: 7 }, n)); return id; };
      const link = (s, t, dashed) => { const k = s < t ? s + '\u0000' + t : t + '\u0000' + s; if (s === t || seen.has(k)) return; seen.add(k); links.push({ s, t, dashed }); };
      const ME = add('me', { label: meName(), kind: 'hub', r: 13, href: '#/card' });
      const pid = {}; db.people.forEach((p) => { pid[p.card.n] = 'p:' + p.id; });
      if (db.me) pid[db.me.n] = ME;
      db.people.forEach((p) => add('p:' + p.id, { label: p.card.n, kind: 'done', href: '#/people/' + encodeURIComponent(p.id) }));
      const org = (name) => add('o:' + name.toLowerCase(), { label: '🏢 ' + name, kind: 'org', r: 8 });
      if (db.me && full) {
        (db.me.g || []).forEach((tg) => link(ME, add('t:' + tg, { label: '#' + tg, kind: 'tag', r: 5 }), true));
        if (db.me.o) link(ME, org(db.me.o), true);
      }
      db.people.forEach((p) => {
        const me = 'p:' + p.id;
        link(ME, me, false);
        if (full && p.card.o) link(me, org(p.card.o), true);
        ((p.note || '').match(/\[\[([^\]|#]+)/g) || []).forEach((m) => {
          const n = m.slice(2).trim(); if (!n) return;
          link(me, pid[n] || add('g:' + n, { label: n, kind: 'ghost' }), false);
        });
        if (full && p.met && p.met.w) link(me, add('w:' + p.met.w, { label: '📍 ' + p.met.w, kind: 'event', r: 8 }), true);
        if (full) allTags(p).forEach((t) => link(me, add('t:' + t, { label: '#' + t, kind: 'tag', r: 5 }), true));
      });
      // 只看人：不畫活動／標籤／公司節點，改成在有共同點的兩個人之間畫虛線
      let shared = 0;
      if (!full) {
        const groups = {};
        const put = (k, id) => { (groups[k] = groups[k] || new Set()).add(id); };
        db.people.forEach((p) => {
          const id = 'p:' + p.id;
          if (p.met && p.met.w) put('w:' + p.met.w, id);
          if (p.card.o) put('o:' + p.card.o.toLowerCase(), id);
          allTags(p).forEach((tg) => put('t:' + tg, id));
        });
        Object.values(groups).forEach((set) => {
          const ids = Array.from(set); if (ids.length < 2) return;
          const before = links.length;
          if (ids.length <= 6) { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) link(ids[i], ids[j], true); }
          else ids.forEach((id, i) => link(id, ids[(i + 1) % ids.length], true)); // 人很多時連成一圈，避免線太多
          shared += links.length - before;
        });
      }
      const deg = {}; links.forEach((l) => { deg[l.s] = (deg[l.s] || 0) + 1; deg[l.t] = (deg[l.t] || 0) + 1; });
      nodes.forEach((n) => { if (n.kind === 'done') n.r = 6 + Math.min(6, deg[n.id] || 0); if (n.kind === 'event' || n.kind === 'org') n.r = 6 + Math.min(6, deg[n.id] || 0); });
      const attrs = Array.from(nodes.values()).filter((n) => n.kind === 'event' || n.kind === 'org' || n.kind === 'tag').length;
      return { nodes: Array.from(nodes.values()), links, attrs, shared };
    }

    /* ---------------- 匯出：Markdown / vCard / Vault ---------------- */
    const q = (s) => JSON.stringify(String(s));
    function safeFile(n) { return String(n || t('未命名')).replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]/g, '-').trim().slice(0, 60) || t('未命名'); }
    const DIR = { people: L('人脈', 'People'), events: L('活動', 'Events'), moc: L('人脈 MOC', 'People MOC') };
    function contactLines(c) {
      return LINKS.filter((l) => c[l.k]).map((l) => `- ${l.ico} ${t(l.label)}${t('：')}[${c[l.k].replace(/[[\]]/g, '')}](${l.href(c[l.k]).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20')})`).join('\n');
    }
    function props(c, extra) {
      const lines = ['---'];
      if (c.t) lines.push('title: ' + q(c.t));
      if (c.o) lines.push('org: ' + q(c.o));
      LINKS.forEach((l) => { if (c[l.k]) lines.push(({ p: 'phone', e: 'email', w: 'website', ig: 'instagram', th: 'threads', in: 'linkedin', gh: 'github' }[l.k] || l.k) + ': ' + q(c[l.k])); });
      (extra || []).forEach((x) => lines.push(x));
      return lines;
    }
    function meMD(c) {
      const lines = props(c, ['tags:', '  - ' + L('名片', 'card'), ...(c.g || []).map((t) => '  - ' + t)]);
      lines.push('---', '', '# ' + c.n, '');
      if (c.b) lines.push(...c.b.split('\n').map((l) => '> ' + l), '');
      const cl = contactLines(c); if (cl) lines.push(t('## 聯絡方式'), cl, '');
      lines.push('---', t('*由 [VaultCard]({0}) 產生*', SITE), '');
      return lines.join('\n');
    }
    function personMD(p) {
      const c = p.card; const m = p.met || {};
      const extra = [];
      if (m.d) extra.push('met: ' + m.d);
      if (m.w) extra.push('where: ' + q('[[' + safeFile(m.w) + ']]'));
      if (db.me) extra.push('me: ' + q('[[' + safeFile(db.me.n) + ']]'));
      extra.push('tags:', '  - ' + L('人脈', 'contact'), ...Array.from(new Set([...(c.g || []), ...(p.tags || [])])).map((t) => '  - ' + t));
      const lines = props(c, extra);
      lines.push('---', '', '# ' + c.n, '');
      if (c.t || c.o) lines.push('**' + [c.t, c.o].filter(Boolean).join(' · ') + '**', '');
      if (c.b) lines.push(...c.b.split('\n').map((l) => '> ' + l), '');
      const cl = contactLines(c); if (cl) lines.push(t('## 聯絡方式'), cl, '');
      lines.push(t('## 筆記'), (p.note || '').trim() || '- ', '');
      if (m.w || m.d) lines.push(t('## 怎麼認識的'), L('- ' + [m.d, m.w ? '在 [[' + safeFile(m.w) + ']]' : ''].filter(Boolean).join(' ') + ' 認識', '- Met' + (m.d ? ' on ' + m.d : '') + (m.w ? ' at [[' + safeFile(m.w) + ']]' : '')), '');
      return lines.join('\n');
    }
    function vcard(c) {
      const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
      const L = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + e(c.n), 'N:;' + e(c.n) + ';;;'];
      if (c.o) L.push('ORG:' + e(c.o));
      if (c.t) L.push('TITLE:' + e(c.t));
      if (c.p) L.push('TEL;TYPE=CELL:' + e(c.p));
      if (c.e) L.push('EMAIL:' + e(c.e));
      if (c.w) L.push('URL:' + e(url(c.w)));
      LINKS.filter((l) => !['p', 'e', 'w'].includes(l.k) && c[l.k]).forEach((l) => L.push('X-SOCIALPROFILE;TYPE=' + l.k + ':' + e(l.href(c[l.k]))));
      if (c.b) L.push('NOTE:' + e(c.b));
      L.push('END:VCARD', '');
      return L.join('\r\n');
    }

    function exportVault() {
      const files = []; const used = new Set();
      const put = (dir, name, text) => {
        let f = safeFile(name); let k = 2; while (used.has(dir + f)) f = safeFile(name) + ' ' + k++;
        used.add(dir + f); files.push([dir + f + '.md', text]); return f;
      };
      const meN = db.me ? put('', db.me.n, meMD(db.me)) : null;
      const names = db.people.map((p) => put(DIR.people + '/', p.card.n, personMD(p)));
      const wheres = {};
      db.people.forEach((p, i) => { if (p.met && p.met.w) (wheres[p.met.w] = wheres[p.met.w] || []).push(names[i]); });
      Object.entries(wheres).forEach(([w, ns]) => put(DIR.events + '/', w, `---\ntags:\n  - ${L('活動', 'event')}\n---\n\n# ${w}\n\n${t('在這裡認識的人：')}\n${ns.map((n) => '- [[' + n + ']]').join('\n')}\n`));
      put('', DIR.moc, `---\ntags:\n  - MOC\n---\n\n# ${DIR.moc}\n\n${meN ? t('我：') + '[[' + meN + ']]\n\n' : ''}${t('## 所有人脈（{0}）', names.length)}\n${names.map((n) => '- [[' + n + ']]').join('\n')}\n${Object.keys(wheres).length ? '\n' + t('## 依活動') + '\n' + Object.entries(wheres).map(([w, ns]) => '- [[' + safeFile(w) + ']]' + t('：') + ns.map((n) => '[[' + n + ']]').join(t('、'))).join('\n') + '\n' : ''}\n${t('> 打開 Obsidian 的「關係圖譜」(Graph view) 看看你的人脈網路！')}\n`);
      download(zip(files), L('VaultCard 人脈 Vault ', 'VaultCard Vault ') + today() + '.zip');
      toast(t('📦 已匯出 {0} 則人脈筆記', names.length));
    }

    // 最小的 ZIP 產生器（不壓縮，UTF-8 檔名）
    let crcT = null;
    function crc32(b) {
      if (!crcT) { crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } }
      let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
    }
    function zip(files) {
      const enc = new TextEncoder(); const parts = []; const central = []; let off = 0;
      const d = new Date(); const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      files.forEach(([name, text]) => {
        const nb = enc.encode(name); const data = enc.encode(text); const crc = crc32(data);
        const h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
        h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
        h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
        parts.push(new Uint8Array(h.buffer), nb, data);
        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
        c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
        c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
        central.push(new Uint8Array(c.buffer), nb);
        off += 30 + nb.length + data.length;
      });
      const size = central.reduce((s, b) => s + b.length, 0);
      const e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
      return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
    }

    /* ---------------- 小工具 ---------------- */
    const FS = plugin('Filesystem'); const Share = plugin('Share');
    const toBase64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = rej; fr.readAsDataURL(blob); });
    async function download(blob, name) {
      if (FS && Share) {
        // iPhone / Android App：WebView 不支援 <a download>，改成寫入暫存檔再打開系統分享面板
        try {
          const { uri } = await FS.writeFile({ path: name, data: await toBase64(blob), directory: 'CACHE' });
          await Share.share({ title: name, files: [uri] });
        } catch (e) {
          if (!/cancel/i.test(String(e && (e.message || e)))) toast(t('❌ 無法儲存檔案'));
        }
        return;
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
    function copy(text) {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t('🔗 已複製名片連結'))).catch(() => { prompt(t('複製這個連結：'), text); });
    }
    function shareLink(link, name) {
      if (Share) { Share.share({ title: t('{0} 的名片', name), text: t('這是我的 VaultCard 名片，打開就能存成人脈筆記 👇'), url: link }).catch(() => {}); return; }
      if (navigator.share) navigator.share({ title: t('{0} 的名片', name), text: t('這是我的 VaultCard 名片，打開就能存成人脈筆記 👇'), url: link }).catch(() => {});
      else copy(link);
    }

    const DEMO = { n: '林小晶', t: '知識管理教練', o: 'VaultCard 社群', b: '幫大家用 Obsidian 打造第二大腦。\n喜歡讀書會、筆記術和好喝的咖啡 ☕', g: ['Obsidian', '知識管理', '讀書會'], w: 'obsidian.md', th: '@vaultcard', c: 0 };
    const DEMO_EN = { n: 'Lena Lin', t: 'Knowledge Coach', o: 'VaultCard Community', b: 'Helping people build a second brain with Obsidian.\nInto book clubs, note-taking and good coffee ☕', g: ['Obsidian', 'PKM', 'BookClub'], w: 'obsidian.md', th: '@vaultcard', c: 0 };

    return {
      cardView, receiveView, peopleView, networkView, settingsView, openDemo, ready,
      hasCard: () => !!db.me,
      personView: (v, id, mode) => personView(v, id, mode === 'edit'),
      count: () => db.people.length
    };
  };
})(window);
