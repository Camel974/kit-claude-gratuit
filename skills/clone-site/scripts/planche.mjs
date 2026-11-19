// planche.mjs : planche côte à côte (original | copie) pour juger au visuel.
// Usage : node planche.mjs <dossier-captures> <nomA> <nomB> [sortie.html]
// Lit <nomA>-desktop.png, <nomB>-desktop.png, <nomA>-mobile.png, <nomB>-mobile.png dans le dossier.
import fs from 'node:fs';
import path from 'node:path';
const [, , dir, a, b, out = path.join(dir, `planche-${a}-vs-${b}.html`)] = process.argv;
if (!b) { console.error('Usage : node planche.mjs <dossier> <nomA> <nomB> [sortie.html]'); process.exit(1); }
const img = (n, m) => { const f = path.join(dir, `${n}-${m}.png`); return fs.existsSync(f) ? `<img src="${path.relative(path.dirname(out), f).replace(/\\/g, '/')}">` : `<p>manque ${n}-${m}.png</p>`; };
const bloc = (m) => `<h2>${m}</h2><div class="g ${m}"><div><h3>${a}</h3>${img(a, m)}</div><div><h3>${b}</h3>${img(b, m)}</div></div>`;
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Planche ${a} vs ${b}</title>
<style>body{font:14px system-ui;margin:0;padding:16px;background:#111;color:#eee}.g{display:grid;grid-template-columns:1fr 1fr;gap:16px}.mobile{max-width:900px}
img{width:100%;border:1px solid #333;display:block}h3{margin:4px 0;color:#9cf}</style>
<h1>Planche : ${a} (gauche) vs ${b} (droite)</h1>${bloc('desktop')}${bloc('mobile')}`);
console.log('OK ' + out);
