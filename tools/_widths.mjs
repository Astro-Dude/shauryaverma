import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3200);
const r = await p.evaluate(()=>{
  // Real glyph widths: measure the chars inside each line, not the line box.
  const words = (sel)=>[...document.querySelectorAll(sel+' .split-line')].map(l=>{
    const cs=[...l.querySelectorAll('.split-char')];
    if(!cs.length) return null;
    const a=cs[0].getBoundingClientRect(), z=cs[cs.length-1].getBoundingClientRect();
    return {text:l.innerText.trim(), left:Math.round(a.left), right:Math.round(z.right), w:Math.round(z.right-a.left)};
  }).filter(Boolean);
  // Measure candidate words at the same type size, off-screen.
  const probe = document.createElement('div');
  const h1 = document.querySelector('.layer__dark .hero h1');
  const cs = getComputedStyle(h1);
  Object.assign(probe.style,{position:'fixed',left:'-9999px',top:'0',whiteSpace:'nowrap',
    font:cs.font, fontFamily:cs.fontFamily, fontSize:cs.fontSize, fontWeight:cs.fontWeight,
    letterSpacing:cs.letterSpacing, textTransform:'uppercase'});
  document.body.append(probe);
  const measure=(w)=>{probe.textContent=w; return Math.round(probe.getBoundingClientRect().width);};
  const cands = {};
  for (const w of ['building','clauding','shipping','breaking','good','bad','vibe','claude','shit','since','2024','prompting','typing'])
    cands[w]=measure(w);
  probe.remove();
  const spot = getComputedStyle(document.querySelector('.layer__red')).getPropertyValue('--size');
  return {dark:words('.layer__dark .hero'), red:words('.layer__red .hero'), cands, spotIdle:spot.trim()};
});
console.log('spotlight over the hero: 375px (extend stop)\n');
console.log('rendered line widths:');
r.dark.forEach((d,i)=>{ const rr=r.red[i]||{};
  console.log(`  L${i+1}  ${d.text.padEnd(9)} ${String(d.w).padStart(4)}px @x${d.left}   ${String(rr.text||'').padEnd(9)} ${String(rr.w||'').padStart(4)}px @x${rr.left||''}   dx ${rr.left!=null?d.left-rr.left:'-'}`);});
console.log('\ncandidate word widths at hero size (fits inside a 375px disc?):');
for (const [w,px] of Object.entries(r.cands)) console.log(`  ${w.padEnd(10)} ${String(px).padStart(4)}px   ${px<=375?'FITS':'too wide'}`);
await b.close();
