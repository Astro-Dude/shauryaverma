/**
 * Screenshot each section individually, for section-by-section review.
 *
 *   node tools/sections.mjs [url]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = '/tmp/sec';
await mkdir(out, { recursive: true });

const SECTIONS = [
  ['01-hero', '.layer__dark .hero'],
  ['02-about', '.layer__dark .about_me'],
  ['03-skills', '.layer__dark .about_ido'],
  ['04-experience', '.layer__dark .work_experience'],
  ['05-history', '.layer__dark .work_history'],
  ['06-projects-intro', '.layer__dark .client_info'],
  ['07-projects', '.layer__dark .client_list'],
  ['08-showcase', '.layer__dark .videoPlayer'],
  ['09-achievements', '.layer__dark .testimonials'],
  ['10-motto', '.layer__dark .motto'],
  ['11-contact', '.layer__dark .contact'],
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url, { waitUntil: 'networkidle' });
try { await page.locator('#js-page-loading_start').click({ timeout: 20_000 }); } catch {}
await page.waitForTimeout(2500);

for (const [name, sel] of SECTIONS) {
  const el = page.locator(sel).first();
  if (!(await el.count())) { console.log(`${name}: NOT FOUND (${sel})`); continue; }
  await el.scrollIntoViewIfNeeded();
  // Let the scroll-scrubbed reveals settle at their in-view state.
  await page.waitForTimeout(1400);
  const box = await el.boundingBox();
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${name}: h=${box ? Math.round(box.height) : '?'}`);
}

console.log(errors.length ? `errors: ${errors.slice(0, 5)}` : 'errors: none');
await browser.close();
