/**
 * Scroll-driven text reveals.
 *
 * Four related effects, all of which wipe rather than fade:
 *
 *   .js-scroll-paragraph-mask   per-line left-to-right wipe, scrubbed against scroll
 *   .js-simple-masking_el       the same wipe for a single inline heading, played on entry
 *   .js-anim--chars             per-character rise, staggered
 *   .js-anim--lines--sim        per-line rise, all lines together
 *   .js-anim--scale             a slow scale-down, for full-bleed backgrounds
 *
 * The wipes work by rendering the content twice: a dimmed copy that is always present, and a
 * full-strength copy clipped to nothing that the animation opens. Duplicating in JS rather
 * than in the template keeps the markup honest — the page ships one readable copy of every
 * sentence, and the second appears only if the motion layer loads.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Exposed for the Playwright tooling, alongside __lenis. Reading a trigger's resolved start/end
// is the only reliable way to tell a mis-measured trigger from a mis-authored one.
(window as unknown as { __ScrollTrigger?: typeof ScrollTrigger }).__ScrollTrigger = ScrollTrigger;

/** True when the element should be split for geometry parity but not animated. */
const isStatic = (el: HTMLElement): boolean => el.hasAttribute('data-no-anim');

/**
 * Read a per-element trigger offset.
 *
 * The value is the share of viewport height at which the element's TOP fires the animation, so
 * it reads inversely to intuition: `0.9` triggers as the element enters from the bottom, `0.2`
 * waits until it has climbed almost to the top of the screen. The motto was authored at `0.2`
 * and consequently did nothing until it was already past — anything meant to animate on arrival
 * wants a value near the top of this range.
 */
function startOffset(el: HTMLElement, fallback = 0.85): string {
  const raw = el.dataset.screenOffset ?? el.dataset.offset;
  const value = raw ? parseFloat(raw) : NaN;
  const share = Number.isFinite(value) ? value : fallback;
  return `top ${Math.round(share * 100)}%`;
}

/* ---------------------------------------------------------------- paragraph wipe */

export function initParagraphMasks(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<HTMLElement>('.js-scroll-paragraph-mask');

  nodes.forEach((el) => {
    const source = el.innerHTML;

    /*
     * Split once, then clone.
     *
     * The obvious approach — insert two copies and split each — produced copies with different
     * line counts: SplitText freezes wrapping at the moment it runs, and the two runs happen at
     * different points in layout, so one copy broke "at the Meta" across two lines and the
     * other did not. The dim copy then sat a full line below the bright one and the reveal
     * showed doubled, offset text.
     *
     * Cloning the already-split DOM makes the two copies identical by construction, which is
     * the property this effect actually needs.
     */
    const bright = document.createElement('div');
    bright.className = 'scroll-paragraph-mask is-masking';
    bright.innerHTML = source;

    el.innerHTML = '';
    el.append(bright);

    const split = new SplitText(bright, { type: 'lines', linesClass: 'line' });

    const dim = bright.cloneNode(true) as HTMLElement;
    dim.className = 'scroll-paragraph-mask is-bg';
    dim.setAttribute('aria-hidden', 'true');
    // Inserted first so the bright copy paints over it.
    el.insertBefore(dim, bright);

    // The red layer is revealed by the mask, not by scroll, so its copy must simply be
    // visible. It still gets split above, so its line boxes match the dark layer's.
    if (prefersReducedMotion() || isStatic(el)) {
      gsap.set(split.lines, { clipPath: 'none' });
      return;
    }

    gsap.set(split.lines, { '--size': '100%' });

    gsap.to(split.lines, {
      '--size': '0%',
      ease: 'none',
      stagger: 0.22,
      scrollTrigger: {
        trigger: el,
        /*
         * Completes by the time the paragraph's TOP reaches the middle of the screen, i.e. while
         * the whole block is comfortably in view.
         *
         * Two earlier versions both left the tail of the sentence dimmed at the moment you would
         * actually read it: ending on `bottom 55%` finished only as the block left the viewport,
         * and ending on `top 30%` still had the last line a quarter unrevealed with the paragraph
         * sitting mid-screen. Keying the end to the top edge, high up, is what guarantees the
         * sentence is whole while it is readable.
         */
        start: 'top 95%',
        end: 'top 50%',
        scrub: 0.6,
      },
    });
  });
}

/* ---------------------------------------------------------------- inline heading wipe */

export function initSimpleMasking(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<HTMLElement>('.js-simple-masking_el');

  nodes.forEach((el) => {
    const source = el.innerHTML;

    // Same construction as the paragraph wipe: build one copy, clone it, so the two can never
    // lay out differently.
    const bright = document.createElement('span');
    bright.className = 'is-masking';
    bright.innerHTML = source;

    const dim = bright.cloneNode(true) as HTMLElement;
    dim.className = 'is-deep';
    dim.setAttribute('aria-hidden', 'true');

    el.innerHTML = '';
    el.append(dim, bright);

    if (prefersReducedMotion()) {
      gsap.set(bright, { clipPath: 'none' });
      return;
    }

    gsap.fromTo(
      bright,
      { '--size': '100%' },
      {
        '--size': '0%',
        duration: 1,
        delay: entryDelay(el),
        ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: startOffset(el, 0.9), once: true },
      },
    );
  });
}

/*
 * Entry animations are built while the loader overlay is still up, so that the text is split and
 * pushed to its starting state before anything is ever seen. The consequence is that whatever is
 * already on screen satisfies its trigger straight away and would play out behind the overlay,
 * so the reveal happens and nobody watches it.
 *
 * First-screen elements therefore wait for the overlay to clear. Everything below the fold gets
 * no delay: by the time it is scrolled to, the overlay is long gone and a delay would just read
 * as lag.
 */
const HANDOVER = 0.45;

function entryDelay(el: Element): number {
  const r = el.getBoundingClientRect();
  const onScreen = r.top < window.innerHeight && r.bottom > 0;
  return onScreen ? HANDOVER : 0;
}

/* ---------------------------------------------------------------- character rise */

export function initCharAnimations(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<HTMLElement>('.js-anim--chars:not(.is-handler)');

  nodes.forEach((el) => {
    el.classList.add('is-handler');

    const split = new SplitText(el, {
      type: 'lines,chars',
      linesClass: 'split-line',
      charsClass: 'split-char',
    });

    if (prefersReducedMotion() || isStatic(el)) return;

    gsap.from(split.chars, {
      yPercent: 110,
      duration: 1.1,
      delay: entryDelay(el),
      ease: 'power3.out',
      stagger: 0.022,
      scrollTrigger: { trigger: el, start: startOffset(el, 0.85), once: true },
    });
  });
}

/* ---------------------------------------------------------------- line rise */

export function initLineAnimations(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<HTMLElement>('.js-anim--lines--sim:not(.is-handler)');

  nodes.forEach((el) => {
    el.classList.add('is-handler');

    const split = new SplitText(el, { type: 'lines', linesClass: 'split-line' });
    if (prefersReducedMotion() || isStatic(el)) return;

    // "sim" for simultaneous: these are short labels, and staggering them reads as indecision.
    gsap.from(split.lines, {
      yPercent: 110,
      opacity: 0,
      duration: 0.9,
      delay: entryDelay(el),
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: startOffset(el, 0.9), once: true },
    });
  });
}

/* ---------------------------------------------------------------- background scale */

export function initScaleAnimations(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<HTMLElement>('.js-anim--scale:not(.is-handler)');

  nodes.forEach((el) => {
    el.classList.add('is-handler');
    if (prefersReducedMotion()) return;

    gsap.fromTo(
      el,
      { scale: 1.18 },
      {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.8 },
      },
    );
  });
}

/** Run every reveal. Called once after the loader hands over. */
export function initReveals(root: ParentNode = document): void {
  initParagraphMasks(root);
  initSimpleMasking(root);
  initCharAnimations(root);
  initLineAnimations(root);
  initScaleAnimations(root);
  ScrollTrigger.refresh();
}
