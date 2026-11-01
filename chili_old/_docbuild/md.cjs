'use strict';
// Tiny, dependency-free Markdown renderer for the Chili UI doc build.
// Supported: front matter, # headings (with optional {#anchor}), paragraphs,
// **bold**, *italic*, `code`, [links](#anchor | url), - / 1. lists,
// GFM pipe tables, fenced code blocks, blockquote callouts (> [!lead] / [!note]
// / [!ok] / [!warn]), [[embed]] tokens, {{CODE:file|hint}} placeholders,
// :::html raw blocks and plain raw <tag> HTML blocks.

const BT = String.fromCharCode(96);

function parseFrontMatter(src) {
  const out = { meta: {}, body: String(src || '').replace(/\r\n/g, '\n') };
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(out.body);
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.charAt(0) === '"' && v.slice(-1) === '"') || (v.charAt(0) === "'" && v.slice(-1) === "'")) v = v.slice(1, -1);
    out.meta[k] = v;
  }
  out.body = out.body.slice(m[0].length);
  return out;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'sec';
}

// inline markdown -> html; code spans are protected from further markup
function inline(text, opts) {
  const s = String(text);
  const chunks = [];
  let i = 0;
  let buf = '';
  while (i < s.length) {
    if (s.charAt(i) === BT) {
      let j = i + 1;
      while (j < s.length && s.charAt(j) !== BT) j++;
      if (j < s.length) {
        if (buf) { chunks.push({ t: 'txt', v: buf }); buf = ''; }
        chunks.push({ t: 'code', v: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    buf += s.charAt(i);
    i++;
  }
  if (buf) chunks.push({ t: 'txt', v: buf });
  return chunks.map(function (c) {
    if (c.t === 'code') return '<code>' + esc(c.v) + '</code>';
    // keep simple inline html tags (<code>, <b>, <br>, ...) while escaping plain text
    const tags = [];
    const src = c.v.replace(/<\/?[a-zA-Z][^>]*>/g, function (t) { tags.push(t); return '\u0000' + (tags.length - 1) + '\u0000'; });
    let h = esc(src);
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+?)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, label, href) {
      return '<a href="' + href + '">' + label + '</a>';
    });
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    h = h.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
    h = h.replace(/\u0000(\d+)\u0000/g, function (m, n) { return tags[+n]; });
    return h;
  }).join('');
}

function splitRow(line) {
  let s = line.trim();
  if (s.charAt(0) === '|') s = s.slice(1);
  if (s.slice(-1) === '|') s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (c === '\\' && s.charAt(i + 1) === '|') { cur += '|'; i++; continue; }
    if (c === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function isTableSep(line) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.indexOf('-') >= 0;
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function renderMd(src, opts) {
  opts = opts || {};
  const hl = opts.hl || function (lang, code) { return esc(code); };
  const codeWrap = opts.codeWrap || function (title, hint, body) {
    const head = (title || hint)
      ? '<div class="codehead">' + (title ? '<span class="fname">' + esc(title) + '</span>' : '')
        + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>'
      : '';
    return '<div class="codewrap">' + head + '<pre class="code"><code>' + body + '</code></pre></div>';
  };
  const embed = opts.embed || function () { return ''; };
  const codeBlock = opts.codeBlock || function (file, hint) { return '<p class="warn">missing ' + esc(file) + '</p>'; };

  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const blank = function (l) { return !l || !String(l).trim(); };

  while (i < lines.length) {
    const line = lines[i];
    if (blank(line)) { i++; continue; }

    if (/^:::html\s*$/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(buf.join('\n'));
      continue;
    }

    if (line.trim().indexOf(BT.repeat(3)) === 0) {
      const marker = BT.repeat(3);
      const rest = line.trim().slice(3);
      const lang = (/^[A-Za-z0-9_+-]+/.exec(rest) || [''])[0];
      const attrs = {};
      const re = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g;
      let am;
      while ((am = re.exec(rest))) attrs[am[1]] = am[2];
      const bare = rest.replace(/([A-Za-z_][\w-]*)\s*=\s*"[^"]*"/g, '').replace(lang, '').trim();
      i++;
      const buf = [];
      while (i < lines.length && lines[i].trim().indexOf(marker) !== 0) { buf.push(lines[i]); i++; }
      i++;
      const code = buf.join('\n');
      const plain = !lang || lang === 'text' || lang === 'plain';
      out.push(codeWrap(attrs.title || bare || '', attrs.hint || '', plain ? esc(code) : hl(lang, code)));
      continue;
    }

    const emb = /^\s*\[\[([a-z0-9_-]+)\]\]\s*$/i.exec(line);
    if (emb) { out.push(embed(emb[1], lines, i)); i++; continue; }

    const codeTok = /^\s*\{\{CODE:([^}|]+?)(?:\|([^}]*))?\}\}\s*$/.exec(line);
    if (codeTok) { out.push(codeBlock(codeTok[1].trim(), (codeTok[2] || '').trim())); i++; continue; }

    const head = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (head) {
      const level = head[1].length;
      let text = head[2];
      let id = '';
      const am = /\s*\{#([\w:.-]+)\}\s*$/.exec(text);
      if (am) { id = am[1]; text = text.slice(0, am.index); }
      if (!id) id = slug(text.replace(/^\d+[.、]\s*/, ''));
      out.push('<h' + level + ' id="' + id + '">' + inline(text, opts) + '</h' + level + '>');
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (line.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headRow = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].indexOf('|') >= 0 && !blank(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      let t = '<table class="compact"><thead><tr>';
      for (const c of headRow) t += '<th>' + inline(c, opts) + '</th>';
      t += '</tr></thead><tbody>';
      for (const r of rows) {
        t += '<tr>';
        for (let k = 0; k < headRow.length; k++) t += '<td>' + inline(r[k] || '', opts) + '</td>';
        t += '</tr>';
      }
      t += '</tbody></table>';
      out.push(t);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      let kind = '';
      const cm = /^\[!(lead|note|ok|warn)\]?\s*(.*)$/i.exec(buf[0] || '');
      if (cm) { kind = cm[1].toLowerCase(); buf[0] = cm[2]; }
      const cls = kind === 'lead' ? 'lead' : (kind || 'note');
      out.push('<div class="callout ' + cls + '">' + renderMd(buf.join('\n'), opts) + '</div>');
      continue;
    }

    const li = LIST_RE.exec(line);
    if (li) {
      const ordered = /[0-9]/.test(li[2]);
      const items = [];
      let cur = null;
      while (i < lines.length) {
        const m = LIST_RE.exec(lines[i]);
        if (m) { if (cur !== null) items.push(cur); cur = m[3]; i++; continue; }
        if (blank(lines[i])) {
          if (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) { cur += '\n' + lines[i + 1].trim(); i += 2; continue; }
          break;
        }
        if (/^\s{2,}\S/.test(lines[i]) && cur !== null) { cur += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      if (cur !== null) items.push(cur);
      const tag = ordered ? 'ol' : 'ul';
      let h = '<' + tag + ' class="tips">';
      for (const it of items) h += '<li>' + it.split('\n').map(function (x) { return inline(x, opts); }).join('<br>') + '</li>';
      h += '</' + tag + '>';
      out.push(h);
      continue;
    }

    if (/^\s*</.test(line)) {
      const buf = [];
      while (i < lines.length && !blank(lines[i])) { buf.push(lines[i]); i++; }
      out.push(buf.join('\n'));
      continue;
    }

    const buf = [];
    while (i < lines.length && !blank(lines[i])) {
      const l = lines[i];
      if (/^\s*(#{1,6}\s|>|:::html|\[\[|\{\{CODE:)/.test(l) || l.trim().indexOf(BT.repeat(3)) === 0) break;
      if (LIST_RE.test(l)) break;
      if (l.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) break;
      buf.push(l.trim());
      i++;
    }
    if (buf.length) out.push('<p>' + inline(buf.join(' '), opts) + '</p>');
  }

  return out.join('\n\n');
}

module.exports = {
  parseFrontMatter: parseFrontMatter,
  renderMd: renderMd,
  inline: inline,
  esc: esc,
  slug: slug,
};
