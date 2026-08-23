/**
 * Markup helpers shared by both layers.
 *
 * Everything is a plain string builder so `vite.config.js` can render the page at build time
 * and ship static HTML — the animations are progressive enhancement on top of real markup,
 * not a requirement for the content to exist.
 */

/** Escape text destined for HTML. Copy in src/data is trusted, but headings become attributes too. */
export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Join class names, dropping falsy entries. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * A `heading-mask` row: two stacked copies of the same geometry. `deep` is what you see;
 * `masking` is clipped to the centre line until hover opens the red band over it.
 *
 * @param {object} o
 * @param {string} o.deep      Markup for the resting state.
 * @param {string} o.masking   Markup revealed by the band.
 * @param {boolean} [o.first]  First row of a group — the reference leaves it un-ruled.
 * @param {string} [o.className]
 * @param {boolean} [o.interactive] Attach the JS hover hook (false inside the red layer).
 */
export const headingMask = ({ deep, masking, first = false, className = '', interactive = true }) => `
  <div class="${cx('heading-mask', first && 'heading-mask__now', interactive && 'js-heading-mask', interactive && 'js-cursor-contract', className)}">
    <div class="heading-mask_el heading-mask_el__deep">${deep}</div>
    <div class="heading-mask_el heading-mask_el__masking" aria-hidden="true">${masking}</div>
  </div>`;

/**
 * A paragraph that wipes in line by line as it scrolls. The module duplicates this node into
 * a dimmed backing copy plus a clipped foreground copy; the markup just marks the target.
 */
export const scrollParagraph = (html, { animate = true } = {}) =>
  `<div class="${cx('scroll-paragraph-mask', 'js-scroll-paragraph-mask')}"${animate ? '' : ' data-no-anim'}>${html}</div>`;

/** Section eyebrow label — the small tracked-out uppercase text above each block. */
export const label = (text, extra = '') =>
  `<p class="${cx('body-text', 'text-uppercase', extra)}">${esc(text)}</p>`;

/**
 * Hero/motto display lines. `js-anim--chars` opts the element into the per-character
 * stagger; inside the red layer the animation is skipped so the two never desync.
 */
export const displayLines = (lines, { animate = true, offset = '0.6' } = {}) => {
  const inner = lines
    .map((l) => (l.strong ? `<strong>${esc(l.text)}</strong>` : esc(l.text)))
    .join('<br>');
  // The hook is emitted on BOTH layers even though only the dark one animates: the module
  // splits the text either way, and identical DOM structure is what keeps the two layers in
  // register under the mask.
  const cls = cx('text-center', 'mb-0', 'js-anim--chars');
  return `<h1 class="${cls}" data-screen-offset="${offset}"${animate ? '' : ' data-no-anim'}>${inner}</h1>`;
};
