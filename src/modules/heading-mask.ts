/**
 * The row hover: a red band opening from the centre line outward.
 *
 * All the motion is CSS (`clip-path: inset(50% 0 50% 0)` -> `inset(0)`), so this module only
 * decides *when* the row is active. Keeping the animation in CSS means it survives with JS
 * disabled and costs nothing per frame.
 *
 * `focusin` is handled alongside `pointerenter` so keyboard users get the same reveal — the
 * band is the only place several rows state their description.
 */

export function initHeadingMasks(root: ParentNode = document): () => void {
  const rows = Array.from(root.querySelectorAll<HTMLElement>('.js-heading-mask'));
  const cleanups: Array<() => void> = [];

  for (const row of rows) {
    const open = () => row.classList.add('is-hover');
    const close = () => row.classList.remove('is-hover');

    row.addEventListener('pointerenter', open);
    row.addEventListener('pointerleave', close);
    // A row can contain a focusable link; focus should light the row it belongs to.
    row.addEventListener('focusin', open);
    row.addEventListener('focusout', close);

    cleanups.push(() => {
      row.removeEventListener('pointerenter', open);
      row.removeEventListener('pointerleave', close);
      row.removeEventListener('focusin', open);
      row.removeEventListener('focusout', close);
      close();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
