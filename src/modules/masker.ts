/**
 * The red spotlight.
 *
 * The page's second layer sits directly on top of the first, masked to a circle that follows
 * the pointer. Everything here exists to write three custom properties onto that layer:
 *
 *   --x, --y   pointer position in *document* space
 *   --size     circle diameter
 *
 * Two details make it feel right rather than merely work:
 *
 *  1. Position is smoothed with `1 - 0.001^dt`, so the circle trails the pointer slightly and
 *     converges at a fixed rate per second regardless of refresh rate.
 *  2. Size is not smoothed — it is tweened, on `power3.out`, to one of a few named stops. The
 *     circle therefore *snaps to intent* (a paragraph, a link) while drifting in position.
 *
 * The vertical value has the scroll offset folded in because the layer is absolutely positioned
 * against the document, not the viewport. Miss that and the reveal slides out of register the
 * moment you scroll.
 */

import { gsap } from 'gsap';
import { getScroll, onScroll } from './smooth-scroll';
import { getPointer, isDesktop, isTouch, prefersReducedMotion, smoothing } from './env';

/**
 * Diameter, in px, for each pointer context.
 *
 * `idle` is the reference's own 40px. The open sizes are viewport-relative rather than the
 * reference's fixed 450px, because this site's headline runs to nine characters at 8.75rem —
 * roughly 900px wide — and a 450px hole would cut every line in half. The circle has to be
 * able to cover a whole line of type for the alternate copy to be readable.
 */
const SIZE = {
  /** Resting state: a small disc that reads as a custom cursor. */
  idle: 40,
  /** Over a link or a row, where the hover band takes over instead. */
  contract: 0,
} as const;

/**
 * Diameter of the open circle, capped so it stays a circle on ultrawides.
 *
 * 26vw / 375px is the reference's own measured value at a 1440px window (it scales with the
 * viewport there too, it is not the fixed 450px the code suggests). Sized against the column
 * rather than the type: the circle covers roughly 40% of a paragraph's width, which is what
 * gives the reveal its half-spliced look instead of cleanly swapping whole lines.
 */
const extendSize = (): number => Math.min(window.innerWidth * 0.26, 375);

/*
 * The showcase stop, measured off the reference rather than guessed.
 *
 * Its "PLAY REEL" disc over the reel is about 97px across at a 1440 viewport - a small disc carrying
 * a label, not a window onto the layer beneath. The previous 350px was a third of the screen, which
 * turned a button into a hole.
 */
const showcaseSize = (): number => (isDesktop() ? 112 : 96);

const GROW = { duration: 0.6, ease: 'power3.out' };
const SHRINK = { duration: 0.3, ease: 'power3.out' };

export class Masker {
  private readonly layer: HTMLElement;

  /** Smoothed position, the value actually written to the DOM. */
  private current = { x: 0, y: 0 };
  /** Raw pointer position, the target being chased. */
  private last = { x: 0, y: 0 };
  /** Tweened diameter. Held in an object so GSAP can animate the property. */
  private readonly size = { value: 0 };

  private scroll = 0;
  private lastTick: number | null = null;
  private started = false;
  private disposers: Array<() => void> = [];

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.last = { ...this.current };
  }

  init(): void {
    // Nothing to reveal without pointer motion, and nothing to point with on touch.
    if (prefersReducedMotion() || isTouch()) {
      this.initHoldButton();
      return;
    }

    // Seed from the position recorded since page load (see trackPointer), so the circle opens
    // where the cursor already is rather than sweeping in from the centre.
    const seeded = getPointer();
    if (seeded) {
      this.current = { ...seeded };
      this.last = { ...seeded };
      this.started = true;
    }

    this.render = this.render.bind(this);
    gsap.ticker.add(this.render);
    this.disposers.push(() => gsap.ticker.remove(this.render));

    const onMove = (e: PointerEvent) => this.handleMove(e);
    window.addEventListener('pointermove', onMove, { passive: true });
    this.disposers.push(() => window.removeEventListener('pointermove', onMove));

    // The circle must keep tracking content, not the viewport, while scrolling.
    this.disposers.push(
      onScroll((scroll) => {
        this.scroll = scroll;
        this.write();
      }),
    );

    this.bindZones();
    this.scroll = getScroll();
    this.write();
  }

  /** Wire the hover regions that decide the circle's size. */
  private bindZones(): void {
    const bind = (selector: string, enter: () => void) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const onEnter = () => enter();
        const onLeave = () => this.toIdle();
        el.addEventListener('pointerenter', onEnter);
        el.addEventListener('pointerleave', onLeave);
        this.disposers.push(() => {
          el.removeEventListener('pointerenter', onEnter);
          el.removeEventListener('pointerleave', onLeave);
        });
      });
    };

    bind('.js-cursor-extend', () => this.tweenTo(extendSize(), GROW));
    bind('.js-cursor-contract', () => this.tweenTo(SIZE.contract, SHRINK));
    bind('.js-videoPlayer_inner', () => this.tweenTo(showcaseSize(), GROW));

    // The pointer is very likely already resting inside a zone by the time this runs — the
    // Start button sits in the middle of the hero, so the visitor's cursor is inside the hero's
    // extend zone the moment the loader clears. Without this, no `pointerenter` ever fires for
    // that zone and the circle stays at its idle size until the pointer leaves and comes back.
    this.syncToPointer();
  }

  /** Apply whichever zone the pointer is currently inside, without waiting for an event. */
  private syncToPointer(): void {
    if (!this.started) return;
    const el = document.elementFromPoint(this.last.x, this.last.y);
    if (!el) return;
    if (el.closest('.js-cursor-contract')) this.tweenTo(SIZE.contract, SHRINK);
    else if (el.closest('.js-videoPlayer_inner')) this.tweenTo(showcaseSize(), GROW);
    else if (el.closest('.js-cursor-extend')) this.tweenTo(extendSize(), GROW);
    else this.toIdle();
  }

  /**
   * Touch fallback: a fixed ring button that opens the mask at the screen centre while held.
   * There is no pointer to follow, so the circle is parked and only its size animates.
   */
  private initHoldButton(): void {
    const btn = document.getElementById('js-btn_clipPath');
    if (!btn || prefersReducedMotion()) return;

    document.documentElement.classList.add('is-touch');
    btn.removeAttribute('aria-hidden');
    btn.removeAttribute('tabindex');

    const park = () => {
      this.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.scroll = getScroll();
      this.write();
    };

    const open = (e: Event) => {
      e.preventDefault();
      park();
      this.tweenTo(Math.max(window.innerWidth, window.innerHeight) * 1.1, { duration: 0.9, ease: 'power3.out' });
    };
    const close = () => this.tweenTo(0, SHRINK);

    btn.addEventListener('pointerdown', open);
    btn.addEventListener('pointerup', close);
    btn.addEventListener('pointercancel', close);
    btn.addEventListener('pointerleave', close);
    // Keyboard parity: hold via space/enter.
    btn.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === ' ' || (e as KeyboardEvent).key === 'Enter') open(e);
    });
    btn.addEventListener('keyup', close);
    btn.addEventListener('blur', close);

    this.disposers.push(() => {
      btn.removeEventListener('pointerdown', open);
      btn.removeEventListener('pointerup', close);
    });
  }

  private handleMove(e: PointerEvent): void {
    this.last.x = e.clientX;
    this.last.y = e.clientY;

    // First movement: jump the circle to the pointer rather than sweeping in from the centre,
    // then open to the resting size.
    if (!this.started) {
      this.started = true;
      this.current = { x: e.clientX, y: e.clientY };
      this.toIdle();
    }
  }

  private toIdle(): void {
    this.tweenTo(SIZE.idle, GROW);
  }

  private tweenTo(value: number, vars: { duration: number; ease: string }): void {
    gsap.killTweensOf(this.size);
    gsap.to(this.size, { value, ...vars, onUpdate: () => this.write() });
  }

  private render(time: number): void {
    if (this.lastTick === null) this.lastTick = time;
    const amount = smoothing(time - this.lastTick);
    this.current.x += (this.last.x - this.current.x) * amount;
    this.current.y += (this.last.y - this.current.y) * amount;
    this.lastTick = time;
    this.write();
  }

  /** Single point of contact with the DOM, so position and size can never be half-applied. */
  private write(): void {
    const { style } = this.layer;
    style.setProperty('--size', `${this.size.value.toFixed(2)}px`);
    style.setProperty('--x', `${this.current.x.toFixed(2)}px`);
    style.setProperty('--y', `${(this.current.y + this.scroll).toFixed(2)}px`);
  }

  destroy(): void {
    for (const fn of this.disposers) fn();
    this.disposers = [];
    gsap.killTweensOf(this.size);
  }
}

export function initMasker(): Masker | null {
  const layer = document.querySelector<HTMLElement>('.js-masker');
  if (!layer) return null;
  const masker = new Masker(layer);
  masker.init();
  return masker;
}
