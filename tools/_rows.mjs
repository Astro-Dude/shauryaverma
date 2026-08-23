import { chromium } from 'playwright';
const CANDS = ['Full-stack','RL Environments','Evals','Backend','Automation','Systems',
  'Infra','DevOps','Algorithms','Agents','AI Agents','Real-time','Extensions','Chrome Ext',
  'Scraping','Pipelines','Product','Shipping','Mentoring','Teaching','Databases','APIs',
  'Replicas','Harnesses','Tooling','Frontend','Interfaces','Deployment','Competitive'];
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});
try { await p.locator('#js-page-loading_start').click({timeout:8000}); } catch {}
await p.waitForTimeout(3200);
const out = await p.evaluate((cands)=>{
  // find a "what I do" row name
  const rows=[...document.querySelectorAll('.layer__dark h3.h1')];
  const ref = rows.find(e=>/full-stack/i.test(e.textContent||'')) || rows[0];
  if(!ref) return {none:true, found:rows.length};
  const cs=getComputedStyle(ref);
  const col = ref.closest('[class*=col-]').getBoundingClientRect().width;
  const probe=document.createElement('span');
  Object.assign(probe.style,{position:'fixed',left:'-99999px',whiteSpace:'nowrap',
    font:cs.font,fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,
    letterSpacing:cs.letterSpacing,textTransform:cs.textTransform});
  document.body.append(probe);
  const w={}; for(const c of cands){probe.textContent=c; w[c]=Math.round(probe.getBoundingClientRect().width);}
  probe.remove();
  return {fontSize:cs.fontSize, transform:cs.textTransform, column:Math.round(col), widths:w,
          sample:ref.textContent.trim().slice(0,40), cls:ref.className};
}, CANDS);
console.log(JSON.stringify({fontSize:out.fontSize,transform:out.transform,column:out.column,sample:out.sample,cls:out.cls},null,1));
if(out.widths){
  const lim = out.column;
  const sorted = Object.entries(out.widths).sort((a,b)=>a[1]-b[1]);
  console.log(`\nlabel widths (column ${lim}px):`);
  for(const [k,v] of sorted) console.log(`  ${k.padEnd(17)} ${String(v).padStart(4)}px  ${v<=lim?'fits':'TOO WIDE'}`);
}
await b.close();
