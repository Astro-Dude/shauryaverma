/**
 * The intro overlay.
 *
 * A progress ring fills while assets load, a counter climbs to 100, and then a button hands
 * control to the visitor. The button matters: the site opens with a full-bleed animated
 * background and a sound toggle, and starting that on the visitor's click rather than on load
 * is both politer and what lets audio play at all under autoplay policies.
 */

import { gsap } from 'gsap';
import { prefersReducedMotion } from './env';

/** `pathLength` on the SVG circle, so dash maths is in convenient units. */
const RING_LENGTH = 829;

export interface LoaderHandles {
  /** Resolves once the visitor has started the site. */
  started: Promise<void>;
}

export function initLoader(): LoaderHandles {
  const root = document.querySelector<HTMLElement>('.js-page-loading');
  const counter = document.querySelector<HTMLElement>('.js-loading_text');
  const ring = document.querySelector<SVGCircleElement>('.page-loading_circle circle');
  const startBtn = document.getElementById('js-page-loading_start') as HTMLButtonElement | null;
  const textWrap = document.getElementById('js-page-loading_text');

  if (!root || !counter || !startBtn) {
    return { started: Promise.resolve() };
  }

  if (ring) {
    ring.style.strokeDasharray = String(RING_LENGTH);
    ring.style.strokeDashoffset = String(RING_LENGTH);
  }

  const progress = { value: 0 };

  const paint = () => {
    const pct = Math.round(progress.value);
    counter.textContent = String(pct);
    if (ring) {
      ring.style.strokeDashoffset = String(RING_LENGTH * (1 - progress.value / 100));
    }
  };

  // Drive the ring from real progress where the browser tells us, and let the tween carry the
  // rest — a bar that stalls at 40% reads worse than one that moves.
  const load = gsap.to(progress, {
    value: 100,
    duration: prefersReducedMotion() ? 0.4 : 2.2,
    ease: 'power2.inOut',
    onUpdate: paint,
  });

  gsap.set(textWrap, { opacity: 1 });

  const started = new Promise<void>((resolve) => {
    const reveal = () => {
      startBtn.disabled = true;

      /*
       * Hand over IMMEDIATELY, not when the fade finishes.
       *
       * The reveal modules split text and set their starting states, and resolving after the
       * overlay had gone meant the page was briefly visible in its un-split, fully-shown state
       * before hiding itself to animate in: content appeared, then appeared to load again. Given
       * the handover now happens under the overlay, that preparation is invisible.
       */
      resolve();

      const tl = gsap.timeline({
        onComplete: () => {
          root.remove();
        },
      });

      if (prefersReducedMotion()) {
        tl.to(root, { autoAlpha: 0, duration: 0.3 });
        return;
      }

      tl.to([startBtn, '.page-loading_logo'], {
        autoAlpha: 0, duration: 0.4, ease: 'power2.out',
      })
        .to(root, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.2');
    };

    startBtn.addEventListener('click', reveal, { once: true });

    /*
     * On completion the progress indicators retire and the button takes their place: the finished
     * state is just the mark and one call to action. Leaving a filled ring and a "100%" on screen
     * reads as a stalled loader rather than a finished one.
     */
    load.eventCallback('onComplete', () => {
      const tl = gsap.timeline();

      if (!prefersReducedMotion()) {
        // The ring grows very slightly as it goes, so it reads as completing rather than vanishing.
        tl.to(ring, { autoAlpha: 0, scale: 1.04, duration: 0.5, ease: 'power2.out',
          transformOrigin: 'center' }, 0);
      } else {
        tl.set([ring, textWrap], { autoAlpha: 0 }, 0);
      }
      tl.to(textWrap, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' }, 0);

      startBtn.hidden = false;
      tl.fromTo(startBtn,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.18);
      tl.add(() => startBtn.focus({ preventScroll: true }));
    });
  });

  return { started };
}
