/**
 * The featured-project panel.
 *
 * Occupies the slot the reference gives a video reel. Instead of footage it holds the flagship
 * project's own interface, rebuilt from its components and animated. It opens with a clip-path wipe
 * as it scrolls into view, which is the reference's behaviour, and the play button follows through
 * to the repository, because there is nothing here to play or pause.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

/* ------------------------------------------------------------------ the drive */

interface Item {
  id: string;
  name: string;
  when: string;
  size: string;
  kind: 'file' | 'folder' | 'alias';
  star?: boolean;
}

/** Where every loop starts. Turns mutate a copy of this, and it is restored when the loop wraps. */
const START: Item[] = [
  { id: 'i42', name: 'invoice-0142.pdf', when: 'Aug 20', size: '41 KB', kind: 'file' },
  { id: 'i41', name: 'invoice-0141.pdf', when: 'Aug 12', size: '39 KB', kind: 'file' },
  { id: 'i40', name: 'invoice-0140.pdf', when: 'Aug 04', size: '40 KB', kind: 'file' },
  { id: 'd1', name: 'deck-final.pdf', when: 'Aug 18', size: '4.1 MB', kind: 'file' },
  { id: 'd2', name: 'deck-final-2.pdf', when: 'Aug 18', size: '4.1 MB', kind: 'file' },
  { id: 'cv', name: 'resume_2026.pdf', when: 'Aug 21', size: '90 KB', kind: 'file' },
  { id: 'ds', name: 'design-system.pdf', when: 'Aug 20', size: '90 KB', kind: 'file' },
  /*
   * Ballast. None of these are touched by any turn; they are here because the window scales up to
   * fill the viewport, and a five-row list in a 900px-tall window left most of it empty white. A
   * drive should look like it has things in it.
   */
  { id: 'x1', name: 'onboarding-deck.pdf', when: 'Aug 14', size: '2.6 MB', kind: 'file' },
  { id: 'x2', name: 'brand-guidelines.pdf', when: 'Aug 11', size: '78 KB', kind: 'file' },
  { id: 'x3', name: 'q3-forecast.pdf', when: 'Aug 09', size: '112 KB', kind: 'file' },
  { id: 'x4', name: 'meeting-notes.pdf', when: 'Aug 06', size: '22 KB', kind: 'file' },
  { id: 'x5', name: 'architecture-review.pdf', when: 'Aug 02', size: '154 KB', kind: 'file' },
  { id: 'x6', name: 'release-checklist.pdf', when: 'Jul 29', size: '18 KB', kind: 'file' },
  { id: 'x7', name: 'user-research.pdf', when: 'Jul 24', size: '640 KB', kind: 'file' },
  { id: 'x8', name: 'headshot.jpg', when: 'Jul 22', size: '2.2 MB', kind: 'file' },
];

/** What a step does to the drive. Every step has one: see the note on TURNS. */
type Effect =
  | { do: 'add'; item: Item }
  | { do: 'remove'; ids: string[] }
  | { do: 'rename'; map: Record<string, string> }
  | { do: 'star'; ids: string[] }
  | { do: 'tag'; ids: string[]; label: string };

interface Step {
  tool: string;
  what: string;
  effect: Effect;
}

interface Turn {
  prompt: string;
  /** The permission mode, which is what decides each step's gate. */
  mode: string;
  note: string;
  steps: Step[];
}

/*
 * Three turns of the same agent, in order, on one drive that keeps whatever the last turn did.
 *
 * EVERY STEP HAS A VISIBLE CONSEQUENCE. An earlier version also listed steps the mode had queued for
 * approval, which was accurate but read as the plan announcing work that then never happened, so
 * those are gone: each line here changes something you can watch change.
 *
 * The permission mode still varies, and it still has to be consistent with what runs. PROJECT.md 4.8:
 * on AUTO-ORGANIZE reversible work - folders, renames, moves, tags, stars - runs immediately, while
 * destructive or public steps wait. So the first two turns are reversible-only on Auto-organize, and
 * the delete and the public alias only appear in the Full access turn, where they really would run.
 *
 * Every tool name is from the agent's real tool table in that same section.
 */
const TURNS: Turn[] = [
  {
    prompt: 'tidy up my invoices',
    mode: 'Auto-organize',
    note: 'Auto-organize · 3 steps applied',
    steps: [
      {
        tool: 'create_folder', what: 'Finance', 
        effect: { do: 'add', item: { id: 'fin', name: 'Finance', when: 'now', size: '3 files', kind: 'folder' } },
      },
      {
        tool: 'rename_file', what: 'invoices to 2026-invoice-*',
        effect: { do: 'rename', map: {
          i42: '2026-invoice-0142.pdf', i41: '2026-invoice-0141.pdf', i40: '2026-invoice-0140.pdf',
        } },
      },
      {
        /* Renamed first, then filed: a file that has already left the top level cannot be seen
         * being renamed. */
        tool: 'move_file', what: '3 invoices into Finance',
        effect: { do: 'remove', ids: ['i42', 'i41', 'i40'] },
      },
    ],
  },
  {
    prompt: 'flag the duplicate deck and star the real one',
    mode: 'Auto-organize',
    note: 'Auto-organize · 2 steps applied',
    steps: [
      {
        tool: 'add_tag', what: 'duplicate to deck-final-2.pdf',
        effect: { do: 'tag', ids: ['d2'], label: 'duplicate' },
      },
      { tool: 'set_favorite', what: 'deck-final.pdf', effect: { do: 'star', ids: ['d1'] } },
    ],
  },
  {
    prompt: 'link my resume and bin the duplicate',
    mode: 'Full access',
    note: 'Full access · 3 steps applied, including the delete',
    steps: [
      {
        tool: 'create_alias', what: '/shaurya/resume',
        effect: { do: 'add', item: { id: 'al', name: '/shaurya/resume', when: 'now', size: 'alias', kind: 'alias' } },
      },
      { tool: 'set_favorite', what: 'resume_2026.pdf', effect: { do: 'star', ids: ['cv'] } },
      /* A delete and a public link, which is exactly what Full access is the mode for. */
      { tool: 'delete_file', what: 'deck-final-2.pdf', effect: { do: 'remove', ids: ['d2'] } },
    ],
  },
];

/* ------------------------------------------------------------------ the demo */

/**
 * The featured panel's demo: BYOS's own interface, with its agent working on one drive over time.
 *
 * Each turn types a different request, gets back a plan naming the agent's real tools, and then the
 * permission mode decides what runs. Anything that runs is committed: the folder made in the first
 * turn is still there in the third, and the file the second turn was not allowed to delete is the
 * file the third one deletes. That continuity is the story, so the rows are mutated in place rather
 * than re-rendered per turn.
 */
function initReel(root: ParentNode): void {
  const stage = root.querySelector<HTMLElement>('.js-byos');
  if (!stage) return;

  const rowsBox = stage.querySelector<HTMLElement>('.js-byos-rows');
  const stepsBox = stage.querySelector<HTMLElement>('.js-byos-steps');
  const countEl = stage.querySelector<HTMLElement>('.js-byos-count');
  const noteEl = stage.querySelector<HTMLElement>('.js-byos-note');
  const plan = stage.querySelector<HTMLElement>('.js-byos-plancard');
  const typed = stage.querySelector<HTMLElement>('.js-byos-typed');
  const caret = stage.querySelector<HTMLElement>('.js-byos-caret');
  const chip = stage.querySelector<HTMLElement>('.js-byos-chip');
  if (!rowsBox || !stepsBox || !countEl || !noteEl || !plan || !typed || !chip) return;

  const MARK = { file: 'byos_doc', folder: 'byos_folder', alias: 'byos_alias' } as const;

  /** One row. `collapsed` is for rows a step is about to create, so they can open on cue. */
  const makeRow = (item: Item, collapsed = false) => {
    const el = document.createElement('span');
    el.className = `byos_row${collapsed ? ' byos_row__new' : ''}`;
    el.dataset.id = item.id;
    el.innerHTML = `
      <span class="byos_star${item.star ? ' is-on' : ''}">&#9733;</span>
      <span class="${MARK[item.kind]}"></span>
      <span class="byos_name"><span class="byos_nm">${item.name}</span></span>
      <span class="byos_when">${item.when}</span>
      <span class="byos_size">${item.size}</span>
      <span class="byos_kebab"></span>`;
    return el;
  };

  const rowFor = (id: string) => rowsBox.querySelector<HTMLElement>(`[data-id="${id}"]`);

  /** Repaint the whole drive. Used to seed the loop and to reset it, never between turns. */
  const seed = (items: Item[]) => {
    rowsBox.innerHTML = '';
    items.forEach((it) => rowsBox.append(makeRow(it)));
  };

  const paintPlan = (t: Turn) => {
    stepsBox.innerHTML = t.steps.map((st) => `
      <span class="byos_step">
        <span class="byos_st"></span>
        <em>${st.tool}</em>
        <span class="byos_step_w">${st.what}</span>
        <span class="byos_step_g">done</span>
      </span>`).join('');
    countEl.textContent = `${t.steps.length} step${t.steps.length === 1 ? '' : 's'}`;
    noteEl.textContent = t.note;
    chip.textContent = t.mode;
    return {
      steps: Array.from(stepsBox.querySelectorAll<HTMLElement>('.byos_step')),
      pips: Array.from(stepsBox.querySelectorAll<HTMLElement>('.byos_st')),
      gates: Array.from(stepsBox.querySelectorAll<HTMLElement>('.byos_step_g')),
    };
  };

  /*
   * Reduced motion gets the whole arc already played: the drive as the three turns leave it, with the
   * last plan still on screen. Everything the loop says, without any of it moving.
   */
  if (prefersReducedMotion()) {
    seed([
      { id: 'al', name: '/shaurya/resume', when: 'now', size: 'alias', kind: 'alias' },
      { id: 'fin', name: 'Finance', when: 'now', size: '3 files', kind: 'folder' },
      { id: 'd1', name: 'deck-final.pdf', when: 'Aug 18', size: '4.1 MB', kind: 'file' },
      { id: 'cv', name: 'resume_2026.pdf', when: 'Aug 21', size: '90 KB', kind: 'file', star: true },
      { id: 'ds', name: 'design-system.pdf', when: 'Aug 20', size: '90 KB', kind: 'file' },
    ]);
    const last = TURNS[TURNS.length - 1];
    const el = paintPlan(last);
    typed.textContent = last.prompt;
    if (caret) caret.style.display = 'none';
    gsap.set(plan, { opacity: 1 });
    gsap.set([...el.gates, noteEl], { opacity: 1 });
    el.pips.forEach((p) => p.classList.add('is-done'));
    return;
  }

  let turn = 0;
  let live: gsap.core.Timeline | null = null;
  let onScreen = false;

  const play = () => {
    const t = TURNS[turn % TURNS.length];
    const first = turn % TURNS.length === 0;

    /* Only the first turn of a cycle repaints. Every other turn inherits the drive as it stands. */
    if (first) seed(START);

    const el = paintPlan(t);
    gsap.set([plan, ...el.gates, noteEl], { opacity: 0 });
    gsap.set(typed, { textContent: '' });

    const tl = gsap.timeline({ onComplete: () => { turn += 1; if (onScreen) play(); } });

    if (first) {
      const rows = Array.from(rowsBox.children) as HTMLElement[];
      tl.fromTo(rows, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }, 0);
    }

    /*
     * The request, typed. Stepped by hand rather than with a plugin: a tween on a plain counter,
     * sliced into the node, with the step count set to the character count so it lands exactly on the
     * last letter.
     */
    const typeFor = Math.min(2.2, 0.05 * t.prompt.length);
    const cur = { i: 0 };
    tl.to(cur, {
      i: t.prompt.length,
      duration: typeFor,
      ease: `steps(${t.prompt.length})`,
      onUpdate: () => { typed.textContent = t.prompt.slice(0, Math.round(cur.i)); },
    }, first ? 0.5 : 0.25);

    const sent = (first ? 0.5 : 0.25) + typeFor + 0.35;

    tl.to(plan, { opacity: 1, duration: 0.45, ease: 'power3.out' }, sent)
      .from(el.steps, { opacity: 0, x: -8, duration: 0.3, stagger: 0.13, ease: 'power2.out' }, sent + 0.1);

    /* Each step resolves in order, and the drive changes under it when a step actually ran. */
    const begin = sent + 0.45 + el.steps.length * 0.13;
    t.steps.forEach((st, i) => {
      const at = begin + i * 0.95;
      tl.add(() => el.pips[i]?.classList.add('is-done'), at)
        .to(el.gates[i], { opacity: 1, duration: 0.28 }, at);

      const fx = st.effect;

      if (fx.do === 'add') {
        /* Created collapsed and opened on cue, so the row appears to be made by the step. */
        const row = makeRow(fx.item, true);
        tl.add(() => rowsBox.prepend(row), at)
          .to(row, {
            opacity: 1, height: 'auto', paddingTop: '0.4375rem', paddingBottom: '0.4375rem',
            duration: 0.45, ease: 'power2.out',
            onComplete: () => row.classList.remove('byos_row__new'),
          }, at);
      }

      if (fx.do === 'rename') {
        Object.entries(fx.map).forEach(([id, to], k) => {
          const nm = rowFor(id)?.querySelector<HTMLElement>('.byos_nm');
          if (!nm) return;
          tl.to(nm, { opacity: 0, duration: 0.2, ease: 'power2.in' }, at + k * 0.08)
            .add(() => { nm.textContent = to; }, at + k * 0.08 + 0.2)
            .to(nm, { opacity: 1, duration: 0.25, ease: 'power2.out' }, at + k * 0.08 + 0.2);
        });
      }

      if (fx.do === 'remove') {
        fx.ids.forEach((id, k) => {
          const row = rowFor(id);
          if (!row) return;
          tl.to(row, {
            opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, x: 12,
            duration: 0.4, ease: 'power2.inOut',
            onComplete: () => row.remove(),
          }, at + k * 0.09);
        });
      }

      if (fx.do === 'star') {
        fx.ids.forEach((id) => {
          const star = rowFor(id)?.querySelector<HTMLElement>('.byos_star');
          if (!star) return;
          tl.add(() => star.classList.add('is-on'), at)
            .fromTo(star, { scale: 0.4 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, at);
        });
      }

      if (fx.do === 'tag') {
        fx.ids.forEach((id) => {
          const cell = rowFor(id)?.querySelector<HTMLElement>('.byos_name');
          if (!cell) return;
          const chipEl = document.createElement('span');
          chipEl.className = 'byos_tag';
          chipEl.textContent = fx.label;
          tl.add(() => cell.append(chipEl), at)
            .fromTo(chipEl, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, at);
        });
      }
    });

    const done = begin + t.steps.length * 0.95;
    tl.to(noteEl, { opacity: 1, duration: 0.4 }, done)
      /* The plan clears but the drive does not: the next turn starts from what this one left. */
      .to(plan, { opacity: 0, y: -10, duration: 0.4, ease: 'power2.in' }, done + 2.4);

    /* Only the last turn of a cycle wipes the drive, so the loop can start over. */
    if (turn % TURNS.length === TURNS.length - 1) {
      tl.to(Array.from(rowsBox.children), {
        opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.in',
      }, done + 3.0);
    }

    live = tl;
  };

  /*
   * Only runs while it is on screen, which for a chained loop means gating the handoff as well as
   * pausing the current turn: without `onScreen` the onComplete would keep queueing turns forever
   * behind six other sections.
   */
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        onScreen = entry.isIntersecting;
        if (onScreen) {
          if (live) live.play();
          else play();
        } else {
          live?.pause();
        }
      }
    },
    { threshold: 0.2 },
  );
  io.observe(stage);
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
  /* These MUST match the .byos_win rules in sections.css, including the narrow breakpoint. */
  const WIDE = { w: 1280, h: 800 };
  const NARROW = { w: 420, h: 640 };
  const measure = () => {
    if (!scaler) return;
    const d = window.matchMedia('(max-width: 767px)').matches ? NARROW : WIDE;
    /*
     * Stops short of the edges. A margin on every side keeps it reading as a window onto the project
     * rather than as the page having been replaced by it, and it leaves the fixed chrome sitting on
     * the page instead of on top of the interface.
     *
     * Bounded on BOTH axes, so the inset is honoured whichever one runs out first, and derived from
     * the smaller viewport dimension so it stays proportionate on a phone.
     */
    const pad = Math.max(20, Math.min(window.innerWidth, window.innerHeight) * 0.045);
    const fit = Math.min((window.innerWidth - pad * 2) / d.w, (window.innerHeight - pad * 2) / d.h);
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

  initReel(root);

  /* No click handler: the panel is an anchor in the markup, which works from the keyboard too. */
  ScrollTrigger.refresh();
}
