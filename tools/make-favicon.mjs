/**
 * Generate the tab icon from the site's own lettermark.
 *
 * Drawn in the browser against the running dev server rather than hand-authored as SVG paths,
 * because the mark IS Jost at 700 with -0.07em tracking: rendering it any other way means the
 * favicon and the header logo drift apart the moment either changes. An SVG favicon using
 * <text> was the other option and was rejected - Jost is self-hosted, so a viewer's browser has
 * no way to resolve it and the mark would silently fall back to their system sans.
 *
 * Each size is drawn at its native resolution rather than downscaled from one master, because at
 * 32px the letterforms need the font's own rasterisation to stay legible.
 *
 * Usage: node tools/make-favicon.mjs [--invert]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const INVERT = process.argv.includes('--invert');
const INK = '#b7ab98';
const BG = '#0d0d0d';
const SIZES = [
  ['public/favicon-32.png', 32],
  ['public/favicon-64.png', 64],
  ['public/favicon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon-512.png', 512],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

for (const [path, size] of SIZES) {
  const b64 = await page.evaluate(async ([s, ink, bg, invert]) => {
    await document.fonts.load(`700 ${Math.round(s * 0.5)}px Jost`);
    await document.fonts.ready;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const x = c.getContext('2d');

    // Rounded square, full bleed. 22% radius reads as a squircle at 32px without going circular.
    const r = s * 0.22;
    x.fillStyle = invert ? ink : bg;
    x.beginPath();
    x.moveTo(r, 0); x.arcTo(s, 0, s, s, r); x.arcTo(s, s, 0, s, r);
    x.arcTo(0, s, 0, 0, r); x.arcTo(0, 0, s, 0, r); x.closePath(); x.fill();

    /*
     * Fit by measured ink, not by font-size. Jost's em box carries loose bearings, so a size
     * picked as a fraction of the canvas leaves the mark visibly small and off-centre. This
     * measures the actual glyph box and solves for the size that fills the target width.
     */
    const target = s * 0.66;
    const track = -0.07;
    const measure = (fs) => {
      x.font = `700 ${fs}px Jost, sans-serif`;
      x.letterSpacing = `${track * fs}px`;
      const m = x.measureText('SV');
      // The trailing letter-space is layout, not ink: drop it so the mark centres on its glyphs.
      return {
        w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        asc: m.actualBoundingBoxAscent,
        desc: m.actualBoundingBoxDescent,
        left: m.actualBoundingBoxLeft,
      };
    };
    let fs = s * 0.5;
    for (let i = 0; i < 6; i++) {
      const m = measure(fs);
      fs *= target / m.w;
    }
    const m = measure(fs);
    x.fillStyle = invert ? bg : ink;
    x.textBaseline = 'alphabetic';
    x.textAlign = 'left';
    x.fillText('SV', (s - m.w) / 2 + m.left, (s + m.asc - m.desc) / 2);
    return c.toDataURL('image/png').split(',')[1];
  }, [size, INK, BG, INVERT]);
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`  ${path}  ${size}x${size}`);
}
await browser.close();
