import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
for (const w of [1440, 1280, 992, 768, 375]) {
  const p = await b.newPage({viewport:{width:w,height:900}});
  await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
  try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
  await p.waitForTimeout(3000);
  const m = await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('.layer__dark .about_ido .js-heading-mask')];
    const info = rows.map(r=>{
      const nm=r.querySelector('h3.h1'); if(!nm) return null;
      const cs=getComputedStyle(nm); const nr=nm.getBoundingClientRect();
      const col=nm.closest('[class*=col-]').getBoundingClientRect().width;
      const lines=Math.round(nr.height/parseFloat(cs.lineHeight||cs.fontSize));
      return {name:nm.innerText.trim(), fs:Math.round(parseFloat(cs.fontSize)),
        w:Math.round(nr.width), col:Math.round(col), lines, band:Math.round(r.getBoundingClientRect().height)};
    }).filter(Boolean);
    const sec=document.querySelector('.layer__dark .about_ido');
    return {info, padBottom:getComputedStyle(sec).paddingBottom};
  });
  const wrapped = m.info.filter(o=>o.lines>1);
  const bands = [...new Set(m.info.map(o=>o.band))];
  console.log(`${String(w).padStart(4)}px  type ${m.info[0]?.fs}px  col ${m.info[0]?.col}px  pad-bottom ${m.padBottom}  bands ${bands.join('/')}  ${wrapped.length?'*** WRAPS: '+wrapped.map(o=>o.name).join(', ')+' ***':'no wrapping'}`);
  const widest = m.info.reduce((a,o)=>o.w>a.w?o:a, m.info[0]);
  if (widest) console.log(`        widest: ${widest.name} ${widest.w}px in ${widest.col}px (${Math.round(widest.col-widest.w)}px spare)`);
  if (w===1440) { await p.evaluate(()=>{const s=document.querySelector('.layer__dark .about_ido');
      window.scrollTo(0, s.getBoundingClientRect().top+window.scrollY-140);}); await p.waitForTimeout(1500);
    await p.screenshot({path:`${OUT}/rows-big.png`}); }
  await p.close();
}
await b.close();
