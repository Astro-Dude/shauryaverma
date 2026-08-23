import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-shaurya-Personal-portfolio/9bf6b5a3-eedd-41d0-923b-21d363d61b7e/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3200);
// pointer well away, so the dark layer reads clean
await p.mouse.move(1380, 60); await p.waitForTimeout(1400);
await p.screenshot({path:`${OUT}/h-dark.png`, clip:{x:220,y:120,width:1000,height:620}});
// then park it on the word that changes
await p.mouse.move(720, 250, {steps:26}); await p.waitForTimeout(1600);
await p.screenshot({path:`${OUT}/h-red.png`, clip:{x:220,y:120,width:1000,height:620}});
const r = await p.evaluate(()=>{
  const d=[...document.querySelectorAll('.layer__dark .hero .split-line')].map(l=>[Math.round(l.getBoundingClientRect().x),Math.round(l.getBoundingClientRect().width)]);
  const rd=[...document.querySelectorAll('.layer__red .hero .split-line')].map(l=>[Math.round(l.getBoundingClientRect().x),Math.round(l.getBoundingClientRect().width)]);
  return {dark:d, red:rd};});
console.log('line boxes  [x,width]');
r.dark.forEach((d,i)=>console.log(`  L${i+1}  dark ${JSON.stringify(d)}  red ${JSON.stringify(r.red[i])}  dx ${d[0]-r.red[i][0]}`));
await b.close();
