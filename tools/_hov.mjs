import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
await p.waitForTimeout(3200);
await p.evaluate(()=>{const s=document.querySelector('.layer__dark .about_ido');
  window.scrollTo(0, s.getBoundingClientRect().top+window.scrollY-140);});
await p.waitForTimeout(1600);
console.log(await p.evaluate(()=>{
  const deep=document.querySelector('.layer__dark .about_ido .heading-mask_el__deep h3.h1');
  const mask=document.querySelector('.layer__dark .about_ido .heading-mask_el__masking span.h1');
  const band=document.querySelector('.layer__dark .about_ido .heading-mask_el__masking');
  const g=(e,label)=>{const cs=getComputedStyle(e); const b=e.getBoundingClientRect();
    return `  ${label.padEnd(22)} ${e.tagName.toLowerCase()}  display:${cs.display.padEnd(12)} font:${Math.round(parseFloat(cs.fontSize))}px  line-height:${cs.lineHeight.padEnd(9)} box ${Math.round(b.width)}x${Math.round(b.height)}`;};
  return [g(deep,'always-visible'), g(mask,'revealed'),
    `  band height            ${Math.round(band.getBoundingClientRect().height)}px  ->  revealed name overflows by ${Math.round(mask.getBoundingClientRect().height - band.getBoundingClientRect().height)}px`].join('\n');
}));
const rows = await p.$$('.layer__dark .about_ido .js-heading-mask');
const box = await rows[1].boundingBox();
await p.mouse.move(box.x+300, box.y+box.height/2, {steps:10});
await p.waitForTimeout(1200);
await p.screenshot({path:`${OUT}/clip.png`});
await b.close();
