/**
 * A flowchart drawn from data.
 *
 * Nodes sit in layers along a main axis: top-to-bottom for a feature walkthrough, left-to-right
 * for the whole system. Edges are cubic curves between ports spread along each node side, so a
 * busy node fans its connections out in order rather than piling them on one point.
 *
 * The chart renders at its natural size and scales down only as far as its container needs.
 * The popup scrolls; the chart never shrinks its type to fit the screen.
 *
 * Edges that run backwards (a response returning to the user, say) leave from the side and loop
 * around the outside instead of cutting back through the middle of the chart.
 */
import { gsap } from 'gsap';
import type { NodeKind } from './types';

const NS = 'http://www.w3.org/2000/svg';

export interface GNode {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  inferred?: boolean;
}

export interface GEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  mode: 'sync' | 'async' | 'stream' | 'event';
  badge?: string;
}

export interface GraphSpec {
  dir: 'TB' | 'LR';
  layers: { label?: string; desc?: string; nodes: GNode[] }[];
  edges: GEdge[];
  /** Draw a labelled band behind each layer (the system view's zones). */
  zones?: boolean;
  /** Keep every edge label visible, not only the lit ones. */
  labels?: boolean;
  /**
   * Fixed column per node, in node widths (halves allowed). When given, layers keep their order and
   * each node sits in its column instead of being centred, so a hand-placed map stays as drawn.
   */
  columns?: Record<string, number>;
}

type Side = 't' | 'b' | 'l' | 'r';

const ICONS: Record<NodeKind, string> = {
  actor: 'M12 3a4 4 0 100 8 4 4 0 000-8z M4 21c0-4 4-7 8-7s8 3 8 7',
  ui: 'M3 5h18v14H3z M3 9h18',
  service: 'M12 2l9 5v10l-9 5-9-5V7z',
  api: 'M8 5L3 12l5 7 M16 5l5 7-5 7',
  worker: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  queue: 'M4 6h16 M4 12h16 M4 18h16',
  database: 'M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0z M4 6c0 2 16 2 16 0 M4 12c0 2 16 2 16 0',
  cache: 'M13 2L4 14h7l-1 8 9-12h-7z',
  storage: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  external: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  extension: 'M10 3h4v3a2 2 0 104 0V3h3v7h-3a2 2 0 100 4h3v7h-7v-3a2 2 0 10-4 0v3H3v-7h3a2 2 0 100-4H3V3z',
  'browser-api': 'M6 6h12v12H6z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
  other: 'M12 8a4 4 0 100 8 4 4 0 000-8z',
};

export const KIND_LABEL: Record<NodeKind, string> = {
  actor: 'Person', ui: 'Interface', service: 'Service', api: 'API', worker: 'Worker', queue: 'Queue',
  database: 'Database', cache: 'Cache', storage: 'Storage', external: 'External',
  extension: 'Extension', 'browser-api': 'Browser API', other: 'Component',
};

export function kindIcon(kind: NodeKind, size = 14): SVGSVGElement {
  const s = el('svg', { viewBox: '0 0 24 24', width: size, height: size, class: 'arch-icon', 'aria-hidden': 'true' });
  s.append(el('path', { d: ICONS[kind] ?? ICONS.other }));
  return s;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/*
 * Real text widths, measured with the same fonts the SVG draws in. Counting characters is how the
 * labels ended up spilling out of their boxes: an uppercase W is three times an i.
 */
const measureCtx = document.createElement('canvas').getContext('2d')!;
export const FONT_LABEL = '600 15px "Geist Sans", sans-serif';
export const FONT_SUB = '500 10px "Geist Mono", monospace';
export const FONT_PILL = '500 10px "Geist Mono", monospace';

/** How far the isometric top and side faces stick out behind each box. */
const DEPTH = 10;

type Shape = 'person' | 'window' | 'server' | 'queue' | 'cylinder' | 'bucket' | 'cloud' | 'chip' | 'block';

function shapeOf(kind: NodeKind): Shape {
  switch (kind) {
    case 'actor': return 'person';
    case 'ui':
    case 'extension': return 'window';
    case 'service':
    case 'api':
    case 'worker': return 'server';
    case 'queue': return 'queue';
    case 'database':
    case 'cache': return 'cylinder';
    case 'storage': return 'bucket';
    case 'external': return 'cloud';
    case 'browser-api': return 'chip';
    default: return 'block';
  }
}

/** Only box-like shapes have isometric faces; arrows land on those faces, so ports need to know. */
function depthOf(kind: NodeKind): number {
  const s = shapeOf(kind);
  return s === 'window' || s === 'server' || s === 'queue' || s === 'block' ? DEPTH : 0;
}

function textWidth(text: string, font: string, letterSpacing = 0): number {
  measureCtx.font = font;
  return measureCtx.measureText(text).width + letterSpacing * text.length;
}

/** Shorten with an ellipsis until it fits in `max` px. */
function fitText(text: string, font: string, max: number, letterSpacing = 0): string {
  if (textWidth(text, font, letterSpacing) <= max) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(`${text.slice(0, mid).trimEnd()}…`, font, letterSpacing) <= max) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

type Pt = { x: number; y: number };

const NORMAL: Record<Side, [number, number]> = { t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] };

interface Placed { spec: GNode; layer: number; x: number; y: number; g: SVGGElement }
interface Routed { spec: GEdge; g: SVGGElement; path: SVGPathElement; label: SVGGElement }

let uid = 0;

export class Chart {
  readonly el: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly root: SVGGElement;
  private readonly packet: SVGGElement;
  private readonly trail: SVGPathElement;
  private readonly W: number;
  private readonly H: number;
  private readonly arrow: string;
  private readonly arrowHot: string;
  private stipple = '';
  private readonly edgeG = el('g', { class: 'arch-edges' });
  private readonly labelG = el('g', { class: 'arch-labels' });
  /** Width the chart wants at 1:1, so the popup can give wide ones a full row. */
  naturalWidth = 0;
  naturalHeight = 0;
  private sizer: ResizeObserver | null = null;

  private placed = new Map<string, Placed>();
  private routed = new Map<string, Routed>();
  private adjacency = new Map<string, string[]>();

  private hover: { type: 'node' | 'edge'; id: string } | null = null;
  private selected: string | null = null;
  private focusEdges: Set<string> | null = null;
  /** A standing highlight set from outside, e.g. the chapter being read. Hover still wins. */
  private spot: { nodes: Set<string>; edges: Set<string> } | null = null;

  /** The fitted viewBox, and the current one after any zoom or pan. */
  private base = { x: 0, y: 0, w: 1, h: 1 };
  private vb = { x: 0, y: 0, w: 1, h: 1 };
  private suppressClick = false;

  private order: string[] = [];
  private holds: number[] = [];
  private index = -1;
  private playing = false;
  private tl: gsap.core.Timeline | null = null;

  onNode: (id: string) => void = () => {};
  onEdge: (id: string) => void = () => {};
  onStep: (index: number, playing: boolean) => void = () => {};

  constructor(private readonly spec: GraphSpec) {
    const lr = spec.dir === 'LR';
    this.W = lr ? 196 : 216;
    this.H = 60;
    const id = ++uid;
    this.arrow = `arch-arrow-${id}`;
    this.arrowHot = `arch-arrow-hot-${id}`;

    this.el = document.createElement('div');
    this.el.className = `arch-chart dir-${spec.dir}${spec.labels ? ' show-labels' : ''}`;
    this.svg = el('svg', { class: 'arch-svg' });
    // Open chevrons for arrows, and a stipple for the shaded side of each box: the engineering-drawing look.
    this.svg.innerHTML = `<defs>
      <marker id="${this.arrow}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5L9 5L1 8.5" class="arch-arrow"/></marker>
      <marker id="${this.arrowHot}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5L9 5L1 8.5" class="arch-arrow is-hot"/></marker>
      <pattern id="arch-stipple-${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.75" class="arch-stipple"/><circle cx="3" cy="3" r="0.75" class="arch-stipple"/></pattern>
    </defs>`;
    this.stipple = `url(#arch-stipple-${id})`;
    this.root = el('g');
    this.trail = el('path', { class: 'arch-trail' });
    this.packet = el('g', { class: 'arch-packet' });
    this.packet.append(el('circle', { r: 11, class: 'arch-packet_halo' }), el('circle', { r: 5, class: 'arch-packet_core' }));
    this.svg.append(this.root);
    this.el.append(this.svg);

    this.layout();
    this.bind();
    this.bindViewport();
    this.fitToBox();
  }

  /*
   * The SVG always spans its whole frame, so zooming and dragging clip at the frame's border and
   * never at some narrower inner edge. Its height follows the width it is given, capped at the
   * chart's natural height so small charts are never blown up past 1:1. The viewBox does the
   * centring (xMidYMid meet).
   */
  private fitToBox(): void {
    const apply = () => {
      const w = this.el.clientWidth;
      if (!w) return;
      const h = Math.min(this.naturalHeight, (w * this.naturalHeight) / this.naturalWidth);
      this.svg.style.height = `${Math.round(h)}px`;
    };
    this.sizer = new ResizeObserver(apply);
    this.sizer.observe(this.el);
  }

  /* ------------------------------------------------------------------ layout */

  private layout(): void {
    const { spec, W, H } = this;
    const lr = spec.dir === 'LR';
    const layers = spec.layers.map((l) => ({ ...l, nodes: [...l.nodes] }));

    for (const e of spec.edges) {
      (this.adjacency.get(e.from) ?? this.adjacency.set(e.from, []).get(e.from)!).push(e.id);
      (this.adjacency.get(e.to) ?? this.adjacency.set(e.to, []).get(e.to)!).push(e.id);
    }

    // Barycentre sweeps: order each layer by where its neighbours sit, to cut crossings.
    const layerOf = new Map<string, number>();
    layers.forEach((l, i) => l.nodes.forEach((n) => layerOf.set(n.id, i)));
    const pos = (id: string) => {
      const l = layers[layerOf.get(id)!];
      return (l.nodes.findIndex((n) => n.id === id) + 0.5) / l.nodes.length;
    };
    const nb = new Map<string, string[]>();
    for (const e of spec.edges) {
      (nb.get(e.from) ?? nb.set(e.from, []).get(e.from)!).push(e.to);
      (nb.get(e.to) ?? nb.set(e.to, []).get(e.to)!).push(e.from);
    }
    for (let it = 0; it < (spec.columns ? 0 : 4); it++) {
      for (const pass of [layers.map((_, i) => i), layers.map((_, i) => layers.length - 1 - i)]) {
        for (const i of pass) {
          const l = layers[i];
          if (l.nodes.length < 2) continue;
          const key = new Map<string, number>();
          l.nodes.forEach((n, j) => {
            const o = (nb.get(n.id) ?? []).filter((m) => layerOf.get(m) !== i && layerOf.has(m));
            key.set(n.id, o.length ? o.reduce((s, m) => s + pos(m), 0) / o.length : (j + 0.5) / l.nodes.length);
          });
          l.nodes.sort((a, b) => key.get(a.id)! - key.get(b.id)!);
        }
      }
    }

    const zoneHead = spec.zones ? 56 : 0;
    const zonePad = spec.zones ? 18 : 0;
    const mainGap = lr ? 96 : 104;
    const crossGap = lr ? 24 : 84;
    const mainSize = lr ? W + zonePad * 2 : H;
    const crossSize = lr ? H : W;
    const extents = layers.map((l) => l.nodes.length * crossSize + Math.max(0, l.nodes.length - 1) * crossGap);
    const maxExtent = Math.max(...extents);

    const zoneG = el('g', { class: 'arch-zones' });
    const { edgeG, labelG } = this;
    const nodeG = el('g', { class: 'arch-nodes' });

    layers.forEach((l, i) => {
      const main0 = i * (mainSize + mainGap);
      const cross0 = (maxExtent - extents[i]) / 2;
      if (spec.zones && lr) {
        const zx = main0;
        const zy = zoneHead - 14 + cross0 - zonePad;
        const g = el('g', { class: 'arch-zone' });
        g.append(el('rect', { x: zx, y: zy, width: mainSize, height: extents[i] + zonePad * 2, rx: 16, class: 'arch-zone_bg' }));
        const n = el('text', { x: zx + 2, y: zy - 26, class: 'arch-zone_idx' });
        n.textContent = String(i + 1).padStart(2, '0');
        const t = el('text', { x: zx + 26, y: zy - 26, class: 'arch-zone_label' });
        t.textContent = (l.label ?? '').toUpperCase();
        g.append(n, t);
        if (l.desc) {
          const d = el('text', { x: zx + 2, y: zy - 10, class: 'arch-zone_desc' });
          d.textContent = l.desc.length > 36 ? `${l.desc.slice(0, 35)}…` : l.desc;
          g.append(d);
        }
        zoneG.append(g);
      }
      l.nodes.forEach((n, j) => {
        const col = spec.columns?.[n.id];
        const c = col !== undefined ? col * (crossSize + crossGap) : cross0 + j * (crossSize + crossGap);
        const x = lr ? main0 + zonePad : c;
        const y = lr ? zoneHead + c : main0;
        const g = this.drawNode(n, x, y);
        nodeG.append(g);
        this.placed.set(n.id, { spec: n, layer: i, x, y, g });
      });
    });

    const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x: number, y: number) => {
      bounds.x0 = Math.min(bounds.x0, x); bounds.y0 = Math.min(bounds.y0, y);
      bounds.x1 = Math.max(bounds.x1, x); bounds.y1 = Math.max(bounds.y1, y);
    };
    for (const p of this.placed.values()) { grow(p.x, p.y - DEPTH); grow(p.x + W + DEPTH, p.y + H); }
    if (spec.zones) zoneG.querySelectorAll('rect').forEach((r) => {
      const x = +r.getAttribute('x')!, y = +r.getAttribute('y')!;
      grow(x, y - 44); grow(x + +r.getAttribute('width')!, y + +r.getAttribute('height')!);
    });

    this.route(grow);

    const pad = 36;
    const vw = bounds.x1 - bounds.x0 + pad * 2;
    const vh = bounds.y1 - bounds.y0 + pad * 2;
    this.base = { x: bounds.x0 - pad, y: bounds.y0 - pad, w: vw, h: vh };
    this.vb = { ...this.base };
    this.applyView();
    this.el.style.setProperty('--natural-w', `${Math.round(vw)}px`);
    this.naturalWidth = vw;
    this.naturalHeight = vh;

    this.root.append(zoneG, edgeG, this.trail, labelG, nodeG, this.packet);
  }

  /**
   * Each part is drawn as what it is: a cylinder for a database, a rack unit for a server, a
   * browser window for a page, a cloud for someone else's service. Box-like shapes get an
   * isometric top and a stippled side; flat ones get the hard offset shadow instead.
   */
  private drawNode(n: GNode, x: number, y: number): SVGGElement {
    const { W, H } = this;
    const shape = shapeOf(n.kind);
    const D = depthOf(n.kind);
    const g = el('g', {
      class: `arch-node kind-${n.kind} shape-${shape}`, transform: `translate(${x} ${y})`,
      'data-node': n.id, tabindex: 0, role: 'button', 'aria-label': `${n.label}. ${n.sub}`,
    });
    const box = (attrs: Record<string, string | number>) => el('rect', { class: 'arch-node_box', width: W, height: H, rx: 3, ...attrs });
    const detail = (d: string) => el('path', { class: 'arch-node_detail', d });
    const shadow = (node: SVGElement) => {
      const s = node.cloneNode() as SVGElement;
      s.setAttribute('class', 'arch-node_shadow');
      s.setAttribute('transform', 'translate(4 4)');
      return s;
    };
    const isoFaces = () => [
      el('polygon', { class: 'arch-node_top', points: `0,0 ${W},0 ${W + D},${-D} ${D},${-D}` }),
      el('polygon', { class: 'arch-node_side', points: `${W},0 ${W + D},${-D} ${W + D},${H - D} ${W},${H}`, fill: this.stipple }),
    ];
    let off = 0;
    let room = W - 46 - 12;

    switch (shape) {
      case 'person': {
        const b = box({ rx: H / 2 });
        g.append(b);
        break;
      }
      case 'window': {
        g.append(...isoFaces(), box({}), detail(`M0 14H${W}`),
          el('circle', { class: 'arch-node_dot', cx: 9, cy: 7, r: 2 }),
          el('circle', { class: 'arch-node_dot', cx: 16, cy: 7, r: 2 }),
          el('circle', { class: 'arch-node_dot', cx: 23, cy: 7, r: 2 }));
        off = 6;
        break;
      }
      case 'server': {
        // A rack unit: vents on the right and a status light that glows when the part is busy.
        const vx = W - 30;
        g.append(...isoFaces(), box({}),
          detail(`M${vx} 18h16M${vx} 26h16M${vx} 34h16M${vx} 42h16`),
          el('circle', { class: 'arch-node_led', cx: vx + 8, cy: 51, r: 2.5 }));
        room = W - 46 - 40;
        break;
      }
      case 'queue': {
        const sx = W - 42;
        g.append(...isoFaces(), box({}), detail(`M${sx} 0V${H}M${sx + 10} 0V${H}M${sx + 20} 0V${H}M${sx + 30} 0V${H}`));
        room = W - 46 - 48;
        break;
      }
      case 'cylinder': {
        const ry = 7;
        const body = el('path', { class: 'arch-node_box', d: `M0 ${ry}V${H - ry}A${W / 2} ${ry} 0 0 0 ${W} ${H - ry}V${ry}` });
        g.append(shadow(body), body,
          el('ellipse', { class: 'arch-node_top', cx: W / 2, cy: ry, rx: W / 2, ry }),
          detail(`M0 ${H / 2 + 2}A${W / 2} ${ry} 0 0 0 ${W} ${H / 2 + 2}`));
        off = 5;
        break;
      }
      case 'bucket': {
        const ry = 7, inset = 12;
        const body = el('path', { class: 'arch-node_box', d: `M0 ${ry}L${inset} ${H - ry}A${W / 2 - inset} ${ry - 1} 0 0 0 ${W - inset} ${H - ry}L${W} ${ry}` });
        g.append(shadow(body), body, el('ellipse', { class: 'arch-node_top', cx: W / 2, cy: ry, rx: W / 2, ry }));
        off = 4;
        room = W - 46 - 18;
        break;
      }
      case 'cloud': {
        const pts: [number, number][] = [[18, H], [12, 30], [W * 0.3, 14], [W * 0.62, 12], [W - 18, 28], [W - 14, H]];
        let d = `M${pts[0][0]} ${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
          const r = Math.hypot(bx - ax, by - ay) * 0.62;
          d += `A${r} ${r} 0 0 1 ${bx} ${by}`;
        }
        d += 'Z';
        const body = el('path', { class: 'arch-node_box', d });
        g.append(shadow(body), body);
        off = 8;
        room = W - 46 - 22;
        break;
      }
      case 'chip': {
        const b = box({});
        let pins = '';
        for (let px = 30; px < W - 10; px += 18) pins += `M${px} -5V0M${px} ${H}v5`;
        g.append(shadow(b), b, detail(pins));
        break;
      }
      default: {
        g.append(...isoFaces(), box({}));
      }
    }

    const icon = el('g', { transform: `translate(16 ${H / 2 - 9 + off}) scale(0.75)`, class: 'arch-node_icon' });
    icon.append(el('path', { d: ICONS[n.kind] ?? ICONS.other }));
    const label = el('text', { x: 46, y: H / 2 - 3 + off, class: 'arch-node_label' });
    // Clipped to the shape by measured width: the full names live in the drawer.
    label.textContent = fitText(n.label, FONT_LABEL, room);
    const sub = el('text', { x: 46, y: H / 2 + 14 + off, class: 'arch-node_sub' });
    sub.textContent = fitText(n.sub.toUpperCase(), FONT_SUB, room, 0.6);
    g.append(icon, label, sub);
    if (n.inferred) g.append(el('circle', { cx: W - 10, cy: 10 + off, r: 2.5, class: 'arch-node_inferred' }));
    return g;
  }

  private sides(e: GEdge): [Side, Side] | null {
    const a = this.placed.get(e.from), b = this.placed.get(e.to);
    if (!a || !b || a === b) return null;
    if (this.spec.dir === 'TB') {
      if (b.layer > a.layer) return ['b', 't'];
      if (b.layer < a.layer) return ['r', 'r'];
      return b.x > a.x ? ['r', 'l'] : ['l', 'r'];
    }
    if (b.layer > a.layer) return ['r', 'l'];
    if (b.layer < a.layer) return ['b', 'b'];
    return ['r', 'r'];
  }

  /**
   * Draw every edge and its label. Clears whatever it drew before, so it can safely run again.
   *
   * Two passes. First every curve is worked out, so that when labels are placed in the second pass
   * they can avoid all the other lines, not just boxes and earlier labels.
   */
  private route(grow: (x: number, y: number) => void = () => {}): void {
    const { W, H, edgeG, labelG } = this;
    edgeG.replaceChildren();
    labelG.replaceChildren();
    type End = { e: GEdge; end: 0 | 1; other: Placed };
    const bySide = new Map<string, End[]>();
    const sideOf = new Map<string, [Side, Side]>();
    for (const e of this.spec.edges) {
      const s = this.sides(e);
      if (!s) continue;
      sideOf.set(e.id, s);
      const a = this.placed.get(e.from)!, b = this.placed.get(e.to)!;
      for (const [key, v] of [[`${e.from}:${s[0]}`, { e, end: 0, other: b }], [`${e.to}:${s[1]}`, { e, end: 1, other: a }]] as const) {
        (bySide.get(key) ?? bySide.set(key, []).get(key)!).push(v as End);
      }
    }

    const ports = new Map<string, { x: number; y: number }>();
    for (const [key, list] of bySide) {
      const [id, side] = key.split(':') as [string, Side];
      const p = this.placed.get(id)!;
      const horizontal = side === 't' || side === 'b';
      list.sort((m, n) => (horizontal ? m.other.x - n.other.x : m.other.y - n.other.y) || (m.e.badge ?? '').localeCompare(n.e.badge ?? '', undefined, { numeric: true }));
      const k = list.length;
      list.forEach((v, i) => {
        const f = k === 1 ? 0.5 : i / (k - 1);
        // Arrows into the top or right of a block land on its top/side face, so they read as 3D.
        const d = depthOf(p.spec.kind) / 2;
        const pt = horizontal
          ? { x: p.x + W * (k === 1 ? 0.5 : 0.22 + 0.56 * f) + (side === 't' ? d : 0), y: side === 't' ? p.y - d : p.y + H }
          : { x: side === 'l' ? p.x : p.x + W + d, y: p.y + (k === 1 ? H / 2 : 12 + (H - 24) * f) - (side === 'r' ? d : 0) };
        ports.set(`${v.e.id}:${v.end}`, pt);
      });
    }

    // Loops (same-side edges) nest outward by span, so a long loop wraps around a short one.
    const loops = this.spec.edges.filter((e) => { const s = sideOf.get(e.id); return s && s[0] === s[1]; });
    const span = (e: GEdge) => {
      const p1 = ports.get(`${e.id}:0`)!, p2 = ports.get(`${e.id}:1`)!;
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    };
    loops.sort((a, b) => span(a) - span(b));
    const loopRank = new Map(loops.map((e, i) => [e.id, i]));

    // Pass 1: every curve.
    type Curve = { e: GEdge; p1: Pt; c1: Pt; c2: Pt; p2: Pt };
    const curves: Curve[] = [];
    for (const e of this.spec.edges) {
      const s = sideOf.get(e.id);
      if (!s) continue;
      const p1 = ports.get(`${e.id}:0`)!, p2 = ports.get(`${e.id}:1`)!;
      const [n1, n2] = [NORMAL[s[0]], NORMAL[s[1]]];
      let k1: number, k2: number;
      if (s[0] === s[1]) {
        const k = 44 + loopRank.get(e.id)! * 22 + span(e) * 0.08;
        k1 = k; k2 = k;
      } else {
        const d = Math.abs(n1[0] ? p2.x - p1.x : p2.y - p1.y);
        k1 = k2 = Math.max(30, d * 0.5);
      }
      curves.push({ e, p1, p2, c1: { x: p1.x + n1[0] * k1, y: p1.y + n1[1] * k1 }, c2: { x: p2.x + n2[0] * k2, y: p2.y + n2[1] * k2 } });
    }

    // Obstacles for labels: boxes, labels as they are placed, and points sampled along every line.
    const taken = [...this.placed.values()].map((p) => ({ x0: p.x - 4, x1: p.x + W + DEPTH + 4, y0: p.y - DEPTH - 4, y1: p.y + H + 4 }));
    const samples = curves.flatMap((c) => {
      const out: { id: string; x: number; y: number }[] = [];
      for (let t = 0.04; t < 0.97; t += 0.04) out.push({ id: c.e.id, x: bez(c.p1.x, c.c1.x, c.c2.x, c.p2.x, t), y: bez(c.p1.y, c.c1.y, c.c2.y, c.p2.y, t) });
      return out;
    });

    // Pass 2: draw, and place each label where it covers the least.
    for (const { e, p1, c1, c2, p2 } of curves) {
      const d = `M${p1.x} ${p1.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
      grow(c1.x * 0.75 + p1.x * 0.25, c1.y * 0.75 + p1.y * 0.25);
      grow(c2.x * 0.75 + p2.x * 0.25, c2.y * 0.75 + p2.y * 0.25);

      const g = el('g', { class: `arch-edge mode-${e.mode}`, 'data-edge': e.id });
      const path = el('path', { d, class: 'arch-edge_line', 'marker-end': `url(#${this.arrow})` });
      g.append(el('path', { d, class: 'arch-edge_hit' }), path);
      edgeG.append(g);

      const shown = fitText(`// ${e.label.toUpperCase()}`, FONT_PILL, 200, 0.5);
      const tw = textWidth(shown, FONT_PILL, 0.5) + 14;
      const box = (t: number, dx = 0, dy = 0) => {
        const x = bez(p1.x, c1.x, c2.x, p2.x, t) + dx, y = bez(p1.y, c1.y, c2.y, p2.y, t) + dy;
        return e.badge
          ? { x, y, x0: x - 13, x1: x + 14 + tw + 2, y0: y - 13, y1: y + 13 }
          : { x, y, x0: x - tw / 2 - 2, x1: x + tw / 2 + 2, y0: y - 12, y1: y + 12 };
      };
      // Covering a box or a label is worst; sitting on someone else's line is bad too.
      const cost = (b: ReturnType<typeof box>) =>
        taken.reduce((sum, r) => sum + Math.max(0, Math.min(b.x1, r.x1) - Math.max(b.x0, r.x0)) * Math.max(0, Math.min(b.y1, r.y1) - Math.max(b.y0, r.y0)), 0)
        + 60 * samples.filter((q) => q.id !== e.id && q.x > b.x0 && q.x < b.x1 && q.y > b.y0 && q.y < b.y1).length;
      // Along the curve first (the badge stays on its arrow), then nudged just off it.
      const tries: [number, number, number][] = [];
      for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) tries.push([t, 0, 0]);
      for (const t of [0.5, 0.35, 0.65]) for (const [dx, dy] of [[0, -22], [0, 22], [-tw / 2 - 16, 0], [-tw - 20, 0], [0, -44], [0, 44]]) tries.push([t, dx, dy]);
      let at = box(0.5), best = Infinity;
      for (const [t, dx, dy] of tries) {
        const b = box(t, dx, dy);
        const c = cost(b);
        if (c < best) { best = c; at = b; }
        if (c === 0) break;
      }
      taken.push(at);
      const mx = at.x, my = at.y;
      const label = el('g', { class: 'arch-edge_label', 'data-edge': e.id, transform: `translate(${mx} ${my})` });
      if (e.badge) {
        // Badge on the line, label pill beside it: the number ties the arrow to its step in the list.
        const pill = el('g', { class: 'arch-edge_pill', transform: 'translate(14 0)' });
        pill.append(el('rect', { x: 0, y: -10, width: tw, height: 20, rx: 10 }));
        const t = el('text', { x: 7, y: 3.5 });
        t.textContent = shown;
        pill.append(t);
        const badge = el('g', { class: 'arch-edge_badge' });
        badge.append(el('circle', { r: 10 }));
        const bt = el('text', { 'text-anchor': 'middle', y: 3.8 });
        bt.textContent = e.badge;
        badge.append(bt);
        label.append(pill, badge);
        grow(mx + 14 + tw, my + 10);
      } else {
        label.append(el('rect', { x: -tw / 2, y: -10, width: tw, height: 20, rx: 10 }));
        const t = el('text', { 'text-anchor': 'middle', y: 3.5 });
        t.textContent = shown;
        label.append(t);
      }
      labelG.append(label);
      this.routed.set(e.id, { spec: e, g, path, label });
    }
  }


  /* ------------------------------------------------------------------ interaction */

  private bind(): void {
    const hit = (t: EventTarget | null) => {
      const x = t as Element | null;
      const n = x?.closest?.('[data-node]');
      if (n) return { type: 'node' as const, id: n.getAttribute('data-node')! };
      const e = x?.closest?.('[data-edge]');
      if (e) return { type: 'edge' as const, id: e.getAttribute('data-edge')! };
      return null;
    };
    this.svg.addEventListener('pointerover', (ev) => { this.hover = hit(ev.target); this.paint(); });
    this.svg.addEventListener('pointerleave', () => { this.hover = null; this.paint(); });
    this.svg.addEventListener('click', (ev) => {
      if (this.suppressClick) { this.suppressClick = false; return; }
      const h = hit(ev.target);
      if (h?.type === 'node') this.onNode(h.id);
      if (h?.type === 'edge') this.onEdge(h.id);
    });
    this.svg.addEventListener('keydown', (ev) => {
      const h = hit(ev.target);
      if (h?.type === 'node' && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        this.onNode(h.id);
      }
    });
    this.svg.addEventListener('focusin', (ev) => { this.hover = hit(ev.target); this.paint(); });
    this.svg.addEventListener('focusout', () => { this.hover = null; this.paint(); });
  }

  /** Mark one node as the one the drawer is showing. */
  select(id: string | null): void {
    this.selected = id;
    this.paint();
  }

  /** Light a set of edges from outside, e.g. while a step in the list is hovered. */
  focus(edgeIds: string[] | null): void {
    this.focusEdges = edgeIds ? new Set(edgeIds) : null;
    this.paint();
  }

  /** Light these parts until told otherwise; everything else dims. */
  spotlight(nodes: string[] | null, edges: string[] = []): void {
    this.spot = nodes ? { nodes: new Set(nodes), edges: new Set(edges) } : null;
    this.paint();
  }

  /** Every edge whose two ends are both in `nodes`. */
  edgesAmong(nodes: string[]): string[] {
    const set = new Set(nodes);
    return [...this.routed.values()].filter((r) => set.has(r.spec.from) && set.has(r.spec.to)).map((r) => r.spec.id);
  }

  /**
   * Move the camera so these nodes fill the view, never closer than about 1:1 so text stays crisp.
   * With no nodes it pulls back to the whole chart.
   */
  frame(nodes: string[] | null, animate = true): void {
    const ps = (nodes ?? []).map((id) => this.placed.get(id)).filter((p): p is Placed => !!p);
    if (!ps.length) { this.resetView(animate); return; }
    const r = this.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = 64;
    let x0 = Math.min(...ps.map((p) => p.x)) - pad, x1 = Math.max(...ps.map((p) => p.x + this.W + DEPTH)) + pad;
    let y0 = Math.min(...ps.map((p) => p.y - DEPTH)) - pad, y1 = Math.max(...ps.map((p) => p.y + this.H)) + pad;
    const maxScale = 1.1;
    let w = Math.max(x1 - x0, r.width / maxScale), h = Math.max(y1 - y0, r.height / maxScale);
    // Match the frame's shape, so the centring is exact rather than left to preserveAspectRatio.
    const aspect = r.width / r.height;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    x0 = cx - w / 2; y0 = cy - h / 2;
    this.moveTo({ x: x0, y: y0, w, h }, animate);
  }

  private paint(): void {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    const addEdge = (id: string) => {
      const r = this.routed.get(id);
      if (!r) return;
      edges.add(id); nodes.add(r.spec.from); nodes.add(r.spec.to);
    };
    let any = false;

    if (this.index >= 0) {
      any = true;
      this.order.slice(0, this.index + 1).forEach(addEdge);
    }
    if (this.focusEdges) {
      any = true;
      this.focusEdges.forEach(addEdge);
    } else if (this.hover) {
      any = true;
      if (this.hover.type === 'node') {
        nodes.add(this.hover.id);
        (this.adjacency.get(this.hover.id) ?? []).forEach(addEdge);
      } else addEdge(this.hover.id);
    } else if (this.spot) {
      any = true;
      this.spot.nodes.forEach((id) => nodes.add(id));
      this.spot.edges.forEach(addEdge);
    }

    this.svg.classList.toggle('has-focus', any);
    const cur = this.index >= 0 ? this.routed.get(this.order[this.index]) : null;
    for (const [id, p] of this.placed) {
      p.g.classList.toggle('is-lit', nodes.has(id));
      p.g.classList.toggle('is-selected', this.selected === id);
      p.g.classList.toggle('is-current', cur?.spec.to === id);
    }
    for (const [id, r] of this.routed) {
      const on = edges.has(id);
      r.g.classList.toggle('is-lit', on);
      r.g.classList.toggle('is-current', cur?.spec.id === id);
      r.label.classList.toggle('is-lit', on);
      r.label.classList.toggle('is-current', cur?.spec.id === id);
      r.path.setAttribute('marker-end', `url(#${on ? this.arrowHot : this.arrow})`);
    }
  }

  /* ------------------------------------------------------------------ zoom and pan */

  private applyView(): void {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    this.el.classList.toggle('is-zoomed', Math.abs(w - this.base.w) > 0.5 || Math.abs(x - this.base.x) > 0.5 || Math.abs(y - this.base.y) > 0.5);
  }

  /** Current zoom relative to the fitted view. */
  private get k(): number {
    return this.base.w / this.vb.w;
  }

  /** Zoom by `factor`, keeping the point under (clientX, clientY) fixed. Defaults to the centre. */
  zoom(factor: number, clientX?: number, clientY?: number, animate = false): void {
    const k = gsap.utils.clamp(0.6, 5, this.k * factor);
    const f = k / this.k;
    if (f === 1) return;
    const r = this.svg.getBoundingClientRect();
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(clientX ?? r.left + r.width / 2, clientY ?? r.top + r.height / 2).matrixTransform(ctm.inverse());
    const to = {
      w: this.vb.w / f,
      h: this.vb.h / f,
      x: p.x - (p.x - this.vb.x) / f,
      y: p.y - (p.y - this.vb.y) / f,
    };
    this.moveTo(to, animate);
  }

  /** Back to the fitted view. */
  resetView(animate = true): void {
    this.moveTo({ ...this.base }, animate);
  }

  private moveTo(to: { x: number; y: number; w: number; h: number }, animate: boolean): void {
    gsap.killTweensOf(this.vb);
    if (!animate) {
      Object.assign(this.vb, to);
      this.applyView();
      return;
    }
    gsap.to(this.vb, { ...to, duration: 0.5, ease: 'power3.out', onUpdate: () => this.applyView() });
  }

  /*
   * The hand: drag anywhere to move. Pinch to zoom: a trackpad pinch arrives as a ctrl+wheel event,
   * a touchscreen pinch as two pointers. A plain scroll is left alone, so the popup still scrolls
   * past a chart instead of getting stuck in it, and one finger on a phone scrolls the page.
   */
  private bindViewport(): void {
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; vx: number; vy: number; scale: number } | null = null;
    let pinch: { d: number; mx: number; my: number } | null = null;
    let moved = 0;

    const unitsPerPx = () => 1 / (this.svg.getScreenCTM()?.a || 1);

    this.svg.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      gsap.killTweensOf(this.vb);
      moved = 0;
      if (ev.pointerType !== 'touch') {
        drag = { x: ev.clientX, y: ev.clientY, vx: this.vb.x, vy: this.vb.y, scale: unitsPerPx() };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        this.el.classList.add('is-dragging');
      }
    });

    this.svg.addEventListener('pointermove', (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        ev.preventDefault();
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const s = unitsPerPx();
        this.vb.x -= (mx - pinch.mx) * s;
        this.vb.y -= (my - pinch.my) * s;
        this.applyView();
        this.zoom(d / pinch.d, mx, my);
        pinch = { d, mx, my };
        moved = 99;
        return;
      }
      if (!drag) return;
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      if (moved < 4) return;
      if (!this.el.classList.contains('is-dragging')) {
        this.el.classList.add('is-dragging');
        this.svg.setPointerCapture(ev.pointerId);
      }
      this.vb.x = drag.vx - dx * drag.scale;
      this.vb.y = drag.vy - dy * drag.scale;
      this.applyView();
    });

    const end = (ev: PointerEvent) => {
      if (!pointers.delete(ev.pointerId)) return;
      if (pointers.size < 2) pinch = null;
      if (pointers.size) return;
      if (moved >= 4) this.suppressClick = true;
      drag = null;
      this.el.classList.remove('is-dragging');
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);

    this.svg.addEventListener('wheel', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      // A pinch sends many small deltas; a mouse wheel notch sends one big one. Cap the big ones.
      const dy = gsap.utils.clamp(-40, 40, ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY);
      this.zoom(Math.exp(-dy * 0.01), ev.clientX, ev.clientY);
    }, { passive: false });

    // Double-click empty space to snap back, for when you've zoomed yourself into a corner.
    this.svg.addEventListener('dblclick', (ev) => {
      if ((ev.target as Element).closest('[data-node], [data-edge]')) return;
      this.resetView();
    });
  }

  /* ------------------------------------------------------------------ walkthrough */

  /** Set the ordered edges a walkthrough follows, with how long to dwell on each. */
  setSteps(order: string[], holds: number[]): void {
    this.order = order;
    this.holds = holds;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get current(): number {
    return this.index;
  }

  play(from?: number): void {
    if (!this.order.length) return;
    this.playing = true;
    const start = from ?? (this.index < 0 || this.index >= this.order.length - 1 ? 0 : this.index + 1);
    this.go(start);
  }

  pause(): void {
    this.playing = false;
    this.tl?.kill();
    this.onStep(this.index, false);
  }

  reset(): void {
    this.playing = false;
    this.tl?.kill();
    this.index = -1;
    this.packet.classList.remove('is-on');
    this.trail.classList.remove('is-on');
    this.paint();
    this.onStep(-1, false);
  }

  /** Jump to a step without autoplaying onward. */
  show(i: number): void {
    this.playing = false;
    this.go(i);
  }

  private go(i: number): void {
    const r = this.routed.get(this.order[i]);
    if (!r) {
      // A step with no drawable arrow (say, a part talking to itself): show its text, then move on.
      this.tl?.kill();
      this.index = i;
      this.paint();
      this.onStep(i, this.playing);
      if (this.playing) {
        this.tl = gsap.timeline().to({}, { duration: this.holds[i] ?? 2.5 }).add(() => {
          if (!this.playing) return;
          if (this.index < this.order.length - 1) this.go(this.index + 1);
          else { this.playing = false; this.onStep(this.index, false); }
        });
      }
      return;
    }
    this.tl?.kill();
    this.index = i;
    this.paint();
    this.onStep(i, this.playing);

    const len = r.path.getTotalLength();
    this.trail.setAttribute('d', r.path.getAttribute('d')!);
    this.trail.style.strokeDasharray = `${len} ${len}`;
    this.trail.classList.add('is-on');
    this.packet.classList.add('is-on');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prog = { t: reduce ? 1 : 0 };
    const place = () => {
      const pt = r.path.getPointAtLength(len * prog.t);
      this.packet.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      this.trail.style.strokeDashoffset = String(len * (1 - prog.t));
    };
    place();

    const tl = gsap.timeline();
    tl.to(prog, { t: 1, duration: reduce ? 0 : gsap.utils.clamp(0.6, 1.5, len / 300), ease: 'power2.inOut', onUpdate: place });
    tl.add(() => {
      const target = this.placed.get(r.spec.to)?.g;
      target?.classList.remove('is-arrived');
      void target?.getBoundingClientRect();
      target?.classList.add('is-arrived');
    });
    if (this.playing) {
      tl.to({}, { duration: this.holds[i] ?? 2.5 });
      tl.add(() => {
        if (!this.playing) return;
        if (this.index < this.order.length - 1) this.go(this.index + 1);
        else { this.playing = false; this.onStep(this.index, false); }
      });
    }
    this.tl = tl;
  }

  destroy(): void {
    this.sizer?.disconnect();
    this.tl?.kill();
    gsap.killTweensOf(this.vb);
  }
}
