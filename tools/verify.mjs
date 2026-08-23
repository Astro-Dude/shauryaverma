// Shoots the local build with the exact same routine used on the reference, then writes a
// side-by-side contact sheet so drift in type scale, rhythm and interaction states is visible
// at a glance.
//
//   npm run dev            (in one terminal)
//   node tools/verify.mjs  (in another)

import { shoot, VIEWPORTS } from './shoot.mjs';
import { readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const URL_ = process.env.VERIFY_URL ?? 'http://localhost:5173/';
const OUT = new URL('../build-shots/', import.meta.url).pathname;
const REF = new URL('../reference/', import.meta.url).pathname;

const { tokens } = await shoot({ url: URL_, outDir: OUT, steps: 10 });

console.log('\n=== build type scale (desktop) ===');
for (const [sel, style] of Object.entries(tokens.desktop.type)) {
  console.log(`${sel.padEnd(14)} ${style.fontSize.padStart(9)}  lh ${style.lineHeight.padStart(9)}  ls ${style.letterSpacing.padStart(9)}  w${style.fontWeight}`);
}

// Contact sheet: every build shot beside the reference shot of the same name.
const hasRef = existsSync(REF);
const buildFiles = (await readdir(OUT)).filter((f) => f.endsWith('.png')).sort();
const refFiles = hasRef
  ? new Set((await readdir(REF)).filter((f) => f.endsWith('.png')))
  : new Set();

const rows = buildFiles.map((f) => `
  <section>
    <h2>${f}</h2>
    <div class="pair">
      <figure><figcaption>reference</figcaption>${
        refFiles.has(f) ? `<img src="../reference/${f}" loading="lazy">` : '<p class="missing">not captured</p>'
      }</figure>
      <figure><figcaption>build</figcaption><img src="./${f}" loading="lazy"></figure>
    </div>
  </section>`).join('');

await writeFile(`${OUT}compare.html`, `<!doctype html>
<meta charset="utf-8"><title>reference vs build</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:2rem; background:#111; color:#b7ab98;
         font:14px/1.5 ui-monospace, monospace }
  h1 { font-size:1rem; letter-spacing:.16em; text-transform:uppercase }
  h2 { font-size:.8rem; font-weight:400; opacity:.6; margin:2.5rem 0 .5rem }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:1rem }
  figure { margin:0 }
  figcaption { font-size:.7rem; letter-spacing:.1em; text-transform:uppercase; opacity:.45;
               margin-bottom:.35rem }
  img { width:100%; display:block; border:1px solid #2a2a2a }
  .missing { opacity:.3; padding:3rem; text-align:center; border:1px dashed #2a2a2a }
</style>
<h1>reference vs build</h1>
${hasRef ? '' : '<p class="missing">No reference/ directory — run <code>npm run capture</code> first.</p>'}
${rows}
`);

console.log(`\nwrote ${OUT}compare.html  (${buildFiles.length} shots, ${VIEWPORTS.length} viewports)`);
