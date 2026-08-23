import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3200);
const top = await p.evaluate(()=>Math.round(document.querySelector('.layer__dark .about_content_desc').getBoundingClientRect().top+scrollY));
await p.evaluate((t)=>window.__lenis?.scrollTo(t-200,{duration:0.6})??scrollTo(0,t-200), top);
await p.waitForTimeout(2200);
const m = await p.evaluate(()=>{
  const g=(s)=>{const e=document.querySelector(s); const r=e.getBoundingClientRect();
    const lines=e.querySelectorAll('.split-line').length;
    return {lines, h:Math.round(r.height), text:e.innerText.replace(/\s+/g,' ').trim().slice(0,60)};};
  return {dark:g('.layer__dark .about_content_desc'), red:g('.layer__red .about_content_desc')};});
console.log(JSON.stringify(m,null,1));
await p.mouse.move(1380,80); await p.waitForTimeout(1200);
await p.screenshot({path:`${OUT}/ab-dark.png`});
await p.mouse.move(560,420,{steps:26}); await p.waitForTimeout(1700);
await p.screenshot({path:`${OUT}/ab-red.png`});
await b.close();
