/**
 * Rows that open a "how it works" popup: project rows, and history rows for a job with a write-up.
 *
 * A project row's link carries `data-arch` and keeps its real href, so without JavaScript (or with
 * a modifier key held) it still goes straight to the project; the popup carries the live and repo
 * links in its corner. A history row has nowhere else to go, so its trigger is a plain button.
 *
 * The popup code and each project's doc are separate chunks, fetched on first hover so the click
 * itself rarely waits. None of it is on the page's critical path.
 */
import { projects } from '../data/projects.mjs';
import type { ArchDoc } from '../arch/types';
import { lockScroll } from './smooth-scroll';

const docs = import.meta.glob<{ default: ArchDoc }>('../data/architecture/*.json');
const loadPopup = () => import('../arch/popup');
const loadDoc = (key: string) => docs[`../data/architecture/${key}.json`]?.().then((m) => m.default);

function linksFor(key: string): { label: string; href: string; primary?: boolean }[] {
  const p = projects.find((x) => x.arch === key);
  if (!p) return [];
  const out: { label: string; href: string; primary?: boolean }[] = [];
  if (p.live) out.push({ label: 'View live', href: p.live, primary: true });
  if (p.repo) out.push({ label: 'Source', href: p.repo, primary: !p.live });
  return out;
}

export function initArchitecture(root: ParentNode = document): void {
  let opening = false;
  // The reveal module clones each heading into a dimmed and a clipped copy, so one row can hold
  // two copies of the link. Bind the row once; the listener catches clicks on either copy.
  const bound = new WeakSet<HTMLElement>();

  root.querySelectorAll<HTMLElement>('[data-arch]').forEach((link) => {
    const key = link.dataset.arch!;
    if (!docs[`../data/architecture/${key}.json`]) return;
    const row = link.closest<HTMLElement>('.heading-mask') ?? link;
    if (bound.has(row)) return;
    bound.add(row);
    row.classList.add('has-arch');

    const warm = () => { void loadPopup(); void loadDoc(key); };
    row.addEventListener('pointerenter', warm, { once: true });
    link.addEventListener('focus', warm, { once: true });

    row.addEventListener('click', async (ev) => {
      // Cmd/Ctrl/Shift/middle-click keep their usual meaning: open the project in a new tab.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      if (opening) return;
      opening = true;
      try {
        const [{ openArchitecture }, doc] = await Promise.all([loadPopup(), loadDoc(key)]);
        if (!doc) {
          if (link instanceof HTMLAnchorElement) window.open(link.href, '_blank', 'noopener');
          return;
        }
        lockScroll(true);
        await openArchitecture(doc, { links: linksFor(key), onClose: () => lockScroll(false) });
      } finally {
        opening = false;
      }
    });
  });
}
