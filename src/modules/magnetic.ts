/**
 * Magnetic hover.
 *
 * Elements drift toward the pointer while it is nearby and spring back when it leaves, so the
 * small fixed controls feel attached to the cursor rather than waiting for it. The reference
 * applies this to its social icons, which are otherwise easy to miss at the edge of the screen.
 *
 * One window-level listener drives every magnet: with a handful of targets, per-element
 * `pointermove` listeners would each do the same work on the same event.
 */

import { gsap } from 'gsap';
import { prefersReducedMotion } from './env';

interface Magnet {
  el: HTMLElement;
  /** How far from the centre the pointer can be and still attract, in px. */
  radius: number;
  /** Share of the pointer offset the element travels. 1 would pin it under the cursor. */
  strength: number;
  engaged: boolean;
}

const magnets: Magnet[] = [];
let bound = false;

function release(m: Magnet): void {
  if (!m.engaged) return;
  m.engaged = false;
  gsap.to(m.el, {
    x: 0,
    y: 0,
    duration: 0.9,
    // Overshoots slightly on the way back, which is what sells it as elastic rather than
    // as a transition running in reverse.
    ease: 'elastic.out(1, 0.45)',
  });
}

/**
 * Engage the single nearest magnet and release the rest.
 *
 * Attracting everything inside its own radius meant neighbouring icons leaned toward the cursor
 * together, which reads as the whole row wobbling rather than one item responding. Picking a
 * winner keeps the effect legible: exactly one thing is ever attached to the cursor.
 */
function onMove(e: PointerEvent): void {
  let winner: Magnet | null = null;
  let winnerDistance = Infinity;
  let winnerOffset = { dx: 0, dy: 0 };

  for (const m of magnets) {
    const r = m.el.getBoundingClientRect();
    // Skip anything scrolled out of view; a fixed-position magnet is always measurable, but an
    // off-screen one should not be doing work.
    if (r.width === 0) continue;

    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const distance = Math.hypot(dx, dy);

    // Compared as a share of each magnet's own radius, so a wide-radius target does not always
    // beat a narrow one that the pointer is sitting much closer to.
    if (distance < m.radius && distance / m.radius < winnerDistance) {
      winner = m;
      winnerDistance = distance / m.radius;
      winnerOffset = { dx, dy };
    }
  }

  for (const m of magnets) {
    if (m === winner) continue;
    release(m);
  }

  if (!winner) return;

  winner.engaged = true;
  gsap.to(winner.el, {
    x: winnerOffset.dx * winner.strength,
    y: winnerOffset.dy * winner.strength,
    duration: 0.45,
    ease: 'power3.out',
  });
}

/**
 * Make everything matching `selector` magnetic.
 *
 * @param radius   attraction distance from the element's centre, in px
 * @param strength share of the pointer offset the element travels (0.3–0.5 reads best)
 */
export function initMagnetic(
  selector: string,
  { radius = 90, strength = 0.4 }: { radius?: number; strength?: number } = {},
): void {
  // A magnet has nowhere to move without a pointer, and the motion is pure decoration.
  if (prefersReducedMotion() || window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    magnets.push({ el, radius, strength, engaged: false });
  });

  if (!bound) {
    window.addEventListener('pointermove', onMove, { passive: true });
    // The pointer can leave the window without ever exiting a magnet's radius.
    document.addEventListener('pointerleave', () => magnets.forEach(release));
    bound = true;
  }
}
