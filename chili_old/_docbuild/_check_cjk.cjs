// usage: node _check_cjk.cjs <htmlfile>
const fs = require('fs');
const file = process.argv[2];
let h = fs.readFileSync(file, 'utf8');
// strip script + style blocks
h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]+/g;
const counts = new Map();
let m;
while ((m = CJK.exec(h))) {
  const t = m[0];
  counts.set(t, (counts.get(t) || 0) + 1);
}
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const allow = new Set(['中文']);
const real = rows.filter(r => !allow.has(r[0]));
console.log('distinct:', rows.length, 'disallowed:', real.length, 'total hits:', real.reduce((s, r) => s + r[1], 0));
for (const [t, n] of real.slice(0, 40)) {
  const i = h.indexOf(t);
  const ctx = h.slice(Math.max(0, i - 90), i + t.length + 90).replace(/\s+/g, ' ');
  console.log(n + '\t' + t + '\t' + ctx);
}
if (real.length && process.env.CHILI_CJK_REPORT) {
  const out = require('path').join(require('os').tmpdir(), require('path').basename(file, '.html') + '._cjk.txt');
  fs.writeFileSync(out, real.map(r => r[1] + '\t' + r[0]).join('\n'), 'utf8');
  console.log('report ->', out);
}
