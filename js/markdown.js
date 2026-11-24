/* 輕量 Markdown 轉換器：支援 Obsidian 常用語法
   標題、粗體、斜體、刪除線、==螢光==、行內程式碼、程式碼區塊、
   清單（巢狀）、待辦、引用、Callout、表格、分隔線、
   [[雙向連結]]、[[筆記|別名]]、![[嵌入]]、#標籤、YAML 屬性 */
(function (global) {
  'use strict';

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const CALLOUT_ICONS = {
    note: '✏️', abstract: '📋', summary: '📋', info: 'ℹ️', todo: '☑️', tip: '💡', hint: '💡',
    success: '✅', check: '✅', done: '✅', question: '❓', help: '❓', faq: '❓',
    warning: '⚠️', caution: '⚠️', attention: '⚠️', failure: '❌', fail: '❌', missing: '❌',
    danger: '⛔', error: '⛔', bug: '🐞', example: '🧪', quote: '❝', cite: '❝'
  };

  function inline(src, opts) {
    const slots = [];
    const keep = (html) => { slots.push(html); return '\u0000' + (slots.length - 1) + '\u0000'; };
    let s = src;

    // 行內程式碼
    s = s.replace(/`([^`]+)`/g, (_, c) => keep('<code>' + esc(c) + '</code>'));
    // 區塊 ID（^id 結尾）隱藏
    s = s.replace(/\s\^[A-Za-z0-9-]+\s*$/, '');
    // 嵌入 ![[...]]（行內）
    s = s.replace(/!\[\[([^\]]+)\]\]/g, (_, t) => keep(renderEmbed(t, opts, true)));
    // 雙向連結 [[target#heading|alias]]
    s = s.replace(/\[\[([^\]]+)\]\]/g, (_, t) => {
      const [target, alias] = t.split('|');
      const label = alias || target.replace(/#\^?/, ' > ');
      const base = target.split('#')[0].trim();
      const resolved = !opts.resolve || !base || opts.resolve(base);
      return keep('<a class="internal-link' + (resolved ? '' : ' unresolved') + '" data-note="' + esc(base) + '">' + esc(label.trim()) + '</a>');
    });
    // 一般連結與圖片
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => keep('<img alt="' + esc(alt) + '" src="' + esc(safeUrl(url)) + '">'));
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => keep('<a href="' + esc(safeUrl(url)) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'));

    s = esc(s);

    // 標籤 #tag（避開 HTML 實體與純數字）
    s = s.replace(/(^|[^\p{L}\p{N}_&#/;])#([\p{L}\p{N}_\-/]+)/gu, (m, pre, tag) => {
      if (/^\d+$/.test(tag)) return m;
      return pre + '<span class="tag" data-tag="' + tag + '">#' + tag + '</span>';
    });
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');

    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
  }

  function safeUrl(u) {
    return /^(javascript|data|vbscript):/i.test(u.trim()) ? '#' : u;
  }

  function renderEmbed(t, opts, isInline) {
    const target = t.split('|')[0].trim();
    const content = opts.embed ? opts.embed(target) : null;
    const tag = isInline ? 'span' : 'div';
    const body = content == null
      ? '<span class="faint">找不到「' + esc(target) + '」，Obsidian 會顯示可點擊建立的提示。</span>'
      : (isInline ? inline(content, { ...opts, embed: null }) : render(content, { ...opts, embed: null }));
    return '<' + tag + ' class="embed" style="display:block"><span class="embed-title" style="display:block">📄 ' + esc(target) + '</span>' + body + '</' + tag + '>';
  }

  function renderFrontmatter(lines) {
    const rows = [];
    let lastKey = null;
    lines.forEach((l) => {
      const m = l.match(/^([\w一-鿿-]+):\s*(.*)$/);
      if (m) { lastKey = { k: m[1], v: m[2] ? [m[2]] : [] }; rows.push(lastKey); }
      else if (lastKey && /^\s*-\s+/.test(l)) lastKey.v.push(l.replace(/^\s*-\s+/, ''));
    });
    if (!rows.length) return '';
    return '<div class="frontmatter"><div class="fm-title">屬性 PROPERTIES</div>' + rows.map((r) => {
      let v = r.v.join(', ').replace(/^\[|\]$/g, '');
      return '<div class="fm-row"><span class="fm-key">' + esc(r.k) + '</span><span>' + esc(v) + '</span></div>';
    }).join('') + '</div>';
  }

  function renderList(lines, opts) {
    // lines: 清單相關行；以縮排建構巢狀
    const root = { children: [], indent: -1 };
    const stack = [root];
    lines.forEach((line) => {
      const m = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (!m) {
        const last = stack[stack.length - 1].children.slice(-1)[0];
        if (last) last.text += '<br>' + inline(line.trim(), opts);
        return;
      }
      const indent = m[1].replace(/\t/g, '    ').length;
      const ordered = /\d/.test(m[2]);
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1];
      let text = m[3];
      let task = null;
      const t = text.match(/^\[( |x|X|\/|-)\]\s+(.*)$/);
      if (t) { task = t[1] !== ' '; text = t[2]; }
      const item = { indent, ordered, task, text: inline(text, opts), children: [] };
      parent.children.push(item);
      stack.push(item);
    });
    const build = (items) => {
      if (!items.length) return '';
      const tag = items[0].ordered ? 'ol' : 'ul';
      return '<' + tag + '>' + items.map((it) => {
        if (it.task !== null) {
          return '<li class="task' + (it.task ? ' checked' : '') + '"><input type="checkbox" disabled' + (it.task ? ' checked' : '') + '><span class="task-text">' + it.text + '</span>' + build(it.children) + '</li>';
        }
        return '<li>' + it.text + build(it.children) + '</li>';
      }).join('') + '</' + tag + '>';
    };
    return build(root.children);
  }

  function renderTable(lines, opts) {
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(lines[0]);
    const aligns = cells(lines[1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : 'left'));
    let h = '<table><thead><tr>' + head.map((c, i) => '<th style="text-align:' + aligns[i] + '">' + inline(c, opts) + '</th>').join('') + '</tr></thead><tbody>';
    lines.slice(2).forEach((l) => {
      h += '<tr>' + cells(l).map((c, i) => '<td style="text-align:' + (aligns[i] || 'left') + '">' + inline(c, opts) + '</td>').join('') + '</tr>';
    });
    return h + '</tbody></table>';
  }

  function render(src, opts) {
    opts = opts || {};
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    let out = '';
    let i = 0;

    // YAML 屬性
    if (lines[0] === '---') {
      const end = lines.indexOf('---', 1);
      if (end > 0) {
        out += renderFrontmatter(lines.slice(1, end));
        i = end + 1;
      }
    }

    const isList = (l) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i++; continue; }

      // 程式碼區塊
      const fence = line.match(/^\s*(```|~~~)\s*([\w-]*)/);
      if (fence) {
        const buf = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
        i++;
        out += '<pre><code' + (fence[2] ? ' data-lang="' + esc(fence[2]) + '"' : '') + '>' + esc(buf.join('\n')) + '</code></pre>';
        continue;
      }

      // 標題
      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        const level = h[1].length;
        out += '<h' + level + '>' + inline(h[2], opts) + '</h' + level + '>';
        i++; continue;
      }

      // 分隔線
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out += '<hr>'; i++; continue; }

      // 單獨一行嵌入
      const em = line.trim().match(/^!\[\[([^\]]+)\]\]$/);
      if (em) { out += renderEmbed(em[1], opts, false); i++; continue; }

      // 引用 / Callout
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        const c = buf[0].match(/^\[!(\w+)\]([+-]?)\s*(.*)$/);
        if (c) {
          const type = c[1].toLowerCase();
          const title = c[3] || (type.charAt(0).toUpperCase() + type.slice(1));
          out += '<div class="callout" data-type="' + esc(type) + '"><div class="callout-title">' + (CALLOUT_ICONS[type] || '📌') + ' ' + inline(title, opts) + '</div>' + render(buf.slice(1).join('\n'), opts) + '</div>';
        } else {
          out += '<blockquote>' + render(buf.join('\n'), opts) + '</blockquote>';
        }
        continue;
      }

      // 表格
      if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        const buf = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) buf.push(lines[i++]);
        out += renderTable(buf, opts);
        continue;
      }

      // 清單
      if (isList(line)) {
        const buf = [];
        while (i < lines.length && lines[i].trim() && (isList(lines[i]) || /^\s{2,}\S/.test(lines[i]))) buf.push(lines[i++]);
        out += renderList(buf, opts);
        continue;
      }

      // 段落（Obsidian 預設會保留換行）
      const buf = [];
      while (
        i < lines.length && lines[i].trim() &&
        !/^(#{1,6})\s/.test(lines[i]) && !/^\s*(```|~~~)/.test(lines[i]) &&
        !/^\s*>/.test(lines[i]) && !isList(lines[i]) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
      ) buf.push(lines[i++]);
      if (!buf.length) { buf.push(lines[i++]); }
      out += '<p>' + buf.map((l) => inline(l, opts)).join('<br>') + '</p>';
    }
    return out;
  }

  global.MD = { render, inline, esc };
})(window);
