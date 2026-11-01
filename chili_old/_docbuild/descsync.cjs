#!/usr/bin/env node
// ============================================================================
//  descsync.cjs - keep the per-source-file description JSON in sync with the Lua sources.
//
//  Layout it manages:
//      _docbuild/desc/<path>.json       Chinese descriptions
//      _docbuild/desc_en/<path>.json    English descriptions
//  one JSON file per documented Lua source file, same relative path (Controls/font.json).
//
//  READ-ONLY by default. Nothing is written unless --write (or --rename) is given.
//
//    node _docbuild/descsync.cjs <repoDir>                 # check only, full report
//    node _docbuild/descsync.cjs <repoDir> --summary       # one short block (used by build-all)
//    node _docbuild/descsync.cjs <repoDir> --write         # add skeletons / blank keys, backup first
//    node _docbuild/descsync.cjs <repoDir> --write --prune # also drop orphaned descriptions
//    node _docbuild/descsync.cjs <repoDir> --rename "A.B=C.B"
//    node _docbuild/descsync.cjs <repoDir> --rollback 2026-11-01_02-19-33
//    node _docbuild/descsync.cjs <repoDir> --lang en       # English report text
//
//  Exit codes: 0 = everything in sync, 1 = pending work (safe to build), 2 = error.
//
//  Safety rules:
//    * missing descriptions are only ever ADDED as empty strings, never overwritten;
//    * removed/renamed members are moved unchanged into "_orphans" and restored automatically
//      when the same key reappears;
//    * deleted source files never make the build fail: the referenced descriptions are reported
//      and, with --write, moved into _docbuild/_attic/removed-<ts>/ (never deleted);
//    * every --write first copies both desc trees into _docbuild/_attic/auto-<ts>/.
// ============================================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const D = __dirname;
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const valueAfter = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const VALUE_OPTS = new Set(['--rename', '--rollback', '--lang']);
// the repo path is the first positional argument; skip values that belong to an option
const rootArg = argv.find((a, i) => !a.startsWith('--') && !/^\d{4}-\d\d-\d\d/.test(a) && !/[=:]/.test(a) && !VALUE_OPTS.has(argv[i - 1]));
const cwd = path.resolve(rootArg || path.join(D, '..'));
const MODE = flags.has('--write') || flags.has('--rename') ? 'write' : (flags.has('--rollback') ? 'rollback' : 'check');
const LANG = (valueAfter('--lang') || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';

const T = {
  zh: {
    title: 'Chili UI 描述同步(escsync)',
    repo: '仓库', readOnly: '只读检查', write: '写入模式', rollback: '回滚模式', summary: '摘要',
    sources: '源码', classes: '类', public: '公开', private: '文件私有（不文档化）', moduleFiles: '模块文件',
    desc: '描述文件', lang: '语言',
    secAdd: '需要新增（--write 会补空位，不覆盖已有文字）',
    secDesc: '需要填写的空描述',
    secOrphan: '已失效 / 孤儿描述（原文保留，未删除）',
    secRemoved: '源码文件已不存在（构建会自动跳过，不影响产物）',
    secRename: '疑似文件改名',
    secFrozen: '已冻结（_frozen: true，跳过）',
    frozenLabel: '已冻结',
    secErr: '错误',
    none: '无',
    nonePending: '结构完全同步，没有待处理项。',
    hintWrite: '要让脚本补上空位：运行「更新描述骨架.bat」（或 node _docbuild/descsync.cjs . --write）',
    hintOrphan: '如果只是改名：node _docbuild/descsync.cjs . --rename "Class:Old=Class:New"；确认删除可加 --prune',
    hintRemoved: '文件确实删了：node _docbuild/descsync.cjs . --write 会把描述移到 _docbuild/_attic/removed-<时间>/ 备份',
    hintBuild: '构建命令：node _docbuild/build-all.cjs（或双击 build-docs.bat）',
    hintCheck: '只读复查：node _docbuild/descsync.cjs .',
    hintEmpty: '直接编辑上面这些 json 文件把对应字段填上；只填空描述，别动已有文字（脚本 --write 也不会覆盖已有内容）',
    kFileDesc: '（文件说明）', kModule: '（模块摘要）', kClass: '（类摘要）', kProp: '（属性）', kFunc: '（函数）',
    sumEmpty: '空描述明细',
    doneWrite: '已写入',
    unchanged: '没有文件需要修改（幂等，未写盘）',
    backup: '备份目录',
    rollbackDone: '已回滚描述目录',
    rollbackNo: '找不到该时间戳的备份',
    manyGone: '一次检测到超过 20% 的源码文件消失，疑似目录不对或扫描不完整，已拒绝写入。确认无误请加 --force。',
    badRaw: '无法获得源码结构（parse.cjs --stdout 失败）',
    totals: '结论',
    todo: '待处理', clean: '干净',
    skippedSkin: '皮肤文件描述保留不动',
    sumClean: '描述同步：干净',
    sumTodo: '描述同步：待处理',
  },
  en: {
    title: 'Chili UI desc sync (descsync)',
    repo: 'repo', readOnly: 'read-only check', write: 'write mode', rollback: 'rollback', summary: 'summary',
    sources: 'sources', classes: 'classes', public: 'public', private: 'file-local (not documented)', moduleFiles: 'module files',
    desc: 'description files', lang: 'language',
    secAdd: 'missing (--write adds blank slots, never overwrites text)',
    secDesc: 'empty descriptions to fill in',
    secOrphan: 'orphaned descriptions (text kept, nothing deleted)',
    secRemoved: 'source files that no longer exist (build skips them, output still works)',
    secRename: 'possible file renames',
    secFrozen: 'frozen (_frozen: true, skipped)',
    frozenLabel: 'frozen',
    secErr: 'errors',
    none: 'none',
    nonePending: 'Everything is in sync - nothing to do.',
    hintWrite: 'to create the blank slots run update-desc-skeleton.bat (or node _docbuild/descsync.cjs . --write)',
    hintOrphan: 'if it was a rename: node _docbuild/descsync.cjs . --rename "Class:Old=Class:New"; if it was really deleted add --prune',
    hintRemoved: 'if the file is really gone: --write moves the descriptions to _docbuild/_attic/removed-<ts>/ (never deletes)',
    hintBuild: 'build with: node _docbuild/build-all.cjs (or double-click build-docs.bat)',
    hintCheck: 're-check read-only: node _docbuild/descsync.cjs .',
    hintEmpty: 'edit these json files and fill in only the empty fields (--write never overwrites existing text)',
    kFileDesc: ' (file description)', kModule: ' (module summary)', kClass: ' (class summary)', kProp: ' (property)', kFunc: ' (function)',
    sumEmpty: 'empty descriptions',
    doneWrite: 'written',
    unchanged: 'nothing to write (idempotent, disk untouched)',
    backup: 'backup',
    rollbackDone: 'description folders restored',
    rollbackNo: 'no backup with that timestamp',
    manyGone: 'more than 20% of the source files disappeared at once - looks like a wrong directory, refusing to write. Add --force if this is intended.',
    badRaw: 'cannot read the source inventory (parse.cjs --stdout failed)',
    totals: 'result',
    todo: 'pending', clean: 'clean',
    skippedSkin: 'skin descriptions kept untouched',
    sumClean: 'descriptions in sync',
    sumTodo: 'descriptions pending',
  },
}[LANG];
const t = k => T[k] || k;

function fail(msg, code) { console.error((LANG === 'en' ? '!! ' : '!! ') + msg); process.exit(code || 2); }
function relOf(p) { return path.relative(cwd, p).replace(/\\/g, '/'); }

// ---------- read the current source inventory (read-only) ----------
function readRaw() {
  try {
    const out = execFileSync(process.execPath, [path.join(D, 'parse.cjs'), cwd, '--stdout'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    fail(t('badRaw') + ': ' + (e.stderr ? String(e.stderr).split('\n')[0] : e.message));
  }
}
function moduleKey(fn) { return (fn.owner ? fn.owner + (fn.kind === 'method' ? ':' : '.') : '') + fn.name; }
const isHelper = f => /^(Handlers|Headers|Themes)\//.test(f) || f === 'core.lua';
const isSkin = f => /^Skins\//.test(f);

function buildExpected(raw) {
  const exp = new Map();
  const ensure = rel => { if (!exp.has(rel)) exp.set(rel, { file: rel, classes: new Map(), module: null, fileDesc: true }); return exp.get(rel); };
  for (const c of raw.classes || []) {
    if (c.local) continue; // file-private classes are intentionally not documented
    const e = ensure(c.file);
    e.classes.set(c.name, {
      props: new Set((c.props || []).map(p => p.name)),
      funcs: new Set((c.funcs || []).map(f => c.name + (f.kind === 'method' ? ':' : '.') + f.name)),
    });
  }
  for (const f of raw.files || []) {
    // Skins are documented with a one-line fileDesc only (their draw functions live in
    // the skin file as locals; default/skin.lua additionally keeps its hand-written module block).
    if (isSkin(f)) { ensure(f); continue; }
    const mf = (raw.moduleFuncs || {})[f] || [];
    if (!isHelper(f) && !mf.length) continue;
    ensure(f).module = new Set(mf.map(moduleKey));
  }
  return exp;
}

// ---------- load the desc tree ----------
function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkJson(p));
    else if (ent.isFile() && ent.name.endsWith('.json')) out.push(p);
  }
  return out.sort();
}
const EMPTY_ORPHANS = () => ({ classes: {}, modules: {}, files: {} });
function normalize(j, rel) {
  const o = Object.assign({}, j);
  o.file = j.file || rel.replace(/\.json$/, '');
  o.classes = j.classes && typeof j.classes === 'object' ? j.classes : {};
  o.module = j.module && typeof j.module === 'object' ? j.module : null;
  o.fileDesc = j.fileDesc !== undefined ? j.fileDesc : undefined;
  o._orphans = Object.assign(EMPTY_ORPHANS(), j._orphans || {});
  return o;
}
function loadTree(dir) {
  const map = new Map();
  for (const p of walkJson(dir)) {
    const rel = path.relative(dir, p).replace(/\\/g, '/').replace(/\.json$/, '');
    let j;
    try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail('bad json ' + rel + '.json: ' + e.message); }
    if (j && j.classes && (j.modules || j.files) && !j.file && !j.fileDesc && !j.module && !j._orphans) {
      fail('legacy flat desc file ' + rel + '.json - run the per-file migration first');
    }
    map.set(rel, normalize(j, rel));
  }
  return map;
}
function serialize(o) {
  const out = {};
  for (const k of Object.keys(o)) if (!['classes', 'module', 'fileDesc', '_orphans', 'file'].includes(k)) out[k] = o[k];
  out.file = o.file;
  if (o.classes && Object.keys(o.classes).length) out.classes = o.classes;
  if (o.module && (Object.keys(o.module.funcs || {}).length || o.module.summary)) out.module = o.module;
  if (o.fileDesc !== undefined) out.fileDesc = o.fileDesc;
  if (o._orphans && (Object.keys(o._orphans.classes || {}).length || Object.keys(o._orphans.modules || {}).length || Object.keys(o._orphans.files || {}).length)) out._orphans = o._orphans;
  return JSON.stringify(out, null, 2) + '\n';
}
const canon = o => serialize(o);
function orphanCount(o) { return Object.keys(o._orphans.classes || {}).length + Object.keys(o._orphans.modules || {}).length + Object.keys(o._orphans.files || {}).length; }
function anyOrphan(o) { const oc = o._orphans.classes || {}, om = o._orphans.modules || {}, of = o._orphans.files || {}; for (const k of Object.keys(oc)) if (Object.keys(oc[k].props || {}).length || Object.keys(oc[k].funcs || {}).length || oc[k].summary) return true; for (const k of Object.keys(om)) if (om[k].summary || Object.keys(om[k].funcs || {}).length) return true; for (const k of Object.keys(of)) if (of[k]) return true; return false; }
function cleanOrphans(o) {
  for (const k of Object.keys(o._orphans.classes || {})) { const v = o._orphans.classes[k]; if (!v.summary && !Object.keys(v.props || {}).length && !Object.keys(v.funcs || {}).length) delete o._orphans.classes[k]; }
  for (const k of Object.keys(o._orphans.modules || {})) { const v = o._orphans.modules[k]; if (!v.summary && !Object.keys(v.funcs || {}).length) delete o._orphans.modules[k]; }
  for (const k of Object.keys(o._orphans.files || {})) if (!o._orphans.files[k]) delete o._orphans.files[k];
}

// ---------- explicit member rename (--rename "Class:Old=Class:New") ----------
function parseRename(s) {
  if (!s) return null;
  const parts = String(s).split('=');
  if (parts.length !== 2) fail('--rename expects "Class:Old=Class:New" or "Class.old=Class.new"');
  const m = /^([A-Za-z_]\w*)([:.])(.+)$/;
  const a = m.exec(parts[0].trim()), b = m.exec(parts[1].trim());
  if (!a || !b) fail('--rename expects "Class:Old=Class:New" or "Class.old=Class.new"');
  if (a[1] !== b[1] || a[2] !== b[2]) fail('--rename: both sides must name the same class and the same kind ( : method / . property )');
  return { cls: a[1], kind: a[2] === ':' ? 'funcs' : 'props', from: a[3], to: b[3] };
}
const RENAME = parseRename(valueAfter('--rename'));
function applyRename(map, empty) {
  if (!RENAME) return;
  for (const [, o] of map) {
    const c = (o.classes || {})[RENAME.cls];
    if (!c) continue;
    const slot = c[RENAME.kind];
    // method keys inside a desc file carry the class prefix ("Panel:TestMethod"); property keys are bare.
    const fromKey = RENAME.kind === 'funcs' ? RENAME.cls + ':' + RENAME.from : RENAME.from;
    const toKey = RENAME.kind === 'funcs' ? RENAME.cls + ':' + RENAME.to : RENAME.to;
    if (!slot || slot[fromKey] === undefined) continue;
    if (slot[toKey] === undefined) slot[toKey] = slot[fromKey];
    delete slot[fromKey];
    empty.moved.push('renamed ' + RENAME.cls + (RENAME.kind === 'funcs' ? ':' : '.') + RENAME.from + ' -> ' + RENAME.to);
    return;
  }
}

// ---------- the actual sync ----------
function syncTree(descDir, exp, raw, collect) {
  const map = loadTree(descDir);
  const before = new Map([...map].map(([k, v]) => [k, canon(v)]));
  const expectedNames = new Set(exp.keys());
  const empty = { zeros: 0, missingFiles: [], missingKeys: [], orphans: [], removed: [], renames: [], frozen: [], moved: [], restored: [] };
  const classOwner = new Map();
  for (const [rel, o] of map) for (const c of Object.keys(o.classes)) if (!classOwner.has(c)) classOwner.set(c, rel);
  const allExpectedClasses = new Set(); for (const e of exp.values()) for (const c of e.classes.keys()) allExpectedClasses.add(c);
  applyRename(map, empty);

  // 1. create skeletons for new documented files
  for (const [rel, e] of exp) {
    if (!map.has(rel)) {
      const o = { file: rel, classes: {}, module: null, fileDesc: '', _orphans: EMPTY_ORPHANS() };
      map.set(rel, o);
      if (e.classes.size || e.module) empty.missingFiles.push(rel);
    }
  }

  // 2. classes: move to the right file / restore from orphans / create blank entries
  for (const [rel, e] of exp) {
    const o = map.get(rel);
    if (o._frozen) { empty.frozen.push(rel); continue; }
    for (const [name, spec] of e.classes) {
      let entry = o.classes[name];
      const owner = classOwner.get(name);
      if (!entry && owner && owner !== rel && map.has(owner)) {
        entry = map.get(owner).classes[name];
        delete map.get(owner).classes[name];
        empty.moved.push(name + ': ' + owner + ' -> ' + rel);
      }
      if (!entry) {
        const donor = findOrphanClass(map, name);
        if (donor) { entry = donor.entry; delete donor.obj._orphans.classes[name]; empty.restored.push(name); }
      }
      if (!entry) { entry = { summary: '', props: {}, funcs: {} }; empty.missingFiles.push(rel + ' :: class ' + name); }
      if (!entry.props || typeof entry.props !== 'object') entry.props = {};
      if (!entry.funcs || typeof entry.funcs !== 'object') entry.funcs = {};
      if (entry.summary === undefined) entry.summary = '';
      for (const p of spec.props) {
        if (entry.props[p] === undefined) {
          const orph = (((o._orphans.classes[name] || {}).props) || {})[p];
          if (orph !== undefined) {
            entry.props[p] = orph;
            delete o._orphans.classes[name].props[p];
            empty.restored.push(rel + ' :: ' + name + '.' + p);
          } else { entry.props[p] = ''; empty.missingKeys.push(rel + ' :: ' + name + '.' + p); }
        }
      }
      for (const f of spec.funcs) {
        if (entry.funcs[f] === undefined) {
          const orph = (((o._orphans.classes[name] || {}).funcs) || {})[f];
          if (orph !== undefined) {
            entry.funcs[f] = orph;
            delete o._orphans.classes[name].funcs[f];
            empty.restored.push(rel + ' :: ' + f);
          } else { entry.funcs[f] = { desc: '', params: {}, returns: '' }; empty.missingKeys.push(rel + ' :: ' + f); }
        }
        else if (typeof entry.funcs[f] === 'string') entry.funcs[f] = { desc: entry.funcs[f], params: {}, returns: '' };
      }
      // extras -> orphans (text preserved)
      for (const p of Object.keys(entry.props)) if (!spec.props.has(p)) { if (entry.props[p]) { (o._orphans.classes[name] = o._orphans.classes[name] || { summary: '', props: {}, funcs: {} }).props[p] = entry.props[p]; empty.orphans.push(rel + ' :: ' + name + '.' + p); } delete entry.props[p]; }
      for (const f of Object.keys(entry.funcs)) if (!spec.funcs.has(f)) { if (entry.funcs[f] && (entry.funcs[f].desc || Object.keys(entry.funcs[f].params || {}).length || entry.funcs[f].returns)) { (o._orphans.classes[name] = o._orphans.classes[name] || { summary: '', props: {}, funcs: {} }).funcs[f] = entry.funcs[f]; empty.orphans.push(rel + ' :: ' + f); } delete entry.funcs[f]; }
      o.classes[name] = entry;
    }
  }

  // 3. module blocks
  for (const [rel, e] of exp) {
    const o = map.get(rel);
    if (o._frozen) continue;
    if (e.module) {
      if (!o.module) o.module = { summary: '', funcs: {} };
      if (!o.module.funcs || typeof o.module.funcs !== 'object') o.module.funcs = {};
      if (o.module.summary === undefined) o.module.summary = '';
      for (const f of e.module) {
        if (o.module.funcs[f] === undefined) {
          const orph = (((o._orphans.modules || {})[rel] || {}).funcs || {})[f];
          if (orph !== undefined) {
            o.module.funcs[f] = orph;
            delete o._orphans.modules[rel].funcs[f];
            empty.restored.push(rel + ' :: ' + f);
          } else { o.module.funcs[f] = { desc: '', params: {}, returns: '' }; empty.missingKeys.push(rel + ' :: ' + f); }
        }
        else if (typeof o.module.funcs[f] === 'string') o.module.funcs[f] = { desc: o.module.funcs[f], params: {}, returns: '' };
      }
      for (const f of Object.keys(o.module.funcs)) if (!e.module.has(f)) { if (o.module.funcs[f] && (o.module.funcs[f].desc || Object.keys(o.module.funcs[f].params || {}).length || o.module.funcs[f].returns)) { (o._orphans.modules[rel] = o._orphans.modules[rel] || { summary: '', funcs: {} }).funcs[f] = o.module.funcs[f]; empty.orphans.push(rel + ' :: ' + f); } delete o.module.funcs[f]; }
    }
  }

  // 4. file one-liners
  for (const [rel, e] of exp) {
    const o = map.get(rel);
    if (o._frozen) continue;
    if (o.fileDesc === undefined) o.fileDesc = '';
  }

  // 5. descriptions that belong to classes which no longer exist anywhere
  for (const [rel, o] of map) {
    if (o._frozen) continue;
    for (const name of Object.keys(o.classes)) {
      if (allExpectedClasses.has(name)) continue;
      const entry = o.classes[name];
      const orph = (o._orphans.classes[name] = o._orphans.classes[name] || { summary: '', props: {}, funcs: {} });
      orph.summary = orph.summary || entry.summary || '';
      Object.assign(orph.props, entry.props || {});
      Object.assign(orph.funcs, entry.funcs || {});
      delete o.classes[name];
      if (anyOrphanValue(orph)) empty.orphans.push(rel + ' :: class ' + name);
    }
  }

  // 6. source files gone / renamed
  for (const [rel, o] of map) {
    if (exp.has(rel)) continue;
    const srcExists = (raw.files || []).includes(rel);
    if (srcExists) { cleanOrphans(o); continue; } // exists but not managed here (e.g. skins) -> untouched
    const sig = fileSignature(o);
    let match = null;
    if (sig) {
      const cands = [...exp.keys()].filter(r => !map.has(r) && fileSignatureOfExpected(exp.get(r)) === sig);
      if (cands.length === 1) match = cands[0];
    }
    if (match) { empty.renames.push(rel + '.json -> ' + match + '.json'); o.file = match; map.set(match, o); map.delete(rel); }
    else { empty.removed.push(rel + '.json (source ' + rel + ' missing)'); }
  }

  // 7. cleanup
  for (const [, o] of map) { if (!o._frozen) { cleanOrphans(o); if (o.module && !Object.keys(o.module.funcs || {}).length && !o.module.summary) delete o.module; } }

  // 8. write changed files
  const changes = [];
  for (const [rel, o] of map) {
    const now = canon(o);
    if (before.get(rel) !== now) changes.push(rel);
  }
  const removedFiles = [...map.keys()].filter(rel => before.has(rel) && !exp.has(rel) && !(raw.files || []).includes(rel) && !empty.renames.some(x => x.endsWith('-> ' + rel + '.json')));
  return { map, changes, empty, before, removedFiles };
}
function anyOrphanValue(v) { return !!(v.summary || Object.keys(v.props || {}).length || Object.keys(v.funcs || {}).length); }
function findOrphanClass(map, name) {
  for (const [, o] of map) {
    const rec = (o._orphans.classes || {})[name];
    if (rec && anyOrphanValue(rec)) return { obj: o, entry: rec };
  }
  return null;
}
function fileSignature(o) {
  const cls = Object.keys(o.classes || {}).sort();
  const fns = Object.keys((o.module && o.module.funcs) || {}).sort();
  if (!cls.length && !fns.length) return '';
  return cls.join(',') + '|' + fns.join(',');
}
function fileSignatureOfExpected(e) {
  return [...e.classes.keys()].sort().join(',') + '|' + [...(e.module || [])].sort().join(',');
}

// ---------- backup / rollback ----------
const AT = path.join(D, '_attic');
function timestamp() { return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19); }
function backupTree(ts) {
  const dir = path.join(AT, 'auto-' + ts);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, src] of [['desc', path.join(D, 'desc')], ['desc_en', path.join(D, 'desc_en')]]) {
    if (fs.existsSync(src)) fs.cpSync(src, path.join(dir, name), { recursive: true });
  }
  return dir;
}
function rollback(ts) {
  const dir = path.join(AT, 'auto-' + ts);
  if (!fs.existsSync(dir)) fail(t('rollbackNo') + ': ' + ts);
  for (const name of ['desc', 'desc_en']) {
    const src = path.join(dir, name);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(D, name);
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(src, dst, { recursive: true });
  }
  console.log(t('rollbackDone') + ': ' + ts);
}

// ---------- report ----------
// every blank description, as "<lang>  <desc file>  ::  <entry>  <what>" — so the report can point at
// the exact json file and field instead of only printing a total (see printReport / --summary).
function listEmpty(descTrees) {
  const rows = [];
  for (const [dir, map] of descTrees) {
    const tag = path.basename(dir) === 'desc' ? 'zh' : 'en';
    for (const [rel, o] of map) {
      if (!o.classes && !o.module) continue;
      const file = rel + '.json';
      if (o.fileDesc === '') rows.push(tag + '  ' + file + '  ::  fileDesc' + t('kFileDesc'));
      if (o.module && o.module.summary === '') rows.push(tag + '  ' + file + '  ::  module.summary' + t('kModule'));
      for (const c of Object.keys(o.classes || {})) {
        const e = o.classes[c];
        if (!e.summary) rows.push(tag + '  ' + file + '  ::  ' + c + '  ' + t('kClass'));
        for (const p of Object.keys(e.props || {})) if (!e.props[p]) rows.push(tag + '  ' + file + '  ::  ' + c + '.' + p + '  ' + t('kProp'));
        for (const f of Object.keys(e.funcs || {})) { const v = e.funcs[f]; if (!v || !v.desc) rows.push(tag + '  ' + file + '  ::  ' + f + '  ' + t('kFunc')); }
      }
      for (const f of Object.keys((o.module && o.module.funcs) || {})) { const v = o.module.funcs[f]; if (!v || !v.desc) rows.push(tag + '  ' + file + '  ::  ' + f + '  ' + t('kFunc')); }
    }
  }
  return rows;
}
function countEmpty(descTrees) { return listEmpty(descTrees).length; }
function mergedEmpty(zh, en) {
  const m = { missingFiles: [], missingKeys: [], orphans: [], removed: [], renames: [], frozen: [], moved: [], restored: [] };
  for (const k of Object.keys(m)) {
    m[k].push(...(zh.empty[k] || []).map(x => 'zh  ' + x));
    m[k].push(...(en.empty[k] || []).map(x => 'en  ' + x));
  }
  return m;
}
function pendingCount(m) {
  return m.missingFiles.length + m.missingKeys.length + m.orphans.length + m.removed.length + m.renames.length + m.frozen.length;
}
function printReport(zh, en, exp, raw, descTrees) {
  const label = MODE === 'check' ? t('readOnly') : t('write');
  console.log(t('title') + '  [' + label + ']');
  console.log('  ' + t('repo') + '      : ' + cwd);
  console.log('  ' + t('sources') + '  : ' + (raw.files || []).length + ' lua  ' + t('classes') + '=' + (raw.classes || []).length + ' (' + t('public') + '=' + [...exp.values()].reduce((s, e) => s + e.classes.size, 0) + ', ' + t('private') + '=' + (raw.classes || []).filter(c => c.local).length + ')  ' + t('moduleFiles') + '=' + [...exp.values()].filter(e => e.module).length);
  console.log('  ' + t('desc') + termPad(t('desc')) + ': ' + descTrees.map(([dir, map]) => path.basename(dir) + '=' + map.size).join('  ') + '   ' + t('lang') + '=' + LANG);
  const sec = (title, rows, hint) => {
    if (!rows.length) return;
    console.log('\n[' + title + '] (' + rows.length + ')');
    for (const r of rows.slice(0, 200)) console.log('  - ' + r);
    if (rows.length > 200) console.log('  ... ' + (rows.length - 200) + ' more');
    if (hint) console.log('  > ' + hint);
  };
  const merged = mergedEmpty(zh, en);
  sec(t('secAdd'), merged.missingFiles.concat(merged.missingKeys), t('hintWrite'));
  sec(t('secOrphan'), merged.orphans, t('hintOrphan'));
  sec(t('secRemoved'), merged.removed, t('hintRemoved'));
  sec(t('secRename'), merged.renames, t('hintCheck'));
  sec(t('secFrozen'), merged.frozen, '');
  sec(t('secDesc'), listEmpty(descTrees), t('hintEmpty'));
  if (merged.moved.length) console.log('\n[moved descriptions] (' + merged.moved.length + ')\n  ' + merged.moved.join('\n  '));
  if (merged.restored.length) console.log('\n[restored from orphans] (' + merged.restored.length + ')\n  ' + merged.restored.join('\n  '));
  const pending = pendingCount(merged);
  console.log('\n' + t('totals') + ': ' + (pending ? t('todo') + '=' + pending : t('clean')) + '  |  ' + t('secDesc') + '=' + countEmpty(descTrees) + '  |  ' + t('hintBuild'));
  return pending;
}
function termPad(s) { return ' '.repeat(Math.max(0, 10 - s.length)); }

// ---------- main ----------
if ((argv[0] || '') === '--rollback' || flags.has('--rollback')) { rollback(valueAfter('--rollback')); process.exit(0); }

const raw = readRaw();
const exp = buildExpected(raw);
const descDir = path.join(D, 'desc');
const descEnDir = path.join(D, 'desc_en');
const zh = syncTree(descDir, exp, raw);
const en = syncTree(descEnDir, exp, raw);
const descTrees = [[descDir, zh.map], [descEnDir, en.map]];

if (flags.has('--summary')) {
  const m = mergedEmpty(zh, en);
  const pending = pendingCount(m);
  const frozenCount = zh.empty.frozen.length + en.empty.frozen.length;
  const frozenTxt = frozenCount ? '  |  ' + t('frozenLabel') + '=' + frozenCount : '';
  const emptyRows = listEmpty(descTrees);
  console.log('  ' + (pending ? t('sumTodo') + '=' + pending : t('sumClean')) + '  |  ' + t('secDesc') + '=' + emptyRows.length + frozenTxt);
  // still name the files: a bare number tells the maintainer nothing about where to look.
  for (const row of emptyRows.slice(0, 15)) console.log('    - ' + row);
  if (emptyRows.length > 15) console.log('    ... ' + (emptyRows.length - 15) + ' more (' + t('hintCheck') + ')');
  process.exit(pending ? 1 : 0);
}

// file renames detected above only renamed inside the in-memory tree; persist via changes below.
const pending = printReport(zh, en, exp, raw, descTrees);

if (MODE === 'write') {
  // safety: a sudden mass deletion usually means a wrong directory
  const gone = new Set([...zh.removedFiles, ...en.removedFiles]);
  const threshold = Math.max(3, Math.ceil(zh.before.size * 0.2));
  if (gone.size > threshold && !flags.has('--force')) fail(t('manyGone') + ' (' + gone.size + ' > ' + threshold + ')');
  const allChanges = { zh, en };
  const changed = [];
  for (const [, tree] of Object.entries(allChanges)) for (const rel of tree.changes) changed.push(rel);
  if (!changed.length && !flags.has('--prune')) {
    console.log('\n' + t('unchanged'));
    process.exit(pending ? 1 : 0);
  }
  const ts = timestamp();
  const dir = backupTree(ts);
  console.log('\n' + t('backup') + ': ' + dir);
  let wrote = 0;
  for (const [tree, base] of [[zh, descDir], [en, descEnDir]]) {
    for (const rel of tree.changes) {
      const o = tree.map.get(rel);
      const dst = path.join(base, rel + '.json');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, canon(o), 'utf8');
      wrote++;
    }
    for (const rel of tree.removedFiles) {
      const src = path.join(base, rel + '.json');
      if (!fs.existsSync(src)) continue;
      const dst = path.join(AT, 'removed-' + ts, path.basename(base), rel + '.json');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
    }
  }
  if (flags.has('--prune')) {
    for (const [tree, base] of [[zh, descDir], [en, descEnDir]]) {
      for (const [rel, o] of tree.map) { if (o._frozen) continue; o._orphans = EMPTY_ORPHANS(); const dst = path.join(base, rel + '.json'); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, canon(o), 'utf8'); wrote++; }
    }
  }
  console.log(t('doneWrite') + ': ' + wrote + ' file(s)');
  console.log(t('hintCheck'));
  process.exit(0);
}

process.exit(pending ? 1 : 0);
