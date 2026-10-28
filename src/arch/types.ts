/**
 * The shape every project's ARCHITECTURE.portfolio.json follows.
 *
 * Feature-first: each feature carries its own step-by-step walkthrough, and that is what the
 * popup draws. `nodes` is the shared vocabulary of parts those steps move between; `zones` and
 * `edges` describe the whole system, which is a secondary view.
 */

export type NodeKind =
  | 'actor' | 'ui' | 'service' | 'api' | 'worker' | 'queue' | 'database' | 'cache' | 'storage'
  | 'external' | 'extension' | 'browser-api' | 'other';

export interface Zone {
  id: string;
  label: string;
  description?: string;
}

export interface ArchNode {
  id: string;
  label: string;
  zone: string;
  kind: NodeKind;
  tech: string[];
  summary: string;
  details: string;
  keyFiles?: string[];
  interesting?: string | null;
  inferred?: boolean;
}

export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  protocol: string;
  mode: 'sync' | 'async' | 'stream' | 'event';
  payload?: string;
  details?: string;
  inferred?: boolean;
}

/** One hop of a feature walkthrough: something moves from one part to another. */
export interface FeatureStep {
  from: string;
  to: string;
  label: string;
  narration: string;
  mode?: ArchEdge['mode'];
}

/** A named procedure inside a feature, written out step by step for the curious. */
export interface Algorithm {
  name: string;
  summary?: string;
  steps: string[];
  complexity?: string;
}

/** The "how it actually works" write-up for a feature: the algorithm, not the brochure. */
export interface DeepDive {
  algorithm: string;
  idea: string;
  how: string[];
  example?: string | null;
  why?: string | null;
  cost?: string | null;
}

export interface Feature {
  id: string;
  name: string;
  summary: string;
  description: string;
  underTheHood: string;
  steps: FeatureStep[];
  algorithms?: Algorithm[];
  deep?: DeepDive;
  /** 1-based step number → what's clever about that hop. Only the non-obvious steps have one. */
  stepNotes?: Record<string, string>;
  /** Node id → what that part does in this feature specifically. */
  nodeNotes?: Record<string, string>;
  keyFiles?: string[];
  status?: 'shipped' | 'partial' | 'planned';
}

/** Sections the features are listed under, in order. */
export interface FeatureGroup {
  id: string;
  label: string;
  features: string[];
}

/** One phase of a pipeline, told inside a chapter; hovering it lights its parts on the map. */
export interface JourneyPhase {
  n: string;
  name: string;
  what: string;
  nodes?: string[];
}

/** A headline number. `{months}` in the label becomes the whole months since `since`. */
export interface JourneyStat {
  value: string;
  label: string;
  /** Refreshed from the site's own API when the popup opens; `value` is the fallback. */
  live?: 'github';
  since?: string;
}

/** A stretch of time in a job: what I did, and which parts of the map it touched. */
export interface Chapter {
  id: string;
  when?: string;
  title: string;
  role?: string;
  summary: string;
  points: string[];
  skills?: string[];
  /** Parts of the map this chapter is about; the camera frames them. */
  nodes: string[];
  /** Arrows the walkthrough follows, in order. */
  edges: string[];
  /** The camera follows each arrow up close as it plays, for chapters that span the whole map. */
  follow?: boolean;
  phases?: JourneyPhase[];
  phasesTitle?: string;
  phasesNote?: string;
}

/**
 * A job told as a story instead of a product tour: one map of everything, drawn once, and
 * chapters in the order they happened, each lighting up its corner of the map.
 */
export interface Journey {
  /** Node id → [row, column] on the map. Columns are in node widths; halves are fine. */
  grid: Record<string, [number, number]>;
  chapters: Chapter[];
  stats?: JourneyStat[];
}

export interface ArchDoc {
  project: string;
  journey?: Journey;
  /** What the popup calls itself, e.g. "what I built" for a job. Defaults to "how it works". */
  label?: string;
  tagline: string;
  summary: string;
  features: Feature[];
  groups?: FeatureGroup[];
  nodes: ArchNode[];
  zones?: Zone[];
  edges?: ArchEdge[];
}
