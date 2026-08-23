// Shared Playwright capture routine.
//
// Used twice: once against minhpham.design to record ground truth (`capture-reference.mjs`),
// once against the local dev server to check our rebuild (`verify.mjs`). Keeping one routine
// means both runs frame identical shots, which is the whole point — the outputs get compared
// side by side.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 682 },
];

// Type classes whose computed styles we want, to match the reference's scale exactly.
const TYPE_SELECTORS = [
  'h1', '.h1', 'h2', '.h2', 'h3', '.h3', 'h4', '.h4', 'h6', '.h6',
  '.desc', '.body-text', '.sub-content',
];

const SPACING_VARS = [
  '--screen-x', '--break-line', '--spacing-supper', '--spacing-xl', '--spacing-xlx',
  '--spacing-lg', '--spacing-md', '--spacing-sm', '--spacing-sx', '--screen-left',
  '--size-btn', '--viewSizeX', '--viewSizeY',
];

/** Dismiss the intro loader if one is present, then wait for the reveal to settle. */
async function startSite(page) {
  const start = page.locator('#js-page-loading_start');
  try {
    await start.waitFor({ state: 'visible', timeout: 20_000 });
    await start.click();
  } catch {
    // No loader (or it auto-dismissed) — carry on.
  }
  await page.waitForTimeout(2500);
}

/**
 * Scroll to an absolute offset and wait for smooth-scroll easing to settle.
 * Lenis animates asynchronously, so a plain scrollTo + screenshot races the tween.
 */
async function scrollTo(page, y) {
  await page.evaluate((target) => {
    // Lenis hijacks scrollTo; dispatching wheel deltas is unreliable, so drive it directly
    // when it's exposed, else fall back to the native scroller.
    const lenis = window.__lenis ?? window.lenis;
    if (lenis?.scrollTo) lenis.scrollTo(target, { immediate: false, duration: 0.8 });
    else window.scrollTo({ top: target, behavior: 'smooth' });
  }, y);
  await page.waitForTimeout(1400);
}

async function readTokens(page) {
  return page.evaluate(({ typeSelectors, spacingVars }) => {
    const rootStyle = getComputedStyle(document.documentElement);
    const spacing = {};
    for (const v of spacingVars) {
      const value = rootStyle.getPropertyValue(v).trim();
      if (value) spacing[v] = value;
    }

    const type = {};
    for (const sel of typeSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const s = getComputedStyle(el);
      type[sel] = {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
        color: s.color,
      };
    }

    const body = getComputedStyle(document.body);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      pageHeight: document.documentElement.scrollHeight,
      body: { background: body.backgroundColor, color: body.color, fontFamily: body.fontFamily },
      spacing,
      type,
    };
  }, { typeSelectors: TYPE_SELECTORS, spacingVars: SPACING_VARS });
}

/**
 * Capture the interaction states that define this design: the cursor-tracking red spotlight
 * at each of its size stops, and the heading-mask row bands.
 */
async function captureInteractions(page, outDir, tag) {
  const shot = (name) => page.screenshot({ path: join(outDir, `${tag}-${name}.png`) });

  // Red spotlight at its "extend" stop (450px) — park the pointer on a paragraph block.
  const extend = page.locator('.js-cursor-extend').first();
  if (await extend.count()) {
    const box = await extend.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
      await page.waitForTimeout(1200);
      await shot('cursor-extend-450');
    }
  }

  // Collapsed stop (0px) — pointer over a contract zone such as a nav link.
  const contract = page.locator('.js-cursor-contract').first();
  if (await contract.count()) {
    const box = await contract.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
      await page.waitForTimeout(900);
      await shot('cursor-contract-0');
    }
  }

  // heading-mask rows: the red band opening from the centre line.
  const rows = page.locator('.js-heading-mask');
  const rowCount = Math.min(await rows.count(), 3);
  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i);
    const box = await row.boundingBox();
    if (!box) continue;
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const fresh = await row.boundingBox();
    if (!fresh) continue;
    await page.mouse.move(fresh.x + fresh.width / 2, fresh.y + fresh.height / 2, { steps: 12 });
    await page.waitForTimeout(180);
    await shot(`heading-mask-${i}-mid`);
    await page.waitForTimeout(700);
    await shot(`heading-mask-${i}-open`);
  }
}

/**
 * Screenshot `url` across viewports at evenly spaced scroll offsets, plus interaction states,
 * and dump computed design tokens.
 *
 * @returns {Promise<{tokens: object, shots: string[]}>}
 */
export async function shoot({ url, outDir, steps = 8, interactions = true }) {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const tokens = {};
  const shots = [];

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        // The reference gates its cursor effects on touch detection; force desktop-style
        // hover so the spotlight is actually exercised on the desktop viewport.
        hasTouch: vp.name === 'mobile',
        isMobile: vp.name === 'mobile',
      });
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') console.warn(`  [${vp.name}] console error: ${msg.text()}`);
      });

      console.log(`→ ${vp.name} (${vp.width}x${vp.height}) ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
      await startSite(page);

      tokens[vp.name] = await readTokens(page);

      const pageHeight = tokens[vp.name].pageHeight;
      const maxScroll = Math.max(0, pageHeight - vp.height);
      for (let i = 0; i < steps; i += 1) {
        const y = Math.round((maxScroll * i) / (steps - 1));
        await scrollTo(page, y);
        const file = join(outDir, `${vp.name}-scroll-${String(i).padStart(2, '0')}.png`);
        await page.screenshot({ path: file });
        shots.push(file);
      }

      if (interactions && vp.name === 'desktop') {
        await scrollTo(page, 0);
        await captureInteractions(page, outDir, vp.name);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(join(outDir, 'tokens.json'), `${JSON.stringify(tokens, null, 2)}\n`);
  return { tokens, shots };
}
