/**
 * Environment facts the motion layer branches on.
 *
 * Read once at startup where the value cannot change (touch support), and live where it can
 * (viewport width, reduced-motion preference).
 */

export const isTouch = (): boolean =>
  window.matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0;

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The reference's `lg` breakpoint, where the layout switches to the wide grid. */
export const isDesktop = (): boolean => window.matchMedia('(min-width: 992px)').matches;

/** Linear interpolation. */
export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

/**
 * Frame-rate-independent smoothing factor.
 *
 * `1 - base^dt` is the reference's own easing: it converges on the target at a fixed rate per
 * second regardless of frame rate, so the cursor feels identical at 60Hz and 120Hz. A plain
 * per-frame lerp would move twice as fast on a 120Hz display.
 */
export const smoothing = (dt: number, base = 0.001): number => 1 - Math.pow(base, dt);

/** Convert a rem-ish design value to px against the current root font-size. */
export const rem = (value: number): number =>
  value * parseFloat(getComputedStyle(document.documentElement).fontSize);

/**
 * Publish the real viewport height as `--vh`.
 *
 * Mobile browsers report `100vh` as the height *without* the collapsing URL bar, so a
 * full-height hero ends up taller than the screen and the layout jumps mid-scroll. Writing the
 * measured value keeps every `calc(var(--vh) * 100)` honest.
 *
 * Bound to `resize` rather than `scroll`: on iOS the value changes as the bar collapses, and
 * reacting to that mid-gesture causes the very jump we are avoiding.
 */
export function setViewportUnit(): () => void {
  const write = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`);
  };
  write();
  window.addEventListener('resize', write);
  window.addEventListener('orientationchange', write);
  return () => {
    window.removeEventListener('resize', write);
    window.removeEventListener('orientationchange', write);
  };
}

/**
 * Record the pointer position from page load.
 *
 * The masker only starts once the loader has been dismissed, by which point the visitor has
 * already moved and clicked — so it needs to know where the cursor is rather than waiting for
 * the next `pointermove`.
 */
let pointer: { x: number; y: number } | null = null;

export function trackPointer(): void {
  window.addEventListener(
    'pointermove',
    (e) => { pointer = { x: e.clientX, y: e.clientY }; },
    { passive: true },
  );
}

/** Last known pointer position, or null if the pointer has never moved. */
export const getPointer = (): { x: number; y: number } | null => pointer;
