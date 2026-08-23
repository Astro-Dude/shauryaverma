// Records ground truth from the reference site so the rebuild can be matched against
// measurements rather than memory. Output lands in reference/ and is never shipped.
//
//   node tools/capture-reference.mjs

import { shoot } from './shoot.mjs';

const SITE = 'https://minhpham.design/';
const OUT = new URL('../reference/', import.meta.url).pathname;

const { tokens } = await shoot({ url: SITE, outDir: OUT, steps: 10 });

console.log('\n=== reference type scale (desktop) ===');
for (const [sel, style] of Object.entries(tokens.desktop.type)) {
  console.log(`${sel.padEnd(14)} ${style.fontSize.padStart(9)}  lh ${style.lineHeight.padStart(9)}  ls ${style.letterSpacing.padStart(9)}  w${style.fontWeight}  ${style.textTransform}`);
}
console.log('\n=== spacing vars (desktop) ===');
console.log(tokens.desktop.spacing);
console.log('\n=== body ===');
console.log(tokens.desktop.body);
console.log(`\npage height: desktop ${tokens.desktop.pageHeight}px · mobile ${tokens.mobile.pageHeight}px`);
console.log(`\nwrote ${OUT}`);
