import { chromium } from 'playwright';
const b = await chromium.launch();
for (const w of [992, 768]) {
  const p = await b.newPage({viewport:{width:w,height:900}});
  await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
  try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
  await p.waitForTimeout(3000);
  const m = await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('.layer__dark .about_ido .js-heading-mask')];
    const o = rows.map(r=>{const nm=r.querySelector('h3.h1'); if(!nm) return null;
      const nr=nm.getBoundingClientRect(); const col=nm.closest('[class*=col-]').getBoundingClientRect().width;
      return {name:nm.innerText.trim(), w:Math.round(nr.width), col:Math.round(col), band:Math.round(r.getBoundingClientRect().height)};}).filter(Boolean);
    const widest=o.reduce((a,x)=>x.w>a.w?x:a,o[0]);
    return {widest, bands:[...new Set(o.map(x=>x.band))]};
  });
  console.log(`  ${w}px BEFORE my change: widest "${m.widest.name}" ${m.widest.w}px in ${m.widest.col}px  (${m.widest.col-m.widest.w}px spare)  bands ${m.bands.join('/')}`);
  await p.close();
}
await b.close();
