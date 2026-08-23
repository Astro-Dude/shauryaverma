import { chromium } from 'playwright';
const CANDS = {
  'dark 3ln': "I'm a selectively skilled developer focused on building software that survives real users.",
  'dark 4ln': "I'm a selectively skilled developer with a strong focus on building software that survives real users.",

  // 3-line reds
  'r3 a': "I'm a third-year student. I ship good shit only if the paycheck is equally good.",
  'r3 b': "I'm a third-year student. I ship good shit only if the paycheck is equally good. Nothing personal.",

  // 4-line reds, padded with something true rather than filler
  'r4 a': "I'm a third-year student with two degrees running. I ship good shit only if the paycheck is equally good.",
  'r4 b': "I'm a third-year student running two degrees at once. I ship good shit only if the paycheck is equally good.",
  'r4 c': "I'm a third-year student, so priorities. I ship good shit only if the paycheck is equally good. Nothing personal.",
};
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3000);
const out = await p.evaluate((cands)=>{
  const ref = document.querySelector('.layer__dark .about_content_desc');
  const cs = getComputedStyle(ref);
  const box = document.createElement('div');
  Object.assign(box.style,{position:'fixed',left:'-99999px',top:'0',width:cs.width,
    font:cs.font, fontFamily:cs.fontFamily, fontSize:cs.fontSize, fontWeight:cs.fontWeight,
    lineHeight:cs.lineHeight, letterSpacing:cs.letterSpacing, textTransform:cs.textTransform});
  document.body.append(box);
  const lh = parseFloat(cs.lineHeight);
  const r = {};
  for (const [k,v] of Object.entries(cands)) {
    box.textContent = v;
    const h = box.getBoundingClientRect().height;
    r[k] = {chars:v.length, lines:Math.round(h/lh), px:Math.round(h)};
  }
  box.remove();
  return {r, width:cs.width, fontSize:cs.fontSize, lineHeight:cs.lineHeight};
}, CANDS);
console.log(`column ${out.width}, type ${out.fontSize}, line-height ${out.lineHeight}\n`);
for (const [k,v] of Object.entries(out.r))
  console.log(`  ${k.padEnd(14)} ${String(v.chars).padStart(4)} chars  ${v.lines} lines  ${String(v.px).padStart(4)}px`);
await b.close();
