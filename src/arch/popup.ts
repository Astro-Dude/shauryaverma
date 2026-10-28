/**
 * The "how it works" popup.
 *
 * One scrolling page per project. Each feature gets its own section: a top-to-bottom flowchart of
 * its walkthrough, the numbered steps beside it, and the detail underneath. A walkthrough plays
 * the first time its chart scrolls into view. The whole-system chart comes last, as reference.
 *
 * Clicking any box opens a drawer with that part's detail, and the drawer links back to every
 * feature the part takes part in. Nothing is crammed to fit the screen: the popup scrolls.
 */
import { gsap } from 'gsap';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './arch.css';
import { Chart, FONT_LABEL, FONT_PILL, FONT_SUB, KIND_LABEL, kindIcon, type GEdge, type GNode, type GraphSpec } from './chart';
import type { ArchDoc, ArchNode, Chapter, Feature, Journey, JourneyStat } from './types';

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> | null = null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === false) continue;
      if (k === 'class') e.className = String(v);
      else e.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Whole months since an ISO date, counted the way people do: 17 Nov → 17 Dec is one. */
function monthsSince(iso: string, now = new Date()): number {
  const a = new Date(`${iso}T00:00:00`);
  let m = (now.getFullYear() - a.getFullYear()) * 12 + (now.getMonth() - a.getMonth());
  if (now.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Drawn, not typed: glyphs like ❚❚ come out as a solid square in Geist. */
const ICON = {
  play: '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 1.5v9l8-4.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor"/></svg>',
  again: '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M9.6 4.2A4 4 0 1 0 10 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10.2 1.4v3.2H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export interface PopupOptions {
  /** Shown top right: the project's live demo and its source. */
  links?: { label: string; href: string; primary?: boolean }[];
  onClose?: () => void;
}

interface FeatureView {
  feature: Feature;
  section: HTMLElement;
  chart: Chart;
  steps: HTMLLIElement[];
  playBtn: HTMLButtonElement;
  /** On screen right now. */
  visible: boolean;
  /** The visitor has taken over (paused, picked a step). Until then it plays on a loop. */
  touched: boolean;
}

export class ArchPopup {
  private root!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private scroller!: HTMLDivElement;
  private drawer!: HTMLElement;
  private indexLinks = new Map<string, HTMLButtonElement>();
  private views: FeatureView[] = [];
  private systemChart: Chart | null = null;
  /** Journey mode: the one map, the chapters beside it, and which one is being read. */
  private map: Chart | null = null;
  private mapCaption: HTMLElement | null = null;
  private chapterEls = new Map<string, HTMLElement>();
  private active: Chapter | null = null;
  private mapTouched = false;
  /** A phase is hovered: it owns the map until the pointer leaves. */
  private phaseOn = false;
  /** Pending "show the whole thing, then start walking" for follow chapters. */
  private overviewTimer = 0;
  private observers: IntersectionObserver[] = [];
  private lastFocus: Element | null = null;
  private readonly nodes: Map<string, ArchNode>;

  constructor(private readonly doc: ArchDoc, private readonly opts: PopupOptions = {}) {
    this.nodes = new Map(doc.nodes.map((n) => [n.id, n]));
  }

  /* ------------------------------------------------------------------ open / close */

  open(): void {
    this.lastFocus = document.activeElement;
    this.render();
    document.body.append(this.root);
    document.documentElement.classList.add('arch-open');
    this.observe();

    const tl = gsap.timeline();
    tl.fromTo(this.root.querySelector('.arch_backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.4 });
    tl.fromTo(this.panel, { clipPath: 'inset(50% 0% 50% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 0.8, ease: 'expo.inOut' }, 0);
    tl.fromTo(this.panel.querySelectorAll('[data-rise]'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' }, 0.45);
    this.panel.focus({ preventScroll: true });
  }

  close(): void {
    this.observers.forEach((o) => o.disconnect());
    gsap.timeline({
      onComplete: () => {
        this.views.forEach((v) => v.chart.destroy());
        this.systemChart?.destroy();
        window.clearTimeout(this.overviewTimer);
        this.map?.destroy();
        this.root.remove();
        document.documentElement.classList.remove('arch-open');
        this.opts.onClose?.();
        (this.lastFocus as HTMLElement | null)?.focus?.({ preventScroll: true });
      },
    })
      .to(this.panel, { clipPath: 'inset(50% 0% 50% 0% round 18px)', duration: 0.5, ease: 'expo.in' })
      .to(this.root.querySelector('.arch_backdrop'), { opacity: 0, duration: 0.3 }, 0.25);
  }

  /* ------------------------------------------------------------------ render */

  private render(): void {
    const d = this.doc;
    this.root = h('div', { class: 'arch', role: 'dialog', 'aria-modal': 'true', 'aria-label': `How ${d.project} works`, 'data-lenis-prevent': true });
    this.panel = h('div', { class: 'arch_panel', tabindex: -1 });
    this.scroller = h('div', { class: 'arch_scroll' });
    this.drawer = h('aside', { class: 'arch-drawer', 'aria-live': 'polite' });

    const close = h('button', { class: 'arch_close', type: 'button', 'aria-label': 'Close' }, h('span'), h('span'));
    close.addEventListener('click', () => this.close());
    const links = this.opts.links?.length
      ? h('div', { class: 'arch_links' }, this.opts.links.map((l) =>
        h('a', { class: `arch_link${l.primary ? ' is-primary' : ''}`, href: l.href, target: '_blank', rel: 'noopener noreferrer' },
          l.label, h('i', { 'aria-hidden': 'true' }, '↗'))))
      : null;

    const intro = h('header', { class: 'arch-intro' },
      h('p', { class: 'arch-eyebrow', 'data-rise': true }, `// ${d.label ?? 'how it works'}, roughly`),
      h('h2', { class: 'arch-intro_title', 'data-rise': true }, d.project),
      h('p', { class: 'arch-intro_tagline', 'data-rise': true }, d.tagline),
      h('p', { class: 'arch-intro_summary', 'data-rise': true }, d.summary),
      h('p', { class: 'arch-intro_hint', 'data-rise': true },
        `${d.features.length} features, each with its own diagram. They play themselves as you scroll. Drag to move, pinch to zoom, click any box for more.`),
    );

    if (d.journey) {
      this.scroller.append(this.renderJourney(d.journey));
    } else {
      const byId = new Map(d.features.map((f, i) => [f.id, { f, i }]));
      const main = h('main', { class: 'arch-main' }, intro,
        this.groups().map((g, gi) => h('div', { class: 'arch-group' },
          h('h3', { class: 'arch-group_title', 'data-rise': true }, h('span', null, pad2(gi + 1)), g.label),
          g.features.map((id) => { const x = byId.get(id)!; return this.renderFeature(x.f, x.i); }))));
      const system = this.renderSystem();
      if (system) main.append(system);
      this.scroller.append(h('div', { class: 'arch-layout' }, this.renderIndex(), main));
    }
    const bar = h('header', { class: 'arch_bar' },
      h('p', { class: 'arch_bar_title' }, h('strong', null, d.project), h('span', null, ` // ${d.label ?? 'how it works'}`)),
      h('div', { class: 'arch_bar_actions' }, links, close));
    this.panel.append(bar, this.scroller, this.drawer);

    const backdrop = h('div', { class: 'arch_backdrop' });
    backdrop.addEventListener('click', () => this.close());
    this.root.append(backdrop, this.panel);
    this.root.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      if (this.panel.classList.contains('has-drawer')) this.closeDrawer();
      else this.close();
    });
  }

  private renderIndex(): HTMLElement {
    const jump = (id: string) => {
      const target = this.scroller.querySelector(`#arch-${id}`) as HTMLElement | null;
      if (!target) return;
      gsap.to(this.scroller, { scrollTop: target.offsetTop - 24, duration: 0.9, ease: 'power3.inOut' });
    };
    const item = (id: string, n: string, label: string, cls = '') => {
      const b = h('button', { class: `arch-index_item ${cls}`, type: 'button' }, h('span', { class: 'arch-index_n' }, n), h('span', null, label));
      b.addEventListener('click', () => jump(id));
      this.indexLinks.set(id, b);
      return h('li', null, b);
    };
    const num = new Map(this.doc.features.map((f, i) => [f.id, pad2(i + 1)]));
    const name = new Map(this.doc.features.map((f) => [f.id, f.name]));
    const groups = this.groups();
    return h('nav', { class: 'arch-index', 'aria-label': 'Features' },
      h('div', { 'data-rise': true }, groups.map((g) => h('div', { class: 'arch-index_group' },
        h('p', { class: 'arch-index_k' }, g.label),
        h('ol', null, g.features.map((id) => item(id, num.get(id)!, name.get(id)!)))))),
      this.doc.edges?.length ? h('ol', { class: 'arch-index_tail' }, item('system', '∞', 'The whole system', 'is-secondary')) : null,
    );
  }

  /** Feature groups in display order; without any, one unnamed group holds everything. */
  private groups(): { id: string; label: string; features: string[] }[] {
    const known = new Set(this.doc.features.map((f) => f.id));
    const gs = (this.doc.groups ?? []).map((g) => ({ ...g, features: g.features.filter((id) => known.has(id)) })).filter((g) => g.features.length);
    const grouped = new Set(gs.flatMap((g) => g.features));
    const rest = this.doc.features.map((f) => f.id).filter((id) => !grouped.has(id));
    if (rest.length) gs.push({ id: 'more', label: gs.length ? 'More' : 'Features', features: rest });
    return gs;
  }

  /* ------------------------------------------------------------------ feature sections */

  private nodeSpec(id: string): GNode {
    const n = this.nodes.get(id);
    if (!n) return { id, label: id, sub: 'Component', kind: 'other' };
    const sub = (n.tech[0] ?? KIND_LABEL[n.kind]).replace(/\s*\(.*?\)/g, '');
    return { id, label: n.label, sub, kind: n.kind, inferred: n.inferred };
  }

  /**
   * Lay a walkthrough out top to bottom. A part is placed one layer below the part that first
   * hands it something, so the chart reads in the order the story is told; anything that
   * flows back up (a reply to the user) loops round the side.
   */
  private featureGraph(f: Feature): GraphSpec {
    const rank = new Map<string, number>();
    f.steps.forEach((s) => {
      if (!rank.has(s.from)) rank.set(s.from, rank.has(s.to) ? Math.max(0, rank.get(s.to)! - 1) : 0);
      if (!rank.has(s.to)) rank.set(s.to, rank.get(s.from)! + 1);
    });
    const depth = Math.max(0, ...rank.values()) + 1;
    const ranked: GNode[][] = Array.from({ length: depth }, () => []);
    for (const [id, r] of rank) ranked[r].push(this.nodeSpec(id));
    // Never more than two boxes side by side: the chart stays tall and narrow, reading top to
    // bottom next to its steps, instead of spreading sideways and shrinking its text.
    const layers: GraphSpec['layers'] = ranked.flatMap((row) => {
      const out: { nodes: GNode[] }[] = [];
      for (let k = 0; k < row.length; k += 2) out.push({ nodes: row.slice(k, k + 2) });
      return out;
    });
    const edges: GEdge[] = f.steps.map((s, i) => ({
      id: `${f.id}-s${i}`, from: s.from, to: s.to, label: s.label, mode: s.mode ?? 'sync', badge: String(i + 1),
    }));
    return { dir: 'TB', layers: layers.filter((l) => l.nodes.length), edges, labels: true };
  }

  private renderFeature(f: Feature, i: number): HTMLElement {
    const chart = new Chart(this.featureGraph(f));
    chart.setSteps(f.steps.map((_, j) => `${f.id}-s${j}`), f.steps.map((s) => Math.min(6, Math.max(2.4, s.narration.length * 0.04))));

    const playIcon = h('span', { class: 'arch-play_icon' });
    playIcon.innerHTML = ICON.play;
    const playBtn = h('button', { class: 'arch-play', type: 'button' }, playIcon, h('span', { class: 'arch-play_label' }, 'Play'));
    // Declared up front so the handlers below can flag that the visitor has taken over.
    const view: FeatureView = { feature: f, section: null as unknown as HTMLElement, chart, steps: [], playBtn, visible: false, touched: false };
    playBtn.addEventListener('click', () => {
      view.touched = true;
      if (chart.isPlaying) chart.pause();
      else chart.play();
    });

    const steps = f.steps.map((s, j) => {
      const note = f.stepNotes?.[String(j + 1)];
      const li = h('li', { class: `arch-step${note ? ' has-note' : ''}` },
        h('button', { class: 'arch-step_btn', type: 'button', title: `${this.nodes.get(s.from)?.label ?? s.from} → ${this.nodes.get(s.to)?.label ?? s.to}` },
          h('span', { class: 'arch-step_n' }, pad2(j + 1)),
          h('span', { class: 'arch-step_body' },
            h('span', { class: 'arch-step_text' }, h('mark', null, s.narration)),
            // The clever part of this hop, shown while the step is playing or after you click it.
            note ? h('span', { class: 'arch-step_note' }, h('span', { class: 'arch-step_note_k' }, 'how '), note) : null)));
      li.addEventListener('pointerenter', () => chart.focus([`${f.id}-s${j}`]));
      li.addEventListener('pointerleave', () => chart.focus(null));
      li.querySelector('button')!.addEventListener('click', () => { view.touched = true; chart.show(j); });
      return li;
    });

    chart.onStep = (idx, playing) => {
      // Left alone, a walkthrough loops: a short breather at the end, then from the top.
      if (idx === f.steps.length - 1 && !playing && !view.touched) {
        window.setTimeout(() => {
          if (view.visible && !view.touched && !chart.isPlaying) chart.play(0);
        }, 2200);
      }
      steps.forEach((li, j) => {
        li.classList.toggle('is-on', j === idx);
        li.classList.toggle('is-done', j < idx);
      });
      const done = idx === f.steps.length - 1 && !playing;
      playBtn.classList.toggle('is-playing', playing);
      playIcon.innerHTML = playing ? ICON.pause : done ? ICON.again : ICON.play;
      playBtn.querySelector('.arch-play_label')!.textContent = playing ? 'Pause' : done ? 'Again' : idx >= 0 ? 'Keep going' : 'Play';
    };
    chart.onNode = (id) => this.openNode(id, chart, f);
    chart.onEdge = (id) => {
      const j = Number(id.split('-s').pop());
      if (!Number.isNaN(j)) { view.touched = true; chart.show(j); }
    };

    // Everything technical lives behind this toggle: the plain summary, the algorithm write-up,
    // and any step-by-step procedures. File paths are left out on purpose; nobody here sees code.
    const nerd = h('details', { class: 'arch-nerd', 'data-rise': true },
      h('summary', null, h('span', null, '// for the nerds'), h('i', { 'aria-hidden': 'true' }, '+')),
      h('div', { class: 'arch-nerd_body' },
        h('p', { class: 'arch-nerd_text' }, f.underTheHood),
        f.deep ? this.renderDeep(f.deep) : null,
        f.algorithms?.length ? h('div', { class: 'arch-algos' }, f.algorithms.map((a) => h('div', { class: 'arch-algo' },
          h('p', { class: 'arch-algo_name' }, a.name),
          a.summary ? h('p', { class: 'arch-algo_sum' }, a.summary) : null,
          h('ol', { class: 'arch-algo_steps' }, a.steps.map((st) => h('li', null, st))),
          a.complexity ? h('p', { class: 'arch-algo_cx' }, h('span', null, 'cost '), a.complexity) : null))) : null));

    const section = h('section', { class: 'arch-feature', id: `arch-${f.id}` },
      h('header', { class: 'arch-feature_head', 'data-rise': true },
        h('span', { class: 'arch-feature_n' }, `feature ${pad2(i + 1)}`),
        h('h3', { class: 'arch-feature_name' }, f.name, f.status && f.status !== 'shipped' ? h('span', { class: 'arch-tag' }, f.status) : null),
        h('p', { class: 'arch-feature_sum' }, f.summary),
        h('p', { class: 'arch-feature_desc' }, f.description)),
      h('div', { class: 'arch-feature_grid' },
        h('div', { class: 'arch-feature_chart', 'data-rise': true }, chart.el),
        h('div', { class: 'arch-feature_story', 'data-rise': true },
          h('div', { class: 'arch-story_head' }, h('span', null, '// step by step'), playBtn),
          h('ol', { class: 'arch-steps' }, steps))),
      nerd,
    );

    view.section = section;
    view.steps = steps;
    this.views.push(view);
    return section;
  }

  /** The algorithm write-up: what technique, how it runs, a worked example, and why. */
  private renderDeep(dd: NonNullable<Feature['deep']>): HTMLElement {
    return h('div', { class: 'arch-deep', 'data-rise': true },
      h('div', { class: 'arch-deep_main' },
        h('p', { class: 'arch-deep_k' }, '// how it actually works'),
        h('h4', { class: 'arch-deep_algo' }, dd.algorithm),
        h('p', { class: 'arch-deep_idea' }, dd.idea),
        h('ol', { class: 'arch-deep_how' }, dd.how.map((x) => h('li', null, x)))),
      h('div', { class: 'arch-deep_side' },
        dd.example ? h('div', null, h('p', { class: 'arch-deep_k' }, '// example'), h('pre', { class: 'arch-deep_ex' }, dd.example)) : null,
        dd.why ? h('div', null, h('p', { class: 'arch-deep_k' }, '// why this way'), h('p', { class: 'arch-deep_why' }, dd.why)) : null,
        dd.cost ? h('p', { class: 'arch-deep_cost' }, h('span', null, 'cost '), dd.cost) : null));
  }

  /* ------------------------------------------------------------------ whole system */

  private renderSystem(): HTMLElement | null {
    const { zones = [], edges = [] } = this.doc;
    if (!edges.length) return null;
    const connected = new Set(edges.flatMap((e) => [e.from, e.to]));
    const layers = zones.map((z) => ({
      label: z.label,
      desc: z.description,
      nodes: this.doc.nodes.filter((n) => n.zone === z.id && connected.has(n.id)).map((n) => this.nodeSpec(n.id)),
    })).filter((l) => l.nodes.length);
    const chart = new Chart({
      dir: 'LR', zones: true, layers,
      edges: edges.map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label, mode: e.mode })),
    });
    chart.onNode = (id) => this.openNode(id, chart);
    chart.onEdge = (id) => this.openEdge(id, chart);
    this.systemChart = chart;

    return h('section', { class: 'arch-feature arch-system', id: 'arch-system' },
      h('header', { class: 'arch-feature_head', 'data-rise': true },
        h('span', { class: 'arch-feature_n' }, 'every part, every wire'),
        h('h3', { class: 'arch-feature_name' }, 'The whole system'),
        h('p', { class: 'arch-feature_sum' }, 'Everything above, wired together at once.'),
        h('p', { class: 'arch-feature_desc' }, 'Hover a box to see what it talks to. It is a lot. Pinch in.')),
      h('div', { class: 'arch-system_chart', 'data-rise': true }, chart.el),
    );
  }

  /* ------------------------------------------------------------------ journey */

  /**
   * A job, told in order. The map of everything sits still on the right; the chapters scroll on
   * the left, and whichever one you're reading moves the map's camera to its corner and plays its
   * arrows. Hovering a phase lights just that phase's parts.
   */
  private renderJourney(j: Journey): HTMLElement {
    const d = this.doc;
    const rows: string[][] = [];
    for (const [id, [r]] of Object.entries(j.grid)) (rows[r] ??= []).push(id);
    const columns = Object.fromEntries(Object.entries(j.grid).map(([id, [, c]]) => [id, c]));
    const map = new Chart({
      dir: 'TB',
      columns,
      layers: rows.filter(Boolean).map((ids) => ({ nodes: ids.sort((a, b) => columns[a] - columns[b]).map((id) => this.nodeSpec(id)) })),
      edges: (d.edges ?? []).map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label, mode: e.mode })),
    });
    this.map = map;
    map.onNode = (id) => { this.mapTouched = true; this.openNode(id, map); };
    map.onEdge = (id) => this.openEdge(id, map);
    const edgeById = new Map((d.edges ?? []).map((e) => [e.id, e]));
    map.onStep = (idx, playing) => {
      const ch = this.active;
      if (!ch) return;
      // A chapter that spans the whole map would be unreadable zoomed out, so the camera rides along.
      if (ch.follow && idx >= 0 && !this.mapTouched && !this.phaseOn) {
        const e = edgeById.get(ch.edges[idx]);
        if (e) map.frame([e.from, e.to]);
      }
      // Loops while the chapter is being read and nobody has grabbed the map.
      if (playing || idx !== ch.edges.length - 1) return;
      window.setTimeout(() => {
        if (this.active !== ch || this.mapTouched || map.isPlaying || this.phaseOn) return;
        if (ch.follow) this.overviewThenWalk(ch);
        else map.play(0);
      }, 1600);
    };
    map.el.addEventListener('pointerdown', () => { this.mapTouched = true; });

    this.mapCaption = h('p', { class: 'arch-map_caption' }, '// the whole thing');
    const aside = h('aside', { class: 'arch-map', 'data-rise': true }, this.mapCaption, map.el);

    const intro = h('header', { class: 'arch-intro arch-journey_intro' },
      h('p', { class: 'arch-eyebrow', 'data-rise': true }, `// ${d.label ?? 'what I did'}, roughly`),
      h('h2', { class: 'arch-intro_title', 'data-rise': true }, d.project),
      h('p', { class: 'arch-intro_tagline', 'data-rise': true }, d.tagline),
      h('p', { class: 'arch-intro_summary', 'data-rise': true }, d.summary),
      j.stats?.length ? h('dl', { class: 'arch-stats', 'data-rise': true }, j.stats.map((s) => this.renderStat(s))) : null);

    const chapters = j.chapters.map((c, i) => this.renderChapter(c, i));
    return h('div', { class: 'arch-journey' },
      h('main', { class: 'arch-journey_story' }, intro, h('ol', { class: 'arch-chapters' }, chapters)),
      aside);
  }

  /**
   * A live stat shows its baked-in number at once and swaps in the fresh one if the API answers.
   * The API is cached at the edge until each morning, so this is one cheap request, not a GitHub call.
   */
  private renderStat(s: JourneyStat): HTMLElement {
    const months = (n: number) => s.label.replace('{months}', String(n));
    const dt = h('dt', null, s.value);
    const dd = h('dd', null, months(s.since ? monthsSince(s.since) : 0));
    if (s.live === 'github') {
      fetch('/api/github')
        .then((r) => (r.ok ? r.json() : null))
        .then((x: { total?: number; months?: number } | null) => {
          if (typeof x?.total !== 'number') return;
          dt.textContent = x.total.toLocaleString('en-US');
          if (typeof x.months === 'number') dd.textContent = months(x.months);
        })
        .catch(() => {});
    }
    return h('div', { class: `arch-stat${s.live ? ' is-live' : ''}` }, dt, dd);
  }

  private renderChapter(c: Chapter, i: number): HTMLElement {
    const phases = c.phases?.length ? h('div', { class: 'arch-phases' },
      c.phasesTitle ? h('p', { class: 'arch-phases_k' }, `// ${c.phasesTitle}`) : null,
      h('ol', null, c.phases.map((p) => {
        const li = h('li', { class: 'arch-phase', tabindex: 0 },
          h('span', { class: 'arch-phase_n' }, p.n),
          h('span', { class: 'arch-phase_body' }, h('strong', null, p.name), h('span', null, p.what)));
        const on = () => {
          if (!this.map || !p.nodes?.length) return;
          this.phaseOn = true;
          window.clearTimeout(this.overviewTimer);
          this.map.reset();
          this.map.spotlight(p.nodes, this.map.edgesAmong(p.nodes));
          if (!this.mapTouched) this.map.frame(p.nodes);
          li.classList.add('is-on');
        };
        const off = () => {
          this.phaseOn = false;
          li.classList.remove('is-on');
          if (this.active === c) this.lightChapter(c, true);
        };
        li.addEventListener('pointerenter', on);
        li.addEventListener('pointerleave', off);
        li.addEventListener('focus', on);
        li.addEventListener('blur', off);
        return li;
      })),
      c.phasesNote ? h('p', { class: 'arch-phases_note' }, c.phasesNote) : null) : null;

    const el = h('li', { class: 'arch-ch', id: `arch-ch-${c.id}`, 'data-rise': true },
      h('div', { class: 'arch-ch_mark' }, h('span', { class: 'arch-ch_n' }, pad2(i + 1)), c.when ? h('span', { class: 'arch-ch_when' }, c.when) : null),
      h('div', { class: 'arch-ch_body' },
        h('h3', { class: 'arch-ch_title' }, c.title),
        c.role ? h('p', { class: 'arch-ch_role' }, c.role) : null,
        h('p', { class: 'arch-ch_sum' }, c.summary),
        h('ul', { class: 'arch-ch_points' }, c.points.map((pt) => h('li', null, pt))),
        phases,
        c.skills?.length ? h('div', { class: 'arch-tags arch-ch_skills' }, c.skills.map((t) => h('span', { class: 'arch-tagpill' }, t))) : null));
    // Clicking a chapter hands the map back to it, even after you've been poking at the map.
    el.addEventListener('click', (ev) => {
      if ((ev.target as Element).closest('.arch-phase')) return;
      this.mapTouched = false;
      this.activate(c, true);
    });
    this.chapterEls.set(c.id, el);
    return el;
  }

  /** Make `c` the chapter being read: caption, highlight, camera, and its arrows on a loop. */
  private activate(c: Chapter | null, force = false): void {
    if (!this.map || (c === this.active && !force)) return;
    // A new chapter is a fresh start: whatever you did to the last one's map is forgiven.
    if (c !== this.active) this.mapTouched = false;
    this.active = c;
    for (const [id, el] of this.chapterEls) el.classList.toggle('is-active', id === c?.id);
    this.mapCaption!.textContent = c ? `// ${pad2(this.doc.journey!.chapters.indexOf(c) + 1)} · ${c.title.toLowerCase()}` : '// the whole thing';
    if (!c) {
      window.clearTimeout(this.overviewTimer);
      this.map.reset();
      this.map.spotlight(null);
      this.map.frame(null);
      return;
    }
    this.lightChapter(c, true);
  }

  private lightChapter(c: Chapter, move: boolean): void {
    const map = this.map!;
    window.clearTimeout(this.overviewTimer);
    map.spotlight(c.nodes, c.edges);
    map.setSteps(c.edges, c.edges.map(() => 1.4));
    if (this.mapTouched) { map.reset(); return; }
    if (c.follow) { this.overviewThenWalk(c); return; }
    if (move) map.frame(c.nodes);
    map.play(0);
  }

  /**
   * For a chapter that spans the whole map: show all of it, every arrow lit, long enough to take in
   * the shape; then walk it step by step with the camera close behind each arrow.
   */
  private overviewThenWalk(c: Chapter): void {
    const map = this.map!;
    window.clearTimeout(this.overviewTimer);
    map.reset();
    map.spotlight(c.nodes, c.edges);
    map.frame(c.nodes);
    this.overviewTimer = window.setTimeout(() => {
      if (this.active === c && !this.mapTouched && !this.phaseOn) map.play(0);
    }, 3200);
  }

  /* ------------------------------------------------------------------ drawer */

  private showDrawer(...children: Child[]): void {
    const close = h('button', { class: 'arch-drawer_close', type: 'button', 'aria-label': 'Close details' }, '×');
    close.addEventListener('click', () => this.closeDrawer());
    this.drawer.replaceChildren(close);
    for (const c of children) if (c) this.drawer.append(c);
    this.drawer.scrollTop = 0;
    this.panel.classList.add('has-drawer');
    gsap.fromTo(this.drawer.children, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.03, ease: 'power3.out' });
  }

  private closeDrawer(): void {
    this.panel.classList.remove('has-drawer');
    this.views.forEach((v) => v.chart.select(null));
    this.systemChart?.select(null);
    this.systemChart?.focus(null);
    this.map?.select(null);
    this.map?.focus(null);
  }

  private jumpToFeature(id: string): void {
    this.closeDrawer();
    const v = this.views.find((x) => x.feature.id === id);
    if (!v) return;
    gsap.to(this.scroller, { scrollTop: v.section.offsetTop - 24, duration: 0.9, ease: 'power3.inOut', onComplete: () => v.chart.play(0) });
  }

  private jumpToChapter(c: Chapter): void {
    this.closeDrawer();
    const el = this.chapterEls.get(c.id);
    if (!el) return;
    this.mapTouched = false;
    gsap.to(this.scroller, { scrollTop: el.offsetTop - 24, duration: 0.9, ease: 'power3.inOut', onComplete: () => this.activate(c, true) });
  }

  private openNode(id: string, from: Chart, feature?: Feature): void {
    const n = this.nodes.get(id);
    if (!n) return;
    this.views.forEach((v) => v.chart.select(null));
    this.systemChart?.select(null);
    this.systemChart?.focus(null);
    this.map?.select(null);
    from.select(id);

    const usedIn: { id: string; name: string; go: () => void }[] = this.doc.journey
      ? this.doc.journey.chapters.filter((c) => c.nodes.includes(id)).map((c) => ({ id: c.id, name: c.title, go: () => this.jumpToChapter(c) }))
      : this.doc.features.filter((f) => f.steps.some((s) => s.from === id || s.to === id)).map((f) => ({ id: f.id, name: f.name, go: () => this.jumpToFeature(f.id) }));
    this.showDrawer(
      h('p', { class: 'arch-drawer_kind' }, kindIcon(n.kind, 13), `// ${KIND_LABEL[n.kind].toLowerCase()}`, n.inferred ? ' · educated guess' : null),
      h('h3', { class: 'arch-drawer_title' }, n.label),
      h('p', { class: 'arch-drawer_lede' }, n.summary),
      feature?.nodeNotes?.[id] ? h('div', { class: 'arch-drawer_here' },
        h('p', { class: 'arch-drawer_k' }, `// in ${feature.name.toLowerCase()}`),
        h('p', null, feature.nodeNotes[id])) : null,
      h('p', { class: 'arch-drawer_body' }, n.details),
      n.interesting ? h('div', { class: 'arch-drawer_fun' }, h('p', { class: 'arch-drawer_k' }, '// fun fact'), h('p', null, n.interesting.replace(/^fun fact:?\s*/i, ''))) : null,
      n.tech.length ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, '// made with'), h('div', { class: 'arch-tags' }, n.tech.map((t) => h('span', { class: 'arch-tagpill' }, t)))) : null,
      usedIn.length ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, this.doc.journey ? '// when it came up' : '// shows up in'),
        h('ul', { class: 'arch-drawer_feats' }, usedIn.map((f) => {
          const b = h('button', { class: 'arch-drawer_feat', type: 'button' }, f.name, h('i', null, '→'));
          b.addEventListener('click', f.go);
          return h('li', null, b);
        }))) : null,
    );
  }

  private openEdge(id: string, from: Chart): void {
    const e = this.doc.edges?.find((x) => x.id === id);
    if (!e) return;
    from.focus([id]);
    const name = (nid: string) => this.nodes.get(nid)?.label ?? nid;
    this.showDrawer(
      h('p', { class: 'arch-drawer_kind' }, '// a wire'),
      h('h3', { class: 'arch-drawer_title' }, name(e.from), h('i', null, ' → '), name(e.to)),
      h('p', { class: 'arch-drawer_lede' }, e.label),
      e.details ? h('p', { class: 'arch-drawer_body' }, e.details) : null,
      h('div', { class: 'arch-tags' }, h('span', { class: 'arch-tagpill' }, e.protocol), h('span', { class: 'arch-tagpill' }, e.mode)),
      e.payload ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, '// what travels'), h('pre', { class: 'arch-code' }, e.payload)) : null,
    );
  }

  /* ------------------------------------------------------------------ scroll behaviour */

  private observe(): void {
    // Every walkthrough plays (and loops) while it's on screen, unless the visitor has taken over.
    // Off screen it pauses, and picks up where it left off when it scrolls back in.
    const auto = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const v = this.views.find((x) => x.chart.el === en.target);
        if (!v) continue;
        v.visible = en.isIntersecting;
        if (v.touched) continue;
        if (en.isIntersecting && !v.chart.isPlaying) v.chart.play();
        else if (!en.isIntersecting && v.chart.isPlaying) v.chart.pause();
      }
    }, { root: this.scroller, threshold: 0.4 });
    this.views.forEach((v) => auto.observe(v.chart.el));

    // Scroll-spy for the index.
    const spy = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const id = en.target.id.replace(/^arch-/, '');
        for (const [k, b] of this.indexLinks) b.classList.toggle('is-active', k === id);
      }
    }, { root: this.scroller, rootMargin: '-35% 0px -60% 0px' });
    this.scroller.querySelectorAll('.arch-feature').forEach((s) => spy.observe(s));

    this.observers.push(auto, spy);

    // Journey: the chapter crossing the upper middle of the view is the one being read. Above the
    // first chapter the map shows everything.
    if (this.doc.journey) {
      const chapters = this.doc.journey.chapters;
      const read = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const c = chapters.find((x) => `arch-ch-${x.id}` === en.target.id);
          if (c) this.activate(c);
        }
      }, { root: this.scroller, rootMargin: '-30% 0px -60% 0px' });
      this.chapterEls.forEach((el) => read.observe(el));
      const top = new IntersectionObserver(([en]) => { if (en.isIntersecting) this.activate(null); }, { root: this.scroller, threshold: 0.6 });
      const intro = this.scroller.querySelector('.arch-journey_intro');
      if (intro) top.observe(intro);
      this.observers.push(read, top);
    }
  }
}

export async function openArchitecture(doc: ArchDoc, opts?: PopupOptions): Promise<ArchPopup> {
  // Charts measure their text to fit it in the boxes, which is only right once the real fonts are in.
  await Promise.all([FONT_LABEL, FONT_SUB, FONT_PILL].map((f) => document.fonts.load(f).catch(() => [])));
  const p = new ArchPopup(doc, opts);
  p.open();
  return p;
}
