/* VaultCard 主程式：外框、路由、圖譜引擎、小工具
   名片與人脈的邏輯在 js/vaultcard.js */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = window.MD.esc;
  const { t, L } = window.I18N;

  /* ---------------- 原生 App（Capacitor）---------------- */
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  let hapticsPlugin = null;
  function haptic(kind) {
    try {
      if (native && !hapticsPlugin) hapticsPlugin = window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin('Haptics') : (window.Capacitor.Plugins || {}).Haptics;
      const H = hapticsPlugin;
      if (H) { kind === 'success' ? H.notification({ type: 'SUCCESS' }) : H.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' }); }
      else if (kind === 'success' && navigator.vibrate) navigator.vibrate(20);
    } catch (e) { /* 不支援就略過 */ }
  }
  if (native) document.documentElement.classList.add('native');

  /* ---------------- 圖示 ---------------- */
  const ICONS = {
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4M14.5 10h4M14.5 14h3"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/>',
    graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.2 7.2 10.8 16M15.8 8.5 13 15.8M8.5 6.3l7 .5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'
  };
  const icon = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + '</svg>';
  const logo = () => '<img src="icons/icon.svg" alt="" style="width:100%;height:100%;display:block">';

  const NAV = [
    { r: '/settings', label: t('設定與資料'), short: t('設定'), ico: 'settings' },
    { r: '/card', label: t('我的名片'), short: t('名片'), ico: 'card' },
    { r: '/network', label: t('人脈圖譜'), short: t('圖譜'), ico: 'graph' },
    { r: '/people', label: t('人脈'), short: t('人脈'), ico: 'people' }
  ];

  /* ---------------- 外框 ---------------- */
  function shell() {
    document.body.innerHTML = `
<div class="app">
  <aside class="ribbon" aria-label="${t('功能區')}">
    <a class="logo" href="#/welcome" title="VaultCard">${logo()}</a>
    ${NAV.map((n) => `<a class="icon-btn" href="#${n.r}" data-route="${n.r}" title="${n.label}">${icon(n.ico)}</a>`).join('')}
  </aside>
  <aside class="sidebar">
    <a class="brand" href="#/welcome" style="color:inherit;text-decoration:none"><div style="width:34px;height:34px">${logo()}</div><div><div class="brand-name">VaultCard</div><div class="brand-sub">${t('人脈就是你的 Vault')}</div></div></a>
    <nav class="nav">${NAV.map((n) => `<a href="#${n.r}" data-route="${n.r}">${icon(n.ico)}<span>${n.label}</span></a>`).join('')}</nav>
    <div class="sidebar-foot"><div class="mini-progress" id="mini-stat"></div></div>
  </aside>
  <div class="main">
    <header class="topbar">
      <a class="icon-btn" id="top-back" href="#/" aria-label="${t('返回')}" hidden>${icon('back')}</a>
      <div style="width:26px;height:26px" id="top-logo">${logo()}</div>
      <div class="title" id="top-title">VaultCard</div>
    </header>
    <main class="view" id="view"></main>
  </div>
  <nav class="bottom-nav">${NAV.map((n) => `<a href="#${n.r}" data-route="${n.r}">${icon(n.ico)}<span>${n.short}</span></a>`).join('')}</nav>
</div>
<div class="toast-wrap" id="toasts"></div>`;
  }

  function setActiveNav(hash) {
    const base = '/' + (hash.split('/')[1] || '');
    const navBase = base === '/c' ? '/people' : base === '/' ? '/card' : base;
    $$('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === navBase));
  }
  function setTitle(title, back) {
    $('#top-title').textContent = title;
    document.title = title === 'VaultCard' ? t('VaultCard · 用 Obsidian 的方式經營人脈') : title + ' · VaultCard';
    const b = $('#top-back');
    b.hidden = !back; $('#top-logo').hidden = !!back;
    if (back) b.setAttribute('href', back);
  }
  function updateStat() {
    const el = $('#mini-stat'); if (!el) return;
    el.innerHTML = t('👥 {0} 位人脈<br><span class="faint">資料只存在這台裝置</span>', CX.count());
  }

  /* ---------------- 路由 ---------------- */
  let cleanup = null;
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    if (cleanup) { const c = cleanup; cleanup = null; c(); }
    const view = $('#view');
    view.className = 'view';
    const parts = hash.split('/').filter(Boolean);
    setActiveNav(hash);
    if (!parts.length) { if (CX.hasCard()) CX.cardView(view); else welcomeView(view); }
    else if (parts[0] === 'card') CX.cardView(view);
    else if (parts[0] === 'people' && parts[1]) CX.personView(view, decodeURIComponent(parts[1]), parts[2]);
    else if (parts[0] === 'people') CX.peopleView(view);
    else if (parts[0] === 'network') CX.networkView(view);
    else if (parts[0] === 'c' && parts[1]) CX.receiveView(view, parts[1]);
    else if (parts[0] === 'settings') CX.settingsView(view);
    else if (parts[0] === 'welcome') welcomeView(view);
    else { location.hash = '#/'; return; }
    window.scrollTo(0, 0);
    updateStat();
  }

  /* ---------------- 歡迎頁 ---------------- */
  function welcomeView(v) {
    setTitle('VaultCard');
    v.innerHTML = `
<section class="welcome">
  <div class="w-logo">${logo()}</div>
  <h1>VaultCard</h1>
  <p class="lead">${t('一張名片，就是一則 Obsidian 筆記。<br>交換名片、記下怎麼認識，用 [[連結]] 把人脈織成一張網。')}</p>
  <div class="cx-actions"><a class="btn primary" href="#/card">🪪 ${CX.hasCard() ? t('打開我的名片') : t('建立我的名片')}</a><button class="btn" id="w-demo">${t('👀 看範例名片')}</button></div>
  <p style="margin-top:18px"><button class="btn ghost" id="w-lang">🌐 ${L('English', '中文')}</button></p>
</section>
<div class="how">
  <div class="card"><div class="n">🪪</div><b>${t('1. 做一張名片')}</b><span>${t('30 秒填好，產生你的 QR Code 與分享連結。')}</span></div>
  <div class="card"><div class="n">🤝</div><b>${t('2. 掃一下就交換')}</b><span>${t('對方打開連結，就能把你存成一則人脈筆記，再回傳他的名片。')}</span></div>
  <div class="card"><div class="n">🕸️</div><b>${t('3. 長出你的人脈圖譜')}</b><span>${t('寫筆記、加 #標籤、用 [[名字]] 連結，最後整包匯出成 Obsidian Vault。')}</span></div>
</div>
<p class="faint" style="text-align:center;font-size:13px;margin-top:28px">${t('不用註冊、沒有伺服器。名片資料直接放在分享連結裡，人脈只存在你的裝置。')}</p>`;
    $('#w-demo').addEventListener('click', CX.openDemo);
    $('#w-lang').addEventListener('click', () => window.I18N.setLang(L('en', 'zh')));
  }

  /* ---------------- 圖譜引擎（力導向）---------------- */
  function makeGraph(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let nodes = [], links = [], byId = {};
    let cam = { x: 0, y: 0, k: 1 };
    let drag = null, hover = null, raf = 0, alpha = 1, running = true;
    let down = null;
    const pointers = new Map(); let pinch = null;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
    }
    function load(data) {
      nodes = data.nodes.map((n, i) => {
        const a = (i / data.nodes.length) * Math.PI * 2;
        return Object.assign({}, n, { x: Math.cos(a) * 160 + (Math.random() - .5) * 40, y: Math.sin(a) * 160 + (Math.random() - .5) * 40, vx: 0, vy: 0 });
      });
      byId = {}; nodes.forEach((n) => { byId[n.id] = n; });
      links = data.links.filter((l) => byId[l.s] && byId[l.t]).map((l) => Object.assign({}, l, { a: byId[l.s], b: byId[l.t] }));
      cam = { x: 0, y: 0, k: Math.min(1.1, Math.max(.5, Math.min(W, H) / 640)) };
      alpha = 1;
    }
    function tick() {
      if (alpha > 0.005) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = b.x - a.x, dy = b.y - a.y; let d2 = dx * dx + dy * dy || 1;
            if (d2 > 250000) continue;
            const f = 2600 / d2; const d = Math.sqrt(d2);
            dx /= d; dy /= d;
            a.vx -= dx * f * alpha; a.vy -= dy * f * alpha; b.vx += dx * f * alpha; b.vy += dy * f * alpha;
          }
        }
        links.forEach((l) => {
          const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = l.dashed ? 150 : 85;
          const f = (d - target) * (l.dashed ? 0.006 : 0.025) * alpha;
          const fx = dx / d * f, fy = dy / d * f;
          l.a.vx += fx; l.a.vy += fy; l.b.vx -= fx; l.b.vy -= fy;
        });
        nodes.forEach((n) => {
          n.vx -= n.x * 0.0025 * alpha; n.vy -= n.y * 0.0025 * alpha;
          if (n === drag) { n.vx = n.vy = 0; return; }
          n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy;
        });
        alpha *= 0.992;
      }
      draw();
      if (running) raf = requestAnimationFrame(tick);
    }
    const toScreen = (n) => [W / 2 + (n.x + cam.x) * cam.k, H / 2 + (n.y + cam.y) * cam.k];
    const toWorld = (sx, sy) => [(sx - W / 2) / cam.k - cam.x, (sy - H / 2) / cam.k - cam.y];
    function neighbors(n) {
      const s = new Set([n]);
      links.forEach((l) => { if (l.a === n) s.add(l.b); if (l.b === n) s.add(l.a); });
      return s;
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const focus = hover || drag; const nb = focus ? neighbors(focus) : null;
      links.forEach((l) => {
        const [x1, y1] = toScreen(l.a); const [x2, y2] = toScreen(l.b);
        const hl = focus && (l.a === focus || l.b === focus);
        ctx.strokeStyle = hl ? 'rgba(168,139,250,.9)' : focus ? 'rgba(120,120,120,.12)' : 'rgba(140,140,140,.35)';
        ctx.lineWidth = hl ? 1.8 : 1;
        ctx.setLineDash(l.dashed ? [4, 4] : []);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.setLineDash([]);
      nodes.forEach((n) => {
        const [x, y] = toScreen(n); const r = n.r * Math.max(.7, cam.k);
        const dim = nb && !nb.has(n);
        let fill = '#8a5cf5';
        if (n.kind === 'hub') fill = '#c4b5fd';
        else if (n.kind === 'todo') fill = '#7a7a7a';
        else if (n.kind === 'ghost') fill = '#4a4a4a';
        else if (n.kind === 'tag') fill = '#4ade80';
        else if (n.kind === 'event') fill = '#facc15';
        else if (n.kind === 'org') fill = '#60a5fa';
        ctx.globalAlpha = dim ? 0.2 : 1;
        if ((n.kind === 'done' || n.kind === 'hub' || n === focus) && !dim) { ctx.shadowColor = '#8a5cf5'; ctx.shadowBlur = n === focus ? 22 : 12; }
        ctx.fillStyle = n === focus ? '#d8ccff' : fill;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (n.kind === 'ghost') { ctx.strokeStyle = '#888'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
        if (cam.k > 0.5 || n === focus || n.kind === 'hub') {
          ctx.fillStyle = dim ? '#666' : n.kind === 'hub' ? '#e9e3ff' : '#cfcfcf';
          ctx.font = (n.kind === 'hub' ? '600 13px ' : '12px ') + getComputedStyle(document.body).fontFamily;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, x, y + r + 14);
        }
        ctx.globalAlpha = 1;
      });
    }
    function pick(sx, sy) {
      const [wx, wy] = toWorld(sx, sy);
      let best = null, bd = Infinity;
      nodes.forEach((n) => { const d = Math.hypot(n.x - wx, n.y - wy); if (d < n.r + 10 / cam.k && d < bd) { bd = d; best = n; } });
      return best;
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    function onDown(e) {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, pos(e));
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: cam.k }; drag = null; down = null; return;
      }
      const [sx, sy] = pos(e);
      const n = pick(sx, sy);
      down = { sx, sy, n, cx: cam.x, cy: cam.y, moved: false };
      if (n) { drag = n; alpha = Math.max(alpha, .3); }
      canvas.style.cursor = 'grabbing';
    }
    function onMove(e) {
      const [sx, sy] = pos(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [sx, sy]);
      if (pinch && pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        cam.k = Math.min(3, Math.max(.3, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); return;
      }
      if (down) {
        if (Math.hypot(sx - down.sx, sy - down.sy) > 4) down.moved = true;
        if (drag) { const [wx, wy] = toWorld(sx, sy); drag.x = wx; drag.y = wy; alpha = Math.max(alpha, .3); }
        else { cam.x = down.cx + (sx - down.sx) / cam.k; cam.y = down.cy + (sy - down.sy) / cam.k; }
      } else {
        const n = pick(sx, sy);
        if (n !== hover) {
          hover = n;
          canvas.style.cursor = n ? (n.href ? 'pointer' : 'default') : 'grab';
          $('#graph-hover').textContent = n ? n.label + (n.kind === 'ghost' ? t('（尚未建立）') : '') : '';
        }
      }
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (down && !down.moved && down.n) {
        const n = down.n;
        if (n.href) location.hash = n.href;
        else if (n.kind === 'ghost') toast(t('📄「{0}」被提到了，但還沒存成人脈筆記', n.label));
      }
      drag = null; down = null; canvas.style.cursor = 'grab';
    }
    function onWheel(e) {
      e.preventDefault();
      const [sx, sy] = pos(e); const [wx, wy] = toWorld(sx, sy);
      cam.k = Math.min(3, Math.max(.3, cam.k * Math.exp(-e.deltaY * 0.0015)));
      const [nx, ny] = toWorld(sx, sy); cam.x += nx - wx; cam.y += ny - wy;
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', () => { if (!down) { hover = null; $('#graph-hover').textContent = ''; } });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(tick);
    return { load, destroy: () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); } };
  }

  /* ---------------- 小工具 ---------------- */
  function toast(msg) {
    const w = $('#toasts'); if (!w) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    w.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2800);
    while (w.children.length > 3) w.removeChild(w.firstChild);
  }

  /* ---------------- PWA ---------------- */
  if ('serviceWorker' in navigator && !native && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------------- 啟動 ---------------- */
  const CX = window.Connect({ $, $$, esc, icon, toast, haptic, setTitle, makeGraph, native, setCleanup: (fn) => { cleanup = fn; } });
  shell();
  window.addEventListener('hashchange', route);
  // 等 App 內的原生備份檢查完再畫第一個畫面（網頁版會立刻完成）
  CX.ready.then(route, route);
})();
