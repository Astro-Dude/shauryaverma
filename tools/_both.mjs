import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
await p.waitForTimeout(3200);

for (const [sel,name,shot] of [['.about_ido','What I do','fix-ido'],['.client','Projects','fix-proj']]) {
  await p.evaluate((s)=>{const e=document.querySelector('.layer__dark '+s);
    window.scrollTo(0, e.getBoundingClientRect().top+window.scrollY-140);}, sel);
  await p.waitForTimeout(1500);
  const rows = await p.$$(`.layer__dark ${sel} .js-heading-mask`);
  const idx = Math.min(1, rows.length-1);
  const box = await rows[idx].boundingBox();
  await p.mouse.move(box.x+300, box.y+box.height/2, {steps:10});
  await p.waitForTimeout(1200);
  const m = await rows[idx].evaluate((r)=>{
    const mask=r.querySelector('.heading-mask_el__masking');
    const nm=mask.querySelector('.h1');
    const nb=nm.getBoundingClientRect(), mb=mask.getBoundingClientRect();
    return {name:nm.innerText.trim(), nameH:Math.round(nb.height), band:Math.round(mb.height),
      over:Math.round(nb.height-mb.height)};
  });
  console.log(`  ${name.padEnd(11)} "${m.name}"  name ${m.nameH}px in ${m.band}px band  ${m.over>0?'*** clipped '+m.over+'px ***':'fits ('+(-m.over)+'px spare)'}`);
  await p.screenshot({path:`${OUT}/${shot}.png`});
}
await b.close();
