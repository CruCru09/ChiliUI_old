#!/usr/bin/env node
// Chili UI reference doc builder: raw.json + desc/*.json  ->  single-file HTML
const fs = require('fs');
const path = require('path');

// Default root = the framework directory (the parent of _docbuild), so this can be run from
// the repository root: `node chili_old/_docbuild/build.cjs` or `... build.cjs en`.
const argLang = !!process.argv[2] && /^(zh|en)$/i.test(process.argv[2]);
const cwd = path.resolve((argLang ? null : process.argv[2]) || path.join(__dirname, '..'));
const LANG = String((argLang ? process.argv[2] : process.argv[3]) || process.env.DOC_LANG || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
const OUT_NAME = LANG === 'en' ? 'chiliui_api_reference_en.html' : 'chiliui_api_reference.html';
let OUT = path.join(cwd, OUT_NAME); // may be redirected by _docbuild/config/site.json -> outputDir
const raw = JSON.parse(fs.readFileSync(path.join(cwd, '_docbuild', 'raw.json'), 'utf8'));

// ---------- merge teammate descriptions ----------
// Descriptions now live next to the source layout: desc/<path>.json, desc_en/<path>.json
// (e.g. desc/Controls/font.json). They are read recursively; each file may contain:
//   { "file": "Controls/font.lua", "classes": {...}, "module": {...}, "fileDesc": "...", "_orphans": {} }
// The legacy flat layout (classes/modules/files in one file) is still understood, so an older
// checkout or a partly migrated tree does not break the build.
const desc = { classes: {}, modules: {}, files: {} };
const descDir = path.join(cwd, '_docbuild', LANG === 'en' ? 'desc_en' : 'desc');
const OTHER_DOC = LANG === 'en' ? 'chiliui_api_reference.html' : 'chiliui_api_reference_en.html';
if (LANG === 'en' && !fs.existsSync(descDir)) {
  console.error('!! _docbuild/desc_en/ not found — cannot build the English document');
  process.exit(2);
}
function walkJson(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkJson(p));
    else if (ent.isFile() && ent.name.endsWith('.json')) out.push(p);
  }
  return out;
}
const descSeen = new Set();
const descSeenVersion = new Map();
if (fs.existsSync(descDir)) {
  for (const p of walkJson(descDir).sort()) {
    const rel = path.relative(descDir, p).replace(/\\/g, '/');
    let d;
    try { d = JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) { console.error('!! bad desc file ' + rel + ': ' + e.message); continue; }
    const file = d.file || rel.replace(/\.json$/, '');
    for (const k of Object.keys(d.classes || {})) {
      if (desc.classes[k]) console.error('!! duplicate description for class ' + k + ' (also in ' + descSeenVersion.get(k) + '), using ' + rel);
      desc.classes[k] = d.classes[k];
      descSeenVersion.set(k, rel);
    }
    for (const k of Object.keys(d.modules || {})) desc.modules[k] = d.modules[k];
    if (d.module) desc.modules[file] = d.module;
    for (const k of Object.keys(d.files || {})) desc.files[k] = d.files[k];
    if (d.fileDesc !== undefined) desc.files[file] = d.fileDesc;
    descSeen.add(rel);
  }
}

// ---------- language pack ----------
const TXT = LANG === 'en' ? {
  htmlLang: 'en',
  pageTitle: 'Chili UI Controls \u00b7 API Reference \u00b7 chili_old',
  brand: 'Chili UI Reference',
  brandSub: (n, lines) => 'chili_old \u00b7 ' + n + ' classes / ' + nf(lines) + ' lines of Lua',
  docH1: 'Chili UI Controls \u00b7 API Reference',
  placeholder: 'Search class / property / function / description\u2026  (Ctrl+K)',
  otherLang: '\u4e2d\u6587',
  copyLabel: 'copy',
  overview: 'Overview',
  controls: 'Controls',
  noDesc: '(no description yet)',
  noComment: '(no comment in the source)',
  noCommentSig: '(no comment in the source; parameter names are given above)'
} : {
  htmlLang: 'zh-CN',
  pageTitle: 'Chili UI \u63a7\u4ef6\u5e93 API \u53c2\u8003 \u00b7 chili_old',
  brand: 'Chili UI \u53c2\u8003\u6587\u6863',
  brandSub: (n, lines) => 'chili_old \u00b7 ' + n + ' \u4e2a\u7c7b / ' + nf(lines) + ' \u884c Lua',
  docH1: 'Chili UI \u63a7\u4ef6\u5e93 \u00b7 API \u53c2\u8003',
  placeholder: '\u641c\u7d22\u7c7b / \u5c5e\u6027 / \u51fd\u6570 / \u63cf\u8ff0\u2026  (Ctrl+K)',
  otherLang: 'English',
  copyLabel: '\u590d\u5236',
  overview: '\u6587\u6863',
  controls: '\u63a7\u4ef6\u7c7b',
  noDesc: '\uff08\u6682\u65e0\u63cf\u8ff0\uff09',
  noComment: '\uff08\u6e90\u7801\u6ca1\u6709\u6ce8\u91ca\uff09',
  noCommentSig: '\uff08\u6e90\u7801\u6ca1\u6709\u6ce8\u91ca\uff1b\u53c2\u6570\u540d\u89c1\u4e0a\u65b9\u7b7e\u540d\uff09'
};

const L10N = LANG === 'en' ? {
  empty: 'No matches',
  morePre: 'Showing first 80 of ',
  morePost: ' matches \u2014 refine your query',
  footPre: '',
  footSuf: 'results \u00b7 \u2191\u2193 select \u00b7 Enter open \u00b7 Esc close',
  copied: 'copied'
} : {
  empty: '\u6ca1\u6709\u5339\u914d\u9879',
  morePre: '\u4ec5\u663e\u793a\u524d 80 \u6761\uff0c\u5171 ',
  morePost: ' \u6761\uff0c\u8bf7\u7ec6\u5316\u5173\u952e\u8bcd',
  footPre: '',
  footSuf: '\u6761\u7ed3\u679c \u00b7 \u2191\u2193 \u9009\u62e9 \u00b7 Enter \u6253\u5f00 \u00b7 Esc \u5173\u95ed',
  copied: '\u5df2\u590d\u5236'
};

// ---------- english chrome dictionary (post-processing) ----------
const i18nPath = path.join(cwd, '_docbuild', 'i18n_en.json');
let i18nMap = null;
if (LANG === 'en') {
  if (!fs.existsSync(i18nPath)) {
    console.error('!! _docbuild/i18n_en.json not found (EN UI text dictionary)');
    process.exit(3);
  }
  try { i18nMap = JSON.parse(fs.readFileSync(i18nPath, 'utf8')); }
  catch (e) { console.error('!! cannot parse i18n_en.json: ' + e.message); process.exit(3); }
}
const i18nKeys = i18nMap ? Object.keys(i18nMap).sort((a, b) => b.length - a.length) : [];
function applyI18n(s) {
  if (!i18nMap) return s;
  for (let i = 0; i < i18nKeys.length; i++) {
    const k = i18nKeys[i];
    if (k && s.indexOf(k) !== -1) s = s.split(k).join(i18nMap[k]);
  }
  return s;
}

// ---------- small helpers ----------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function slug(s) { return String(s).replace(/[^A-Za-z0-9_.-]+/g, '-'); }
function nf(n) { return Number(n).toLocaleString('en-US'); }
function arr(a) { return Array.isArray(a) ? a : []; }

function inferType(rawv, name) {
  const v = String(rawv == null ? '' : rawv).trim();
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v)) return 'number';
  if (/^'.*'$/.test(v) || /^".*"$/.test(v)) return 'string';
  if (v === 'true' || v === 'false') return 'boolean';
  if (v === 'nil') return 'nil';
  if (/^\{/.test(v)) {
    const t = v.replace(/\s+/g, '');
    if (/^\{\(?-?[\d.eE+-]+,\(?-?[\d.eE+-]+,\(?-?[\d.eE+-]+,\(?-?[\d.eE+-]+\}?$/.test(t)) {
      if (/color|colour/i.test(name)) return '颜色 {r,g,b,a}';
      return '表 {4 项}';
    }
    if (/^\{-?[\d.eE+-]+,?[^A-Za-z]*\}$/.test(t) && /^(padding|margin|itemmargin|itempadding|margins)$/i.test(name)) return '表 {l,t,r,b}';
    return 'table';
  }
  if (/^function/.test(v)) return 'function';
  if (/^(table\.)?[Mm]erge\(/.test(v)) return 'table';
  if (/^[A-Za-z_]+\.[A-Za-z_]+\(/.test(v)) return 'value';
  return 'any';
}

function prettyVal(v, max) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const lim = max || 70;
  if (s.length <= lim) return s;
  return s.slice(0, lim) + '…';
}

// ---------- parse skins ----------
function walk(dir, out) {
  out = out || [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== '_docbuild' && ent.name !== '.git') walk(p, out); }
    else if (ent.name.toLowerCase().endsWith('.lua')) out.push(p);
  }
  return out;
}
const relFiles = raw.files;

// reuse the Lua scanner logic in a compact form (brace matching + fields)
function skipString(t, i) {
  const q = t[i];
  i++;
  while (i < t.length) {
    if (t[i] === '\\') { i += 2; continue; }
    if (t[i] === q) return i + 1;
    if (t[i] === '\n') return i;
    i++;
  }
  return i;
}
function skipLong(t, i) {
  let j = i + 1, lv = 0;
  while (t[j] === '=') { lv++; j++; }
  if (t[j] !== '[') return -1;
  const close = ']' + '='.repeat(lv) + ']';
  const k = t.indexOf(close, j + 1);
  return k === -1 ? t.length : k + close.length;
}
function skipCom(t, i) {
  let j = i + 2;
  const lb = t[j] === '[' ? skipLong(t, j) : -1;
  if (lb !== -1) return lb;
  const nl = t.indexOf('\n', j);
  return nl === -1 ? t.length : nl;
}
function matchBrace(t, open) {
  let i = open + 1, d = 1;
  while (i < t.length) {
    const c = t[i];
    if (c === '"' || c === "'") { i = skipString(t, i); continue; }
    if (c === '[') { const lb = skipLong(t, i); if (lb !== -1) { i = lb; continue; } }
    if (c === '-' && t[i + 1] === '-') { i = skipCom(t, i); continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return i; }
    i++;
  }
  return -1;
}
function fieldsOf(body) {
  const out = [];
  let i = 0, n = body.length;
  while (i < n) {
    while (i < n && /\s/.test(body[i])) i++;
    if (i >= n) break;
    if (body[i] === '-' && body[i + 1] === '-') { i = skipCom(body, i); continue; }
    if (body[i] === ',' || body[i] === ';') { i++; continue; }
    const m = /^[A-Za-z_]\w*/.exec(body.slice(i, i + 100));
    if (!m) { i++; continue; }
    const key = m[0];
    let j = i + key.length;
    while (j < n && body[j] === ' ') j++;
    if (!(body[j] === '=' && body[j + 1] !== '=')) { i = j; continue; }
    let k = j + 1, d = 0;
    while (k < n) {
      const c = body[k];
      if (c === '"' || c === "'") { k = skipString(body, k); continue; }
      if (c === '[') { const lb = skipLong(body, k); if (lb !== -1) { k = lb; continue; } }
      if (c === '-' && body[k + 1] === '-') { k = skipCom(body, k); continue; }
      if (c === '{' || c === '(') { d++; k++; continue; }
      if (c === '}' || c === ')') { d--; k++; continue; }
      if (d === 0 && (c === ',' || c === ';')) break;
      if (d === 0 && c === '\n') {
        let la = k + 1;
        while (la < n && /\s/.test(body[la])) la++;
        if (la >= n || body[la] === '}') break;
        if (/^[A-Za-z_]\w*\s*=[^=]/.test(body.slice(la, la + 100))) break;
      }
      k++;
    }
    out.push({ key: key, val: body.slice(j + 1, k).replace(/\s+/g, ' ').trim() });
    i = k;
  }
  return out;
}

const skins = [];
const skinFiles = relFiles.filter(f => /^Skins\/[^/]+\/skin\.lua$/.test(f));
for (const rel of skinFiles) {
  const t = fs.readFileSync(path.join(cwd, rel), 'utf8');
  const name = rel.split('/')[1];
  const groups = [];
  let info = null;
  const reSkin = /skin\.([A-Za-z_]\w*)\s*=\s*\{/g;
  let mm;
  while ((mm = reSkin.exec(t))) {
    const open = t.indexOf('{', mm.index);
    const close = matchBrace(t, open);
    if (close < 0) continue;
    const flds = fieldsOf(t.slice(open + 1, close));
    if (mm[1] === 'info') info = flds;
    else groups.push({ name: mm[1], fields: flds });
  }
  // also skin.X = Merge(skin.X, {...}) / other constructs
  const merges = [];
  const reM = /skin\.([A-Za-z_]\w*)\s*=\s*Merge\s*\(/g;
  while ((mm = reM.exec(t))) merges.push(mm[1]);
  const aliases = [];
  const reAl = /skin\.([A-Za-z_]\w*)\s*=\s*skin\.([A-Za-z_]\w*)/g;
  while ((mm = reAl.exec(t))) { if (mm[1] !== 'info') aliases.push({ name: mm[1], target: mm[2] }); }
  const assignExtra = [];
  const reA = /skin\.([A-Za-z_]\w*)\s*=\s*([^{\s][^\n]*)/g;
  while ((mm = reA.exec(t))) {
    if (mm[1] === 'info') continue;
    if (/^Merge/.test(mm[2])) continue;
    assignExtra.push({ name: mm[1], val: mm[2].trim() });
  }
  // draw functions defined in this skin (global functions)
  const draws = (raw.moduleFuncs[rel] || []).map(f => ({ key: f.name, line: f.line, comment: f.comment }));
  // a skin file may assign skin.<name> more than once -> merge, later values win
  const mergedGroups = [], gmap = new Map();
  for (const g of groups) {
    if (gmap.has(g.name)) {
      const prev = gmap.get(g.name);
      for (const f of g.fields) {
        const ex = prev.fields.filter(function (x) { return x.key === f.key; })[0];
        if (ex) ex.val = f.val; else prev.fields.push(f);
      }
    } else { gmap.set(g.name, g); mergedGroups.push(g); }
  }
  // skin.control = skin.general 这类别名：没有自己的字段表，直接指向另一组
  for (const al of aliases) {
    if (gmap.has(al.name) || !gmap.has(al.target)) continue;
    const g = { name: al.name, fields: [], aliasOf: al.target };
    gmap.set(al.name, g); mergedGroups.push(g);
  }
  skins.push({ name: name, file: rel, info: info, groups: mergedGroups, merges: merges, extra: assignExtra, aliases: aliases, draws: draws });
}

// ---------- class graph ----------
// File-private classes (`local X = Parent:Inherit{}`) are parsed but deliberately kept out of
// the public reference: they cannot be reached from a widget, so documenting them would only add noise.
const docClasses = raw.classes.filter(c => !c.local);
const byName = {};
for (const c of docClasses) byName[c.name] = c;
const childrenOf = {};
for (const c of docClasses) {
  const p = c.parent || null;
  (childrenOf[p] = childrenOf[p] || []).push(c.name);
}
function ancestorsOf(name) {
  const out = [];
  let cur = byName[name];
  while (cur && cur.parent) { out.push(cur.parent); cur = byName[cur.parent]; }
  return out;
}
function allProps(name) {
  const me = byName[name];
  const own = new Map();
  for (const p of arr(me.props)) own.set(p.name, p);
  const inherited = [];
  for (const a of ancestorsOf(name)) {
    const ap = byName[a];
    for (const p of arr(ap.props)) if (!own.has(p.name) && !inherited.some(x => x.p.name === p.name)) inherited.push({ p: p, from: a });
  }
  return { own: Array.from(own.values()), inherited: inherited };
}
function allFuncs(name) {
  const me = byName[name];
  const ownKeys = new Set(arr(me.funcs).map(f => f.kind + ':' + f.name));
  const own = arr(me.funcs).map(f => ({ f: f, from: name }));
  const inherited = [];
  for (const a of ancestorsOf(name)) {
    for (const f of arr(byName[a].funcs)) {
      const k = f.kind + ':' + f.name;
      if (ownKeys.has(k)) continue;
      if (inherited.some(x => x.f.kind + ':' + x.f.name === k)) continue;
      inherited.push({ f: f, from: a });
    }
  }
  return { own: own, inherited: inherited };
}
function fdesc(cls, f) {
  const key = cls + (f.kind === 'method' ? ':' : '.') + f.name;
  const d = desc.classes[cls];
  if (d && d.funcs && d.funcs[key]) return d.funcs[key];
  return null;
}
function pdesc(cls, p) {
  const d = desc.classes[cls];
  if (d && d.props && d.props[p.name]) return d.props[p.name];
  return '';
}
function classSummary(cls) {
  const d = desc.classes[cls];
  return (d && d.summary) || '';
}
const totalProps = docClasses.reduce((s, c) => s + c.props.length, 0);
const totalFuncs = docClasses.reduce((s, c) => s + c.funcs.length, 0)
  + Object.keys(raw.moduleFuncs).reduce((s, k) => s + raw.moduleFuncs[k].length, 0);
const totalLines = relFiles.reduce((s, f) => s + (raw.modulesMeta[f] ? raw.modulesMeta[f].lines : 0), 0);

// ---------- load order from core.lua ----------
const coreTxt = fs.readFileSync(path.join(cwd, 'core.lua'), 'utf8');
const loadOrder = [];
{
  const clean = coreTxt.split('\n').map(function (line) { return line.replace(/--.*$/, ''); }).join('\n');
  const re = /["']([^"']+\.lua)["']/g; let m;
  while ((m = re.exec(clean))) {
    if (!loadOrder.includes(m[1])) loadOrder.push(m[1]);
  }
}
const ioIndex = {};
loadOrder.forEach((f, i) => { ioIndex[f.toLowerCase()] = i; });

function classOrderIndex(c) {
  const i = ioIndex[String(c.file).toLowerCase()];
  return i === undefined ? 999 : i;
}
const classes = docClasses.slice().sort((a, b) => {
  const d = classOrderIndex(a) - classOrderIndex(b);
  if (d !== 0) return d;
  return a.name.localeCompare(b.name);
});
const classNames = classes.map(c => c.name);

// ---------- CSS ----------
const CSS = [
':root{',
'  --bg:#ffffff; --fg:#1e2430; --muted:#66707d; --line:#e4e8ee; --soft:#f6f8fa;',
'  --accent:#2f6fb3; --accent-soft:#eaf2fb;',
'  --nav-bg:#f7f9fb; --nav-fg:#3d4856; --nav-active:#e6eef8; --nav-hover:#eef2f7; --nav-group:#8a94a2;',
'  --nav-cnt:#98a3b1; --nav-sub:#5b6675; --nav-top:#1e2430; --nav-border:#e5e9ef; --nav-accent:#2f6fb3;',
'  --mono:ui-monospace,SFMono-Regular,"Cascadia Mono",Consolas,"Liberation Mono",monospace;',
'}',
'*{box-sizing:border-box}',
'html{scroll-behavior:smooth}',
'body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}',
'a{color:var(--accent);text-decoration:none}',
'a:hover{text-decoration:underline}',
'code,pre,.mono{font-family:var(--mono);font-size:13px}',
'/* topbar */',
'#topbar{position:fixed;top:0;left:0;right:0;height:54px;display:flex;align-items:center;gap:16px;padding:0 20px;background:#fff;border-bottom:1px solid var(--line);z-index:50}',
'#topbar .brand{font-weight:650;font-size:15px;white-space:nowrap}',
'#topbar .brand span{color:var(--muted);font-weight:400;font-size:12.5px;margin-left:8px}',
'#topbar .grow{flex:1}',
'.searchbox{position:relative;width:min(420px,45vw)}',
'#search{width:100%;height:34px;padding:0 12px 0 32px;border:1px solid var(--line);border-radius:8px;background:var(--soft);font-size:13.5px;outline:none}',
'#search:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px var(--accent-soft)}',
'.searchbox::before{content:"⌕";position:absolute;left:11px;top:6px;color:var(--muted);font-size:15px}',
'#results{position:absolute;top:40px;left:0;right:0;max-height:60vh;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 14px 34px rgba(20,30,50,.16);display:none;z-index:60}',
'#results.on{display:block}',
'#results a{display:block;padding:7px 12px;border-bottom:1px solid #f1f3f6;color:var(--fg)}',
'#results a:hover{background:var(--accent-soft);text-decoration:none}',
'#results .r-kind{display:inline-block;min-width:56px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}',
'#results .r-desc{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'/* layout */',
'#layout{display:flex;padding-top:54px;min-height:100vh}',
'#nav{position:fixed;top:54px;bottom:0;width:272px;background:var(--nav-bg);color:var(--nav-fg);border-right:1px solid var(--nav-border);overflow-y:auto;padding:14px 0 60px;font-size:13.5px}',
'#nav .group{margin:16px 0 6px;padding:0 18px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--nav-group)}',
'#nav a{display:block;padding:4px 18px 4px 18px;color:var(--nav-fg);border-left:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#nav a:hover{background:var(--nav-hover);color:var(--nav-top);text-decoration:none}',
'#nav a.active{background:var(--nav-active);border-left-color:var(--nav-accent);color:var(--nav-top)}',
'#nav a .cnt{float:right;color:var(--nav-cnt);font-size:11px;font-family:var(--mono)}',
'#nav a.sub{padding-left:32px;font-size:12.5px;color:var(--nav-sub)}',
'#nav a.top{font-weight:600;color:var(--nav-top)}',
'#content{margin-left:272px;flex:1;min-width:0;padding:34px 48px 120px;max-width:1180px}',
'/* typography */',
'h1{font-size:26px;line-height:1.3;margin:8px 0 6px;font-weight:680}',
'h1 .modtag{display:inline-block;font-size:11.5px;font-weight:600;color:var(--muted);background:var(--soft);border:1px solid var(--line);border-radius:5px;padding:1px 7px;vertical-align:3px;margin-right:9px;letter-spacing:.03em}',
'h2{font-size:19px;margin:34px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line);font-weight:650}',
'h3{font-size:15px;margin:22px 0 8px;font-weight:640}',
'p{margin:9px 0}',
'section.doc-sec{padding-top:14px;border-top:3px solid var(--soft);margin-top:56px;scroll-margin-top:70px}',
'section.doc-sec:first-of-type{border-top:0;margin-top:0}',
'article.cls{padding:6px 0 18px;scroll-margin-top:70px}',
'.lead{color:#3a4552}',
'.meta{font-size:12.5px;color:var(--muted);margin:2px 0 10px}',
'.meta code{font-size:12px}',
'.chips{margin:10px 0 4px}',
'.chip{display:inline-block;font-size:12px;padding:1px 9px;border-radius:99px;background:var(--soft);border:1px solid var(--line);color:#41505f;margin:0 6px 6px 0}',
'a.chip:hover{background:var(--accent-soft);border-color:#bcd6ef;text-decoration:none}',
'.chip.self{background:var(--accent-soft);border-color:#bcd6ef;color:#215b91}',
'.count{font-size:12px;color:var(--muted);font-weight:400;margin-left:8px}',
'/* tables */',
'table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:13.5px}',
'th{text-align:left;white-space:nowrap;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:7px 10px;border-bottom:1px solid var(--line);background:var(--soft)}',
'td{padding:6px 10px;border-bottom:1px solid #eef1f5;vertical-align:top}',
'tr:hover td{background:#fafcff}',
'td.nm{white-space:nowrap;font-family:var(--mono);font-size:12.5px;font-weight:600}',
'td.nm a{color:#1f4e79}',
'td.ty{white-space:nowrap;color:#6b7684;font-size:12px;font-family:var(--mono)}',
'td.df{font-family:var(--mono);font-size:12px;color:#5c6a78;max-width:280px;overflow:hidden;text-overflow:ellipsis}',
'td.ds{color:#39434f}',
'td.frm{white-space:nowrap;font-size:12px;color:#8a6d3b}',
'td.num{text-align:right;font-family:var(--mono);font-size:12.5px;color:#4a5563}',
'table.compact td,table.compact th{padding:4px 9px}',
'.type{display:inline-block;font-size:11px;padding:0 5px;border-radius:4px;background:#eef3f8;color:#3c5a78;font-family:var(--mono)}',
'span.event{background:#fdf3e3;color:#8a5a12}',
'/* functions */',
'.fn{border-left:3px solid #dfe6ee;padding:2px 0 6px 16px;margin:14px 0;scroll-margin-top:70px}',
'.fn:target{border-left-color:var(--accent);background:linear-gradient(90deg,var(--accent-soft),transparent 65%)}',
'.fn .sig{font-family:var(--mono);font-size:13.5px;font-weight:600;color:#16324f}',
'.fn .sig .p{color:#7a4a1a;font-weight:500}',
'.fn .sig .rt{color:#6b7684;font-weight:400}',
'.fn .fd{color:#39434f;margin:5px 0 0}',
'.fn .params{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0 0;font-size:12.5px;color:#4a5563}',
'.fn .params b{font-family:var(--mono);font-weight:600;color:#7a4a1a}',
'.fn .ret{font-size:12.5px;color:#4a5563;margin-top:4px}',
'.fn .ret b{color:#2f6fb3;font-weight:600}',
'.fn .noD{color:#9aa4b0}',
'/* details */',
'details{margin:10px 0 6px;border:1px solid var(--line);border-radius:9px;background:#fcfdfe}',
'details>summary{cursor:pointer;padding:9px 14px;font-size:13.5px;font-weight:600;color:#3d4a58;list-style:none;user-select:none}',
'details>summary::-webkit-details-marker{display:none}',
'details>summary:before{content:"▸";color:var(--muted);margin-right:8px;display:inline-block;transition:transform .12s}',
'details[open]>summary:before{transform:rotate(90deg)}',
'details[open]>summary{border-bottom:1px solid var(--line);background:var(--soft);border-radius:9px 9px 0 0}',
'details .inner{padding:6px 14px 10px}',
'/* overview blocks */',
'.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:16px 0}',
'.stat{border:1px solid var(--line);border-radius:10px;padding:12px 15px;background:var(--soft)}',
'.stat .v{font-size:23px;font-weight:680;color:#16324f;line-height:1.2}',
'.stat .k{font-size:12px;color:var(--muted);margin-top:2px}',
'ul.tree,ul.tree ul{list-style:none;margin:0;padding-left:18px}',
'ul.tree li{margin:2px 0;position:relative}',
'ul.tree ul li:before{content:"└ ";color:#aab4c0;font-family:var(--mono)}',
'ul.tree>li:before{content:none}',
'.order{columns:2;column-gap:26px;font-size:12.5px;font-family:var(--mono);color:#4a5563}',
'.order div{break-inside:avoid;padding:1px 0}',
'.note{background:#fffaf0;border:1px solid #f0e2c8;border-left:3px solid #d9a441;border-radius:8px;padding:10px 14px;font-size:13.5px;color:#5b4a26;margin:14px 0}',
'ol.tips{margin:6px 0 12px;padding-left:24px;font-size:13.5px;line-height:1.75}',
'ol.tips li{margin:3px 0}',
'pre.code{background:#1f2733;color:#e6edf3;padding:14px 16px;border-radius:9px;overflow:auto;font-size:12.5px;line-height:1.55}',
'pre.code .c{color:#7d8fa0}',
'pre.code .s{color:#a5d6a7}',
'pre.code .k{color:#7fb3e8}',
'.sk-info td.nm{font-family:var(--mono)}',
'.tag{display:inline-block;font-size:11px;padding:0 7px;border-radius:99px;background:#eef3f8;color:#3c5a78;margin-right:6px}',
'#backtop{position:fixed;right:22px;bottom:22px;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--muted);font-size:16px;cursor:pointer;display:none;box-shadow:0 4px 14px rgba(20,30,50,.12)}',
'#backtop.on{display:block}',
'[id]{scroll-margin-top:78px}',
'mark{background:#fff1a8;color:inherit;padding:0 1px;border-radius:2px}',
'#results a.sel,#results a.sel:hover{background:var(--accent-soft)}',
'#results .r-nm{font-weight:650;color:#16324f;font-family:var(--mono);font-size:12.5px}',
'#results .r-where{color:#9aa4b0;font-size:11.5px;margin-left:8px}',
'#results .r-more{padding:8px 12px;font-size:12px;color:var(--muted);background:var(--soft)}',
'#results .r-foot{position:sticky;bottom:0;padding:7px 12px;font-size:11.5px;color:var(--muted);background:#fff;border-top:1px solid var(--line)}',
'#results .r-empty{padding:10px 12px;color:var(--muted)}',
'.flash{animation:flashbg 1.5s ease-out 1}',
'@keyframes flashbg{0%{background:#fff6cf}100%{background:transparent}}',
'.sigwrap{position:relative}',
'.sigwrap button.copy{position:absolute;right:0;top:2px;font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--muted);cursor:pointer;opacity:0;transition:opacity .12s}',
'.fn:hover .sigwrap button.copy,.sigwrap button.copy:focus{opacity:1}',
'.sigwrap button.copy:hover{color:var(--accent);border-color:#bcd6ef;background:var(--accent-soft)}',
'.crumb{font-size:12px;color:var(--muted);margin:2px 0 8px}',
'.crumb code{color:#41505f}',
'#topbar a.lang{font-size:12.5px;color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:3px 10px;white-space:nowrap}',
'#topbar a.lang:hover{color:var(--accent);border-color:#bcd6ef;background:var(--accent-soft);text-decoration:none}',
'@media (max-width:1000px){#nav{display:none}#content{margin-left:0;padding:24px 20px 100px}}',
'@media print{#nav,#topbar,#backtop{display:none}#content{margin:0;max-width:none}details{break-inside:avoid}details>summary{list-style:none}details>summary:before{content:""}}',
'.codewrap{margin:16px 0 18px}',
'.codehead{display:flex;align-items:center;gap:10px;background:#eef3f8;border:1px solid #dbe4ee;border-bottom:0;border-radius:9px 9px 0 0;padding:6px 12px;font-family:var(--mono);font-size:12px;color:#4a5b6c}',
'.codehead .fname{font-weight:650;color:#2b4257}',
'.codehead .hint{color:#8b98a6;font-family:inherit}',
'.codewrap pre.code{margin:0;border-radius:0 0 9px 9px}',
'.warn{background:#fff4f3;border:1px solid #f1cfcb;border-left:3px solid #cf5b50;border-radius:8px;padding:10px 14px;font-size:13.5px;color:#5e3a35;margin:14px 0}',
'.ok{background:#f2fbf4;border:1px solid #cfe9d6;border-left:3px solid #4a9e63;border-radius:8px;padding:10px 14px;font-size:13.5px;color:#2f4a37;margin:14px 0}',
'.guide h2{margin-top:30px}',
'.guide h3{margin:20px 0 8px;font-size:15px;color:#1d3448}',
'.guide code{background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12.5px}',
'.guide table.compact code{background:transparent;padding:0}',
'.guide ul,.guide ol{font-size:13.5px;line-height:1.8}',
'.guide p{font-size:13.5px;line-height:1.8}',
'.guide details.faq{border:1px solid var(--line);border-radius:9px;margin:8px 0;background:#fff}',
'.guide details.faq>summary{cursor:pointer;padding:9px 14px;font-weight:600;font-size:13.5px;color:#1d3448}',
'.guide details.faq[open]>summary{border-bottom:1px solid var(--line);background:var(--soft);border-radius:9px 9px 0 0}',
'.guide details.faq .faqbody{padding:12px 15px;font-size:13.5px;line-height:1.8}',
'.guide .grid2 .card{border:1px solid var(--line);border-radius:10px;padding:12px 15px;background:#fff}',
'.guide .card h4{margin:0 0 6px;font-size:13.5px;color:#16324f}',
'.guide .card p{margin:0;font-size:12.8px;color:#4c5a68}',
'.guide .step{counter-reset:none;font-weight:650;color:#16324f}',
'.guide .badge{display:inline-block;font-size:11px;padding:1px 8px;border-radius:99px;background:#e8f1fb;color:#2c5b86;margin-right:6px;font-family:var(--mono)}',
// universal-key block on every class page
'.ukbox{border:1px solid #cfe0f2;border-left:3px solid #3b7dd8;border-radius:9px;background:#f7fbff;padding:2px 16px 8px;margin:18px 0 20px}',
'.ukbox>h2{margin:12px 0 4px;font-size:16px;border:0;padding:0}',
'.ukbox>h2 .count{margin-left:8px}',
'.ukbox p{font-size:13px;line-height:1.7;margin:6px 0}',
'.ukbox table.compact{margin:8px 0 4px;background:#fff}',
'.ukbox details{margin:8px 0}',
'.ukbox details>summary{cursor:pointer;font-size:13px;font-weight:600;color:#23486f;padding:5px 0}',
'.ukbox .ukgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin:8px 0 10px}',
'.ukbox .ukgrid code{display:block;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:12.5px;color:#1f537f}',
'.ukbox .uklink{font-size:12.5px;margin-top:4px}'
].join('\n');

// extra rules for the quick-reference / props-methods / universal-key-link blocks
const EXTRA_CSS = [
'.ukline{margin:10px 0 2px;padding:8px 12px;border-left:3px solid #bcd6ef;background:#f4f9ff;border-radius:0 6px 6px 0;font-size:12.5px;color:#3a4552}',
'.ukline b{color:#1f537f}',
'.uses{margin-top:6px;font-size:12px;color:var(--muted);line-height:1.9}',
'.uses .lb{color:#8a94a1;margin-right:4px}',
'.rwchip{display:inline-block;font-family:var(--mono);font-size:11.5px;padding:0 6px;margin:0 4px 4px 0;border-radius:5px;border:1px solid var(--line);background:#f7f9fc;color:#41505f}',
'.rwchip.r{background:#eaf2fb;border-color:#c8dcf0}',
'.rwchip.w{background:#fff1e2;border-color:#f0d5b4}',
'.rwchip.rw{background:#f1ecfb;border-color:#d7caf0}',
'.rwchip.i{background:#f4f5f7;color:#9aa4b0;border-color:#e8ebef}',
'a.rwchip:hover{background:var(--accent-soft);text-decoration:none}',
'table.mx td.num{text-align:right;font-family:var(--mono);font-size:12.5px;color:#41505f}',
'table.mx td.num b{color:var(--fg)}',
'.qcard{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:12px 0 18px}',
'.qcard a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--fg)}',
'.qcard a:hover{border-color:#bcd6ef;background:#f7fbff;text-decoration:none}',
'.qcard b{display:block;font-size:14px;margin-bottom:3px;color:#1f537f}',
'.qcard span{font-size:12.5px;color:var(--muted)}',
'details.mxcls{margin:8px 0;border:1px solid var(--line);border-radius:8px}',
'details.mxcls>summary{cursor:pointer;padding:8px 12px;font-weight:600;font-size:13.5px;background:var(--soft);border-radius:8px}',
'details.mxcls>summary .count{margin-left:6px}',
'details.mxcls>div{padding:2px 12px 8px}',
'.legend{font-size:12.5px;color:var(--muted);margin:4px 0 14px}',
  // small "?" help link next to the read/write chips
  '.useshelp{display:inline-block;width:15px;height:15px;line-height:13px;text-align:center;border-radius:50%;border:1px solid var(--line);color:var(--muted);font-size:11px;text-decoration:none;vertical-align:1px}',
  '.useshelp:hover{border-color:#bcd6ef;background:var(--accent-soft);color:var(--accent);text-decoration:none}',
  // code blocks: never paint the inner <code> (fixes light bars inside dark pre)
  'pre code,pre.code code,.guide pre code{background:transparent;padding:0;border:0;border-radius:0;color:inherit;font-size:inherit;line-height:inherit}',
  // light / dark switch button in the topbar
  '#themebtn{font:inherit;font-size:13px;line-height:1;padding:6px 10px;border:1px solid var(--line);border-radius:7px;background:var(--soft);color:var(--muted);cursor:pointer;white-space:nowrap}',
  '#themebtn:hover{color:var(--accent);border-color:#bcd6ef;background:var(--accent-soft)}',
  // GitHub repo icon (shown only when config/site.json has repoUrl)
  '#topbar a.repolink{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 auto;border:1px solid var(--line);border-radius:50%;background:var(--soft);color:var(--muted)}',
  '#topbar a.repolink:hover{color:var(--accent);border-color:#bcd6ef;background:var(--accent-soft)}',
  '#topbar a.repolink svg{width:18px;height:18px;display:block}'
].join('\n');

// ---------- dark theme ----------
const DARK_CSS = [
  "/* ===== dark theme ===== */",
  "[data-theme=\"dark\"]{color-scheme:dark;--bg:#0e131a;--fg:#d7e0ea;--muted:#8fa0b3;--line:#26313d;--soft:#151c25;--accent:#6db3ff;--accent-soft:#12304c;--nav-bg:#0a0e14;--nav-fg:#9dafc2;--nav-active:#1a2532;--nav-hover:#141d27;--nav-group:#728294;--nav-cnt:#68788a;--nav-sub:#9dafc2;--nav-top:#e2e9f1;--nav-border:#1b2430;--nav-accent:#4d90d9}",
  "[data-theme=\"dark\"] #topbar{background:#0c1117}",
  "[data-theme=\"dark\"] #search{background:#121a23;color:var(--fg);border-color:#26313d}",
  "[data-theme=\"dark\"] #search:focus{background:#16202b;box-shadow:0 0 0 3px #12304c}",
  "[data-theme=\"dark\"] #themebtn{border-color:#2b3743;background:#141d27;color:#9dafc2}",
  "[data-theme=\"dark\"] #topbar a.repolink{border-color:#2b3743;background:#141d27;color:#9dafc2}",
  "[data-theme=\"dark\"] #topbar a.repolink:hover{color:var(--accent);border-color:#3d6d99}",
  "[data-theme=\"dark\"] #results{background:#121a23;border-color:#26313d;box-shadow:0 14px 34px rgba(0,0,0,.6)}",
  "[data-theme=\"dark\"] #results a{border-bottom-color:#1c2632}",
  "[data-theme=\"dark\"] #results .r-nm{color:#bcd8f5}",
  "[data-theme=\"dark\"] #results .r-foot{background:#121a23}",
  "[data-theme=\"dark\"] #results .r-more{background:#161d26}",
  "[data-theme=\"dark\"] .searchbox::before{color:#7c8c9e}",
  "[data-theme=\"dark\"] #nav .group{color:#728294}",
  "[data-theme=\"dark\"] #nav a:hover{background:#141d27;color:#fff}",
  "[data-theme=\"dark\"] #nav a .cnt{color:#68788a}",
  "[data-theme=\"dark\"] #nav a.sub{color:#9dafc2}",
  "[data-theme=\"dark\"] #nav a.top{color:#e2e9f1}",
  "[data-theme=\"dark\"] .lead{color:#b9c6d4}",
  "[data-theme=\"dark\"] .modtag{background:#151c25;border-color:#26313d;color:#8fa0b3}",
  "[data-theme=\"dark\"] .fn{border-left-color:#2c3947}",
  "[data-theme=\"dark\"] .fn:target{background:linear-gradient(90deg,#12304c,transparent 65%)}",
  "[data-theme=\"dark\"] .fn .sig{color:#9cc6f0}",
  "[data-theme=\"dark\"] .fn .sig .p{color:#e3b57a}",
  "[data-theme=\"dark\"] .fn .sig .rt{color:#8fa0b3}",
  "[data-theme=\"dark\"] .fn .fd{color:#c2cedb}",
  "[data-theme=\"dark\"] .fn .params,[data-theme=\"dark\"] .fn .ret{color:#aab8c8}",
  "[data-theme=\"dark\"] .fn .params b{color:#e3b57a}",
  "[data-theme=\"dark\"] .fn .ret b{color:#82bcf5}",
  "[data-theme=\"dark\"] .fn .noD{color:#71818f}",
  "[data-theme=\"dark\"] td{border-bottom-color:#1e2833}",
  "[data-theme=\"dark\"] tr:hover td{background:#141b24}",
  "[data-theme=\"dark\"] td.nm a{color:#9cc6f0}",
  "[data-theme=\"dark\"] td.ty{color:#93a3b4}",
  "[data-theme=\"dark\"] td.df{color:#a7b6c6}",
  "[data-theme=\"dark\"] td.ds{color:#c2cedb}",
  "[data-theme=\"dark\"] td.frm{color:#d8b483}",
  "[data-theme=\"dark\"] td.num{color:#aab8c8}",
  "[data-theme=\"dark\"] .chip{background:#17202a;border-color:#2b3743;color:#bcc9d7}",
  "[data-theme=\"dark\"] a.chip:hover{border-color:#2f5b86;background:#12304c}",
  "[data-theme=\"dark\"] .chip.self{background:#12304c;border-color:#2f5b86;color:#a8d0f7}",
  "[data-theme=\"dark\"] .type{background:#18222d;color:#a9c6e4}",
  "[data-theme=\"dark\"] span.event{background:#3a2c14;color:#e8c07c}",
  "[data-theme=\"dark\"] .tag{background:#18222d;color:#a9c6e4}",
  "[data-theme=\"dark\"] details{background:#111821}",
  "[data-theme=\"dark\"] details>summary{color:#c6d3e1}",
  "[data-theme=\"dark\"] details[open]>summary{background:#161d26}",
  "[data-theme=\"dark\"] .stat .v{color:#bcd8f5}",
  "[data-theme=\"dark\"] .order{color:#a6b5c6}",
  "[data-theme=\"dark\"] ul.tree ul li:before{color:#5d6c7d}",
  "[data-theme=\"dark\"] .note{background:#241d10;border-color:#4a3a19;border-left-color:#c99a3d;color:#e0c58f}",
  "[data-theme=\"dark\"] .warn{background:#2a1512;border-color:#4f2621;border-left-color:#d3675a;color:#eab6ae}",
  "[data-theme=\"dark\"] .ok{background:#0f2417;border-color:#1d4230;border-left-color:#4fa96a;color:#a9dcb9}",
  "[data-theme=\"dark\"] .codehead{background:#131b24;border-color:#26313d;color:#9fb0c2}",
  "[data-theme=\"dark\"] .codehead .fname{color:#bcd8f5}",
  "[data-theme=\"dark\"] .codehead .hint{color:#7f90a2}",
  "[data-theme=\"dark\"] pre.code{background:#0b1016;color:#dbe5ee}",
  "[data-theme=\"dark\"] #backtop{background:#141d27}",
  "[data-theme=\"dark\"] mark{background:#5a4a12;color:#f3e6bd}",
  "[data-theme=\"dark\"] .sigwrap button.copy{background:#131b24;border-color:#2b3743}",
  "[data-theme=\"dark\"] .guide code{background:#18222d;color:#c9d6e3}",
  "[data-theme=\"dark\"] .guide h3{color:#bcd8f5}",
  "[data-theme=\"dark\"] .guide details.faq{background:#111821}",
  "[data-theme=\"dark\"] .guide details.faq>summary{color:#c6d3e1}",
  "[data-theme=\"dark\"] .guide .card{border-color:#26313d;background:#111821}",
  "[data-theme=\"dark\"] .guide .card h4{color:#bcd8f5}",
  "[data-theme=\"dark\"] .guide .card p{color:#aab8c8}",
  "[data-theme=\"dark\"] .guide .badge{background:#12304c;color:#a8d0f7}",
  "[data-theme=\"dark\"] .guide .step{color:#bcd8f5}",
  "[data-theme=\"dark\"] .ukbox{background:#101a24;border-color:#1e3b58;border-left-color:#3b7dd8}",
  "[data-theme=\"dark\"] .ukbox table.compact{background:#0e141c}",
  "[data-theme=\"dark\"] .ukbox details>summary{color:#a8c8e8}",
  "[data-theme=\"dark\"] .ukbox .ukgrid code{background:#141d27;color:#9ecdf7}",
  "[data-theme=\"dark\"] .ukline{background:#101a24;border-left-color:#2f5b86;color:#bcc9d7}",
  "[data-theme=\"dark\"] .ukline b{color:#a8d0f7}",
  "[data-theme=\"dark\"] .rwchip{background:#161d26;color:#bcc9d7;border-color:#2b3743}",
  "[data-theme=\"dark\"] .rwchip.r{background:#12304c;border-color:#2f5b86}",
  "[data-theme=\"dark\"] .rwchip.w{background:#3a2c14;border-color:#5a4620}",
  "[data-theme=\"dark\"] .rwchip.rw{background:#25183e;border-color:#3d2a5e}",
  "[data-theme=\"dark\"] .rwchip.i{background:#171b20;color:#7f8e9d;border-color:#242c36}",
  "[data-theme=\"dark\"] table.mx td.num{color:#aab8c8}",
  "[data-theme=\"dark\"] .qcard a{background:#111821;border-color:#26313d}",
  "[data-theme=\"dark\"] .qcard a:hover{border-color:#2f5b86;background:#101a24}",
  "[data-theme=\"dark\"] .qcard b{color:#a8d0f7}",
  "[data-theme=\"dark\"] .legend{color:#8fa0b3}",
  "[data-theme=\"dark\"] .crumb code{color:#bcc9d7}",
  "[data-theme=\"dark\"] h1 .modtag{color:#8fa0b3}",
].join('\n');

// ---------- anchors ----------
function clsAnchor(n) { return 'cls-' + slug(n); }
function fnAnchor(cls, f) { return 'fn-' + slug(cls) + '-' + slug(f.name); }
function propAnchor(cls, p) { return 'prop-' + slug(cls) + '-' + slug(p.name); }
function modAnchor(file) { return 'mod-' + slug(file).replace(/\./g, '_'); }
function skinAnchor(n) { return 'skin-' + slug(n); }

const INDEX = []; // search index
const KIND_RANK = { '\u7c7b': 0, '\u5c5e\u6027': 1, '\u51fd\u6570': 2, '\u6a21\u5757': 3, '\u76ae\u80a4': 4, '\u76ae\u80a4\u5b57\u6bb5': 5 };
KIND_RANK['\u6559\u7a0b'] = -1;   // 教程页排最前
KIND_RANK['Guide'] = -1;
KIND_RANK['\u901f\u67e5'] = -0.5;  // 速查（类索引 / 属性 × 方法）
KIND_RANK['Quick ref'] = -0.5;
function idx(kind, name, where, anchor, d) {
  INDEX.push({
    k: kind, r: KIND_RANK[kind] == null ? 9 : KIND_RANK[kind],
    n: name, w: where, a: anchor, d: String(d || '').replace(/\s+/g, ' ').slice(0, 160)
  });
}
function brief(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const lim = n || 90;
  if (t.length <= lim) return t;
  const cut = t.slice(0, lim);
  const p = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'), cut.lastIndexOf('.'));
  return (p > lim * 0.4 ? cut.slice(0, p) : cut) + '…';
}
function placeholder() { return '<span class="noD">' + TXT.noDesc + '</span>'; }

// ---------- tutorial pages ----------
const PAGES_DIR = path.join(cwd, '_docbuild', 'pages');
const SNIP_DIR = path.join(PAGES_DIR, LANG === 'en' ? 'snippets_en' : 'snippets');
const WIDGETS_DIR = path.dirname(cwd);
// ---------- content pipeline: markdown pages, listed in config/pages.json ----------
// Pages are NOT auto-discovered: _docbuild/config/pages.json lists the page file
// names in sidebar order. Add a line to add a page, remove a line to drop one.
// Each page is a pair of files: content/<kind>/<name>.zh.md and <name>.en.md.
const MD = require('./md.cjs');
const CONTENT_DIR = path.join(cwd, '_docbuild', 'content');
const CONFIG_DIR = path.join(cwd, '_docbuild', 'config');
function readJsonCfg(p, dflt) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return dflt; }
}
const SITE = readJsonCfg(path.join(CONFIG_DIR, 'site.json'), {});
const STATS_CFG = readJsonCfg(path.join(CONFIG_DIR, 'stats.json'), null);
const PAGES_CFG = readJsonCfg(path.join(CONFIG_DIR, 'pages.json'), { docs: [], guides: [] });
// site.json -> "defaultTheme": "dark" applies when the visitor has not picked a theme yet
const DEFAULT_THEME = (SITE && String(SITE.defaultTheme).toLowerCase() === 'dark') ? 'dark' : 'light';
// site.json -> "repoUrl" adds a round GitHub button in the topbar; leave it empty to hide the button
const REPO_URL = (SITE && typeof SITE.repoUrl === 'string') ? SITE.repoUrl.trim() : '';
function repoLink() {
  if (!REPO_URL) return '';
  return '<a class="repolink" href="' + esc(REPO_URL) + '" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>';
}
// site.json -> "outputDir": "docs" writes the generated pages into <repo>/docs instead of the root
if (SITE && SITE.outputDir) {
  const dir = path.resolve(cwd, String(SITE.outputDir));
  if (dir !== cwd) { OUT = path.join(dir, OUT_NAME); try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {} }
}
function readPage(kind, base, lang) {
  const f = path.join(CONTENT_DIR, kind, base + '.' + lang + '.md');
  if (!fs.existsSync(f)) return null;
  const src = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const fm = MD.parseFrontMatter(src);
  const where = 'content/' + kind + '/' + base + '.' + lang + '.md';
  for (const k of ['title', 'short']) if (!fm.meta[k]) console.warn('!! ' + where + ': front matter is missing "' + k + '"');
  if (!/^#\s+/m.test(fm.body)) console.warn('!! ' + where + ': no "# heading" (h1) found');
  const embeds = (fm.body.match(/\[\[([a-zA-Z0-9_\-]+)\]\]/g) || []).map(s => s.slice(2, -2));
  for (const e of embeds) if (!['stats', 'loadorder', 'tagline'].includes(e)) {
    console.warn('!! ' + where + ': unknown embed [[' + e + ']]');
  }
  const ids = (fm.body.match(/\{#([A-Za-z0-9_\-]+)\}/g) || []).map(s => s.slice(2, -1));
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupIds.length) console.warn('!! ' + where + ': duplicate heading ids: ' + Array.from(new Set(dupIds)).join(', '));
  return {
    kind, base, lang,
    id: String(fm.meta.id || base),
    title: String(fm.meta.title || base),
    short: String(fm.meta.short || fm.meta.title || base),
    desc: String(fm.meta.desc || ''),
    file: f,
    body: fm.body,
    meta: fm.meta,
  };
}
// sidebar order == order in config/pages.json
function loadKind(kind) {
  const list = (PAGES_CFG && Array.isArray(PAGES_CFG[kind])) ? PAGES_CFG[kind] : [];
  const otherLang = LANG === 'en' ? 'zh' : 'en';
  const out = [];
  for (const raw of list) {
    const base = String(raw || '').trim();
    if (!base) continue;
    const page = readPage(kind, base, LANG);
    if (!page) {
      const alt = readPage(kind, base, otherLang);
      if (alt) { console.warn('!! content/' + kind + '/' + base + ': missing ' + LANG + ' version, using ' + otherLang); out.push(alt); }
      else console.warn('!! config/pages.json: ' + kind + ' page "' + base + '" has no .md file (expected content/' + kind + '/' + base + '.zh.md / .en.md)');
      continue;
    }
    out.push(page);
  }
  return out;
}
const DOC_PAGES = loadKind('docs');
const GUIDE_PAGES = loadKind('guides');
const PAGES = GUIDE_PAGES.map(p => ({
  id: p.id, zh: p.title, en: p.title,
  shortZh: p.short, shortEn: p.short,
  descZh: p.desc, descEn: p.desc,
  md: p,
}));
console.log('  content    : ' + DOC_PAGES.length + ' docs + ' + GUIDE_PAGES.length + ' guides (config/pages.json)');
if (SITE) {
  if (SITE.titleZh && SITE.titleEn) TXT.pageTitle = LANG === 'en' ? SITE.titleEn : SITE.titleZh;
  const brand = LANG === 'en'
    ? (SITE.brandEn || SITE.brandZh || SITE.brand)
    : (SITE.brandZh || SITE.brand);
  if (brand) TXT.brand = brand;
  if (SITE.taglineZh && SITE.taglineEn) TXT.brandSub = (n, lines) => (LANG === 'en' ? SITE.taglineEn : SITE.taglineZh)
    .replace('{classes}', n).replace('{lines}', nf(lines)).replace('{dir}', 'chili_old');
}
const LUA_KW = new Set(['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'goto',
  'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while']);

// minimal Lua syntax highlighter: comments / strings / keywords
function hlLua(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '-' && src[i + 1] === '-') {
      const lng = /^--\[(=*)\[/.exec(src.slice(i, i + 12));
      if (lng) {
        const close = ']' + lng[1] + ']';
        const j = src.indexOf(close, i + lng[0].length);
        const end = j < 0 ? n : j + close.length;
        out.push('<span class="c">' + esc(src.slice(i, end)) + '</span>');
        i = end; continue;
      }
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      out.push('<span class="c">' + esc(src.slice(i, j)) + '</span>');
      i = j; continue;
    }
    if (c === '[') {
      const lng = /^\[(=*)\[/.exec(src.slice(i, i + 12));
      if (lng) {
        const close = ']' + lng[1] + ']';
        const j = src.indexOf(close, i + lng[0].length);
        const end = j < 0 ? n : j + close.length;
        out.push('<span class="s">' + esc(src.slice(i, end)) + '</span>');
        i = end; continue;
      }
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        if (src[j] === '\n') break;
        j++;
      }
      out.push('<span class="s">' + esc(src.slice(i, j)) + '</span>');
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j);
      out.push(LUA_KW.has(w) ? '<span class="k">' + w + '</span>' : esc(w));
      i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9a-fA-FxX.]/.test(src[j])) j++;
      out.push(esc(src.slice(i, j)));
      i = j; continue;
    }
    out.push(esc(c));
    i++;
  }
  return out.join('');
}

function codeBlock(file, hint) {
  const cands = [path.join(WIDGETS_DIR, file), path.join(SNIP_DIR, file), path.join(PAGES_DIR, file)];
  let p = null;
  for (const c of cands) if (fs.existsSync(c)) { p = c; break; }
  if (!p) {
    console.error('!! 缺少代码文件 ' + file + '（查找: ' + cands.join(' , ') + '）');
    return '<p class="warn">（缺少代码文件 <code>' + esc(file) + '</code>）</p>';
  }
  const src = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '');
  let head = '<div class="codehead"><span class="fname">' + esc(file) + '</span>';
  if (hint) head += '<span class="hint">' + esc(hint) + '</span>';
  head += '</div>';
  return '<div class="codewrap">' + head + '<pre class="code">' + hlLua(src) + '</pre></div>';
}

function expandCodes(html) {
  return html.replace(/\{\{CODE:([^}|]+?)(?:\|([^}]*))?\}\}/g, function (m, f, hint) {
    return codeBlock(String(f).trim(), hint ? String(hint).trim() : '');
  });
}

// ---------- markdown rendering ----------
function mdOpts(page) {
  return {
    hl: (lang, code) => (!lang || lang === 'lua') ? hlLua(code) : esc(code),
    codeWrap: (title, hint, body) =>
      '<div class="codewrap"><div class="codehead"><span class="fname">' + esc(title || '') + '</span>'
      + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div><pre class="code">' + body + '</pre></div>',
    codeBlock,
    embed: (name, arg) => embedHtml(name, arg, page),
  };
}
function renderMdBody(page) { return expandCodes(MD.renderMd(page.body, mdOpts(page))); }
function renderMdPage(page) {
  return '<section class="doc-sec' + (page.kind === 'guides' ? ' guide' : '') + '" id="' + esc(page.id) + '">'
    + renderMdBody(page) + '</section>';
}

// ---------- stats: numbers are edited by hand in config/stats.json ----------
function computeStats() {
  const moduleFnCount = Object.keys(raw.moduleFuncs).reduce((s, k) => s + raw.moduleFuncs[k].length, 0);
  return {
    files: raw.files.length,
    lines: totalLines,
    classes: docClasses.length,
    props: docClasses.reduce((s, c) => s + c.props.length, 0),
    methods: docClasses.reduce((s, c) => s + c.funcs.length, 0),
    moduleFuncs: moduleFnCount,
    skins: skins.length,
  };
}
const ACTUAL = computeStats();
const STAT_LABELS = {
  files:       ['源码文件 (.lua)', 'source files (.lua)'],
  lines:       ['代码行数', 'lines of code'],
  classes:     ['控件类', 'classes'],
  props:       ['本类声明属性', 'declared properties'],
  methods:     ['本类声明方法', 'declared methods'],
  moduleFuncs: ['模块 / 全局函数', 'module / global functions'],
  skins:       ['皮肤包', 'skins'],
};
function statValues() {
  const v = (STATS_CFG && STATS_CFG.values) || {};
  const out = {};
  for (const k of Object.keys(STAT_LABELS)) out[k] = (v[k] != null && !isNaN(Number(v[k]))) ? Number(v[k]) : ACTUAL[k];
  return out;
}
function statCardsHtml() {
  const v = statValues();
  let h = '<div class="grid2">';
  for (const k of Object.keys(STAT_LABELS)) {
    h += '<div class="stat"><div class="v">' + esc(nf(v[k])) + '</div><div class="k">' + esc(STAT_LABELS[k][LANG === 'en' ? 1 : 0]) + '</div></div>';
  }
  h += '</div>';
  return h;
}
// ---------- [[embed]] tokens usable inside markdown ----------
function embedHtml(name, arg, page) {
  const n = String(name || '').trim().toLowerCase();
  if (n === 'stats' || n === '统计' || n === 'statistics') return statCardsHtml();
  if (n === 'loadorder' || n === 'load-order' || n === '加载顺序') {
    let h = '<div class="order">';
    loadOrder.forEach((f, i) => { h += '<div>' + String(i + 1).padStart(2, '0') + '  ' + esc(f) + '</div>'; });
    return h + '</div>';
  }
  if (n === 'tagline' || n === 'sitetagline') return esc(LANG === 'en' ? (SITE.taglineEn || '') : (SITE.taglineZh || ''));
  console.error('!! unknown embed [[' + name + ']]' + (page ? ' in ' + page.base : ''));
  return '<p class="warn">unknown embed <code>[[' + esc(name) + ']]</code></p>';
}

function renderDocs() { return DOC_PAGES.map(renderMdPage).join(''); }

function renderPages() { return PAGES.map(p => renderMdPage(p.md)).join(''); }

function argsNames(args) {
  const a = String(args || '').trim();
  if (!a || a === '...') return [];
  const out = [];
  let depth = 0, cur = '';
  for (const ch of a) {
    if (ch === '{' || ch === '(') depth++;
    if (ch === '}' || ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(s => s.trim().split('=')[0].trim()).filter(Boolean);
}

function sigHtml(owner, f) {
  const sep = f.kind === 'method' ? ':' : '.';
  let args = String(f.args || '').trim();
  let inner = esc(args);
  const names = argsNames(args);
  for (const nm of names) {
    const safe = nm.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp('(^|[,\\s(])(' + safe + ')($|[,\\s)=])'), function (m, a, b, c) {
      return a + '<span class="p">' + b + '</span>' + c;
    });
  }
  if (args === '...') inner = '...';
  return '<span class="sig">' + esc(owner) + sep + esc(f.name) + '(' + inner + ')</span>';
}

// ---------- overview ----------
function renderOverview() {
  const moduleFnCount = Object.keys(raw.moduleFuncs).reduce((s, k) => s + raw.moduleFuncs[k].length, 0);
  const ownProps = docClasses.reduce((s, c) => s + c.props.length, 0);
  const classFnCount = docClasses.reduce((s, c) => s + c.funcs.length, 0);
  let h = '';
  h += '<h1 id="overview-top"><span class="modtag">' + esc(TXT.overview) + '</span>' + esc(TXT.docH1) + '</h1>';
  h += '<p class="lead">本页由 <code>chili_old</code> 目录下的全部 Lua 源码自动解析生成，逐一列出每个类的<b>可用属性</b>与<b>可用函数</b>'
    + '（含从父类继承来的成员），并附源码文件清单、加载顺序与皮肤（skin）配置速查，结构参照 ldoc 风格的 '
    + '<a href="https://gajop.github.io/chiliui/modules/controls.control.html" target="_blank" rel="noopener">Chili UI gajop API 页</a>。</p>';
  if (LANG === 'en') {
    h += '<p class="ok"><b>New to Chili?</b> Read <a href="#guide-start"><b>Getting started</b></a> first: it walks you from a working install to your first window, '
      + 'then continue with <a href="#guide-examples">the examples</a>, <a href="#guide-functions">key functions</a> and <a href="#guide-faq">FAQ / pitfalls</a>. '
      + 'Every demo widget lives in <code>LuaUI/Widgets/chili_demo_*.lua</code>.</p>';
  } else {
    h += '<p class="ok"><b>第一次用 Chili？</b>先看 <a href="#guide-start"><b>新手起步</b></a>：从装好框架到写出第一个窗口的完整流程、'
      + '怎么确定该用哪个类、怎么在这份文档里查属性和函数；接着是 <a href="#guide-examples">示例逐一讲解</a>、'
      + '<a href="#guide-functions">重要函数与常用模式</a>、<a href="#guide-faq">常见问题与避坑</a>。'
      + '所有示例 widget 都在 <code>LuaUI/Widgets/chili_demo_*.lua</code>。</p>';
  }

  h += '<div class="grid2">';
  const stats = [
    ['源码文件 (.lua)', nf(raw.files.length)],
    ['代码行数', nf(totalLines)],
    ['控件类', nf(docClasses.length)],
    ['本类声明属性', nf(ownProps)],
    ['本类声明方法', nf(classFnCount)],
    ['模块 / 全局函数', nf(moduleFnCount)],
    ['皮肤包', nf(skins.length)],
  ];
  for (const s of stats) h += '<div class="stat"><div class="v">' + esc(s[1]) + '</div><div class="k">' + esc(s[0]) + '</div></div>';
  h += '</div>';

  h += '<h2 id="howto">怎么读这份文档</h2>';
  h += '<table class="compact"><thead><tr><th>区块</th><th>内容</th></tr></thead><tbody>';
  h += '<tr><td class="nm">属性表</td><td class="ds">本类自己声明的字段：<b>属性名 / 类型 / 默认值 / 说明</b>。构造对象时把这些名字直接写进 <code>Class:New{ ... }</code> 的表里。</td></tr>';
  h += '<tr><td class="nm">继承属性</td><td class="ds">本类没有重新声明、但通过父类继承可用的字段，折叠显示，标注来源类。</td></tr>';
  h += '<tr><td class="nm"><b>' + pk('通用键', 'Universal keys') + '</b></td><td class="ds">' + pk(
    '<b>不属于任何类、但所有控件都能写</b>的键：结构键 <code>parent / children / name / classname / clientWidth / clientHeight</code>，'
    + '几何键 <code>x / y / width / height / right / bottom</code>（<a href="#cls-Control">Control</a> 起）。'
    + '<b>完整表格只放在 <a href="#cls-Object">Object</a>（结构键）和 <a href="#cls-Control">Control</a>（结构键 + 几何键）这两个类页面上</b>，'
    + '其余 26 个类页面只留一行指向它们的提示 —— 这些键对每个控件完全一样，重复 28 遍只会让页面变长。完整规则见 <a href="#guide-newkeys">New 里能写什么</a>。',
    '<b>Declared by no class yet accepted by every control</b>: structure keys <code>parent / children / name / classname / clientWidth / clientHeight</code>, '
    + 'geometry keys <code>x / y / width / height / right / bottom</code> (from <a href="#cls-Control">Control</a> down). '
    + '<b>The full tables live on <a href="#cls-Object">Object</a> (structure keys) and <a href="#cls-Control">Control</a> (structure + geometry keys) only</b>; '
    + 'the other 26 class pages just carry a one-line pointer &mdash; the keys are identical for every control, so repeating them 28 times would only make the page longer. '
    + 'Full rules: <a href="#guide-newkeys">What you can pass to New</a>.') + '</td></tr>';
  h += '<tr><td class="nm"><b>' + pk('类索引速查', 'Class index') + '</b></td><td class="ds">' + pk(
    '28 个类摊在一张表里横向对照：父类、本类 / 可用属性数、本类 / 可用方法数、皮肤块数、一句话职责 —— 用来先决定「该用哪个类」，再点进详情。见 <a href="#class-index">类索引</a>。',
    'All 28 classes side by side: parent, own / total properties, own / total methods, skin blocks and a one-line purpose &mdash; use it to pick the class you need, then open the details. See <a href="#class-index">the class index</a>.') + '</td></tr>';
  h += '<tr><td class="nm"><b>' + pk('属性 × 方法', 'Properties x methods') + '</b></td><td class="ds">' + pk(
    '回答两个常被问到的问题：<b>属性是不是只对某些方法有效</b>（不是，所有属性在任何实例上都能读写），以及<b>某个方法读写哪些字段</b>（每个类的「方法 → 字段」表，由源码静态扫描得出）。见 <a href="#props-methods">属性 × 方法</a>。',
    'Answers the two questions people ask most: <b>is a property only valid for some methods</b> (no &mdash; every property is readable and writable on any instance), and <b>which fields does a method read or write</b> (a per-class method -> fields table produced by static scanning). See <a href="#props-methods">Properties x methods</a>.') + '</td></tr>';
  h += '<tr><td class="nm"><b>' + pk('方法读写字段', 'Method fields') + '</b></td><td class="ds">' + pk(
    '方法详情下面那排小方块（「源码里读写的字段」）<b>不是属性清单</b>，而是「这个方法体里出现过哪些 <code>self.x</code> / <code>obj.x</code>」的静态扫描结果：'
    + 'r 只读、w 只写、rw 读写、<code>_</code> 开头是内部字段。它只覆盖被这个方法直接碰到的字段，所以看起来「只列了一部分」。'
    + '完整解释、图例、为什么不全、和属性表的区别，见 <a href="#guide-uses"><b>方法读写了哪些字段</b></a>。',
    'The chips under every method detail ("fields read / written in the source") are <b>not a property list</b>: they are a static scan of the <code>self.x</code> / <code>obj.x</code> references inside that function body &mdash; '
    + 'r = read, w = written, rw = both, a leading <code>_</code> means a framework-internal field. They only cover the fields the method touches directly, which is why the list looks partial. '
    + 'Full explanation, legend, limits and the difference from the property table: <a href="#guide-uses"><b>Fields read and written</b></a>.') + '</td></tr>';
  h += '<tr><td class="nm"><b>' + pk('换皮肤', 'Skins') + '</b></td><td class="ds">' + pk(
    '11 套自带皮肤的实际字段、三种换法（全局 / 按类 / 单控件）、自定义一套皮肤，以及「为什么改完 theme 老控件不变」。教程见 <a href="#guide-skins">换皮肤</a>，可运行案例见 <code>chili_demo_09_skins.lua</code>。',
    'The actual fields of all 11 bundled skins, the three ways to switch (global / per class / per control), writing your own set, and why changing the theme does not restyle existing controls. Guide: <a href="#guide-skins">Skins</a>; runnable demo: <code>chili_demo_09_skins.lua</code>.') + '</td></tr>';
  h += '<tr><td class="nm">方法 / 函数</td><td class="ds"><code>Class:Method(...)</code> 表示实例方法（用冒号调用，<code>self</code> 自动传入，参数表中省略 <code>self</code>）；'
    + '<code>Class.Static(...)</code> 表示点号调用的静态函数。每个函数给出参数与返回值说明。</td></tr>';
  h += '<tr><td class="nm">事件</td><td class="ds">以 <code>On*</code> 命名的属性是事件表，构造时写成 <code>OnClick = { function(self) ... end }</code>，触发时按顺序调用表中所有函数。</td></tr>';
  h += '<tr><td class="nm">初始化时机</td><td class="ds">widget 文件体在<b>加载阶段</b>就执行（那时 <code>WG.Chili</code> 还是 nil），类表要等 <code>api_chili.lua</code> 初始化后才有；widget 按 <code>layer</code> 升序初始化，所以用 Chili 的 widget 要把 <code>layer</code> 设成 <code>&gt; 1000</code>。</td></tr>';
  h += '<tr><td class="nm">可见性</td><td class="ds">顶层控件必须写 <code>parent = Chili.Screen0</code>；<a href="#fn-Object-New"><code>Object:New</code></a> 只在有 parent 时才 AddChild，孤儿控件不会被绘制也不会响应鼠标。</td></tr>';
  h += '<tr><td class="nm">辅助模块</td><td class="ds"><code>Handlers/</code>、<code>Headers/</code>、<code>core.lua</code>、<code>Themes/</code> 中不属于控件类的全局/表函数。</td></tr>';
  h += '<tr><td class="nm">皮肤</td><td class="ds"><code>Skins/*/skin.lua</code> 里每个控件可配置的皮肤字段（颜色、贴图、字体等），决定控件的实际外观。</td></tr>';
  h += '</tbody></table>';

  h += '<h2 id="usage">基本用法</h2>';
  h += '<p>Chili 框架由 <code>LuaUI/Widgets/api_chili.lua</code> 加载：它把整个类表放进 <code>WG.Chili</code>，<b>不会</b>创建全局 <code>Chili</code>，而且它的 <code>layer = 1000</code>。'
    + '这带来三个必须注意的约束：</p>';
  h += '<ol class="tips">'
    + '<li><b>别在文件顶层取类</b>：widget 文件体在「加载阶段」就执行，此时框架还没 Initialize，<code>WG.Chili</code> 是 nil。</li>'
    + '<li><b>layer 要大于 1000</b>：widget 按 <code>layer</code> 升序初始化，<code>api_chili.lua</code> 是 1000，自己的窗口 widget 得排在它后面。</li>'
    + '<li><b>顶层控件必须给 parent</b>：<a href="#fn-Object-New"><code>Object:New</code></a> 只有在传了 <code>parent</code> 时才把控件挂进父控件；没有 parent 的控件不会挂到 <code>Screen0</code>，永远不会被绘制、也不会响应鼠标。</li>'
    + '</ol>';
  h += '<pre class="code"><span class="c">-- api_chili.lua 把 Chili 的类表放进 WG.Chili（不创建全局 Chili），它自己的 layer = 1000</span>'
    + '\n<span class="k">function</span> widget:<span class="k">GetInfo</span>()'
    + '\n  <span class="k">return</span> { name = <span class="s">"Chili Test"</span>, layer = 1001, enabled = true } <span class="c">-- 1001 &gt; 1000，保证 chili 先就绪</span>'
    + '\n<span class="k">end</span>'
    + '\n'
    + '\n<span class="k">local</span> Chili, win   <span class="c">-- 文件顶层只声明变量，不取类</span>'
    + '\n'
    + '\n<span class="k">function</span> widget:<span class="k">Initialize</span>()'
    + '\n  Chili = WG.Chili                          <span class="c">-- 不要用全局 Chili，它不存在</span>'
    + '\n  <span class="k">if</span> not Chili <span class="k">then</span> <span class="k">return</span> <span class="k">end</span>          <span class="c">-- 框架没加载成功时直接放弃，避免 nil 索引</span>'
    + '\n'
    + '\n  win = Chili.Window:New{'
    + '\n    <span class="k">parent</span>  = Chili.Screen0,                <span class="c">-- 关键：没有 parent 的控件永远不会被画出来</span>'
    + '\n    <span class="k">caption</span> = <span class="s">"示例窗口"</span>,'
    + '\n    x = 100, y = 100, width = 320, height = 180,'
    + '\n    <span class="k">children</span> = {                            <span class="c">-- children 会自动 AddChild，不用重复写 parent</span>'
    + '\n      Chili.Label:New{ caption = <span class="s">"你好，Chili"</span>, x = 12, y = 40 },'
    + '\n      Chili.Button:New{'
    + '\n        caption = <span class="s">"点击"</span>, x = 12, y = 90, width = 100, height = 26,'
    + '\n        <span class="k">OnClick</span> = { <span class="k">function</span>(self) Spring.Echo(<span class="s">"clicked"</span>) <span class="k">end</span> },'
    + '\n      },'
    + '\n    },'
    + '\n  }'
    + '\n<span class="k">end</span></pre>';
  h += '<p class="note">构造函数的通用行为由 <a href="#fn-Object-New"><code>Object:New</code></a> / <a href="#fn-Control-New"><code>Control:New</code></a> 定义：'
    + '把传入表的字段逐个拷贝到新实例，处理 <code>children</code>、<code>childrenByName</code>，并触发控件的布局与绘制缓存初始化。'
    + '想改外观（颜色 / 贴图 / 字体 / 边距）就改该控件在皮肤里的字段，见下方 <a href="#skins">皮肤</a> 一节。</p>';

  h += '<h2 id="loadorder">加载顺序（core.lua）</h2>';
  h += '<p>框架入口 <code>core.lua</code> 按下列顺序 <code>VFS.Include</code> 各文件：先加载 <code>Headers/</code> 工具与 <code>Handlers/</code> 资源句柄，'
    + '再按继承依赖顺序加载 <code>Controls/</code>（父类先于子类）。</p>';
  h += '<div class="order">';
  loadOrder.forEach((f, i) => { h += '<div>' + String(i + 1).padStart(2, '0') + '  ' + esc(f) + '</div>'; });
  h += '</div>';

  h += '<h2 id="porting">移植到其他游戏（复用这套 chili）</h2>';
  h += '<p>这套 <code>chili_old</code> 已经是自包含版本：目录不写死（<code>debug.getinfo</code> 自解析），'
    + '也不依赖 Zero-K 的 LuaRules/Utilities 工具层 —— 缺失的 <code>Spring.Utilities.CopyTable</code>、'
    + '<code>Spring.ScaledGetMouseState</code>、<code>Spring.GetViewSizes</code>、<code>Spring.Orig</code> 由 '
    + '<code>Headers/zkcompat.lua</code> 在框架加载最开始补齐（已存在则不覆盖）。</p>';
  h += '<p>把同级的 <code>api_chili.lua</code> 和整个 <code>chili_old/</code> 目录一起拷到目标游戏的 '
    + '<code>LuaUI/Widgets/</code> 下即可；目标游戏已有 <code>chili/</code> 时的处理、以及启动后如何自检，'
    + '见 <a href="PORTING.md">PORTING.md（移植说明）</a>。</p>';
  return h;
}

// ---------- inheritance tree ----------
function renderTree() {
  const roots = classes.filter(c => !c.parent);
  const kids = childrenOf;
  function node(name, depth) {
    const c = byName[name];
    const cs = arr(kids[name]);
    let html = '<li><a href="#' + clsAnchor(name) + '"><b>' + esc(name) + '</b></a>'
      + ' <span class="mono" style="color:#8a94a1;font-size:11.5px">' + esc(c.file) + '</span>';
    if (cs.length) {
      html += '<ul>';
      for (const k of cs) html += node(k, depth + 1);
      html += '</ul>';
    }
    return html + '</li>';
  }
  let h = '<p>下表根据源码中的 <code>Class = Parent:Inherit{...}</code> 关系自动推导。父类在左，子类在右；子类自动拥有父类的全部属性与方法。</p>';
  h += '<ul class="tree">';
  for (const r of roots) h += node(r.name, 0);
  h += '</ul>';
  return h;
}


// non-Object/Control classes: one compact pointer instead of repeating the whole block
function renderUniversalKeysLink(c) {
  const nm = c.name;
  const anc = ancestorsOf(nm);
  const base = anc.indexOf('Control') !== -1 ? 'Control' : 'Object';
  const geom = base === 'Control';
  return '<p class="ukline">' + pk(
    '<b>还有一类键没列出 [通用键]:</b>（' + (geom ? '<code>x</code> <code>y</code> <code>width</code> <code>height</code> <code>right</code> <code>bottom</code> · ' : '')
    + '<code>parent</code> <code>children</code> <code>name</code> <code>classname</code> …）- 它们不属于任何类，所有控件都能写，'
    + '所以只写在定义它们的 <a href="#cls-' + base + '"><code>' + base + '</code></a> 页面和教程页里：'
    + '<a href="#cls-' + base + '">' + base + ' 的通用键</a> | <a href="#guide-newkeys">New 里能写什么</a>（详细信息）。',
    '<b>One more key group is not listed here: the universal keys</b> (' + (geom ? '<code>x</code> <code>y</code> <code>width</code> <code>height</code> <code>right</code> <code>bottom</code> &middot; ' : '')
    + '<code>parent</code> <code>children</code> <code>name</code> <code>classname</code> ...). They belong to no class and every control accepts them, '
    + 'so they are documented once, on <a href="#cls-' + base + '"><code>' + base + '</code></a> and in the tutorial: '
    + '<a href="#cls-' + base + '">universal keys on ' + base + '</a> &middot; <a href="#guide-newkeys">What you can pass to New</a> (Detailed information).')
    + '</p>';
}

// "reads / writes these fields" chips under a function detail
function usesRow(clsName, f) {
  const u = f && f.uses;
  if (!u) return '';
  const keys = Object.keys(u).sort((a, b) => (a[0] === '_' ? 1 : 0) - (b[0] === '_' ? 1 : 0) || a.localeCompare(b));
  if (!keys.length) return '';
  const known = {};
  const pp = allProps(clsName);
  for (const p of pp.own) known[p.name] = clsName;
  for (const p of pp.inherited) known[p.name] = p.from;
  let h = '<div class="uses" title="' + esc(pk('这些是这段源码里碰到的控件字段（不是方法的参数）。r=只读 w=会写 rw=读写，灰底 _ 开头是框架内部字段。', 'These are the control fields this function touches (they are not parameters). r=read, w=written, rw=both; grey _name = framework-internal.')) + '"><span class="lb">' + pk('源码里读写的字段', 'fields touched') + '</span>';
  for (const k of keys) {
    const mode = u[k];
    const owner = known[k];
    const internal = k[0] === '_';
    const chipCls = 'rwchip ' + (internal ? 'i' : mode);
    const title = internal ? pk('框架内部字段（不要手动改）', 'framework-internal field (do not set it yourself)')
      : (mode === 'rw' ? pk('读写', 'read + written') : mode === 'w' ? pk('写', 'written') : pk('读', 'read'));
    if (owner && !internal) h += '<a class="' + chipCls + '" href="#' + propAnchor(owner, { name: k }) + '" title="' + esc(title + ' · ' + owner) + '"><code>' + esc(k) + '</code></a>';
    else h += '<span class="' + chipCls + '" title="' + esc(title) + '"><code>' + esc(k) + '</code></span>';
  }
  h += '<a class="useshelp" href="#guide-uses" title="' + esc(pk('这排方块是什么？看这里', 'What are these chips?')) + '">?</a>';
  return h + '</div>';
}

// ---------- class rendering ----------
function typeLabel(p) {
  if (/^On[A-Z]/.test(p.name)) return '事件表';
  return inferType(p.raw, p.name);
}
function typeCell(t) {
  const cls = /事件/.test(t) ? 'type event' : 'type';
  return '<span class="' + cls + '">' + esc(t) + '</span>';
}
function defCell(rawv) {
  const v = String(rawv == null ? '' : rawv).replace(/\s+/g, ' ').trim();
  if (!v) return '<span class="noD">—</span>';
  const short = v.length > 46 ? v.slice(0, 46) + '…' : v;
  return '<code title="' + esc(v) + '">' + esc(short) + '</code>';
}
function firstLine(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t;
}
function fileHeader(file) {
  const m = raw.modulesMeta[file];
  if (!m || !m.header) return '';
  const lines = String(m.header).split('\n').map(x => x.replace(/^\s*-*[-/]*\s*/, '').trim()).filter(Boolean);
  return lines.slice(0, 2).join(' ');
}

function propTable(clsName, props, withSrc) {
  let h = '<table><thead><tr><th>属性</th><th>类型</th><th>默认值</th>'
    + (withSrc ? '<th>继承自</th>' : '') + '<th>说明</th></tr></thead><tbody>';
  for (const p of props) {
    const srcCls = p.__from || clsName;
    const id = withSrc ? null : propAnchor(srcCls, p);
    h += (id ? '<tr id="' + id + '">' : '<tr>');
    h += '<td class="nm"><a href="#' + propAnchor(srcCls, p) + '">' + esc(p.name) + '</a></td>';
    h += '<td class="ty">' + typeCell(typeLabel(p)) + '</td>';
    h += '<td class="df">' + defCell(p.raw) + '</td>';
    if (withSrc) h += '<td class="frm"><a href="#' + clsAnchor(srcCls) + '">' + esc(srcCls) + '</a></td>';
    const d = pdesc(srcCls, p);
    h += '<td class="ds">' + (d ? esc(d) : placeholder()) + '</td>';
    h += '</tr>';
  }
  return h + '</tbody></table>';
}

function funcRows(clsName, funcs, withSrc) {
  let h = '<table class="compact"><thead><tr><th>函数</th>' + (withSrc ? '<th>继承自</th>' : '') + '<th>说明</th></tr></thead><tbody>';
  for (const it of funcs) {
    const f = it.f || it;
    const srcCls = it.from || clsName;
    const id = fnAnchor(srcCls, f);
    const d = fdesc(srcCls, f);
    h += '<tr><td class="nm" style="white-space:normal"><a href="#' + id + '">' + esc(srcCls) + (f.kind === 'method' ? ':' : '.') + esc(f.name) + '</a>'
      + (f.kind === 'static' ? ' <span class="tag" style="font-size:10px">静态</span>' : '') + '</td>';
    if (withSrc) h += '<td class="frm"><a href="#' + clsAnchor(srcCls) + '">' + esc(srcCls) + '</a></td>';
    h += '<td class="ds">' + (d && d.desc ? esc(brief(d.desc, 110)) : placeholder()) + '</td></tr>';
  }
  return h + '</tbody></table>';
}

function funcDetail(clsName, it, noId) {
  const f = it.f || it;
  const srcCls = it.from || clsName;
  const d = fdesc(srcCls, f);
  const id = fnAnchor(srcCls, f);
  let h = '<div class="fn"' + (noId ? '' : ' id="' + id + '"') + '>';
  const sigPlain = srcCls + (f.kind === 'method' ? ':' : '.') + f.name + '(' + String(f.args || '').trim() + ')';
  h += '<div class="sigwrap">' + sigHtml(srcCls, f) + '<button class="copy" data-sig="' + esc(sigPlain) + '" title="' + esc(TXT.copyLabel) + '">' + esc(TXT.copyLabel) + '</button></div>';
  if (d && d.desc) h += '<div class="fd">' + esc(d.desc) + '</div>';
  else h += '<div class="fd noD">' + TXT.noCommentSig + '</div>';
  const pnames = argsNames(f.args);
  const pmap = (d && d.params) || {};
  const known = pnames.filter(n => pmap[n]);
  if (known.length) {
    h += '<div class="params">';
    for (const nm of known) {
      h += '<span><b>' + esc(nm) + '</b> ' + esc(pmap[nm]) + '</span>';
    }
    h += '</div>';
  }
  if (d && d.returns) h += '<div class="ret"><b>返回</b> ' + esc(d.returns) + '</div>';
  h += usesRow(srcCls, f);
  return h + '</div>';
}

// ---------- universal keys (not declared by any class, usable by every control) ----------
function pk(zh, en) { return LANG === 'en' ? en : zh; }

const UK_GEOM = [
  { k: 'x',        t: 'number | string', d: '0',
    zh: '左边界（相对父控件客户区左上角）；负数=从右边量，字符串=百分比', en: 'left edge inside the parent client area; negative counts from the right, a string is a percentage' },
  { k: 'y',        t: 'number | string', d: '0',
    zh: '上边界；负数=从下边量，字符串=百分比', en: 'top edge; negative counts from the bottom, a string is a percentage' },
  { k: 'width',    t: 'number | string', d: 'defaultWidth of the class', dZh: '类的 defaultWidth',
    zh: '宽度；给 x 又给 right 时可以省略（自动左右拉伸）', en: 'width; can be omitted when both x and right are given (stretches horizontally)' },
  { k: 'height',   t: 'number | string', d: 'defaultHeight of the class', dZh: '类的 defaultHeight',
    zh: '高度；给 y 又给 bottom 时可以省略（自动上下拉伸）', en: 'height; can be omitted when both y and bottom are given (stretches vertically)' },
  { k: 'right',    t: 'number | string', d: 'nil',
    zh: '右边界：离父客户区右边多远（贴右对齐）；父控件变宽时自动重算', en: 'right edge: distance from the parent right border (right alignment); recomputed when the parent resizes' },
  { k: 'bottom',   t: 'number | string', d: 'nil',
    zh: '下边界：离父客户区下边多远（贴底）；父控件变高时自动重算', en: 'bottom edge: distance from the parent bottom (bottom alignment); recomputed when the parent grows' },
];
const UK_STRUCT = [
  { k: 'parent', t: 'Object', d: 'nil',
    zh: '写它等于创建后立刻 <code>父:AddChild(自己)</code>。<b>顶层控件必须写</b>（一般为 <code>Chili.Screen0</code>），否则是孤儿：不绘制、不响应鼠标',
    en: 'same as calling <code>parent:AddChild(self)</code> right after construction. <b>Required for a top-level control</b> (usually <code>Chili.Screen0</code>); an orphan is never drawn and never receives input' },
  { k: 'children', t: 'table', tZh: 'table（数组）', d: '{}',
    zh: '子控件数组，<b>必须是数组</b>（<code>{ a, b, c }</code>）；数组顺序=层级顺序（后面的在上层）。写成键值表不生效',
    en: 'child list, <b>must be an array</b> (<code>{ a, b, c }</code>); array order is stacking order (later children are on top). A keyed table does nothing' },
  { k: 'name', t: 'string', d: 'classname + counter', dZh: 'classname + 序号',
    zh: '控件名，用于 <code>GetChildByName</code> / <code>childrenByName</code>；同一父控件下重名会直接报错',
    en: 'control name, used by <code>GetChildByName</code> / <code>childrenByName</code>; a duplicate name under the same parent raises an error' },
  { k: 'classname', t: 'string', d: 'lowercased class name', dZh: '类名小写',
    zh: '决定套用哪套皮肤（<code>skin[classname]</code>）；一般保持默认',
    en: 'selects the skin (<code>skin[classname]</code>); normally leave it alone' },
  { k: 'clientWidth / clientHeight', t: 'number', d: 'nil',
    zh: '内部可绘区宽高。会按 <code>padding</code> 自动换算成 <code>width / height</code>，比手算 padding 稳',
    en: 'inner (client) width/height; converted to <code>width / height</code> using <code>padding</code>, safer than doing the arithmetic yourself' },
  { k: 'minimumSize', t: 'table {w, h}', d: 'nil',
    zh: '旧写法，等价于 <code>minWidth</code> + <code>minHeight</code>', en: 'legacy spelling of <code>minWidth</code> + <code>minHeight</code>' },
];

function renderUniversalKeys(c) {
  const nm = c.name;
  const anc = ancestorsOf(nm);
  const isCtl = nm === 'Control' || anc.indexOf('Control') !== -1;
  let h = '<div class="ukbox">';
  h += '<h2>' + pk('New 里能写的通用键', 'Keys every control accepts in New')
    + ' <span class="count">' + pk('不属于任何类，所有控件通用', 'not class-specific: identical for every control') + '</span></h2>';
  h += '<p>' + pk(
    '上面的「属性」表只列出<b>本类自己声明</b>的字段；「继承属性」折叠表列出父类声明的字段。'
    + '下面这些键<b>不属于任何类</b>，但所有控件都能写 —— 它们由基类在构造时处理。'
    + '完整规则（几何怎么算、表怎么合并、哪些键写了不生效）见 <a href="#guide-newkeys"><b>New 里能写什么</b></a>。',
    'The <b>property table</b> above lists only fields <b>declared by this class</b>; the collapsed <b>inherited properties</b> table lists fields declared by parent classes. '
    + 'The keys below are <b>declared by no class</b> yet accepted by every control: the base classes handle them during construction. '
    + 'For the full rules (how geometry is resolved, how tables are merged, which keys silently do nothing) see <a href="#guide-newkeys"><b>What you can pass to New</b></a>.') + '</p>';
  h += '<div class="ukgrid">';
  for (const r of UK_STRUCT) h += '<code>' + esc(r.k) + '</code>';
  if (isCtl) for (const r of UK_GEOM) h += '<code>' + esc(r.k) + '</code>';
  h += '</div>';

  const tbl = (rows, headZh, headEn) => {
    let s = '<table class="compact"><thead><tr><th>' + pk('键', 'Key') + '</th><th>' + pk('类型', 'Type') + '</th>'
      + '<th>' + pk('省略时', 'When omitted') + '</th><th>' + pk('说明', 'Description') + '</th></tr></thead><tbody>';
    for (const r of rows) {
      s += '<tr><td class="nm">' + esc(r.k) + '</td><td class="ty">' + esc(pk(r.tZh || r.t, r.t)) + '</td><td class="ty">' + esc(pk(r.dZh || r.d, r.d)) + '</td>'
        + '<td class="ds">' + pk(r.zh, r.en) + '</td></tr>';
    }
    return s + '</tbody></table>';
  };

  h += '<h3 style="margin:14px 0 2px">' + pk('结构键：父子关系与命名', 'Structure keys: parent, children, naming') + '</h3>';
  h += tbl(UK_STRUCT);
  if (isCtl) {
    h += '<h3 style="margin:14px 0 2px">' + pk('几何键：位置与大小', 'Geometry keys: position and size') + '</h3>';
    h += tbl(UK_GEOM);
    h += '<p class="uklink">' + pk(
      '规则：水平方向 <code>x / width / right</code> 三选二，垂直方向 <code>y / height / bottom</code> 三选二，少给的那个由框架算出来。'
      + '详见 <a href="#nk-geometry">几何键规则</a>。',
      'Rule: give two of <code>x / width / right</code> and two of <code>y / height / bottom</code>; the framework derives the missing one. '
      + 'See <a href="#nk-geometry">the geometry rules</a>.') + '</p>';
    h += '<details><summary>' + pk('更多通用键：字体 / 命中测试 / 旧别名 / 合并规则 / 写了不生效的键', 'More universal keys: font, hit testing, legacy aliases, merge rules, keys that do nothing')
      + ' <span class="tag">' + pk('展开', 'expand') + '</span></summary>';
    h += '<table class="compact"><thead><tr><th>' + pk('键', 'Key') + '</th><th>' + pk('类型', 'Type') + '</th><th>' + pk('说明', 'Description') + '</th></tr></thead><tbody>';
    const extra = [
      ['font', 'table', pk('字体表，<b>与类默认字体逐层合并</b>：只写 <code>{ size = 20 }</code> 时颜色/描边保留默认', 'font table, <b>merged field by field</b> with the class default: writing only <code>{ size = 20 }</code> keeps the default color and outline')],
      ['noFont', 'boolean', pk('不创建 Font 对象（自己用 gl.Text 画字时省内存）；设了它别再用文字类属性', 'do not create a Font object (saves memory when you draw text yourself); do not combine with text properties')],
      ['objectOverrideFont', 'Font', pk('共享一个已存在的 Font 实例，不新建', 'share an existing Font instance instead of creating one')],
      ['hitTestAllowEmpty', 'boolean', pk('点在自己客户区空白处也算点到自己（空白面板收 OnClick 用）', 'clicks on empty spots of the client area still count as this control (blank panels that need OnClick)')],
      ['noClickThrough', 'boolean', pk('吃掉客户区外的点击，不再往下传（模态遮罩用）', 'swallow clicks outside the client area instead of passing them on (modal overlay)')],
      ['disableChildrenHitTest', 'boolean', pk('不测试子控件的命中（点击都落在自己身上）', 'skip hit testing of children (all clicks land on this control)')],
      ['snapToGrid', 'boolean', pk('拖动时按网格吸附（Tweak 界面编辑模式）', 'snap to the grid while dragging (Tweak edit mode)')],
      [pk('旧别名', 'Legacy aliases'), '—', pk('<code>fontSize / fontsize → font.size</code>、<code>textColor / captionColor → font.color</code>、<code>fontOutline → font.outline</code>、<code>fontShadow → font.shadow</code>、<code>borderColor1 → borderColor</code>', '<code>fontSize / fontsize → font.size</code>, <code>textColor / captionColor → font.color</code>, <code>fontOutline → font.outline</code>, <code>fontShadow → font.shadow</code>, <code>borderColor1 → borderColor</code>')],
    ];
    for (const r of extra) h += '<tr><td class="nm">' + r[0] + '</td><td class="ty">' + r[1] + '</td><td class="ds">' + r[2] + '</td></tr>';
    h += '</tbody></table>';
    h += '<p class="warn" style="margin:10px 0 8px">' + pk(
      '<b>三个最容易踩的坑</b>：① <code>visible = false</code> 会被父控件挂载时的 <code>SetParent</code> 覆盖成 true（构造完再 <code>:Hide()</code>）；'
      + '② 控件没有 <code>layer</code> 字段，层级由父控件 children 顺序决定（用 <code>:SetLayer(n)</code> / <code>:BringToFront()</code>）；'
      + '③ 没有 <code>center / dock / anchor</code> 这些键（用百分比或 <a href="#cls-LayoutPanel">LayoutPanel</a> 系列）。详见 <a href="#nk-traps">写了不生效的键</a>。',
      '<b>Three most common traps</b>: (1) <code>visible = false</code> is overwritten by <code>SetParent</code> when the control is attached, so call <code>:Hide()</code> afterwards; '
      + '(2) there is no <code>layer</code> field &mdash; stacking comes from the parent children order (use <code>:SetLayer(n)</code> / <code>:BringToFront()</code>); '
      + '(3) there are no <code>center / dock / anchor</code> keys (use percentages or a <a href="#cls-LayoutPanel">LayoutPanel</a>). See <a href="#nk-traps">keys that do nothing</a>.') + '</p>';
    h += '</details>';
  } else {
    h += '<p class="note">' + pk(
      '几何键（<code>x / y / width / height / right / bottom</code>）从 <a href="#cls-Control"><code>Control</code></a> 开始才有；'
      + '<code>Object</code> 本身只处理结构键与事件。',
      'Geometry keys (<code>x / y / width / height / right / bottom</code>) start at <a href="#cls-Control"><code>Control</code></a>; '
      + '<code>Object</code> itself only handles structure keys and events.') + '</p>';
  }
  h += '</div>';
  return h;
}

function renderClass(c) {
  const name = c.name;
  const anc = ancestorsOf(name);
  const ownP = arr(c.props);
  const pf = allFuncs(name);
  const pp = allProps(name);
  const summary = classSummary(name) || fileHeader(c.file);
  let h = '<article class="cls" id="' + clsAnchor(name) + '">';
  h += '<div class="crumb"><a href="#overview-top">' + esc(TXT.overview) + '</a> / <a href="#classes">' + esc(TXT.controls) + '</a> / <code>' + esc(name) + '</code></div>';
  h += '<h1><span class="modtag">类</span>' + esc(name) + '</h1>';
  h += '<div class="meta">定义于 <code>' + esc(c.file) + ':' + c.line + '</code>'
    + ' · 父类：' + (c.parent ? '<a href="#' + clsAnchor(c.parent) + '"><code>' + esc(c.parent) + '</code></a>' : '<span class="noD">无（根类）</span>')
    + ' · 本类属性 <b>' + ownP.length + '</b> · 可用属性 <b>' + (pp.own.length + pp.inherited.length) + '</b>'
    + ' · 本类方法 <b>' + pf.own.length + '</b> · 可用方法 <b>' + (pf.own.length + pf.inherited.length) + '</b></div>';

  // inheritance chips
  h += '<div class="chips">';
  h += '<span class="chip">继承链</span>';
  for (const a of anc.slice().reverse()) h += '<a class="chip" href="#' + clsAnchor(a) + '">' + esc(a) + '</a><span style="color:#aab4c0">→</span>';
  h += '<span class="chip self">' + esc(name) + '</span>';
  const kids = arr(childrenOf[name]);
  if (kids.length) {
    h += '<span style="color:#aab4c0;margin:0 4px">子类</span>';
    for (const k of kids) h += '<a class="chip" href="#' + clsAnchor(k) + '">' + esc(k) + '</a>';
  }
  h += '</div>';

  h += '<p class="lead">' + (summary ? esc(summary) : placeholder()) + '</p>';
  idx('类', name, c.file, clsAnchor(name), summary);

  h += '<h2>属性 <span class="count">' + ownP.length + ' 个本类声明</span></h2>';
  if (ownP.length) {
    h += propTable(name, ownP, false);
    for (const p of ownP) idx('属性', p.name, name + ' · ' + typeLabel(p), propAnchor(name, p), pdesc(name, p));
  } else {
    h += '<p class="note">本类没有新增属性，属性全部来自父类。</p>';
  }
  for (const it of pf.own) {
    const f = it.f || it;
    const srcCls = it.from || name;
    const d0 = fdesc(srcCls, f);
    idx('函数', srcCls + (f.kind === 'method' ? ':' : '.') + f.name, srcCls, fnAnchor(srcCls, f),
        ((d0 && d0.desc) ? d0.desc : '') + (f.uses && Object.keys(f.uses).length ? ' [' + Object.keys(f.uses).join(' ') + ']' : ''));
  }
  if (name === 'Object' || name === 'Control') h += renderUniversalKeys(c);
  else h += renderUniversalKeysLink(c);

  if (pp.inherited.length) {
    h += '<details><summary>' + pk('继承自父类的属性（', 'Inherited from parent classes (') + pp.inherited.length + pk(' 个）', ')') + '</summary><div class="inner">';
    h += propTable(name, pp.inherited.map(x => Object.assign({}, x.p, { __from: x.from })), true);
    h += '</div></details>';
  }

  h += '<h2>方法 <span class="count">' + pf.own.length + ' 个本类声明</span></h2>';
  if (pf.own.length) {
    h += funcRows(name, pf.own, false);
  } else {
    h += '<p class="note">本类没有新增方法，方法全部来自父类。</p>';
  }

  if (pf.own.length) {
    h += '<h3>方法详情</h3>';
    for (const it of pf.own) h += funcDetail(name, it);
  }

  if (pf.inherited.length) {
    h += '<details><summary>继承自父类的方法（' + pf.inherited.length + ' 个，含详细说明）</summary><div class="inner">';
    for (const it of pf.inherited) h += funcDetail(name, it, true);
    h += '</div></details>';
  }

  // aliases
  const als = raw.assignments.filter(a => a.owner === name);
  if (als.length) {
    h += '<h2>别名 / 静态改写 <span class="count">' + als.length + '</span></h2><table class="compact"><thead><tr><th>写法</th><th>等价于</th><th>位置</th></tr></thead><tbody>';
    for (const a of als) {
      h += '<tr><td class="nm">' + esc(a.owner) + '.' + esc(a.field) + '</td><td class="nm">' + esc(a.value) + '</td><td class="ty">' + esc(a.file) + ':' + a.line + '</td></tr>';
    }
    h += '</tbody></table>';
  }
  h += '</article>';
  return h;
}

// ---------- helper modules ----------
function moduleFiles() {
  const out = [];
  for (const f of relFiles) {
    if (/^Skins\//.test(f)) continue;
    const isHelper = /^(Handlers|Headers|Themes)\//.test(f) || f === 'core.lua';
    const mf = raw.moduleFuncs[f] || [];
    if (isHelper || mf.length) out.push(f);
  }
  return out;
}
function moduleKey(fn) { return (fn.owner ? fn.owner + (fn.kind === 'method' ? ':' : '.') : '') + fn.name; }
function moduleSig(fn) {
  if (!fn.owner) return '<span class="sig">' + esc(fn.name) + '(' + esc(fn.args) + ')</span>';
  return '<span class="sig">' + esc(fn.owner) + (fn.kind === 'method' ? ':' : '.') + esc(fn.name) + '(' + esc(fn.args) + ')</span>';
}

function renderModule(file) {
  const d = desc.modules[file] || {};
  const fns = raw.moduleFuncs[file] || [];
  const lines = raw.modulesMeta[file] ? raw.modulesMeta[file].lines : 0;
  const summary = d.summary || desc.files[file] || fileHeader(file);
  let h = '<article class="cls" id="' + modAnchor(file) + '">';
  h += '<div class="crumb"><a href="#overview-top">' + esc(TXT.overview) + '</a> / <a href="#modules">' + esc(TXT.brand) + '</a> / <code>' + esc(file) + '</code></div>';
  h += '<h1><span class="modtag">模块</span><code>' + esc(file) + '</code></h1>';
  h += '<div class="meta">' + nf(lines) + ' 行 · 导出函数 <b>' + fns.length + '</b></div>';
  h += '<p class="lead">' + (summary ? esc(summary) : placeholder()) + '</p>';
  idx('模块', file, '辅助模块', modAnchor(file), summary);

  if (fns.length) {
    h += '<h2>函数 <span class="count">' + fns.length + '</span></h2>';
    h += '<table class="compact"><thead><tr><th>函数</th><th>说明</th></tr></thead><tbody>';
    for (const fn of fns) {
      const key = moduleKey(fn);
      const fd = (d.funcs && d.funcs[key]) || null;
      idx('函数', key, file.replace(/^(Handlers|Headers|Themes)\//, ''), modAnchor(file) + '-' + slug(fn.name), fd && fd.desc ? fd.desc : '');
      h += '<tr><td class="nm" style="white-space:normal"><a href="#' + modAnchor(file) + '-' + slug(fn.name) + '">' + esc(key) + '</a></td>'
        + '<td class="ds">' + (fd && fd.desc ? esc(brief(fd.desc, 120)) : placeholder()) + '</td></tr>';
    }
    h += '</tbody></table>';
    for (const fn of fns) {
      const key = moduleKey(fn);
      const fd = (d.funcs && d.funcs[key]) || null;
      h += '<div class="fn" id="' + modAnchor(file) + '-' + slug(fn.name) + '">';
      h += moduleSig(fn);
      h += '<div class="fd">' + (fd && fd.desc ? esc(fd.desc) : '<span class="noD">' + TXT.noComment + '</span>') + '</div>';
      const pnames = argsNames(fn.args);
      const pmap = (fd && fd.params) || {};
      const known = pnames.filter(n => pmap[n]);
      if (known.length) {
        h += '<div class="params">';
        for (const nm of known) h += '<span><b>' + esc(nm) + '</b> ' + esc(pmap[nm]) + '</span>';
        h += '</div>';
      }
      if (fd && fd.returns) h += '<div class="ret"><b>返回</b> ' + esc(fd.returns) + '</div>';
      if (fn.comment) h += '<div class="meta">源码注释：' + esc(brief(fn.comment, 160)) + '</div>';
      h += '</div>';
    }
  } else {
    h += '<p class="note">本文件没有导出函数，只承载数据结构 / 常量的定义或 include 逻辑。</p>';
  }
  h += '</article>';
  return h;
}

// ---------- skins ----------
function parseSkinTop(t) {
  const m = /(?:^|\n)\s*(?:local\s+)?skin\s*=\s*\{/.exec(t);
  if (!m) return null;
  const open = t.indexOf('{', m.index + m[0].indexOf('{'));
  const close = matchBrace(t, open);
  if (close < 0) return null;
  const flds = fieldsOf(t.slice(open + 1, close));
  const infoF = flds.find(f => f.key === 'info');
  const info = [];
  if (infoF && /^\{/.test(infoF.val)) {
    const io = infoF.val.indexOf('{');
    const ic = matchBrace(infoF.val, io);
    if (ic > 0) {
      for (const f of fieldsOf(infoF.val.slice(io + 1, ic))) info.push(f);
    }
  }
  const top = flds.filter(f => f.key !== 'info' && /^\{/.test(f.val)).map(f => ({ name: f.key, val: f.val }));
  return { info: info, extraGroups: top };
}

const skinByName = {};
for (const s of skins) {
  const t = fs.readFileSync(path.join(cwd, s.file), 'utf8');
  const top = parseSkinTop(t);
  s.infoFields = s.info || [];
  if ((!s.infoFields || !s.infoFields.length) && top && top.info.length) s.infoFields = top.info;
  s.extraTopGroups = [];
  if (top) {
    for (const g of top.extraGroups) {
      if (!s.groups.some(x => x.name === g.name)) s.extraTopGroups.push(g);
    }
  }
  s.modDesc = desc.modules[s.file] || null;
  skinByName[s.name] = s;
}
skins.sort((a, b) => (a.name === 'default' ? -1 : b.name === 'default' ? 1 : a.name.localeCompare(b.name)));

function infoTable(fields) {
  if (!fields || !fields.length) return '<p class="noD">（该皮肤没有 skin.info 元数据）</p>';
  let h = '<table class="compact sk-info"><tbody>';
  for (const f of fields) {
    h += '<tr><td class="nm" style="width:120px">' + esc(f.key) + '</td><td class="ds"><code>' + esc(f.val) + '</code></td></tr>';
  }
  return h + '</tbody></table>';
}
function skinGroupTable(fields) {
  if (!fields.length) return '<p class="empty">（该表在源码中为空：<code>{}</code>，可在此皮肤里自行补字段）</p>';
  let h = '<table class="compact"><thead><tr><th>字段</th><th>值</th></tr></thead><tbody>';
  for (const f of fields) {
    const v = String(f.val).replace(/\s+/g, ' ').trim();
    const short = v.length > 220 ? v.slice(0, 220) + '…' : v;
    const isFnRef = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(v) && !/^(true|false|nil)$/.test(v) && !/^[\d.-]+$/.test(v) && !/^["']/.test(v);
    h += '<tr><td class="nm">' + esc(f.key) + '</td><td class="ds">'
      + (isFnRef ? '<span class="type" style="margin-right:6px">函数引用</span><code title="' + esc(v) + '">' + esc(short) + '</code>' : '<code title="' + esc(v) + '">' + esc(short) + '</code>')
      + '</td></tr>';
  }
  return h + '</tbody></table>';
}
function renderSkin(s) {
  const groups = s.groups.concat(s.extraTopGroups || []);
  const usedGroupAnchors = new Set();
  let h = '<article class="cls" id="' + skinAnchor(s.name) + '">';
  h += '<h1><span class="modtag">皮肤</span>' + esc(s.name) + '</h1>';
  const infoName = (s.infoFields || []).find(f => f.key === 'name');
  const ver = (s.infoFields || []).find(f => f.key === 'version');
  let meta = '<code>' + esc(s.file) + '</code> · 控件皮肤块 <b>' + groups.length + '</b>';
  if (infoName) meta += ' · 名称 <code>' + esc(infoName.val) + '</code>';
  if (ver) meta += ' · 版本 <code>' + esc(ver.val) + '</code>';
  h += '<div class="meta">' + meta + '</div>';
  const dsum = (s.modDesc && s.modDesc.summary) || desc.files[s.file] || '';
  h += '<p class="lead">' + (dsum ? esc(dsum) : '该皮肤通过 <code>skin.&lt;控件类名&gt; = { ... }</code> 覆盖各控件的外观字段（颜色、贴图、字体、边距等），由 <code>Handlers/skinhandler.lua</code> 在换肤时合并到控件实例的 <code>skin</code> 属性上。') + '</p>';
  idx('皮肤', s.name, s.file, skinAnchor(s.name), dsum || ('皮肤包：覆盖 ' + groups.length + ' 组控件外观字段（颜色 / 贴图 / 字体 / 边距）'));

  if (s.infoFields && s.infoFields.length) h += '<h2>元数据 skin.info</h2>' + infoTable(s.infoFields);

  h += '<h2>控件皮肤字段 <span class="count">' + groups.length + ' 组</span></h2>';
  const drawFns = (raw.moduleFuncs[s.file] || []);
  const drawDesc = (s.modDesc && s.modDesc.funcs) || {};
  // mark groups that are actually covered by control classes
  for (const g of groups) {
    const fields = arr(g.fields);
    const ctrlName = classNames.find(function (n) { return n.toLowerCase() === String(g.name).toLowerCase(); });
    const isCtrl = !!ctrlName || /^(general|control|icons)$/.test(g.name);
    let gAnchor = skinAnchor(s.name) + '-' + slug(g.name);
    if (usedGroupAnchors.has(gAnchor)) { let n2 = 2; while (usedGroupAnchors.has(gAnchor + '-' + n2)) n2++; gAnchor = gAnchor + '-' + n2; }
    usedGroupAnchors.add(gAnchor);
    if (g.aliasOf) {
      idx('皮肤字段', 'skin.' + g.name, s.name, gAnchor, pk('别名：直接指向 skin.' + g.aliasOf + '（字段完全相同）',
        'alias: points straight at skin.' + g.aliasOf + ' (identical fields)'));
      h += '<details id="' + gAnchor + '"' + '><summary><code>skin.' + esc(g.name) + '</code>'
        + ' <span class="count">' + pk('别名', 'alias') + '</span>'
        + (ctrlName ? ' <span class="tag" style="font-size:10px">' + pk('对应类 ', 'class ') + '<a href="#' + clsAnchor(ctrlName) + '">' + esc(ctrlName) + '</a></span>' : '')
        + '</summary><div class="inner"><p class="note">'
        + pk('该皮肤没有为这个类单独写块：', 'This skin has no block of its own for this class: ')
        + '<code>skin.' + esc(g.name) + ' = skin.' + esc(g.aliasOf) + '</code>'
        + pk('，字段与 <code>skin.' + esc(g.aliasOf) + '</code> 完全相同。', '; its fields are exactly those of <code>skin.' + esc(g.aliasOf) + '</code>.')
        + '</p></div></details>';
      continue;
    }
    idx('皮肤字段', 'skin.' + g.name, s.name, gAnchor, (ctrlName ? '控件 ' + ctrlName + ' 的皮肤字段：' : '皮肤字段：') + fields.map(f => f.key).join(', ').slice(0, 130));
    h += '<details id="' + gAnchor + '"' + (g.name === 'general' || g.name === 'window' ? ' open' : '') + '><summary><code>skin.' + esc(g.name) + '</code>'
      + ' <span class="count">' + fields.length + ' 个字段</span>'
      + (ctrlName ? ' <span class="tag" style="font-size:10px">对应类 <a href="#' + clsAnchor(ctrlName) + '">' + esc(ctrlName) + '</a></span>' : (isCtrl ? '' : ' <span class="tag" style="font-size:10px">扩展 / 皮肤特有</span>')) + '</summary><div class="inner">'
      + skinGroupTable(fields) + '</div></details>';
  }
  if (s.merges && s.merges.length) {
    h += '<p class="note">该文件还通过 <code>Merge()</code> 合并覆盖了：' + s.merges.map(x => '<code>skin.' + esc(x) + '</code>').join('、') + '。</p>';
  }
  if (s.extra && s.extra.length) {
    h += '<p class="note">别名 / 直接赋值：' + s.extra.map(x => '<code>skin.' + esc(x.name) + ' = ' + esc(brief(x.val, 60)) + '</code>').join('、') + '。</p>';
  }
  if (drawFns.length) {
    h += '<h2>绘制函数 <span class="count">' + drawFns.length + ' 个</span></h2>';
    h += '<p>皮肤自己的 <code>gl.Vertex</code> 绘制实现；被对应控件的 <code>DrawControl</code> 调用。</p>';
    h += '<table class="compact"><thead><tr><th>函数</th><th>说明</th></tr></thead><tbody>';
    for (const fn of drawFns) {
      const key = fn.name;
      const fd = drawDesc[key] || null;
      h += '<tr><td class="nm">' + esc(key) + '</td><td class="ds">' + (fd && fd.desc ? esc(brief(fd.desc, 140)) : '<span class="noD">—</span>') + '</td></tr>';
    }
    h += '</tbody></table>';
  }
  h += '</article>';
  return h;
}


// ---------- quick reference: class index ----------
const SKIN_NOTES = {
  'default': pk('框架自带的兜底皮肤：几乎每个控件都有一块，浅蓝底 + 黑字，样式最朴素。', 'The framework fallback: a block for nearly every control, pale blue fill with black text.'),
  'Evolved': pk('默认皮肤（theme 当前值）：橙色 focus 高亮 + 深色面板，块最多（48 个），控件覆盖最完整。', 'The default (current theme value): orange focus highlight, dark panels, the most class blocks (48).'),
  'Carbon': pk('深色科技风，青色高亮，适合深色界面。', 'Dark tech look with cyan highlights.'),
  'Glass': pk('半透明玻璃质感，蓝色高亮。', 'Translucent glass look with blue highlights.'),
  'Robocracy': pk('橙黄高亮，自带一套 14 号字体（skins/Robocracy/fonts/n019003l.pfb）。', 'Orange-yellow highlight, ships its own 14px font.'),
  'Blueprint': pk('蓝图风格，青色描边，偏工程感。', 'Blueprint style with cyan outlines.'),
  'Twilight': pk('深青底 + 青色边框。', 'Dark teal fill with cyan borders.'),
  'DarkHive': pk('深灰极简，适合 HUD / 覆盖层。', 'Very dark grey, good for HUDs and overlays.'),
  'DarkHiveSquare': pk('DarkHive 的方角变体，块很少。', 'Square-cornered variant of DarkHive, very few blocks.'),
  'DarkGlass': pk('极简深色玻璃。', 'Minimal dark glass.'),
  'BubbleBlack': pk('纯黑气泡，块最少（2 个），只覆盖关键控件。', 'Pure black bubbles, the fewest blocks (2).'),
};
function skinNote(name) { return SKIN_NOTES[name] || ''; }

function skinBlockCount(clsLower) {
  let k = 0;
  for (const s of skins) for (const g of s.groups) if (g.name === clsLower) { k++; break; }
  return k;
}
function renderClassIndex() {
  let h = '<h1 id="class-index">' + pk('类索引速查', 'Class index') + ' <span class="count">' + classes.length + pk(' ', ' classes') + '</span></h1>';
  h += '<table class="compact mx"><thead><tr>'
    + '<th>' + pk('类', 'Class') + '</th><th>' + pk('父类', 'Parent') + '</th>'
    + '<th>' + pk('本类属性', 'Own props') + '</th><th>' + pk('可用属性', 'All props') + '</th>'
    + '<th>' + pk('本类方法', 'Own methods') + '</th><th>' + pk('可用方法', 'All methods') + '</th>'
    + '<th>' + pk('皮肤块', 'Skin blocks') + '</th><th>' + pk('一句话', 'What it is') + '</th></tr></thead><tbody>';
  for (const c of classes) {
    const pp = allProps(c.name);
    const pf = allFuncs(c.name);
    const sk = skinBlockCount(String(c.name).toLowerCase());
    const sum = classSummary(c.name) || fileHeader(c.file);
    h += '<tr><td class="nm"><a href="#' + clsAnchor(c.name) + '"><b>' + esc(c.name) + '</b></a></td>'
      + '<td class="ty">' + (c.parent ? '<a href="#' + clsAnchor(c.parent) + '">' + esc(c.parent) + '</a>' : '<span class="noD">—</span>') + '</td>'
      + '<td class="num">' + pp.own.length + '</td>'
      + '<td class="num"><b>' + (pp.own.length + pp.inherited.length) + '</b></td>'
      + '<td class="num">' + pf.own.length + '</td>'
      + '<td class="num"><b>' + (pf.own.length + pf.inherited.length) + '</b></td>'
      + '<td class="ty">' + (sk ? pk(sk + ' 套', sk + ' skins') : '<span class="noD">—</span>') + '</td>'
      + '<td class="ds">' + (sum ? esc(brief(sum, 64)) : placeholder()) + '</td></tr>';
  }
  h += '</tbody></table>';
  h += '<p class="legend">' + pk(
    '「可用」= 本类声明 + 从父类继承（去重后）。「皮肤块」= 11 套皮肤里有几套为这个类写了 <code>skin.&lt;classname&gt;</code> 块或等价别名（如 <code>skin.control = skin.general</code>）。',
    '"All" = declared here plus inherited (deduplicated). "Skin blocks" = how many of the 11 skins define a <code>skin.&lt;classname&gt;</code> block or an equivalent alias such as <code>skin.control = skin.general</code>.') + '</p>';
  h += '<div class="qcard">'
    + '<a href="#class-index"><b>' + pk('类索引（本页）', 'Class index (this page)') + '</b><span>' + pk('横向对照 28 个类，挑类用', 'side-by-side view of 28 classes') + '</span></a>'
    + '<a href="#props-methods"><b>' + pk('属性 × 方法', 'Properties x methods') + '</b><span>' + pk('属性是否只对某些方法有效、每个方法动哪些字段', 'whether a property is method-specific, and which fields each method touches') + '</span></a>'
    + '<a href="#inheritance"><b>' + pk('继承树', 'Class tree') + '</b><span>' + pk('完整的父子关系', 'the full parent/child tree') + '</span></a>'
    + '<a href="#guide-newkeys"><b>' + pk('New 里能写什么', 'Keys for New') + '</b><span>' + pk('通用键 x/y/width/right/... 的完整规则', 'universal keys: x, y, width, right, ...') + '</span></a>'
    + '<a href="#guide-skins"><b>' + pk('换皮肤', 'Skins') + '</b><span>' + pk('三种换法 + 自定义皮肤', 'three ways to switch + writing your own') + '</span></a>'
    + '</div>';
  return h;
}

// ---------- properties x methods ----------
function usesTable(clsName) {
  const pf = allFuncs(clsName);
  const rows = [];
  for (const it of pf.own) {
    const f = it.f || it;
    const u = f.uses || {};
    const keys = Object.keys(u);
    rows.push({ f: f, src: clsName, uses: u, keys: keys });
  }
  return rows;
}
function renderPropsMethods() {
  const tz = (zh, en) => pk(zh, en);
  let h = '<h1 id="props-methods">' + pk('属性 × 方法', 'Properties x methods') + '</h1>';
  h += '<p class="lead">' + tz(
    '具体问题：<b>1</b> 属性是不是只对某些方法有效？<b>2</b> 某个方法会不会动到我关心的字段？<b>3</b> 我想改一个东西，该调哪个方法？'
    + '下面的 方法 > 读写字段 表不是手写的，是构建时逐个函数扫描源码体、找出 <code>self.x</code> / <code>obj.x</code> 的读写位置整理出来的，所以能当严谨依据用。',
    'Specific issue: <b>(1)</b> is any property valid only for some methods? <b>(2)</b> does a given method touch the field I care about? <b>(3)</b> which method should I call to change something? '
    + 'The method -> fields tables below are not hand-written: the builder scans each function body for reads and writes of <code>self.x</code> / <code>obj.x</code>, so they can be relied on.') + '</p>';

  if (LANG === 'en') {
    h += '<p class="ok"><b>Confused by the "fields read / written" chips?</b> Read <a href="#guide-uses"><b>Fields read and written</b></a> first: it explains that they are a static scan of <code>self.</code> / <code>obj.</code> references, not a property list, why they look partial, and what they are good for.</p>';
  } else {
    h += '<p class="ok"><b>被方法详情下面那排「源码里读写的字段」绕晕了？</b>先看 <a href="#guide-uses"><b>方法读写了哪些字段</b></a>：它讲清那排方块是对 <code>self.</code> / <code>obj.</code> 引用的静态扫描、不是属性清单，为什么看起来只列了一部分，以及能拿来干什么。</p>';
  }

  // 1. the answer
  h += '<h2 id="pm-answer">' + tz('1. 结论：没有任何属性只对某些方法有效', '1. The answer: no property is restricted to certain methods') + '</h2>';
  h += '<p class="ok"><b>' + tz('所有属性都是实例（或类表）上的普通字段，方法只是读写它们。', 'Every property is a plain field on the instance (or on the class table); methods only read and write them.') + '</b> '
    + tz('不存在「<code>padding</code> 只对布局方法有效」「<code>backgroundColor</code> 只对绘制方法有效」这种机制 —— 换句话说，'
      + '任何继承下来的属性，在任何实例上都能读、能写。真正有区别的是：<b>写完之后谁会去用它</b>，以及<b>在什么时机用</b>（构造期读的一次性字段 vs 每帧 / 每次重绘都读的字段）。',
      'There is no mechanism such as "padding is only valid for layout methods" or "backgroundColor only for drawing methods" &mdash; any inherited property can be read and written on any instance. '
      + 'What does differ is <b>who consumes the value</b> and <b>when</b>: fields read once during construction versus fields read on every resize / repaint.') + '</p>';

  h += '<table class="compact"><thead><tr><th>' + tz('机制', 'Mechanism') + '</th><th>' + tz('源码里的写法', 'In the source') + '</th><th>' + tz('对“属性可用性”的含义', 'What it means for properties') + '</th></tr></thead><tbody>';
  const mech = [
    [tz('继承 = 拷贝', 'Inheritance = copying'),
     tz('<code>Object:Inherit</code>：<code>for i,v in pairs(self) do … class[i] = v end</code>（表字段做 <code>table.shallowcopy</code>；<code>setmetatable(class,{__index=self})</code> 那行是注释掉的）', '<code>Object:Inherit</code>: <code>for i,v in pairs(self) do … class[i] = v end</code> (table fields are <code>table.shallowcopy</code>-ed; the <code>setmetatable(class,{__index=self})</code> line is commented out)'),
     tz('父类的字段真实存在于子类表里（不是查表委托），所以子类实例天然拥有全部祖先字段。', 'Parent fields physically exist on the child class table (no lookup delegation), so an instance naturally has every ancestor field.')],
    [tz('实例继承整条类链', 'Instances inherit the class chain'),
     tz('<code>Object:New</code> 末尾 <code>setmetatable(obj, {__index = self})</code>', '<code>setmetatable(obj, {__index = self})</code> at the end of <code>Object:New</code>'),
     tz('实例上读不到的字段回退到类表 → 读到的是类默认值；一旦你在实例上写了同名键，就遮住了类默认值（只影响这一个实例）。', 'A field missing on the instance falls back to the class table, i.e. the class default; writing the same key on the instance shadows it for that instance only.')],
    [tz('标量不拷贝进实例', 'Scalars are not copied'),
      tz('<code>Object:New</code> 只对 <code>type(v)==="table"</code> 的类字段做 <code>table.merge</code>，注释写着「We do not need to copy other types」', '<code>Object:New</code> only <code>table.merge</code>s class fields whose <code>type(v)=="table"</code>; the comment says "We do not need to copy other types".'),
     tz('number / string / boolean 默认值来自类表；改它们就是在实例上新建一个同名键，不污染别的实例。', 'number / string / boolean defaults come from the class table; changing one creates a same-named key on the instance and does not affect other instances.')],
    [tz('表字段逐键合并', 'Table fields merge key by key'),
     tz('<code>table.merge(obj[i], classDefault)</code>：只填空（<code>if self[i]==nil then self[i]=v end</code>），嵌套表递归', '<code>table.merge(obj[i], classDefault)</code>: fill-only (<code>if self[i]==nil then self[i]=v end</code>), recursing into nested tables'),
     tz('你传入的表与类默认逐键合并：写 <code>padding={10}</code> 得到 <code>{10,5,5,5}</code>；两个实例各自持有一份表，不会互相串改。', 'The table you pass is merged key by key with the class default: <code>padding={10}</code> becomes <code>{10,5,5,5}</code>; each instance owns its own copy.')],
    [tz('构造期读取的字段', 'Fields read during construction'),
     tz('<code>Control:New</code> 里 <code>padding</code> → <code>clientArea</code>、<code>minimumSize</code> → <code>minWidth</code>、<code>classname</code> / <code>skinName</code> → 选皮肤', 'in <code>Control:New</code>: <code>padding</code> -> <code>clientArea</code>, <code>minimumSize</code> -> <code>minWidth</code>, <code>classname</code> / <code>skinName</code> -> skin selection'),
     tz('这一类属性「写也能写」，但构造完成后再改不会自动重算 —— 需要调用对应方法（如 <code>UpdateClientArea</code>）或重建控件。', 'These properties can still be written, but changing them after construction does not recompute anything &mdash; call the matching method (e.g. <code>UpdateClientArea</code>) or rebuild the control.')],
  ];
  for (const r of mech) h += '<tr><td class="nm">' + r[0] + '</td><td class="ds">' + r[1] + '</td><td class="ds">' + r[2] + '</td></tr>';
  h += '</tbody></table>';

  // 2. lifecycle classes
  h += '<h2 id="pm-lifecycle">' + tz('2. 属性按「什么时候被读」分三类', '2. Three kinds of properties, by when they are read') + '</h2>';
  h += '<p>' + tz('同样是「可写」，写完之后是否立刻生效完全不同。判断办法：点进方法的详情，看它下面的「源码里读写的字段」；或者看下面的分类表。',
    'All are writable, but whether a write takes effect immediately differs a lot. To check: open the method details and read the "fields read / written in the source" line, or use the table below.') + '</p>';
  h += '<table class="compact"><thead><tr><th>' + tz('类别', 'Kind') + '</th><th>' + tz('典型字段', 'Typical fields') + '</th><th>' + tz('写完要做什么', 'After writing') + '</th></tr></thead><tbody>';
  const life = [
    [tz('构造期一次性读', 'Read once at construction'),
     '<code>padding</code> <code>clientWidth</code> <code>clientHeight</code> <code>minimumSize</code> <code>classname</code> <code>skinName</code> <code>children</code> <code>parent</code> <code>font</code>',
     tz('已经构造完的控件不会重算：几何相关的用 <code>SetPos</code> / <code>Resize</code> / <code>UpdateClientArea</code>，皮肤相关的只能重建控件。', 'An already-built control will not recompute: for geometry use <code>SetPos</code> / <code>Resize</code> / <code>UpdateClientArea</code>; for skins you have to rebuild the control.')],
    [tz('每次重绘 / 每次布局都读', 'Read on every repaint / layout'),
     '<code>backgroundColor</code> <code>borderColor</code> <code>borderThickness</code> <code>font.color</code> <code>caption</code> <code>x</code> <code>y</code> <code>width</code> <code>height</code> <code>visible</code> <code>enabled</code>',
     tz('改完调 <code>:Invalidate()</code>（重画）或 <code>:RequestRealign()</code>（重排）。<code>x/y/width/height</code> 更推荐用 <code>:SetPos()</code> / <code>:Resize()</code>，它们会顺手处理 right/bottom 约束与子控件。', 'Call <code>:Invalidate()</code> (repaint) or <code>:RequestRealign()</code> (re-layout) afterwards. For <code>x/y/width/height</code> prefer <code>:SetPos()</code> / <code>:Resize()</code>, which also handle right/bottom constraints and children.')],
    [tz('内部缓存（<code>_</code> 前缀）', 'Internal caches (<code>_</code> prefix)'),
     '<code>_own_dlist</code> <code>_children_dlist</code> <code>_all_dlist</code> <code>_relativeBounds</code> <code>_givenBounds</code> <code>_realignRequested</code>',
     tz('不要手写：它们在绘制 / 布局时被方法自己维护，手改会画错。文档里标灰的就是这类字段。', 'Do not write them: methods maintain them during draw / layout, and manual writes cause wrong rendering. In this reference they are the grey chips.')],
  ];
  for (const r of life) h += '<tr><td class="nm">' + r[0] + '</td><td class="ds">' + r[1] + '</td><td class="ds">' + r[2] + '</td></tr>';
  h += '</tbody></table>';

  // 3. per class tables
  h += '<h2 id="pm-tables">' + tz('3. 每个类：方法 → 读写字段', '3. Per class: method -> fields') + '</h2>';
  h += '<p>' + tz('只列<b>本类声明</b>的方法；继承来的方法在父类的那张表里。每个方法只列它有实际读写的字段（纯转调 / 空实现的方法显示「—」）。'
    + '点字段名跳到对应类的属性说明；<code>_</code> 开头的是框架内部字段。',
    'Only methods <b>declared by this class</b> are listed; inherited methods appear under their parent. Each method lists the fields it actually reads or writes (pure forwarders / empty bodies show an em dash). '
    + 'Click a field name to jump to its property description; <code>_</code>-prefixed ones are framework internals.') + '</p>';
  h += '<p class="legend">' + tz('图例：', 'Legend: ')
    + '<span class="rwchip r">' + tz('只读', 'read') + '</span> <span class="rwchip w">' + tz('只写', 'written') + '</span> '
    + '<span class="rwchip rw">' + tz('读 + 写', 'read + written') + '</span> <span class="rwchip i">' + tz('内部字段', 'internal') + '</span></p>';
  for (const c of classes) {
    const rows = usesTable(c.name);
    const withUses = rows.filter(r => r.keys.length);
    h += '<details class="mxcls" id="mx-' + slug(c.name) + '"><summary><a href="#' + clsAnchor(c.name) + '">' + esc(c.name) + '</a>'
      + '<span class="count">' + withUses.length + ' / ' + rows.length + tz(' 个方法有字段读写', ' methods touch fields') + '</span></summary><div>';
    if (!withUses.length) {
      h += '<p class="note">' + tz('本类方法都是纯转调或空实现，没有直接读写字段。', 'All methods here are forwarders or empty bodies; none touches a field directly.') + '</p>';
    } else {
      h += '<table class="compact"><thead><tr><th>' + tz('方法', 'Method') + '</th><th>' + tz('读写的字段', 'Fields touched') + '</th><th>' + tz('说明', 'Description') + '</th></tr></thead><tbody>';
      for (const r of withUses) {
        const d = fdesc(c.name, r.f);
        h += '<tr><td class="nm"><a href="#' + fnAnchor(c.name, r.f) + '"><code>' + esc(c.name + (r.f.kind === 'method' ? ':' : '.') + r.f.name) + '</code></a></td>'
          + '<td class="ds">' + usesRow(c.name, r.f).replace(/^<div class="uses">/, '').replace(/<\/div>$/, '').replace(/<span class="lb">[^<]*<\/span>/, '') + '</td>'
          + '<td class="ds">' + (d && d.desc ? esc(brief(d.desc, 96)) : placeholder()) + '</td></tr>';
      }
      h += '</tbody></table>';
    }
    h += '</div></details>';
  }

  // 4. how to use it
  h += '<h2 id="pm-howto">' + tz('4. 怎么用这两张表', '4. How to use these two tables') + '</h2>';
  h += '<ol class="tips">'
    + '<li>' + tz('<b>「这个属性是不是只有某个方法能用？」</b>——不是。所有属性在实例上都可读写；区别只在于「构造期读一次」还是「每次重绘都读」，见第 2 节。',
      '<b>"Is this property only valid for some method?"</b> &mdash; no. Every property is readable and writable on every instance; the difference is whether it is read once at construction or on every repaint (section 2).') + '</li>'
    + '<li>' + tz('<b>「这个方法会不会重排布局？」</b>——看字段表里有没有 <code>_realignRequested</code> / <code>_relativeBounds</code> / <code>_givenBounds</code>，有就是会重排（通常内部会走到 <code>UpdateLayout</code> 或 <code>AlignControl</code>）。',
      '<b>"Will this method re-layout?"</b> &mdash; look for <code>_realignRequested</code> / <code>_relativeBounds</code> / <code>_givenBounds</code> in its field list; if present it re-lays out (usually through <code>UpdateLayout</code> or <code>AlignControl</code>).') + '</li>'
    + '<li>' + tz('<b>「我想改一个东西该调谁？」</b>——先在第 3 节找到读那个字段的方法，再调它：例如想让控件随父容器伸缩，不要自己每帧算 <code>width</code>，而是构造时给 <code>right</code>、改尺寸时调 <code>:Resize()</code>。',
      '<b>"Which method should I call to change X?"</b> &mdash; find the method that reads that field in section 3 and call it: e.g. to let a control stretch with its parent, do not compute <code>width</code> yourself every frame; pass <code>right</code> at construction and call <code>:Resize()</code>.') + '</li>'
    + '<li>' + tz('每个方法的详细说明里也有一行「源码里读写的字段」，那是同一份数据的单函数视图。', 'Every method detail also carries a "fields read / written in the source" line &mdash; the same data for a single function.') + '</li>'
    + '</ol>';
  return h;
}

// ---------- file list ----------
function filesByDir() {
  const groups = {};
  for (const f of relFiles) {
    const dir = f.indexOf('/') === -1 ? '(根目录)' : f.split('/').slice(0, 1).join('/');
    (groups[dir] = groups[dir] || []).push(f);
  }
  return groups;
}
function renderFiles() {
  const groups = filesByDir();
  const order = ['(根目录)', 'core.lua', 'Controls', 'Handlers', 'Headers', 'Themes', 'Skins'];
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  let h = '<h1>文件清单</h1>';
  h += '<p>全部 <b>' + raw.files.length + '</b> 个 Lua 文件（合计 ' + nf(totalLines) + ' 行）。「类」为该文件中定义的控件类数，「函数」为这些类声明的方法数加上文件级导出函数数。</p>';
  for (const k of keys) {
    const fs2 = groups[k].slice().sort();
    h += '<h3>' + esc(k) + ' <span class="count">' + fs2.length + ' 个文件</span></h3>';
    h += '<table class="compact"><thead><tr><th>文件</th><th>行数</th><th>类</th><th>函数</th><th>说明</th></tr></thead><tbody>';
    for (const f of fs2) {
      const cs = docClasses.filter(c => c.file === f);
      const mf = (raw.moduleFuncs[f] || []).length;
      const fnCount = cs.reduce((s, c) => s + c.funcs.length, 0) + mf;
      const lines = raw.modulesMeta[f] ? raw.modulesMeta[f].lines : 0;
      const d = desc.files[f] || (cs.length ? classSummary(cs[0].name) : ((desc.modules[f] && desc.modules[f].summary) || ''));
      let clsCell = '—';
      if (cs.length) clsCell = cs.map(c => '<a href="#' + clsAnchor(c.name) + '">' + esc(c.name) + '</a>').join(', ');
      h += '<tr><td class="nm" style="white-space:normal"><code>' + esc(f) + '</code></td>'
        + '<td class="num">' + nf(lines) + '</td>'
        + '<td class="ds">' + clsCell + '</td>'
        + '<td class="num">' + (fnCount || 0) + '</td>'
        + '<td class="ds">' + (d ? esc(d) : '<span class="noD">—</span>') + '</td></tr>';
    }
    h += '</tbody></table>';
  }
  return h;
}

// ---------- nav ----------
function renderNav() {
  let h = '';
  h += '<div class="group">' + pk('文档', 'Docs') + '</div>';
  DOC_PAGES.forEach((p, i) => {
    h += '<a' + (i === 0 ? ' class="top"' : '') + ' href="#' + esc(p.id) + '" data-t="' + esc(p.id) + '">' + esc(p.title) + '</a>';
  });  h += '<div class="group">' + (LANG === 'en' ? 'Guides' : '教程') + '  ' + PAGES.length + '</div>';
  for (const p of PAGES) {
    h += '<a href="#' + p.id + '" data-t="' + p.id + '">' + esc(LANG === 'en' ? p.shortEn : p.shortZh) + '</a>';
  }
  h += '<div class="group">' + pk('速查', 'Quick reference') + '</div>';
  h += '<a href="#class-index" data-t="class-index">' + pk('类索引（28 个类横向对照）', 'Class index (all 28 classes)') + '</a>';
  h += '<a href="#props-methods" data-t="props-methods">' + pk('属性 × 方法', 'Properties x methods') + '</a>';
  h += '<a href="#inheritance" data-t="inheritance">' + pk('继承树', 'Class tree') + '</a>';
  h += '<div class="group">' + pk('控件类', 'Classes') + '  ' + classes.length + '</div>';
  for (const c of classes) {
    const fnN = arr(c.funcs).length;
    h += '<a href="#' + clsAnchor(c.name) + '" data-t="' + clsAnchor(c.name) + '"><span class="cnt">' + arr(c.props).length + '/' + fnN + '</span>'
      + esc(c.name) + (c.parent ? '' : ' <span style="color:#6f7d8d">· 根</span>') + '</a>';
  }
  const mods = moduleFiles();
  h += '<div class="group">' + pk('辅助模块', 'Helper modules') + '  ' + mods.length + '</div>';
  for (const f of mods) {
    h += '<a href="#' + modAnchor(f) + '" data-t="' + modAnchor(f) + '" class="sub"><span class="cnt">' + ((raw.moduleFuncs[f] || []).length) + '</span>' + esc(f.replace(/^(Handlers|Headers|Themes)\//, '')) + '</a>';
  }
  h += '<div class="group">' + pk('皮肤', 'Skins') + '  ' + skins.length + '</div>';
  for (const s of skins) {
    h += '<a href="#' + skinAnchor(s.name) + '" data-t="' + skinAnchor(s.name) + '" class="sub"><span class="cnt">' + s.groups.length + '</span>' + esc(s.name) + '</a>';
  }
  h += '<div class="group">' + pk('其他', 'More') + '</div>';
  h += '<a href="#files" data-t="files">' + pk('文件清单', 'Source file list') + '</a>';
  return h;
}

// ---------- js ----------
const SEARCH_JS = fs.readFileSync(path.join(cwd, '_docbuild', '_search.js'), 'utf8');
const THEME_JS = [
  '(function themeToggle(){',
  '  var root=document.documentElement, btn=document.getElementById("themebtn");',
  '  var DARK=' + JSON.stringify(LANG === 'en' ? '\u263e Dark' : '\u263e 黑夜') + ', LIGHT=' + JSON.stringify(LANG === 'en' ? '\u2600 Light' : '\u2600 白天') + ';',
  '  var TD=' + JSON.stringify(LANG === 'en' ? 'Switch to dark mode' : '切换到黑夜模式') + ', TL=' + JSON.stringify(LANG === 'en' ? 'Switch to light mode' : '切换到白天模式') + ';',
  '  function sync(){',
  '    var dark=root.getAttribute("data-theme")==="dark";',
  '    if(btn){ btn.textContent=dark?LIGHT:DARK; btn.title=dark?TL:TD; }',
  '  }',
  '  function set(t){',
  '    if(t==="dark") root.setAttribute("data-theme","dark"); else root.removeAttribute("data-theme");',
  '    try{ localStorage.setItem("chili-doc-theme", t); }catch(e){}',
  '    sync();',
  '  }',
  '  if(btn) btn.addEventListener("click", function(){ set(root.getAttribute("data-theme")==="dark"?"light":"dark"); });',
  '  sync();',
  '})();',
].join('\n');

function buildJs() {
  return SEARCH_JS
    .replace('__INDEX_JSON__', () => JSON.stringify(INDEX))
    .replace('__L10N_JSON__', () => JSON.stringify(L10N)) + '\n' + THEME_JS;
}

// warn about coverage
(function coverage() {
  const miss = { clsSummary: [], prop: 0, func: 0, propList: [], funcList: [] };
  for (const c of docClasses) {
    if (!classSummary(c.name)) miss.clsSummary.push(c.name);
    for (const p of arr(c.props)) if (!pdesc(c.name, p)) { miss.prop++; if (miss.propList.length < 12) miss.propList.push(c.name + '.' + p.name); }
    for (const f of arr(c.funcs)) { const d = fdesc(c.name, f); if (!d || !d.desc) { miss.func++; if (miss.funcList.length < 12) miss.funcList.push(c.name + (f.kind === 'method' ? ':' : '.') + f.name); } }
  }
  if (miss.clsSummary.length) console.error('!! 缺类摘要:', miss.clsSummary.join(', '));
  if (miss.prop) console.error('!! 缺属性描述 ' + miss.prop + ' 条，例如: ' + miss.propList.join(', '));
  if (miss.func) console.error('!! 缺函数描述 ' + miss.func + ' 条，例如: ' + miss.funcList.join(', '));
})();

// ---------- assemble ----------
function mdSections(body) {
  const out = [];
  const re = /^#{2,3}\s+(.+?)\s*\{#([A-Za-z0-9_\-]+)\}\s*$/gm;
  let m;
  while ((m = re.exec(body)) !== null) out.push([m[1].replace(/[`*_]/g, '').trim(), m[2]]);
  return out;
}
for (const p of PAGES) {
  const isMd = !!p.md;
  idx(LANG === 'en' ? 'Guide' : '\u6559\u7a0b',
      LANG === 'en' ? p.shortEn : p.shortZh,
      LANG === 'en' ? 'Tutorial' : '\u6559\u7a0b\u9875',
      p.id,
      LANG === 'en' ? p.descEn : p.descZh);
  if (isMd) for (const s of mdSections(p.md.body)) {
    idx(LANG === 'en' ? 'Guide' : '\u6559\u7a0b', s[0], LANG === 'en' ? 'Tutorial' : '\u6559\u7a0b\u9875', s[1], LANG === 'en' ? p.shortEn : p.shortZh);
  }
}
for (const p of DOC_PAGES) {
  idx(LANG === 'en' ? 'Doc' : '\u6587\u6863', p.short, LANG === 'en' ? 'Docs' : '\u6587\u6863', p.id, p.desc);
  for (const s of mdSections(p.body)) {
    idx(LANG === 'en' ? 'Doc' : '\u6587\u6863', s[0], LANG === 'en' ? 'Docs' : '\u6587\u6863', s[1], p.title);
  }
}
KIND_RANK['Doc'] = -1; KIND_RANK['\u6587\u6863'] = -1;
idx(LANG === 'en' ? 'Quick ref' : '\u901f\u67e5',
    LANG === 'en' ? 'Class index' : '\u7c7b\u7d22\u5f15',
    LANG === 'en' ? 'Quick ref' : '\u901f\u67e5',
    'class-index',
    LANG === 'en' ? 'all 28 classes side by side: parent, own / total properties and methods, skin blocks' : '28 个类横向对照：父类、本类/可用属性与方法、皮肤块数');
idx(LANG === 'en' ? 'Quick ref' : '\u901f\u67e5',
    LANG === 'en' ? 'Properties x methods' : '\u5c5e\u6027 \u00d7 \u65b9\u6cd5',
    LANG === 'en' ? 'Quick ref' : '\u901f\u67e5',
    'props-methods',
    LANG === 'en' ? 'is a property method-specific? which fields does each method read or write?' : '属性是不是只对某个方法有效？每个方法读写哪些字段？');
// universal New keys are searchable once (they belong to no class): jump to the guide sections
(function indexUniversalKeys() {
  const where = LANG === 'en' ? 'Universal keys' : '通用键';
  const rows = [
    ['parent', 'nk-struct', LANG === 'en' ? 'parent of the new control; required for a top-level control (Chili.Screen0)' : '父控件；顶层控件必须写 parent = Chili.Screen0'],
    ['children', 'nk-struct', LANG === 'en' ? 'array of child controls passed to New (must be an array)' : 'New 里传入的子控件数组（必须是数组）'],
    ['name', 'nk-struct', LANG === 'en' ? 'control name used by GetChildByName / childrenByName' : '控件名，用于 GetChildByName / childrenByName'],
    ['classname', 'nk-struct', LANG === 'en' ? 'selects the skin (skin[classname])' : '决定套用哪套皮肤（skin[classname]）'],
    ['clientWidth', 'nk-struct', LANG === 'en' ? 'inner width, converted to width via padding' : '内部可绘区宽，按 padding 换算成 width'],
    ['clientHeight', 'nk-struct', LANG === 'en' ? 'inner height, converted to height via padding' : '内部可绘区高，按 padding 换算成 height'],
    ['minimumSize', 'nk-struct', LANG === 'en' ? 'legacy spelling of minWidth + minHeight' : 'minWidth + minHeight 的旧写法'],
    ['x', 'nk-geometry', LANG === 'en' ? 'left edge; negative counts from the right, string is a percentage' : '左边界；负数从右量，字符串是百分比'],
    ['y', 'nk-geometry', LANG === 'en' ? 'top edge; negative counts from the bottom, string is a percentage' : '上边界；负数从下量，字符串是百分比'],
    ['width', 'nk-geometry', LANG === 'en' ? 'width of the control (number, percentage, or derived from x + right)' : '宽度（数字 / 百分比，或由 x + right 推出）'],
    ['height', 'nk-geometry', LANG === 'en' ? 'height of the control (number, percentage, or derived from y + bottom)' : '高度（数字 / 百分比，或由 y + bottom 推出）'],
    ['right', 'nk-geometry', LANG === 'en' ? 'distance from the parent right edge (right alignment / stretch)' : '离父控件右边的距离（贴右 / 拉伸）'],
    ['bottom', 'nk-geometry', LANG === 'en' ? 'distance from the parent bottom edge (bottom alignment / stretch)' : '离父控件下边的距离（贴底 / 拉伸）'],
    ['font', 'nk-font', LANG === 'en' ? 'font table, merged field by field with the class default' : '字体表，与类默认字体逐层合并'],
    ['noFont', 'nk-font', LANG === 'en' ? 'do not create a Font object' : '不创建 Font 对象'],
    ['objectOverrideFont', 'nk-font', LANG === 'en' ? 'share an existing Font instance' : '共享已存在的 Font 实例'],
    ['hitTestAllowEmpty', 'nk-hit', LANG === 'en' ? 'clicks on empty client area still count as this control' : '点在客户区空白处也算点到自己'],
    ['noClickThrough', 'nk-hit', LANG === 'en' ? 'swallow clicks outside the client area' : '吃掉客户区外的点击'],
    ['disableChildrenHitTest', 'nk-hit', LANG === 'en' ? 'skip hit testing of children' : '不测试子控件命中'],
    ['snapToGrid', 'nk-hit', LANG === 'en' ? 'snap to the grid while dragging' : '拖动时按网格吸附'],
    ['visible', 'nk-traps', LANG === 'en' ? 'visible = false is overwritten on attach; call Hide() afterwards' : 'visible = false 会被挂载时覆盖，构造完调 Hide()'],
  ];
  for (const r of rows) idx('属性', r[0], where, r[1], r[2]);
})();

const mods = moduleFiles();
let body = '';
body += renderDocs();
body += renderPages();

body += '<section class="doc-sec quickref" id="quickref">' + renderClassIndex() + '</section>';
body += '<section class="doc-sec propsmethods" id="propsmethods">' + renderPropsMethods() + '</section>';

body += '<section class="doc-sec" id="inheritance"><h1>' + pk('类继承树', 'Class tree') + '</h1>' + renderTree() + '</section>';

body += '<section class="doc-sec" id="classes"><h1>' + pk('控件类', 'Classes') + ' <span class="count">' + classes.length + pk(' 个', '') + '</span></h1>';

body += '<p>按 <code>core.lua</code> 的加载顺序排列（父类在前）。每个类一节：属性表（含默认值）、继承属性、方法清单与方法详情（参数 / 返回值）、继承方法与别名。</p>';
for (const c of classes) body += renderClass(c);
body += '</section>';

body += '<section class="doc-sec" id="modules"><h1>辅助模块 <span class="count">' + mods.length + ' 个文件</span></h1>';
body += '<p><code>Handlers/</code> 与 <code>Headers/</code> 提供纹理、字体、皮肤、主题、任务调度等底层服务；<code>Themes/theme.lua</code> 定义默认主题，<code>core.lua</code> 是框架入口。</p>';
for (const f of mods) body += renderModule(f);
body += '</section>';

body += '<section class="doc-sec" id="skins"><h1>' + pk('皮肤（Skins）', 'Skins') + ' <span class="count">' + skins.length + pk(' 个', '') + '</span></h1>';
body += '<p class="lead">' + pk(
  'Chili 的外观由皮肤数据驱动：每个 <code>skin.&lt;控件类名&gt;</code> 表提供该控件的颜色、贴图、字体、边距等字段，'
  + '运行时由 <code>Handlers/skinhandler.lua</code> 在<b>构造时</b>把这些字段「只填空位」地合并进控件实例；控件的 <code>DrawControl</code> 依据这些字段绘制。'
  + '所以换皮肤有两种含义：<b>①</b> 换一套现成的（下面列了 11 套的实际字段），<b>②</b> 自己写一套。两种做法、三个层级（全局 / 按类 / 单控件）以及「为什么改完老控件不变」的完整说明都在 '
  + '<a href="#guide-skins"><b>换皮肤教程</b></a>，可运行的案例见 <code>LuaUI/Widgets/chili_demo_09_skins.lua</code>。',
  'Chili appearance is driven by skin data: each <code>skin.&lt;classname&gt;</code> table supplies colors, textures, fonts and margins for that control, and '
  + '<code>Handlers/skinhandler.lua</code> merges them into the instance <b>at construction time</b> (fill-only); <code>DrawControl</code> then paints from those fields. '
  + 'So switching skins has two meanings: <b>(1)</b> pick one of the bundled sets (all 11 are listed below with their actual fields), <b>(2)</b> write your own. '
  + 'Both, the three scopes (global / per class / per control) and why existing controls do not change are explained in the '
  + '<a href="#guide-skins"><b>skins guide</b></a>; the runnable demo is <code>LuaUI/Widgets/chili_demo_09_skins.lua</code>.') + '</p>';
if (skins.length) {
  body += '<table class="compact"><thead><tr><th>' + pk('皮肤', 'Skin') + '</th><th>' + pk('info.name', 'info.name') + '</th><th>' + pk('控件块数', 'Class blocks') + '</th><th>' + pk('一句话', 'Notes') + '</th></tr></thead><tbody>';
  for (const s of skins) {
    body += '<tr><td class="nm"><a href="#' + skinAnchor(s.name) + '"><b>' + esc(s.name) + '</b></a></td>'
      + '<td class="ty"><code>' + esc((s.info && s.info.name) || s.name) + '</code></td>'
      + '<td class="num">' + s.groups.length + '</td>'
      + '<td class="ds">' + (skinNote(s.name) ? esc(skinNote(s.name)) : '<span class="noD">—</span>') + '</td></tr>';
  }
  body += '</tbody></table>';
  body += '<p class="legend">' + pk('默认皮肤由 <code>Themes/theme.lua</code> 的 <code>theme.skin.general.skinName</code> 决定，当前值 <code>"Evolved"</code>。',
    'The default skin comes from <code>theme.skin.general.skinName</code> in <code>Themes/theme.lua</code>; the current value is <code>"Evolved"</code>.') + '</p>';
}
for (const s of skins) body += renderSkin(s);
body += '</section>';

body += '<section class="doc-sec" id="files">' + renderFiles() + '</section>';

let html = '<!DOCTYPE html>\n<html lang="' + TXT.htmlLang + '">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  + '<title>' + esc(TXT.pageTitle) + '</title>\n'
  + '<style>\n' + CSS + '\n' + EXTRA_CSS + '\n' + DARK_CSS + '\n</style>\n'
  + '<script>(function(){try{var t=localStorage.getItem("chili-doc-theme")||' + JSON.stringify(DEFAULT_THEME) + ';if(t==="dark")document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();</script>\n'
  + '</head>\n<body>\n'
  + '<div id="topbar"><div class="brand">' + esc(TXT.brand) + '<span>' + esc(TXT.brandSub(classes.length, totalLines)) + '</span></div><div class="grow"></div>'
  + repoLink()
  + '<button id="themebtn" type="button" title="' + esc(DEFAULT_THEME === 'dark' ? pk('切换到白天模式', 'Switch to light mode') : pk('切换到黑夜模式', 'Switch to dark mode')) + '">' + esc(DEFAULT_THEME === 'dark' ? pk('\u2600 白天', '\u2600 Light') : pk('\u263e 黑夜', '\u263e Dark')) + '</button>'
  + '<a class="lang" href="' + OTHER_DOC + '" title="' + esc(TXT.otherLang) + '">' + esc(TXT.otherLang) + '</a>'
  + '<div class="searchbox"><input id="search" placeholder="' + esc(TXT.placeholder) + '" autocomplete="off" spellcheck="false"><div id="results"></div></div></div>\n'
  + '<div id="layout">\n<nav id="nav">' + renderNav() + '</nav>\n<main id="content">' + body + '</main>\n</div>\n'
  + '<button id="backtop" title="\u2191">\u2191</button>\n'
  + '<script>\n' + buildJs() + '\n</script>\n</body>\n</html>\n';

if (LANG === 'en') html = applyI18n(html);

fs.writeFileSync(OUT, html, 'utf8');
console.log('OK ->', OUT);
console.log('  bytes      :', Buffer.byteLength(html, 'utf8'));
console.log('  lang       :', LANG);
console.log('  classes    :', docClasses.length, '(public)' + (raw.classes.length !== docClasses.length ? ' +' + (raw.classes.length - docClasses.length) + ' local/private' : ''));
console.log('  moduleFiles:', mods.length);
console.log('  skins      :', skins.length);
console.log('  indexItems :', INDEX.length);
console.log('  desc files :', fs.existsSync(descDir) ? walkJson(descDir).length + ' json (one per source path)' : '(none)');

// ---------- stats: printed for reference; --update-stats rewrites config/stats.json ----------
(function statsReport() {
  const actual = Object.keys(ACTUAL).map(k => k + '=' + ACTUAL[k]).join(' ');
  console.log('  stats      :', actual);
  const cfg = statValues();
  const diff = Object.keys(ACTUAL).filter(k => cfg[k] !== ACTUAL[k]);
  if (diff.length) console.log('  stats.json : differs from the source for ' + diff.join(',') + ' (run build-all --update-stats to refresh)');
  if (process.argv.indexOf('--update-stats') >= 0) {
    const p = path.join(CONFIG_DIR, 'stats.json');
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const out = {
      _comment: '这些数字直接决定文档首页的统计卡片；改过源码后可以运行 node _docbuild/build-all.cjs --update-stats 重新写入。',
      generated: new Date().toISOString().slice(0, 10),
      values: ACTUAL,
    };
    fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('  stats.json : updated ->', p);
  }
})();
