'use strict';
// _checkmd.cjs - validate a markdown doc page.
//   node _docbuild/_checkmd.cjs guides guide-start     (checks both languages)
//   node _docbuild/_checkmd.cjs guides/guide-start.zh.md
// Reports front matter, heading ids, block stats, unknown embeds and, for
// guides, heading ids that are missing compared with the legacy .html page (if one was kept).
const fs = require('fs');
const path = require('path');
const MD = require('./md.cjs');
const cwd = path.resolve(__dirname, '..');
const BT = String.fromCharCode(96);
const FENCE = BT + BT + BT;

function render(mdFile) {
  const src = fs.readFileSync(mdFile, 'utf8').replace(/\r\n/g, '\n');
  const fm = MD.parseFrontMatter(src);
  const unknown = [];
  const html = MD.renderMd(fm.body, {
    hl: (l, c) => c,
    codeWrap: (t, h, b) => b,
    codeBlock: (f, h) => 'CODE(' + f + ')',
    embed: (n) => { if (!['stats','loadorder','tagline','sitetagline','统计','加载顺序'].includes(String(n).toLowerCase())) unknown.push(n); return 'EMBED(' + n + ')'; },
  });
  return { fm, html, unknown };
}

function ids(html) {
  const out = [];
  const re = /\sid="([A-Za-z0-9_.:-]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}

function legacyIds(base, lang) {
  const f = path.join(cwd, '_docbuild', 'pages', base + '.' + lang + '.html');
  if (!fs.existsSync(f)) return null;
  return ids(fs.readFileSync(f, 'utf8'));
}

function check(mdFile, base, lang) {
  const { fm, html, unknown } = render(mdFile);
  const hid = ids(html);
  const name = path.basename(mdFile);
  const problems = [];
  for (const k of ['title', 'short', 'desc']) if (!fm.meta[k]) problems.push('front matter missing ' + k);
  if (!/^#\s+/.test(fm.body.replace(/^\s+/, ''))) problems.push('no h1 heading');
  if (unknown.length) problems.push('unknown embed: ' + unknown.join(', '));
  const leg = base ? legacyIds(base, lang) : null;
  const h1ids = ids((html.match(/<h1[\s\S]*?<\/h1>/g) || ['']).join(''));
  let missing = [];
  let extra = [];
  if (leg) {
    missing = leg.filter(x => hid.indexOf(x) < 0);
    // the id auto-generated from the h1 heading is new by design (it is the page anchor)
    extra = hid.filter(x => leg.indexOf(x) < 0 && h1ids.indexOf(x) < 0);
  }
  const h2 = (html.match(/<h2/g) || []).length;
  const tables = (html.match(/<table/g) || []).length;
  const fences = (fm.body.match(new RegExp('^' + FENCE, 'gm')) || []).length;
  const codes = (fm.body.match(/\{\{CODE:/g) || []).length;
  const embeds = (fm.body.match(/^\[\[[a-z0-9_-]+\]\]/gim) || []).length;
  console.log('--- ' + name);
  console.log('  title : ' + (fm.meta.title || '(none)'));
  console.log('  short : ' + (fm.meta.short || '(none)') + '  id: ' + (fm.meta.id || '(file name)'));
  console.log('  ids   : ' + hid.length + (hid.length ? ' -> ' + hid.join(', ') : ''));
  console.log('  blocks: h2=' + h2 + ' tables=' + tables + ' fenced=' + fences + ' codeTokens=' + codes + ' embeds=' + embeds);
  if (leg) {
    if (missing.length) problems.push('missing anchors vs legacy page: ' + missing.join(', '));
    if (extra.length) problems.push('new anchors (check they are intended): ' + extra.join(', '));
    console.log('  legacy: ' + leg.length + ' ids, missing=' + missing.length + ', extra=' + extra.length);
  }
  if (problems.length) { console.log('  PROBLEMS:'); problems.forEach(p => console.log('   - ' + p)); }
  return problems.length;
}

const a = process.argv[2] || '';
let bad = 0;
if (a.indexOf('.md') > 0) {
  bad += check(path.resolve(cwd, a), null, null);
} else {
  const kind = a;
  const base = process.argv[3];
  if (!kind || !base) { console.error('usage: node _docbuild/_checkmd.cjs guides guide-start'); process.exit(2); }
  for (const lang of ['zh', 'en']) {
    const f = path.join(cwd, '_docbuild', 'content', kind, base + '.' + lang + '.md');
    if (!fs.existsSync(f)) { console.log('--- ' + base + '.' + lang + '.md MISSING'); bad++; continue; }
    bad += check(f, kind === 'guides' ? base : null, lang);
  }
}
console.log(bad ? 'RESULT: ' + bad + ' problem(s)' : 'RESULT: OK');
process.exit(bad ? 1 : 0);