/**
 * Entry point.
 *
 * Initialisation order matters in two places:
 *   - smooth scroll comes first, because every ScrollTrigger built afterwards needs to be
 *     measuring against Lenis rather than the window;
 *   - the reveals wait for the loader, so nothing animates past the overlay unseen.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/700.css';
import '@fontsource/nunito-sans/400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/grid.css';
import './styles/sections/layers.css';
import './styles/sections/masks.css';
import './styles/sections/sections.css';

import { initSmoothScroll, scrollTo } from './modules/smooth-scroll';
import { initMasker } from './modules/masker';
import { initHeadingMasks } from './modules/heading-mask';
import { initReveals } from './modules/reveals';
import { initLoader } from './modules/loader';
import { initShowcase } from './modules/showcase';
import { initAchievements } from './modules/achievements';
import { initSound, initEmail } from './modules/sound';
import { initMagnetic } from './modules/magnetic';
import { initArchitecture } from './modules/architecture';
import { isTouch, setViewportUnit, trackPointer } from './modules/env';

gsap.registerPlugin(ScrollTrigger);

function initNav(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.header_menu_item a'));
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      e.preventDefault();
      scrollTo(href);
    });
  });

  /*
   * The section you are in lights its nav label, the same state a hover gives it.
   *
   * A section is current once its top has passed the middle of the viewport. The last one also wins
   * at the very bottom of the page, because Contact is shorter than a screen and its top may never
   * get that far up.
   *
   * A plain scroll listener rather than ScrollTrigger: Lenis moves the real window scroll, so this
   * works with smoothing on or off, and from before the loader has finished.
   */
  const spied = links
    .map((link) => ({ item: link.closest<HTMLElement>('.header_menu_item'), section: document.querySelector<HTMLElement>(link.hash) }))
    .filter((s): s is { item: HTMLElement; section: HTMLElement } => !!s.item && !!s.section);
  if (!spied.length) return;

  let queued = false;
  const update = () => {
    queued = false;
    const mid = window.innerHeight / 2;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = 0;
    spied.forEach((s, i) => { if (s.section.getBoundingClientRect().top <= mid) current = i; });
    if (atEnd) current = spied.length - 1;
    spied.forEach((s, i) => s.item.classList.toggle('is-active', i === current));
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
}

function boot(): void {
  setViewportUnit();
  // Start before anything else, so the masker knows where the cursor is when it wakes up.
  trackPointer();
  if (isTouch()) document.documentElement.classList.add('is-touch');

  // Available immediately — these do not depend on the loader having finished.
  initEmail();
  initHeadingMasks();
  initArchitecture();
  initNav();
  initSound();

  /*
   * The magnetic targets are the fixed marks in the corners: the social icons and the logo.
   * Both are small and easy to overlook, so leaning toward the cursor is what makes them
   * findable. The nav and the sound toggle are deliberately left out; they are already obvious
   * and moving them only adds noise.
   *
   * Only ever one engages at a time (see magnetic.ts), so these pools cannot fight.
   */
  initMagnetic('.footer_socials .social_link', { radius: 95, strength: 0.45 });
  initMagnetic('.header_logo .link-logo', { radius: 110, strength: 0.4 });

  /*
   * Three.js is ~500KB and every canvas it draws is decorative, so it is split into its own
   * chunk and fetched after the page is interactive. The sections behind these canvases have a
   * solid background, so nothing looks broken while it loads (or if it never does).
   */
  void import('./modules/webgl').then(({ initWebgl }) => initWebgl());
  void import('./modules/objects3d').then(({ init3dObjects }) => init3dObjects());

  const { started } = initLoader();

  void started.then(async () => {
    /*
     * Wait for the webfont before splitting text. SplitText freezes line breaks at the moment it
     * runs, so splitting against a fallback face bakes in the wrong wrapping and the lines stay
     * wrong after the real font swaps in.
     */
    try {
      await document.fonts.ready;
    } catch {
      // Non-fatal: split against whatever is loaded.
    }

    initSmoothScroll();
    initReveals();
    initMasker();
    initShowcase();
    initAchievements();
    ScrollTrigger.refresh();

    /*
     * Only now is the content allowed to show. Until this class lands the animated blocks are
     * held at opacity 0 (see base.css), which is what stops the page flashing its un-animated
     * state while the above is still preparing.
     */
    document.documentElement.classList.add('js-ready');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
