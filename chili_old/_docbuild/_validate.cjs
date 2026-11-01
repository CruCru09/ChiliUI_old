const fs = require('fs');
for (const file of process.argv.slice(2)) {
  const h = fs.readFileSync(file, 'utf8');
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const hrefs = [...h.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  const missing = [...new Set(hrefs.filter(x => !ids.has(x)))];
  const idx = (h.match(/"a":"/g) || []).length;
  const ph = ['__INDEX_JSON__', '__L10N_JSON__'].filter(p => h.includes(p));
  const lang = (h.match(/<html lang="([^"]+)"/) || [])[1];
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
  // validate every <script> block separately (the page has an early theme script + the app script)
  let jsok = 'ok';
  for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try { new Function(m[1]); } catch (e) { jsok = 'ERR ' + e.message; break; }
  }
  console.log(file.split(/[\\/]/).pop());
  console.log('  lang=' + lang + ' title=' + title);
  console.log('  ids=' + ids.size + ' hashLinks=' + hrefs.length + ' missingAnchors=' + missing.length + (missing.length ? ' ' + JSON.stringify(missing.slice(0, 8)) : ''));
  console.log('  indexItems=' + idx + ' placeholders=' + (ph.length ? ph.join(',') : 'none') + ' js=' + jsok + ' bytes=' + h.length);
}
