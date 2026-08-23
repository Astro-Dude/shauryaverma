import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:9000}); } catch {}
await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
  const r = document.querySelector('.layer__dark .about_ido .js-heading-mask');
  const walk=(el,d=0)=>{
    let s = '  '.repeat(d) + el.tagName.toLowerCase() +
      (typeof el.className==='string'&&el.className ? '.'+el.className.trim().split(/\s+/).join('.') : '');
    const t = [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').slice(0,26);
    if (t) s += `  "${t}"`;
    const b = el.getBoundingClientRect();
    s += `   [${Math.round(b.width)}x${Math.round(b.height)}]`;
    return [s, ...[...el.children].map(c=>walk(c,d+1))].join('\n');
  };
  return walk(r);
}));
await b.close();
