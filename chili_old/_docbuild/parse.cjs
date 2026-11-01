
// Chili UI source parser -> raw inventory JSON
const fs = require('fs');
const path = require('path');

// Default root = the framework directory (the parent of _docbuild), so this can be run from
// the repository root as `node chili_old/_docbuild/parse.cjs`.
const cwd = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const OUT = path.join(cwd, '_docbuild', 'raw.json');
// --stdout: print the inventory as JSON and write nothing. Used by descsync.cjs so a
// structure check can look at the current sources without touching the workspace.
const STDOUT = process.argv.indexOf('--stdout') >= 0;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name === '_docbuild' || ent.name === '.git') continue; walk(p, out); }
    else if (ent.name.toLowerCase().endsWith('.lua')) out.push(p);
  }
  return out;
}
const relFiles = walk(cwd).map(f => path.relative(cwd, f).replace(/\\/g, '/')).sort();

function skipString(t, i) {
  const q = t[i];
  if (q === '"' || q === "'") {
    i++;
    while (i < t.length) {
      if (t[i] === '\\') { i += 2; continue; }
      if (t[i] === q) return i + 1;
      if (t[i] === '\n') return i;
      i++;
    }
    return i;
  }
  return -1;
}
function skipLongBracket(t, i) {
  let j = i + 1, level = 0;
  while (t[j] === '=') { level++; j++; }
  if (t[j] !== '[') return -1;
  const close = ']' + '='.repeat(level) + ']';
  const k = t.indexOf(close, j + 1);
  return k === -1 ? t.length : k + close.length;
}
function skipComment(t, i) {
  let j = i + 2;
  const lb = (t[j] === '[') ? skipLongBracket(t, j) : -1;
  if (lb !== -1) return lb;
  const nl = t.indexOf('\n', j);
  return nl === -1 ? t.length : nl;
}
function matchBrace(t, openIdx) {
  let i = openIdx + 1, depth = 1;
  while (i < t.length) {
    const c = t[i];
    if (c === '"' || c === "'") { i = skipString(t, i); continue; }
    if (c === '[') { const lb = skipLongBracket(t, i); if (lb !== -1) { i = lb; continue; } }
    if (c === '-' && t[i + 1] === '-') { i = skipComment(t, i); continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}
function lineOf(t, idx) { let n = 1; for (let i = 0; i < idx; i++) if (t[i] === '\n') n++; return n; }
function stripCommentsFromValue(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'") { const j = skipString(s, i); out += s.slice(i, j); i = j; continue; }
    if (c === '-' && s[i + 1] === '-') { i = skipComment(s, i); continue; }
    out += c; i++;
  }
  return out.replace(/\s+/g, ' ').trim();
}
function cleanComment(s) {
  return s.replace(/^\s*--+\/?\/?\s?/, '').trim();
}

// Parse a table body into fields: {name, raw, comment, line, nested}
function parseFields(body, startLine) {
  const fields = [];
  const n = body.length;
  let i = 0;
  let pending = []; // comment lines pending
  while (i < n) {
    // consume whitespace, collecting comment lines
    let consumedComment = false;
    while (i < n) {
      if (/\s/.test(body[i])) { i++; continue; }
      if (body[i] === '-' && body[i + 1] === '-') {
        const end = skipComment(body, i);
        const txt = cleanComment(body.slice(i, end));
        if (txt) pending.push(txt); else pending.push('');
        i = end;
        consumedComment = true;
        continue;
      }
      break;
    }
    if (i >= n) break;
    if (body[i] === ',' || body[i] === ';') { i++; pending = []; continue; }
    if (body[i] === '[') {
      const lb = skipLongBracket(body, i);
      if (lb !== -1) { i = lb; pending = []; continue; }
    }
    const m = /^[A-Za-z_]\w*/.exec(body.slice(i, i + 120));
    if (!m) { i++; pending = []; continue; }
    const key = m[0];
    let j = i + key.length;
    while (j < n && body[j] === ' ') j++;
    if (!(body[j] === '=' && body[j + 1] !== '=')) { i = j; pending = []; continue; }
    const eqPos = j;
    const fLine = startLine + lineOf(body, i) - 1;
    const commentLines = pending.filter(x => x !== '');
    pending = [];
    // scan value
    let k = eqPos + 1, depth = 0, inStr = null;
    while (k < n) {
      const c = body[k];
      if (c === '"' || c === "'") { k = skipString(body, k); continue; }
      if (c === '[') { const lb = skipLongBracket(body, k); if (lb !== -1) { k = lb; continue; } }
      if (c === '-' && body[k + 1] === '-') { k = skipComment(body, k); continue; }
      if (c === '{' || c === '(' || c === '[') { depth++; k++; continue; }
      if (c === '}' || c === ')' || c === ']') { depth--; k++; continue; }
      if (depth === 0 && (c === ',' || c === ';')) break;
      if (depth === 0 && c === '\n') {
        let la = k + 1;
        while (la < n && /\s/.test(body[la])) la++;
        if (la >= n) break;
        if (body[la] === '}') break;
        const m2 = /^[A-Za-z_]\w*\s*=[^=]/.exec(body.slice(la, la + 120));
        if (m2) break;
      }
      k++;
    }
    const rawVal = body.slice(eqPos + 1, k).trim();
    // trailing comment on the value's last line
    let tail = '';
    const restOfLine = body.slice(k).split('\n')[0];
    const tm = /^\s*(?:,|;)?\s*(--.*)$/.exec(restOfLine);
    if (tm) tail = cleanComment(tm[1]);
    fields.push({
      name: key,
      raw: stripCommentsFromValue(rawVal).slice(0, 400),
      comment: [commentLines.join(' ').replace(/\s+/g, ' ').trim(), tail].filter(Boolean).join(' | '),
      line: fLine,
    });
    i = k;
  }
  return fields;
}

// strip comments from a line for structural regexes (keep code)
function stripLineComment(line) {
  let out = '', i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'") {
      const s = i; i = skipString(line, i); out += line.slice(s, i); continue;
    }
    if (c === '-' && line[i + 1] === '-') break;
    out += c; i++;
  }
  return out;
}

// ---- block end + property usage ----
function stripCode(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'") { const j = skipString(s, i); out += '""'; i = j; continue; }
    if (c === '-' && s[i + 1] === '-') { i = skipComment(s, i); continue; }
    if (c === '[') { const lb = skipLongBracket(s, i); if (lb !== -1) { out += '[]'; i = lb; continue; } }
    out += c; i++;
  }
  return out;
}
// returns the 0-based index of the line that closes the block opened at startLine (1-based)
function findEndIdx(lines, startLine) {
  let depth = 0, seen = false;
  for (let li = startLine - 1; li < lines.length; li++) {
    const code = stripCode(lines[li]);
    depth += (code.match(/\b(?:function|then|do|repeat)\b/g) || []).length;
    seen = true;
    // an `elseif ... then` adds a second `then` for the same `end`
    depth -= (code.match(/\b(?:end|until|elseif)\b/g) || []).length;
    if (seen && depth <= 0) return li;
  }
  return lines.length - 1;
}
// which instance fields does this function read / write?  (self.x / obj.x)
function propUsage(text) {
  const uses = {};
  const re = /\b(?:self|obj)\.([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(text))) {
    const prop = m[1];
    const rest = text.slice(m.index + m[0].length);
    const write = /^\s*=(?!=)/.test(rest);
    const cur = uses[prop];
    if (write) uses[prop] = (cur === 'r') ? 'rw' : (cur === 'rw' ? 'rw' : 'w');
    else if (!cur) uses[prop] = 'r';
    else if (cur === 'w') uses[prop] = 'rw';
  }
  return uses;
}

const classes = [];
const moduleFuncs = {};
const assignments = [];
const modulesMeta = {};

for (const rel of relFiles) {
  const t = fs.readFileSync(path.join(cwd, rel), 'utf8');
  const lines = t.split('\n');

  // ---- class / table definitions ----
  // `local X = Parent:Inherit{...}` defines a file-private class; it is parsed so structure
  // checks know it exists, but it is marked local:true and kept out of the public docs.
  const reInherit = /^(local[ \t]+)?([A-Za-z_]\w*)\s*=\s*(?:([A-Za-z_]\w*)\s*:\s*)?Inherit\s*\{/gm;
  let mm;
  while ((mm = reInherit.exec(t))) {
    const openIdx = t.indexOf('{', mm.index);
    const closeIdx = matchBrace(t, openIdx);
    if (closeIdx < 0) continue;
    const body = t.slice(openIdx + 1, closeIdx);
    classes.push({
      name: mm[2], parent: mm[3] || null, file: rel, line: lineOf(t, mm.index),
      local: !!mm[1],
      props: parseFields(body, lineOf(t, openIdx + 1)),
      funcs: [],
    });
  }
  const reRoot = /^(Object)\s*=\s*\{/gm;
  while ((mm = reRoot.exec(t))) {
    const openIdx = t.indexOf('{', mm.index);
    const closeIdx = matchBrace(t, openIdx);
    if (closeIdx < 0) continue;
    classes.push({
      name: 'Object', parent: null, file: rel, line: lineOf(t, mm.index),
      props: parseFields(t.slice(openIdx + 1, closeIdx), lineOf(t, openIdx + 1)), funcs: [],
    });
  }

  // ---- function definitions ----
  const reF = /^function\s+([A-Za-z_]\w*(?:[.:]\w+)+)\s*\(([^)]*)\)/gm;
  while ((mm = reF.exec(t))) {
    const full = mm[1];
    const ln = lineOf(t, mm.index);
    const sepIdx = Math.max(full.lastIndexOf('.'), full.lastIndexOf(':'));
    const owner = full.slice(0, sepIdx);
    const sep = full[sepIdx];
    const fname = full.slice(sepIdx + 1);
    const prev = [];
    for (let x = ln - 2; x >= 0; x--) {
      const tr = (lines[x] || '').trim();
      if (tr.startsWith('--')) { const c = cleanComment(tr); if (c) prev.unshift(c); }
      else if (tr === '' && prev.length === 0) continue;
      else break;
    }
    const comment = prev.join(' ').replace(/\s+/g, ' ').trim();
    const cls = classes.find(c => c.name === owner);
    const endIdx = findEndIdx(lines, ln);
    const bodyText = lines.slice(ln - 1, endIdx + 1).join('\n');
    const rec = { name: fname, kind: sep === ':' ? 'method' : 'static', args: mm[2].trim(), line: ln, endLine: endIdx + 1, uses: propUsage(bodyText), comment };
    if (cls) cls.funcs.push(rec);
    else { (moduleFuncs[rel] = moduleFuncs[rel] || []).push(Object.assign({ owner }, rec)); }
  }

  // ---- global function definitions (function Name(...)) ----
  const reG = /^function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/gm;
  while ((mm = reG.exec(t))) {
    const ln = lineOf(t, mm.index);
    const prev = [];
    for (let x = ln - 2; x >= 0; x--) {
      const tr = (lines[x] || '').trim();
      if (tr.startsWith('--')) { const c = cleanComment(tr); if (c) prev.unshift(c); }
      else if (tr === '' && prev.length === 0) continue;
      else break;
    }
    const gEnd = findEndIdx(lines, ln);
    (moduleFuncs[rel] = moduleFuncs[rel] || []).push({
      owner: '', name: mm[1], kind: 'global', args: mm[2].trim(), line: ln, endLine: gEnd + 1,
      uses: propUsage(lines.slice(ln - 1, gEnd + 1).join('\n')),
      comment: prev.join(' ').replace(/\s+/g, ' ').trim(),
    });
  }

  // ---- top-level assignments (Class.field = value) ----
  for (let li = 0; li < lines.length; li++) {
    const code = stripLineComment(lines[li]).trim();
    const am = /^([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(code);
    const isClassLevel = !!am && /^[A-Z]/.test(am[1]) && ['VFS','Spring','WG','LUAUI','CHILI','SCEN','Game','table','string','math','io','os','coroutine'].indexOf(am[1]) < 0;
    if (am && am[3] !== undefined && isClassLevel) {
      assignments.push({ owner: am[1], field: am[2], value: am[3].trim().slice(0, 200), file: rel, line: li + 1 });
    }
  }

  // ---- module meta: header comment block ----
  const head = lines.slice(0, 12).map(l => l.trim()).filter(l => l.startsWith('--'));
  modulesMeta[rel] = { lines: lines.length, header: head.map(cleanComment).filter(Boolean).join(' ') };
}

// Lua keeps the LAST definition of a duplicated function, so the docs must show the last one too.
// (The old code kept the first, which could show a body that no longer exists.)
function dedupeKeepLast(list, keyFn, label) {
  const counts = new Map();
  for (const x of list) { const k = keyFn(x); counts.set(k, (counts.get(k) || 0) + 1); }
  const dups = [...counts].filter(([, n]) => n > 1).map(([k, n]) => k + ' x' + n);
  if (dups.length) console.error('!! duplicate ' + label + ': ' + dups.join(', ') + ' — Lua runs the last definition, the docs now show that one');
  const last = new Map();
  list.forEach((x, i) => last.set(keyFn(x), i));
  return list.filter((x, i) => last.get(keyFn(x)) === i);
}
for (const c of classes) {
  c.funcs = dedupeKeepLast(c.funcs, f => f.kind + ':' + f.name, 'method ' + c.name);
}
for (const f of Object.keys(moduleFuncs)) {
  moduleFuncs[f] = dedupeKeepLast(moduleFuncs[f], x => (x.owner || '') + '|' + x.name + '|' + x.kind, 'function in ' + f);
}
const modKeys = {};
for (const f of Object.keys(moduleFuncs)) for (const x of moduleFuncs[f]) modKeys[x.kind] = (modKeys[x.kind] || 0) + 1;
const inventory = { files: relFiles, classes, moduleFuncs, assignments, modulesMeta };
if (STDOUT) {
  process.stdout.write(JSON.stringify(inventory));
  process.exit(0);
}
fs.writeFileSync(OUT, JSON.stringify(inventory, null, 1));
// human readable summary
let s = 'classes: ' + classes.length + '\n';
for (const c of classes) s += c.name + ' (parent=' + (c.parent || '-') + ') ' + c.file + ' props=' + c.props.length + ' funcs=' + c.funcs.length + '\n';
s += '\nmoduleFuncs (' + JSON.stringify(modKeys) + '):\n';
for (const f of Object.keys(moduleFuncs)) s += f + ': ' + moduleFuncs[f].map(a => a.owner + (a.kind === 'method' ? ':' : '.') + a.name).join(', ') + '\n';
s += '\nassignments: ' + assignments.length + '\n';
for (const a of assignments) s += a.owner + '.' + a.field + ' = ' + a.value + '  [' + a.file + ':' + a.line + ']\n';
console.log(s);
