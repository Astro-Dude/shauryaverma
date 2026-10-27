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

export interface Feature {
  id: string;
  name: string;
  summary: string;
  description: string;
  underTheHood: string;
  steps: FeatureStep[];
  keyFiles?: string[];
  status?: 'shipped' | 'partial' | 'planned';
}

export interface ArchDoc {
  project: string;
  tagline: string;
  summary: string;
  features: Feature[];
  nodes: ArchNode[];
  zones?: Zone[];
  edges?: ArchEdge[];
}
