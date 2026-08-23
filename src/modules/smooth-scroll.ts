/**
 * Smooth scrolling, and the element parallax that rides on it.
 *
 * Lenis owns the scroll position; GSAP's ticker drives it and ScrollTrigger is told to ask
 * Lenis rather than the window. Getting this handshake right is what stops scroll-triggered
 * animations from lagging a frame behind the content they belong to.
 *
 * Markup hooks:
 *   data-lenis-speed="±n"     translate the element by scroll * n  (background bands, the orb)
 *   data-lenis-parallax="n"   the same, expressed as a share of the element's own height
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

type ScrollListener = (scroll: number) => void;

let lenis: Lenis | null = null;
const listeners = new Set<ScrollListener>();

/** Current scroll offset in px, whether or not Lenis is running. */
export const getScroll = (): number => lenis?.scroll ?? window.scrollY;

/** Subscribe to scroll updates. Returns an unsubscribe function. */
export function onScroll(fn: ScrollListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function scrollTo(target: string | number | HTMLElement): void {
  if (lenis) lenis.scrollTo(target, { duration: 1.2 });
  else if (typeof target !== 'number') document.querySelector(String(target))?.scrollIntoView();
}

/** Elements that translate against the scroll, resolved once at init. */
interface ParallaxTarget {
  el: HTMLElement;
  speed: number;
  /** When true, `speed` is a share of the element's height rather than of raw scroll. */
  relative: boolean;
  top: number;
  height: number;
}

let targets: ParallaxTarget[] = [];

function collectParallax(): void {
  const nodes = document.querySelectorAll<HTMLElement>('[data-lenis-speed], [data-lenis-parallax]');
  targets = Array.from(nodes).map((el) => {
    const relative = el.hasAttribute('data-lenis-parallax');
    const raw = el.getAttribute(relative ? 'data-lenis-parallax' : 'data-lenis-speed') ?? '0';
    const rect = el.getBoundingClientRect();
    return {
      el,
      speed: parseFloat(raw),
      relative,
      top: rect.top + window.scrollY,
      height: rect.height,
    };
  });
}

/**
 * Offset each parallax element by its distance from the viewport centre. Using distance rather
 * than absolute scroll keeps every element's motion centred on its own position, so nothing
 * has drifted far off by the time it enters view.
 */
function renderParallax(scroll: number): void {
  const mid = scroll + window.innerHeight / 2;
  for (const t of targets) {
    const distance = mid - (t.top + t.height / 2);
    const amount = t.relative ? distance * t.speed : distance * t.speed;
    t.el.style.transform = `translate3d(0, ${amount.toFixed(2)}px, 0)`;
  }
}

export function initSmoothScroll(): Lenis | null {
  gsap.registerPlugin(ScrollTrigger);

  // Honour the OS setting: no smoothing, no parallax, native scrolling only.
  if (prefersReducedMotion()) {
    document.documentElement.style.scrollBehavior = 'auto';
    ScrollTrigger.refresh();
    return null;
  }

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Touch scrolling stays native; smoothing it fights the platform.
    syncTouch: false,
  });

  // Expose for the Playwright verification script, which needs to drive scroll deterministically.
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

  collectParallax();

  lenis.on('scroll', ({ scroll }: { scroll: number }) => {
    ScrollTrigger.update();
    renderParallax(scroll);
    for (const fn of listeners) fn(scroll);
  });

  // One clock for both libraries, so they can never disagree about the current frame.
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop: (value) => {
      if (typeof value === 'number') lenis?.scrollTo(value, { immediate: true });
      return lenis?.scroll ?? 0;
    },
    getBoundingClientRect: () => ({
      top: 0, left: 0, width: window.innerWidth, height: window.innerHeight,
    }),
  });

  // Layout shifts (font swap, image load, resize) invalidate the cached parallax geometry.
  const remeasure = () => {
    collectParallax();
    renderParallax(getScroll());
    ScrollTrigger.refresh();
  };
  window.addEventListener('resize', remeasure);
  document.fonts?.ready.then(remeasure);

  renderParallax(0);
  return lenis;
}
