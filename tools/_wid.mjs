import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3200);
const m = await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('.layer__dark .js-heading-mask')];
  const names=[...document.querySelectorAll('.layer__dark h3.h1')];
  const out = rows.map((r,i)=>{
    const nm = r.querySelector('h3.h1');
    const desc = r.querySelector('p.desc');
    const nr = nm?.getBoundingClientRect(); const dr = desc?.getBoundingClientRect();
    const dcs = desc ? getComputedStyle(desc) : null;
    return {row:i+1, name:nm?.innerText.trim(),
      nameW: nr?Math.round(nr.width):null, nameH: nr?Math.round(nr.height):null,
      descW: dr?Math.round(dr.width):null, descH: dr?Math.round(dr.height):null,
      descLines: dr&&dcs ? Math.round(dr.height/parseFloat(dcs.lineHeight)) : null,
      bandH: Math.round(r.getBoundingClientRect().height)};
  });
  return out.filter(o=>o.name);
});
console.log('row  name              nameW  descW  desc lines  band height');
m.forEach(o=>console.log(`  ${o.row}  ${String(o.name).padEnd(17)} ${String(o.nameW).padStart(4)}  ${String(o.descW).padStart(5)}  ${String(o.descLines).padStart(9)}  ${String(o.bandH).padStart(9)}`));
const hs=[...new Set(m.map(o=>o.bandH))];
console.log(`\n  distinct band heights: ${hs.join(', ')}  ${hs.length===1?'(uniform)':'*** UNEVEN ***'}`);
const top = await p.evaluate(()=>Math.round(document.querySelector('.layer__dark .about_ido, .layer__dark .js-heading-mask').getBoundingClientRect().top+scrollY));
await p.mouse.move(20,20); await p.waitForTimeout(800);
await p.evaluate((t)=>window.__lenis?.scrollTo(t-120,{duration:0.6})??scrollTo(0,t-120), top);
await p.waitForTimeout(1800);
await p.screenshot({path:`${OUT}/rows-idle.png`});
// hover the longest description
await p.mouse.move(500, 420, {steps:20}); await p.waitForTimeout(1400);
await p.screenshot({path:`${OUT}/rows-hover.png`});
await b.close();
