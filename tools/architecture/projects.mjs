/**
 * Which projects feed the "how it works" popup, and how each is curated.
 *
 * The facts live in each project's own repo (ARCHITECTURE.portfolio.json and
 * ARCHITECTURE.deepdive.json, kept up to date in that repo). This file only decides what
 * the portfolio shows: which features, in which groups and order, and which parts to leave off the
 * diagrams. Run `npm run arch:sync` after either repo updates its files.
 */

export const PROJECTS = [
  {
    key: 'byos',
    repo: '../BYOS',
    name: 'BYOS',
    groups: [
      ['getting-in', 'Getting in', ['telegram-sign-up', 'login']],
      ['storage', 'Your storage', ['upload-to-your-storage', 'github-storage', 'storage-health']],
      ['drive', 'The drive', ['versions', 'folders', 'missing-files']],
      ['search', 'Search', ['search-operators']],
      ['sharing', 'Sharing', ['permanent-links', 'shared-folders']],
      ['indexing', 'Indexing', ['drive-indexing', 'vision-ocr']],
      ['bao', 'Bao answers', ['ask-bao', 'rag-addons', 'verified-citations', 'source-highlighting']],
      ['plans', 'Bao changes things', ['permission-modes', 'reviewable-plans', 'revise-plan', 'organize']],
      ['models', 'Any model', ['model-check']],
      ['dev', 'For developers', ['api-keys', 'webhooks']],
    ],
    // Parts that only exist for features we don't show.
    dropNodes: ['razorpay', 'admin-service'],
    // Where the repo's own doc lags its code. Each one checked against the source file named.
    patches: {
      nodes: {
        // apps/api/alembic/versions/0026_pgvector_search.py: CREATE EXTENSION vector, plus the
        // (user_id, embed_model) index; ranking is ORDER BY embedding::vector <=> query in semantic.py.
        postgres: { tech: ['PostgreSQL 16', 'pgvector', 'pg_trgm', 'pgcrypto', 'citext', 'Alembic', 'asyncpg'] },
      },
    },
  },
  {
    key: 'dom-heist',
    repo: '../VibeExtract',
    groups: [
      ['pick', 'Picking a thing', ['point-and-capture']],
      ['read', 'Reading the page', ['dom-walk', 'hover-pseudo-animation', 'shadow-svg-media', 'font-fidelity']],
      ['tricky', 'The tricky bits', ['hover-grab', 'menus-and-dropdowns', 'cross-origin-iframes', 'full-page-multi-frame', 'pixel-recovery']],
      ['out', 'Getting it out', ['export-and-preview']],
    ],
    dropNodes: ['test-harness', 'toon-cli'],
  },
];
