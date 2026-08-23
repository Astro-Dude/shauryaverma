/**
 * The monogram: "SV" set as a lettermark in the site's own display face.
 *
 * Live text rather than drawn paths, because it IS the site's typography: it picks up Jost at the
 * same weight as the headlines, so the mark and the type can never drift apart.
 *
 * Tracking is the whole design. At normal spacing it reads as two separate letters; pulled in to
 * -0.07em the S and V close up and read as a single unit. Tighter than that and the V crowds the
 * S; looser and it becomes a label rather than a mark.
 *
 * Single colour on purpose. A two-tone version (red V) looked good on the dark layer, but the
 * mark sits on the red layer too, where a red letter would disappear. Inheriting `currentColor`
 * is what lets it invert for free.
 */

/**
 * @param {object} [o]
 * @param {number} [o.size] font size in px
 * @param {string} [o.className]
 * @returns {string} the lettermark
 */
export const logo = ({ size = 40, className = 'logo-mark' } = {}) =>
  `<span class="${className}" style="font-size:${size}px" aria-hidden="true">SV</span>`;
