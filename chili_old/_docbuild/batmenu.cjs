// batmenu.cjs - interactive console wizard used by the .bat launchers.
//
// Why this file exists: cmd.exe mis-parses non-ASCII characters inside .bat files
// (it re-reads the file by byte offsets, so a UTF-8 Chinese line can make it start
// executing in the middle of a line). The launchers therefore stay pure ASCII, while
// all bilingual text and confirmation prompts live here, where UTF-8 output is safe.
//
// usage: node _docbuild/batmenu.cjs <check|update|build|rollback> [--lang zh|en | --ask-lang]
//   --lang zh|en  force the interface language (used by the fixed-language launchers)
//   --ask-lang    ask on startup which interface language to use (en / cn, default en)
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const mode = (argv[0] || '').toLowerCase();
const langIdx = argv.indexOf('--lang');
const askLang = argv.indexOf('--ask-lang') >= 0;
let LANG = langIdx >= 0 && String(argv[langIdx + 1] || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
// The framework directory = parent of _docbuild (the .bat launchers cd here first, and this
// also keeps `node chili_old/_docbuild/batmenu.cjs check` working from the repository root).
const ROOT = path.resolve(__dirname, '..');
const D = path.join(ROOT, '_docbuild');
const AT = path.join(D, '_attic');

const T_ALL = {
  zh: {
    checkTitle: 'Chili UI 文档 - 源码结构检测(只读，不会修改任何文件)',
    updateTitle: 'Chili UI 文档 - 更新描述骨架(会写入 _docbuild\\desc与desc_en）',
    buildTitle: 'Chili UI 文档构建',
    rollbackTitle: 'Chili UI 文档 - 回滚描述',
    folder: '目录',
    checkClean: '[结果] 干净: 描述文件和源码完全同步.',
    checkPending: '[结果] 有待处理项(见上方分组) \n        生成空白描述骨架: 运行 update-desc-skeleton.bat\n        确认是文件改名: 见上方提示里的 --rename 用法\n        文件确实删除: 运行 更新描述骨架.bat(会移到 _attic 备份，不会直接删)',
    checkFail: '[结果] 检测脚本出错，请把完整输出发给维护者。',
    updating: '先看差异(只读)...',
    abortedNoWrite: '[错误] 检测脚本出错，已停止，没有写入任何文件。',
    explainWrite: '将要写入：_docbuild\\desc\\ 与 _docbuild\\desc_en\\ 的 JSON 描述文件\n写入前会自动备份到 _docbuild\\_attic\\auto-[时间]\\',
    askWrite: '确认写入请输入 WRITE (其他任意内容取消): ',
    cancelled: '[已取消] 没有写入任何文件。',
    writing: '写入中...',
    writeFail: '[错误] 写入失败(可能已部分写入)，请查看上面的报错并考虑回滚。',
    writeDone: '[完成] 请打开新出现的空描述填中文/英文说明，然后运行 build-docs.bat.\n        想撤销这次写入: 运行 rollback-desc.bat，输入上面显示的备份时间戳。',
    summarizing: '只读检测源码结构(不会修改任何文件)...',
    syncFail: '[错误] 检测脚本自身出错(不是源码问题)，请把上面的完整输出发给维护者。',
    pendingNote: '[提示] 描述文件与源码没有完全同步（上面一行是汇总）。\n        现在构建仍然可用，但新源码的说明会是空白。\n        想先生成空白骨架：关闭本窗口，运行 更新描述骨架.bat。\n        想看完整清单：运行 检测源码结构.bat。',
    askBuild: '输入 BUILD 继续构建(直接回车或输入其他内容 = 取消): ',
    cancelledBuild: '[已取消] 没有构建任何文件。',
    building: '构建中...',
    buildFail: '[错误] 构建失败，请看上面的报错。',
    buildDone: '[完成] 已生成：chiliui_api_reference.html(中文)/ chiliui_api_reference_en.html(英文)\n        如果改了源码里的类或函数，记得同时更新 _docbuild\\desc 与 desc_en 里的说明。',
    backups: '可用的自动备份：',
    noBackups: '(没有找到 _docbuild\\_attic\\auto-* 备份)',
    noBackupsNote: '[提示] 还没有自动备份；更新描述骨架.bat 每次写入前都会自动创建。',
    rollbackWarn: '注意：回滚会覆盖当前 _docbuild\\desc 与 desc_en 目录的全部内容。',
    askTs: '请输入备份时间戳（例如 2026-11-01_02-19-33）: ',
    askRollback: '确认回滚请输入 ROLLBACK（其他任意内容取消）: ',
    cancelledRollback: '[已取消] 没有修改任何文件。',
    rollbackFail: '[错误] 回滚失败，请看上面的报错；当前文件可能未改变或只恢复了一半。',
    rollbackDone: '[完成] 已回滚到 %s。建议随后运行 检测源码结构.bat 复查。',
    pressKey: '按任意键继续...'
  },
  en: {
    checkTitle: 'Chili UI docs - source structure check (read-only, nothing is written)',
    updateTitle: 'Chili UI docs - update description skeleton (WRITES _docbuild\\desc and desc_en)',
    buildTitle: 'Chili UI docs builder',
    rollbackTitle: 'Chili UI docs - rollback descriptions',
    folder: 'folder',
    checkClean: '[result] clean: description files and sources are in sync.',
    checkPending: '[result] pending items (see the sections above).\n        Create blank slots: run update-desc-skeleton.bat\n        If a file was renamed: see the --rename hint above\n        If a file was really deleted: run update-desc-skeleton.bat (moves it to the _attic backup)',
    checkFail: '[result] the check script failed - send the full output to the maintainer.',
    updating: 'Showing the differences first (read-only)...',
    abortedNoWrite: '[ERROR] The check failed, stopped. Nothing was written.',
    explainWrite: 'Will write: the JSON description files under _docbuild\\desc\\ and _docbuild\\desc_en\\\nA backup is created first in _docbuild\\_attic\\auto-[timestamp]\\',
    askWrite: 'Type WRITE to confirm (anything else cancels): ',
    cancelled: '[cancelled] Nothing was written.',
    writing: 'Writing...',
    writeFail: '[ERROR] Writing failed (may be partial). Check the output and consider a rollback.',
    writeDone: '[done] Fill in the new blank descriptions, then run build-docs.bat.\n       To undo this write: run rollback-desc.bat and type the backup timestamp shown above.',
    summarizing: 'Read-only check of the source structure (no files are modified)...',
    syncFail: '[ERROR] The check script itself failed (not a source problem). Send the output above to the maintainer.',
    pendingNote: '[note] The description files are not fully in sync with the sources (see the summary line).\n       The build still works, but new source members will show empty descriptions.\n       To create the blank slots first: close this window and run update-desc-skeleton.bat.\n       For the full list: run check-structure.bat.',
    askBuild: 'Type BUILD to continue (press Enter or anything else to cancel): ',
    cancelledBuild: '[cancelled] Nothing was built.',
    building: 'Building...',
    buildFail: '[ERROR] Build failed - check the messages above.',
    buildDone: '[done] chiliui_api_reference.html (Chinese) + chiliui_api_reference_en.html (English)\n       If you changed classes/functions in the sources, update _docbuild\\desc and desc_en too.',
    backups: 'Available automatic backups:',
    noBackups: '(no _docbuild\\_attic\\auto-* backup found)',
    noBackupsNote: '[note] There is no automatic backup yet; update-desc-skeleton.bat creates one before every write.',
    rollbackWarn: 'WARNING: this replaces the whole _docbuild\\desc and desc_en folders.',
    askTs: 'Backup timestamp (for example 2026-11-01_02-19-33): ',
    askRollback: 'Type ROLLBACK to confirm (anything else cancels): ',
    cancelledRollback: '[cancelled] Nothing was modified.',
    rollbackFail: '[ERROR] Rollback failed - check the output; files may be unchanged or only partly restored.',
    rollbackDone: '[done] Restored backup %s. Run check-structure.bat to verify.',
    pressKey: 'Press any key to continue...'
  }
};
let T = T_ALL[LANG];

const line = () => '  ' + '-'.repeat(101);
function head(title) {
  console.log(line());
  console.log('  ' + title);
  console.log('  ' + T.folder + ': ' + ROOT);
  console.log(line());
  console.log('');
}
function rule() { console.log(''); }

function runNode(script, args) {
  const r = spawnSync(process.execPath, [path.join(D, script)].concat(args), { stdio: 'inherit', cwd: ROOT });
  return r.status === null ? 2 : r.status;
}

// Input: on a real console use readline; when stdin is piped (tests / automation)
// read every line up front, because Node's readline closes the interface as soon as
// the pipe reaches EOF and would drop the lines that follow the first answer.
const IS_TTY = !!process.stdin.isTTY;
let pipedLines = null;
let pipedIdx = 0;
let rl = null;
let pendingAsk = null;

function nextPipedLine() {
  if (!pipedLines) {
    let all = '';
    try { all = fs.readFileSync(0, 'utf8'); } catch (e) { all = ''; }
    pipedLines = all.split(/\r?\n/);
  }
  const v = pipedIdx < pipedLines.length ? pipedLines[pipedIdx] : '';
  pipedIdx += 1;
  return String(v || '').trim();
}

// The prompt text MUST be passed to readline.question(). Writing it with
// process.stdout.write() and then calling question('') makes readline redraw the current
// line (empty prompt) and erase what we just wrote -- that is why the question was
// invisible in a real console window while piped tests looked fine.
function ask(promptText) {
  if (!IS_TTY) { process.stdout.write(promptText); return Promise.resolve(nextPipedLine()); }
  // Print the question as a normal line first, then let readline read the answer on the
  // next line. readline redraws the line it is prompting on; if the question were only
  // written without a newline, that redraw erased it and the console looked blank.
  console.log(promptText);
  return new Promise(resolve => {
    if (!rl) {
      rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
      rl.on('close', () => { if (pendingAsk) { const r = pendingAsk; pendingAsk = null; r(''); } });
    }
    pendingAsk = resolve;
    try {
      rl.question('', ans => {
        if (!pendingAsk) return;
        const r = pendingAsk; pendingAsk = null;
        r(String(ans || '').trim());
      });
    } catch (e) { pendingAsk = null; resolve(''); }
  });
}
function pressKey() { return ask(T.pressKey); }

// --ask-lang: the launchers that are not tied to one language ask first. Everything below
// (titles, prompts, confirmation words) is then printed in the chosen language.
async function chooseLang() {
  if (!askLang) return;
  for (;;) {
    const ans = (await ask('Language  [en/cn] (default en): ')).toLowerCase();
    if (!ans || ans === 'en' || ans === 'english' || ans === '1') { LANG = 'en'; break; }
    if (ans === 'cn' || ans === 'zh' || ans === 'chinese' || ans === '中文' || ans === '2') { LANG = 'zh'; break; }
    console.log('  ?  ' + ans + '  ->  en / cn');
  }
  T = T_ALL[LANG];
  console.log('');
}

function syncArgs() { return ['--lang', LANG]; }

async function modeCheck() {
  head(T.checkTitle);
  const code = runNode('descsync.cjs', [ROOT].concat(syncArgs()));
  rule();
  if (code === 2) { console.log(T.checkFail); await pressKey(); return 2; }
  if (code === 1) { console.log(T.checkPending); await pressKey(); return 1; }
  console.log(T.checkClean); rule();
  await pressKey(); return 0;
}

async function modeUpdate() {
  head(T.updateTitle);
  console.log('[1/2] ' + T.updating);
  const code = runNode('descsync.cjs', [ROOT].concat(syncArgs()));
  if (code === 2) { rule(); console.log(T.abortedNoWrite); await pressKey(); return 1; }
  rule();
  console.log(T.explainWrite);
  rule();
  const ans = await ask(T.askWrite);
  if (ans.toUpperCase() !== 'WRITE') { rule(); console.log(T.cancelled); await pressKey(); return 1; }
  rule();
  console.log('[2/2] ' + T.writing);
  const w = runNode('descsync.cjs', [ROOT, '--write'].concat(syncArgs()));
  if (w !== 0) { rule(); console.log(T.writeFail); await pressKey(); return 1; }
  rule();
  console.log(T.writeDone); rule();
  await pressKey(); return 0;
}

async function modeBuild() {
  head(T.buildTitle);
  console.log('[1/2] ' + T.summarizing);
  const code = runNode('descsync.cjs', [ROOT, '--summary'].concat(syncArgs()));
  if (code === 2) { rule(); console.log(T.syncFail); await pressKey(); return 1; }
  if (code === 1) {
    rule();
    console.log(T.pendingNote);
    rule();
    const ans = await ask(T.askBuild);
    if (ans.toUpperCase() !== 'BUILD') { rule(); console.log(T.cancelledBuild); await pressKey(); return 1; }
  }
  rule();
  console.log('[2/2] ' + T.building);
  const b = runNode('build-all.cjs', [ROOT]);
  if (b !== 0) { rule(); console.log(T.buildFail); await pressKey(); return 1; }
  rule();
  console.log(T.buildDone); rule();
  await pressKey(); return 0;
}

async function modeRollback() {
  head(T.rollbackTitle);
  let names = [];
  try {
    names = fs.readdirSync(AT).filter(n => n.indexOf('auto-') === 0 && fs.statSync(path.join(AT, n)).isDirectory()).sort().reverse();
  } catch (e) { names = []; }
  if (!names.length) {
    console.log(T.noBackups); rule();
    console.log(T.noBackupsNote); await pressKey(); return 1;
  }
  console.log(T.backups);
  names.forEach(n => console.log('  - ' + n));
  rule();
  console.log(T.rollbackWarn);
  const ts = await ask(T.askTs);
  if (!ts) { rule(); console.log(T.cancelledRollback); await pressKey(); return 1; }
  const ans = await ask(T.askRollback);
  if (ans.toUpperCase() !== 'ROLLBACK') { rule(); console.log(T.cancelledRollback); await pressKey(); return 1; }
  rule();
  const code = runNode('descsync.cjs', [ROOT, '--rollback', ts].concat(syncArgs()));
  if (code !== 0) { rule(); console.log(T.rollbackFail); await pressKey(); return 1; }
  rule();
  console.log(T.rollbackDone.replace('%s', ts)); rule();
  await pressKey(); return 0;
}

(async () => {
  await chooseLang();
  let code;
  if (mode === 'check') code = await modeCheck();
  else if (mode === 'update') code = await modeUpdate();
  else if (mode === 'build') code = await modeBuild();
  else if (mode === 'rollback') code = await modeRollback();
  else { console.log('usage: node _docbuild/batmenu.cjs <check|update|build|rollback> [--lang zh|en]'); code = 2; }
  process.exit(code);
})();
