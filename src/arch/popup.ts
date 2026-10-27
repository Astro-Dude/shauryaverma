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
import type { ArchDoc, ArchNode, Feature } from './types';

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

function fileList(files?: string[]): HTMLElement | null {
  if (!files?.length) return null;
  return h('ul', { class: 'arch-files' }, files.map((s) => {
    const [path, ...rest] = s.split(' — ');
    return h('li', null, h('code', null, path), rest.length ? h('span', null, rest.join(' — ')) : null);
  }));
}

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
}

export class ArchPopup {
  private root!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private scroller!: HTMLDivElement;
  private drawer!: HTMLElement;
  private indexLinks = new Map<string, HTMLButtonElement>();
  private views: FeatureView[] = [];
  private systemChart: Chart | null = null;
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
      h('p', { class: 'arch-eyebrow', 'data-rise': true }, '// how it works, roughly'),
      h('h2', { class: 'arch-intro_title', 'data-rise': true }, d.project),
      h('p', { class: 'arch-intro_tagline', 'data-rise': true }, d.tagline),
      h('p', { class: 'arch-intro_summary', 'data-rise': true }, d.summary),
      h('p', { class: 'arch-intro_hint', 'data-rise': true },
        `${d.features.length} features. Each one plays itself when you scroll to it. Click any box if you're nosy.`),
    );

    const main = h('main', { class: 'arch-main' }, intro, d.features.map((f, i) => this.renderFeature(f, i)));
    const system = this.renderSystem();
    if (system) main.append(system);

    this.scroller.append(h('div', { class: 'arch-layout' }, this.renderIndex(), main));
    const bar = h('header', { class: 'arch_bar' },
      h('p', { class: 'arch_bar_title' }, h('strong', null, d.project), h('span', null, ' // how it works')),
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
    return h('nav', { class: 'arch-index', 'aria-label': 'Features' },
      h('div', { class: 'arch-index_k', 'data-rise': true }, 'the good stuff'),
      h('ol', { 'data-rise': true },
        this.doc.features.map((f, i) => item(f.id, pad2(i + 1), f.name)),
        this.doc.edges?.length ? item('system', '∞', 'The whole mess', 'is-secondary') : null),
    );
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
    const layers: GraphSpec['layers'] = Array.from({ length: depth }, () => ({ nodes: [] }));
    for (const [id, r] of rank) layers[r].nodes.push(this.nodeSpec(id));
    const edges: GEdge[] = f.steps.map((s, i) => ({
      id: `${f.id}-s${i}`, from: s.from, to: s.to, label: s.label, mode: s.mode ?? 'sync', badge: String(i + 1),
    }));
    return { dir: 'TB', layers: layers.filter((l) => l.nodes.length), edges, labels: true };
  }

  private renderFeature(f: Feature, i: number): HTMLElement {
    const chart = new Chart(this.featureGraph(f));
    chart.setSteps(f.steps.map((_, j) => `${f.id}-s${j}`), f.steps.map((s) => Math.min(6, Math.max(2.4, s.narration.length * 0.04))));

    const playBtn = h('button', { class: 'arch-play', type: 'button' }, h('span', { class: 'arch-play_icon', 'aria-hidden': 'true' }, '▶'), h('span', { class: 'arch-play_label' }, 'Play'));
    playBtn.addEventListener('click', () => (chart.isPlaying ? chart.pause() : chart.play()));

    const steps = f.steps.map((s, j) => {
      const li = h('li', { class: 'arch-step' },
        h('button', { class: 'arch-step_btn', type: 'button', title: `${this.nodes.get(s.from)?.label ?? s.from} → ${this.nodes.get(s.to)?.label ?? s.to}` },
          h('span', { class: 'arch-step_n' }, pad2(j + 1)),
          h('span', { class: 'arch-step_text' }, h('mark', null, s.narration))));
      li.addEventListener('pointerenter', () => chart.focus([`${f.id}-s${j}`]));
      li.addEventListener('pointerleave', () => chart.focus(null));
      li.querySelector('button')!.addEventListener('click', () => chart.show(j));
      return li;
    });

    chart.onStep = (idx, playing) => {
      steps.forEach((li, j) => {
        li.classList.toggle('is-on', j === idx);
        li.classList.toggle('is-done', j < idx);
      });
      const done = idx === f.steps.length - 1 && !playing;
      playBtn.classList.toggle('is-playing', playing);
      playBtn.querySelector('.arch-play_icon')!.textContent = playing ? '❚❚' : done ? '↻' : '▶';
      playBtn.querySelector('.arch-play_label')!.textContent = playing ? 'Pause' : done ? 'Again' : idx >= 0 ? 'Keep going' : 'Play';
    };
    chart.onNode = (id) => this.openNode(id, chart);
    chart.onEdge = (id) => {
      const j = Number(id.split('-s').pop());
      if (!Number.isNaN(j)) chart.show(j);
    };

    const nerd = h('details', { class: 'arch-nerd', 'data-rise': true },
      h('summary', null, h('span', null, '// for the nerds'), h('i', { 'aria-hidden': 'true' }, '+')),
      h('div', { class: 'arch-nerd_body' },
        h('p', null, f.underTheHood),
        f.keyFiles?.length ? h('div', { class: 'arch-nerd_files' }, h('span', { class: 'arch-nerd_k' }, '// where it lives'), fileList(f.keyFiles)) : null));

    const section = h('section', { class: 'arch-feature', id: `arch-${f.id}` },
      h('header', { class: 'arch-feature_head', 'data-rise': true },
        h('span', { class: 'arch-feature_n' }, `feature ${pad2(i + 1)}`),
        h('h3', { class: 'arch-feature_name' }, f.name, f.status && f.status !== 'shipped' ? h('span', { class: 'arch-tag' }, f.status) : null),
        h('p', { class: 'arch-feature_sum' }, f.summary),
        h('p', { class: 'arch-feature_desc' }, f.description)),
      // A chart that wants more than ~760px gets the whole row, with the steps underneath.
      h('div', { class: `arch-feature_grid${chart.naturalWidth > 760 ? ' is-wide' : ''}` },
        h('div', { class: 'arch-feature_chart', 'data-rise': true }, chart.el),
        h('div', { class: 'arch-feature_story', 'data-rise': true },
          h('div', { class: 'arch-story_head' }, h('span', null, '// step by step'), playBtn),
          h('ol', { class: 'arch-steps' }, steps))),
      nerd,
    );

    this.views.push({ feature: f, section, chart, steps, playBtn });
    return section;
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
        h('span', { class: 'arch-feature_n' }, 'the whole thing'),
        h('h3', { class: 'arch-feature_name' }, 'The whole mess'),
        h('p', { class: 'arch-feature_sum' }, 'Every box and every wire at once.'),
        h('p', { class: 'arch-feature_desc' }, 'Drag it around, zoom in, blow it up to full size. Hover a box to see what it talks to. You asked for this.')),
      h('div', { class: 'arch-system_chart', 'data-rise': true }, chart.el),
    );
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
  }

  private jumpToFeature(id: string): void {
    this.closeDrawer();
    const v = this.views.find((x) => x.feature.id === id);
    if (!v) return;
    gsap.to(this.scroller, { scrollTop: v.section.offsetTop - 24, duration: 0.9, ease: 'power3.inOut', onComplete: () => v.chart.play(0) });
  }

  private openNode(id: string, from: Chart): void {
    const n = this.nodes.get(id);
    if (!n) return;
    this.views.forEach((v) => v.chart.select(null));
    this.systemChart?.select(null);
    this.systemChart?.focus(null);
    from.select(id);

    const usedIn = this.doc.features.filter((f) => f.steps.some((s) => s.from === id || s.to === id));
    this.showDrawer(
      h('p', { class: 'arch-drawer_kind' }, kindIcon(n.kind, 13), `// ${KIND_LABEL[n.kind].toLowerCase()}`, n.inferred ? ' · educated guess' : null),
      h('h3', { class: 'arch-drawer_title' }, n.label),
      h('p', { class: 'arch-drawer_lede' }, n.summary),
      h('p', { class: 'arch-drawer_body' }, n.details),
      n.interesting ? h('div', { class: 'arch-drawer_fun' }, h('p', { class: 'arch-drawer_k' }, '// fun fact'), h('p', null, n.interesting.replace(/^fun fact:?\s*/i, ''))) : null,
      n.tech.length ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, '// made with'), h('div', { class: 'arch-tags' }, n.tech.map((t) => h('span', { class: 'arch-tagpill' }, t)))) : null,
      usedIn.length ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, '// shows up in'),
        h('ul', { class: 'arch-drawer_feats' }, usedIn.map((f) => {
          const b = h('button', { class: 'arch-drawer_feat', type: 'button' }, f.name, h('i', null, '→'));
          b.addEventListener('click', () => this.jumpToFeature(f.id));
          return h('li', null, b);
        }))) : null,
      n.keyFiles?.length ? h('div', { class: 'arch-drawer_sec' }, h('p', { class: 'arch-drawer_k' }, '// where it lives'), fileList(n.keyFiles)) : null,
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
    // Each walkthrough plays once, the first time its chart is mostly on screen.
    const played = new WeakSet<Chart>();
    const auto = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const v = this.views.find((x) => x.chart.el === en.target);
        if (!v) continue;
        if (en.isIntersecting && !played.has(v.chart)) {
          played.add(v.chart);
          v.chart.play(0);
        } else if (!en.isIntersecting && v.chart.isPlaying) v.chart.pause();
      }
    }, { root: this.scroller, threshold: 0.6 });
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
  }
}

export async function openArchitecture(doc: ArchDoc, opts?: PopupOptions): Promise<ArchPopup> {
  // Charts measure their text to fit it in the boxes, which is only right once the real fonts are in.
  await Promise.all([FONT_LABEL, FONT_SUB, FONT_PILL].map((f) => document.fonts.load(f).catch(() => [])));
  const p = new ArchPopup(doc, opts);
  p.open();
  return p;
}
