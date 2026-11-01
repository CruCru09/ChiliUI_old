#!/usr/bin/env node
// ============================================================================
//  Chili UI docs - one-command build (Windows / macOS / Linux)
//
//    node _docbuild/build-all.cjs                 # build both languages
//    node _docbuild/build-all.cjs --update-stats  # + write config/stats.json
//    node _docbuild/build-all.cjs <repoDir>       # build some other checkout
//
//  Steps: parse.cjs (scan every .lua) -> build.cjs zh -> build.cjs en
//         -> descsyns --check --summary (read-only) -> checks
// ============================================================================
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const root = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(__dirname, '..'));
const D = __dirname;
const node = process.execPath;

function step(label, script, extra) {
  console.log('\n=== ' + label + ' ===');
  const r = spawnSync(node, [path.join(D, script), root].concat(extra || []), { stdio: 'inherit', cwd: root });
  if (r.status !== 0) {
    console.error('\n[FAILED] ' + label + ' (exit ' + r.status + ')');
    process.exit(r.status || 1);
  }
}

console.log('Chili UI docs builder');
console.log('  node    : ' + process.version);
console.log('  repo    : ' + root);
if (!fs.existsSync(path.join(D, 'parse.cjs'))) { console.error('!! _docbuild/parse.cjs not found'); process.exit(2); }

// fingerprint of the description folders: the build itself must never touch them
function hashTree(dir) {
  if (!fs.existsSync(dir)) return 'missing';
  const files = [];
  (function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p); else if (ent.name.endsWith('.json')) files.push(p);
    }
  })(dir);
  files.sort();
  const h = crypto.createHash('sha256');
  for (const p of files) { h.update(path.relative(dir, p).replace(/\\/g, '/')); h.update('\0'); h.update(fs.readFileSync(p)); h.update('\0'); }
  return h.digest('hex');
}
const descHashBefore = hashTree(path.join(D, 'desc')) + '/' + hashTree(path.join(D, 'desc_en'));

step('1/4 scanning Lua sources', 'parse.cjs');
step('2/4 building Chinese page', 'build.cjs', ['zh'].concat(flags.has('--update-stats') ? ['--update-stats'] : []));
step('3/4 building English page', 'build.cjs', ['en']);

// ---------- description sync (read-only; never blocks the build) ----------
if (fs.existsSync(path.join(D, 'descsync.cjs'))) {
  console.log('\n=== 4/4 description sync check (read-only) ===');
  const sync = spawnSync(node, [path.join(D, 'descsync.cjs'), root, '--summary'], { stdio: 'inherit', cwd: root });
  if (sync.status === 1) console.log('  > to create the blank slots: 更新描述骨架.bat / update-desc-skeleton.bat');
  else if (sync.status !== 0) console.error('  !! descsyns failed (exit ' + sync.status + ') - the html above is still usable');
}
const descHashAfter = hashTree(path.join(D, 'desc')) + '/' + hashTree(path.join(D, 'desc_en'));
if (descHashBefore !== descHashAfter) {
  console.error('!! the _docbuild/desc folders changed during the build - some other process is writing them. Re-run after it stops.');
}

// ---------- sanity checks on the generated pages ----------
const pages = ['chiliui_api_reference.html', 'chiliui_api_reference_en.html'].map(f => {
  const candidates = [path.join(root, f)];
  try {
    const site = JSON.parse(fs.readFileSync(path.join(D, 'config', 'site.json'), 'utf8'));
    if (site.outputDir) candidates.unshift(path.resolve(root, site.outputDir, f));
  } catch (e) {}
  return candidates.find(p => fs.existsSync(p));
}).filter(Boolean);

if (!pages.length) { console.error('\n[FAILED] no generated html found'); process.exit(1); }

// ---------- readable diagnostics: where a leftover actually comes from ----------
const CONTENT_DIR = path.join(D, 'content');
const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]+/g;
const LANG_SWITCH = '\u4e2d\u6587';   // the "中文" header button is intentional on the English page

function codePoints(s) {
  return [...s].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
}
function snippetAt(text, index, width) {
  const from = Math.max(0, index - width);
  const to = Math.min(text.length, index + width);
  return (from > 0 ? '...' : '') + text.slice(from, to).replace(/\s+/g, ' ').trim() + (to < text.length ? '...' : '');
}
function sectionIdAt(text, index) {
  const start = text.lastIndexOf('<section', index);
  if (start < 0) return '';
  const end = text.indexOf('>', start);
  if (end < 0) return '';
  const m = /\sid="([^"]+)"/.exec(text.slice(start, end + 1));
  return m ? m[1] : '';
}
// every english markdown page, with its page id (front matter "id:" or the file name)
function readEnPages() {
  const out = [];
  if (!fs.existsSync(CONTENT_DIR)) return out;
  for (const kind of fs.readdirSync(CONTENT_DIR)) {
    const kd = path.join(CONTENT_DIR, kind);
    let st;
    try { st = fs.statSync(kd); } catch (e) { continue; }
    if (!st.isDirectory()) continue;
    for (const name of fs.readdirSync(kd)) {
      if (!/\.en\.md$/.test(name)) continue;
      const abs = path.join(kd, name);
      const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
      const meta = {};
      if (lines.length && lines[0].trim() === '---') {
        for (let k = 1; k < lines.length; k++) {
          if (lines[k].trim() === '---') break;
          const m = /^([A-Za-z_]\w*)\s*:\s*(.*)$/.exec(lines[k]);
          if (m) meta[m[1]] = m[2].trim();
        }
      }
      let rel = path.relative(process.cwd(), abs);
      if (rel.indexOf('..') === 0) rel = path.relative(root, abs);
      out.push({ id: meta.id || name.replace(/\.en\.md$/, ''), rel: rel.replace(/\\/g, '/'), lines: lines });
    }
  }
  return out;
}
const EN_PAGES = readEnPages();

console.log('\n=== checks ===');
const problems = [];
for (const file of pages) {
  const h = fs.readFileSync(file, 'utf8');
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const hrefs = [...h.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  // anchors that contain quotes / '+' come from javascript string templates, not real links
  const missing = [...new Set(hrefs.filter(x => !ids.has(x) && !/['"+ ]/.test(x)))];
  const indexItems = (h.match(/"a":"/g) || []).length;
  const placeholders = ['__INDEX_JSON__', '__L10N_JSON__'].filter(p => h.includes(p));
  let jsok = true;
  for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try { new Function(m[1]); } catch (e) { jsok = false; }
  }
  const name = path.basename(file);
  console.log('  ' + name);
  console.log('    ids=' + ids.size + '  links=' + hrefs.length + '  indexItems=' + indexItems
    + '  missingAnchors=' + missing.length + (missing.length ? ' ' + JSON.stringify(missing.slice(0, 6)) : '')
    + '  placeholders=' + (placeholders.length ? placeholders.join(',') : 'none') + '  js=' + (jsok ? 'ok' : 'ERR'));
  if (missing.length) problems.push(name + ': ' + missing.length + ' internal link(s) point at an anchor that does not exist: ' + JSON.stringify(missing.slice(0, 6)));
  if (placeholders.length) problems.push(name + ': unreplaced template placeholder ' + placeholders.join(', '));
  if (!jsok) problems.push(name + ': inline javascript does not parse');

  if (file.indexOf('_en') >= 0) {
    const text = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const found = [];
    for (const m of text.matchAll(CJK_RE)) {
      if (m[0] === LANG_SWITCH) continue;
      found.push({ s: m[0], i: m.index, section: sectionIdAt(text, m.index) });
    }
    if (!found.length) {
      console.log('    english page - chinese leftovers: 0');
    } else {
      const grouped = [];
      const seen = new Set();
      for (const f of found) {
        const key = f.s + '|' + f.section;
        if (seen.has(key)) continue;
        seen.add(key);
        grouped.push(f);
      }
      const chars = [...new Set(found.map(f => f.s))];
      console.log('    english page - chinese leftovers: ' + found.length + ' character(s), ' + chars.length + ' distinct');
      grouped.slice(0, 12).forEach((f, n) => {
        console.log('      ' + (n + 1) + ') ' + JSON.stringify(f.s) + '  (' + codePoints(f.s) + ')'
          + '  in ' + (f.section ? 'section #' + f.section : 'no page section (header / generated table)'));
        console.log('         generated html: ' + snippetAt(text, f.i, 70));
        const srcPage = EN_PAGES.filter(p => p.id === f.section)[0];
        if (srcPage) console.log('         page source   : ' + srcPage.rel);
      });
      if (grouped.length > 12) console.log('      ... and ' + (grouped.length - 12) + ' more place(s)');
      const fixLines = [];
      for (const p of EN_PAGES) {
        p.lines.forEach((line, idx) => {
          const hit = chars.filter(c => line.indexOf(c) >= 0);
          if (hit.length) fixLines.push({ rel: p.rel, no: idx + 1, text: line.trim(), chars: hit });
        });
      }
      if (fixLines.length) {
        console.log('    fix these lines (they are markdown files, edit them and rebuild):');
        for (const f of fixLines.slice(0, 20)) {
          console.log('      ' + f.rel + ':' + f.no + '   [' + f.chars.map(codePoints).join(' ') + ']');
          console.log('        ' + (f.text.length > 160 ? f.text.slice(0, 160) + '...' : f.text));
        }
        if (fixLines.length > 20) console.log('      ... and ' + (fixLines.length - 20) + ' more line(s)');
      } else {
        console.log('    no .en.md line contains these characters - they come from the builder itself:');
        console.log('      look for hard-coded text in _docbuild/build.cjs, or add the page source above.');
      }
      const where = [...new Set(grouped.map(f => f.section).filter(Boolean))];
      problems.push(name + ': ' + found.length + ' chinese character(s) left in an english page'
        + (where.length ? ' (pages: ' + where.join(', ') + ')' : '')
        + ' - the markdown line to edit is printed above');
    }
  }
}

if (problems.length) {
  console.log('\n[FAILED] the generated pages have problems:');
  problems.forEach(p => console.log('  - ' + p));
  console.log('\n  Each problem above names the page and, for text problems, the markdown file:line to edit.');
  console.log('  Fix those lines and run the build again.');
  process.exit(1);
}
console.log('\nPASS - generated pages look consistent');
process.exit(0);
