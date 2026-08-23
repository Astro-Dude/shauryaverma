import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
await p.waitForTimeout(3200);

// 1. the spotlight over the experience photo band must stay small
const eb = await p.evaluate(()=>{const e=document.querySelector('.layer__dark .work_experience');
  const r=e.getBoundingClientRect(); return {top:Math.round(r.top+scrollY), h:Math.round(r.height)};});
await p.evaluate((t)=>window.__lenis?.scrollTo(t,{duration:0.6})??scrollTo(0,t), eb.top);
await p.waitForTimeout(1600);
for (const [label,x,y] of [['over empty photo',1150,600],['over the headline',600,300]]) {
  await p.mouse.move(x,y,{steps:16}); await p.waitForTimeout(1400);
  const s = await p.evaluate(()=>getComputedStyle(document.querySelector('.layer__red')).getPropertyValue('--size').trim());
  console.log(`  spotlight ${label.padEnd(18)} ${s}`);
}
await p.screenshot({path:`${OUT}/spot-band.png`});

// 2. the What I do cut
await p.evaluate(()=>{const s=document.querySelector('.layer__dark .about_ido');
  window.scrollTo(0, s.getBoundingClientRect().top+window.scrollY-140);});
await p.waitForTimeout(1500);
const rows = await p.$$('.layer__dark .about_ido .js-heading-mask');
const box = await rows[1].boundingBox();
await p.mouse.move(box.x+300, box.y+box.height/2, {steps:12});
await p.waitForTimeout(1300);
console.log();
console.log(await p.evaluate(()=>{
  const r=[...document.querySelectorAll('.layer__dark .about_ido .js-heading-mask')][1];
  const deepN=r.querySelector('.heading-mask_el__deep h3.h1');
  const maskN=r.querySelector('.heading-mask_el__masking .h1');
  const maskCol=r.querySelector('.heading-mask_clip');
  const desc=r.querySelector('.heading-mask_el__masking p.desc');
  const g=(e)=>{const b=e.getBoundingClientRect(); return {w:Math.round(b.width), left:Math.round(b.left)};};
  const dn=g(deepN), mn=g(maskN), mc=g(maskCol), de=g(desc);
  return [`  resting name   ${dn.w}px at x${dn.left}  (full)`,
    `  revealed name  ${mn.w}px at x${mn.left}  clipped to ${mc.w}px  ->  cut ${mn.w-mc.w}px`,
    `  description    ${de.w}px at x${de.left}   was 340px  ->  +${Math.round((de.w/340-1)*100)}%`,
    `  left edges match: ${dn.left===mn.left ? 'yes' : 'NO ('+(dn.left-mn.left)+'px)'}`].join('\n');
}));
await p.screenshot({path:`${OUT}/cut-final.png`});
await b.close();
