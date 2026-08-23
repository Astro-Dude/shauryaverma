/**
 * Layer parity check.
 *
 * The red layer is a duplicate of the page revealed through a moving hole, so a text block in
 * one layer has to sit exactly on top of its twin in the other. Any drift shows up as
 * misaligned text the moment the spotlight passes over it.
 *
 * This walks both layers in parallel and reports, per corresponding block, how far apart they
 * are. It is the objective version of "does it line up".
 *
 *   node tools/parity.mjs
 */

import { chromium } from 'playwright';

const URL_ = process.env.VERIFY_URL ?? 'http://localhost:5173/';
/** Drift under this many px reads as aligned at display sizes. */
const TOLERANCE = 2;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(URL_, { waitUntil: 'networkidle' });
try {
  await page.locator('#js-page-loading_start').click({ timeout: 20_000 });
} catch { /* no loader */ }
await page.waitForTimeout(2500);

const report = await page.evaluate(() => {
  const dark = document.querySelector('.layer__dark');
  const red = document.querySelector('.layer__red');
  if (!dark || !red) return { error: 'layers not found' };

  const docTop = (el, layer) =>
    el.getBoundingClientRect().top - layer.getBoundingClientRect().top;

  /* Compare like with like: the same selector, in DOM order, within each layer. */
  const groups = [
    ['hero headline', '.hero h1'],
    ['hero subtitle', '.hero_content_inner_subtitle'],
    ['section blocks', '.hero, .about, .work, .client, .video, .testimonials, .motto, .contact'],
    ['paragraphs', '.scroll-paragraph-mask.is-masking'],
    ['heading rows', '.heading-mask'],
    ['achievement items', '.testimonial'],
    ['motto headline', '.motto_content_heading'],
  ];

  const out = [];
  for (const [name, sel] of groups) {
    const a = Array.from(dark.querySelectorAll(sel));
    const b = Array.from(red.querySelectorAll(sel));
    const rows = [];
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (!a[i] || !b[i]) {
        rows.push({ i, missing: !a[i] ? 'dark' : 'red', text: (a[i] ?? b[i]).textContent.trim().slice(0, 34) });
        continue;
      }
      const ra = a[i].getBoundingClientRect();
      const rb = b[i].getBoundingClientRect();
      rows.push({
        i,
        text: a[i].textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
        dTop: +(docTop(b[i], red) - docTop(a[i], dark)).toFixed(1),
        dHeight: +(rb.height - ra.height).toFixed(1),
        dWidth: +(rb.width - ra.width).toFixed(1),
        dLeft: +(rb.left - ra.left).toFixed(1),
      });
    }
    out.push({ name, countDark: a.length, countRed: b.length, rows });
  }
  return {
    darkHeight: dark.getBoundingClientRect().height,
    redHeight: red.getBoundingClientRect().height,
    groups: out,
  };
});

if (report.error) {
  console.error(report.error);
  process.exit(1);
}

console.log(`layer height   dark ${report.darkHeight.toFixed(0)}px   red ${report.redHeight.toFixed(0)}px   drift ${(report.redHeight - report.darkHeight).toFixed(1)}px\n`);

let worst = 0;
let failures = 0;

for (const g of report.groups) {
  const countMismatch = g.countDark !== g.countRed ? `  ⚠ COUNT ${g.countDark} vs ${g.countRed}` : '';
  console.log(`── ${g.name} (${g.countDark})${countMismatch}`);
  for (const r of g.rows) {
    if (r.missing) {
      console.log(`   [${r.i}] MISSING in ${r.missing}: "${r.text}"`);
      failures += 1;
      continue;
    }
    const drift = Math.max(Math.abs(r.dTop), Math.abs(r.dHeight));
    worst = Math.max(worst, drift);
    const flag = drift > TOLERANCE ? ' ✗' : '';
    if (drift > TOLERANCE) failures += 1;
    if (drift > TOLERANCE || process.env.VERBOSE) {
      console.log(`   [${r.i}] top ${String(r.dTop).padStart(8)}  h ${String(r.dHeight).padStart(8)}  w ${String(r.dWidth).padStart(8)}${flag}  "${r.text}"`);
    }
  }
}

/*
 * Clipping audit.
 *
 * Zero drift is necessary but not sufficient: two blocks cropped to the same wrong height also
 * measure as perfectly aligned. This catches the case that actually bit during development,
 * where fixed heights hid over half of every paragraph while parity reported success.
 *
 * Only elements that genuinely crop are reported: an element whose overflow is visible may
 * exceed its box (descender padding does this routinely) without losing anything.
 */
const clipped = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.layer__dark *, .layer__red *').forEach((el) => {
    /*
     * Skip the reveal wrappers. Their `overflow: hidden` IS the animation: `.split-line` is the
     * edge characters rise from, `.simple-masking` is the window the wipe travels across. Both
     * legitimately crop the glyph em-box, which at 84% leading overhangs the line box by ~35px
     * — harmless for the uppercase display type this design uses.
     */
    if (el.closest('.split-line, .simple-masking, .split-char')) return;
    // The screen-reader-only pattern is a 1px box with hidden overflow by definition.
    if (el.classList.contains('visually-hidden')) return;
    /*
     * Full-bleed backgrounds are scaled up (js-anim--scale rests at 1.18x) and cropped by their
     * section on purpose — that crop is what makes the slow zoom read as a zoom rather than a
     * resize. A transform grows the scrollable area, so these always look "clipped".
     */
    if (el.querySelector('.js-anim--scale') || el.closest('.js-anim--scale')) return;
    if (/_bg$|_bg\s/.test(String(el.className))) return;
    /*
     * A row the featured panel's agent creates. It rests collapsed to zero height with its content
     * still in the DOM, because opening it IS the animation, so it is clipped by definition.
     */
    if (el.classList.contains('byos_row__new')) return;
    /*
     * A revealed row name is deliberately wider than its column and cut at the boundary, which is
     * the effect the reference uses. Clipped by design, so not a finding.
     */
    if (el.classList.contains('heading-mask_clip')) return;
    /*
     * The featured panel's window. Clipping its own contents is what a window does, and it is drawn
     * at a fixed design size and scaled, so its box and its content never agree by definition.
     */
    if (el.classList.contains('byos_win')) return;

    const s = getComputedStyle(el);
    const hides = s.overflow === 'hidden' || s.overflowY === 'hidden' || s.overflow === 'clip';
    if (!hides) return;
    // Line-clamped elements are cropped on purpose.
    if (s.webkitLineClamp && s.webkitLineClamp !== 'none') return;
    const box = el.getBoundingClientRect().height;
    if (box < 1) return;
    const lost = el.scrollHeight - Math.ceil(box);
    // A few px is descender padding, not lost content; a whole line is a real problem.
    if (lost > 12) {
      out.push({
        sel: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')}`,
        box: Math.round(box),
        content: el.scrollHeight,
        lost,
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
  });
  return out;
});

if (clipped.length) {
  console.log(`\n── clipped content (${clipped.length})`);
  for (const c of clipped) {
    console.log(`   ${c.sel}  box ${c.box} content ${c.content} (lost ${c.lost}px)  "${c.text}"`);
  }
}

console.log(`\nworst drift ${worst.toFixed(1)}px · ${failures} block(s) over ${TOLERANCE}px · ${clipped.length} clipped`);
await browser.close();
process.exit(failures || clipped.length ? 1 : 0);
