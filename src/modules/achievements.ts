/**
 * The achievements slider.
 *
 * Sits in the reference's testimonial slot: items advance as the section scrolls, and a thumb
 * rail on the right tracks which one is live. The rail is the only affordance telling you
 * there is more than one, so it moves with the scroll rather than on a timer.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

export function initAchievements(root: ParentNode = document): void {
  const section = root.querySelector<HTMLElement>('.js-testimonials');
  if (!section) return;

  const items = Array.from(section.querySelectorAll<HTMLElement>('.js-testimonial'));
  if (!items.length) return;

  /*
   * Every copy of the rail: the dark layer's, and the red layer's under the spotlight. Only the dark
   * one used to move, so opening the spotlight over the rail showed the first item lit regardless.
   */
  const rails = Array.from(root.querySelectorAll<HTMLElement>('.testimonials_thumbs_inner')).map((rail) => ({
    thumbs: Array.from(rail.querySelectorAll<HTMLElement>('.thumb-item')),
    flash: rail.querySelector<HTMLElement>('.js-testimonials_thumbs_flash'),
  }));

  let current = -1;

  const setActive = (index: number, animate = true) => {
    if (index === current) return;
    current = index;
    for (const { thumbs, flash } of rails) {
      thumbs.forEach((t, i) => t.classList.toggle('is-active', i === index));
      const target = thumbs[index];
      if (!flash || !target) continue;
      // The flash is positioned against the rail, so measure inside it.
      const railTop = (target.offsetParent as HTMLElement | null)?.offsetTop ?? 0;
      /*
       * Position only. The marker is a CSS border triangle, which requires a zero-height box: the
       * red `border-right` is only a triangle while there is no content box for it to run along.
       * Animating height to the thumb's own height stretched it into a tapered vertical bar the
       * full height of the circle, so the rail read as a sliver rather than an arrow.
       *
       * Centring is computed here from the two measured heights instead of a fixed CSS offset,
       * because --arrow-size changes at the 768 breakpoint and a hard-coded half would drift.
       */
      gsap.to(flash, {
        y: target.offsetTop - railTop + (target.offsetHeight - flash.offsetHeight) / 2,
        duration: animate && !prefersReducedMotion() ? 0.45 : 0,
        ease: 'power3.out',
        overwrite: true,
      });
    }
  };

  /*
   * The live item is worked out from where things are, every update, rather than from enter events.
   *
   * It used to be event-driven: each item lit itself on entering a band in the middle of the
   * viewport. Nothing un-lit it on the way back, and the items are taller than that band, so their
   * zones overlapped. Scroll down until 03 lit, back up, and 02 never re-entered (it had never left),
   * so 03 stayed lit over 02. A fast flick could also fire several enters in one frame, and the last
   * one created won rather than the one on screen.
   *
   * Now it is simply the last item whose top has crossed the middle of the viewport. One answer for
   * any scroll position, whichever direction it was reached from and however fast.
   */
  const pick = () => {
    const mid = window.innerHeight / 2;
    let index = 0;
    items.forEach((item, i) => { if (item.getBoundingClientRect().top <= mid) index = i; });
    return index;
  };

  setActive(pick(), false);

  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: () => setActive(pick()),
    // A refresh can move the thumbs (resize, breakpoint), so the marker is re-placed even if the item is unchanged.
    onRefresh: () => { current = -1; setActive(pick(), false); },
  });
}
