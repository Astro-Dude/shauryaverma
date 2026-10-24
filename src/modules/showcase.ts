/**
 * The featured-project panel.
 *
 * Occupies the slot the reference gives a video reel, and holds the flagship project's demo film.
 * It grows as it scrolls into view, which is the reference's behaviour, and the panel follows
 * through to the live app.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';
import { holdMusic } from './sound';

/* ------------------------------------------------------------------ the film */

/**
 * The featured panel's film: muted, looping, and only running while it is on screen.
 *
 * Nothing is fetched until the panel is near. The source is picked once, by viewport, from the two
 * encodes in the markup: a phone shows the film a few hundred pixels wide and has no use for 1080p.
 *
 * Sound follows the footer toggle. Turning it on is a click, which is the gesture browsers want
 * before audio, so the film can unmute there and then. A stored "on" from a previous visit has had
 * no gesture yet, so if the unmuted play is refused the film falls back to muted rather than
 * stopping.
 *
 * While the film is on screen the background music is held silent, since the film has its own
 * soundtrack. It comes back when the film scrolls away.
 */
function initFilm(root: ParentNode): void {
  const video = root.querySelector<HTMLVideoElement>('.js-byos-film');
  if (!video) return;

  const { srcSm, srcLg } = video.dataset;
  const pick = () => (window.matchMedia('(max-width: 767px)').matches ? srcSm : srcLg) ?? srcLg ?? srcSm;

  /* Reduced motion gets the poster, a still frame of the drive, and nothing moving. */
  if (prefersReducedMotion()) return;

  const toggle = document.querySelector<HTMLElement>('.js-footer_sound');
  const soundOn = () => toggle?.dataset.state === 'on';

  let onScreen = false;

  const play = () => {
    if (!onScreen) return;
    video.muted = !soundOn();
    video.play().catch(() => {
      if (video.muted) return;
      video.muted = true;
      void video.play().catch(() => {});
    });
  };

  /* The first gesture is what lets a refused unmute through, so try again on it. */
  const retry = () => { if (onScreen && video.muted && soundOn()) play(); };
  window.addEventListener('pointerdown', retry, { passive: true });
  window.addEventListener('keydown', retry, { passive: true });

  if (toggle) {
    new MutationObserver(() => {
      if (onScreen) play();
      else video.muted = !soundOn();
    }).observe(toggle, { attributes: true, attributeFilter: ['data-state'] });
  }

  /* Loaded a screen early, so the first frames are there by the time the window has grown in. */
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      const src = pick();
      if (!src) return;
      video.src = src;
      video.preload = 'auto';
      play();
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(video);

  /* Paused off screen, so it is not decoding, or playing sound, behind six other sections. */
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        onScreen = entry.isIntersecting;
        holdMusic('film', onScreen);
        if (onScreen) {
          if (video.src) play();
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.2 },
  );
  seen.observe(video);
}

export function initShowcase(root: ParentNode = document): void {
  const panel = root.querySelector<HTMLElement>('.js-videoPlayer');
  if (!panel) return;

  /*
   * The window grows as the section rises, which is what the reference does with its reel: it enters
   * inset to the content column and expands as it scrolls up. Measured on the reference at a 1440
   * viewport, from x238-1201 to x0-1440.
   *
   * A scale rather than the clip-path reveal this used to do. A clip-path uncovers more of a
   * fixed-size thing; the reference's reel actually gets bigger.
   */
  const stage = root.querySelector<HTMLElement>('.js-byos');

  /*
   * The two ends of the scale, measured rather than guessed, because they depend on the viewport in a
   * way calc() cannot express. Recomputed on resize.
   */
  const scaler = root.querySelector<HTMLElement>('.byos_scale');
  /* This MUST match the .byos_win size in sections.css. */
  const FILM = { w: 1280, h: 720 };
  const measure = () => {
    if (!scaler) return;
    /*
     * Grows to the full width of the page, edge to edge.
     *
     * Width alone decides it. On a screen wider than 16:9 the film then runs taller than the
     * viewport and its top and bottom sit just out of view, which is the trade for filling the
     * width; letterboxing it to fit the height would bring the side margins back.
     *
     * clientWidth rather than innerWidth, which counts the scrollbar and would push the film under
     * it by a few pixels.
     */
    const fit = document.documentElement.clientWidth / FILM.w;
    scaler.style.setProperty('--s1', fit.toFixed(4));
    scaler.style.setProperty('--s0', (fit * 0.6).toFixed(4));
  };

  /*
   * The section's own offset down the document, so the spotlight label can convert the masker's
   * document-space `--y` into a local one. Layout-dependent but not scroll-dependent, so it is
   * measured here rather than every frame.
   *
   * Written to every copy of the section: the label lives in the red layer, but keeping the rule
   * layer-agnostic means neither has to know which one it is.
   */
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.videoPlayer'));
  const locate = () => {
    for (const el of sections) {
      el.style.setProperty('--sec-top', `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`);
    }
  };
  measure();
  locate();
  window.addEventListener('resize', () => { measure(); locate(); }, { passive: true });
  /* Re-measured after ScrollTrigger settles, since pinning and font swaps move everything below. */
  ScrollTrigger.addEventListener('refresh', locate);

  if (stage && !prefersReducedMotion()) {
    gsap.fromTo(
      stage,
      { '--grow': 0 },
      {
        '--grow': 1,
        ease: 'none',
        /*
         * Finished growing by the time the section's top reaches the top of the viewport, which is
         * exactly when the window starts sticking. So it expands on the way in and then holds at full
         * screen for the rest of the runway, rather than still growing while it is stuck.
         */
        scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top top', scrub: 0.7 },
      },
    );
  }

  initFilm(root);

  /* No click handler: the panel is an anchor in the markup, which works from the keyboard too. */
  ScrollTrigger.refresh();
}
