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
  const thumbs = Array.from(section.querySelectorAll<HTMLElement>('.thumb-item'));
  const flash = section.querySelector<HTMLElement>('.js-testimonials_thumbs_flash');
  if (!items.length) return;

  const setActive = (index: number) => {
    thumbs.forEach((t, i) => t.classList.toggle('is-active', i === index));
    if (flash && thumbs[index]) {
      const target = thumbs[index];
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
        duration: prefersReducedMotion() ? 0 : 0.45,
        ease: 'power3.out',
      });
    }
  };

  setActive(0);

  items.forEach((item, index) => {
    ScrollTrigger.create({
      trigger: item,
      // Fire when the item occupies the middle band of the viewport, which is where it reads.
      start: 'top 65%',
      end: 'bottom 35%',
      onEnter: () => setActive(index),
      onEnterBack: () => setActive(index),
    });
  });
}
