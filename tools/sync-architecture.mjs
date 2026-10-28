/**
 * Rebuild src/data/architecture/<key>.json from each project's own repo.
 *
 *   npm run arch:sync            rebuild every project
 *   npm run arch:sync -- --init  also (re)record the current popup copy as the override baseline
 *   npm run arch:sync -- --force write even if features the popup shows have vanished upstream
 *   npm run arch:sync -- --worktree  read uncommitted repo files instead of the committed ones
 *
 * By default each repo's files are read from git HEAD, i.e. what that project has committed. An
 * uncommitted edit (a half-finished session, or an old copy pasted over the file) is reported and
 * ignored, so it can't quietly roll the popup back. Files that were never committed are read from
 * disk, with a warning.
 *
 * Three inputs per project:
 *   1. <repo>/ARCHITECTURE.portfolio.json  the facts: features, steps, parts, wiring
 *   2. <repo>/ARCHITECTURE.deepdive.json   the algorithm write-ups and per-step / per-part notes
 *   3. tools/architecture/copy/<key>.json  the popup's casual rewrites of the visitor-facing text
 *
 * The rewrites are overrides, and each remembers a hash of the source text it was written from.
 * When the repo changes that text (a fact changed), the override is dropped and the repo's own
 * wording shows instead, so the popup can be informal but never out of date. Those fields are
 * listed at the end as "needs a fresh rewrite".
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECTS } from './architecture/projects.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = (key) => resolve(ROOT, 'src/data/architecture', `${key}.json`);
const COPY = (key) => resolve(ROOT, 'tools/architecture/copy', `${key}.json`);
const init = process.argv.includes('--init');
const worktree = process.argv.includes('--worktree');

/** Read a repo file as committed (default), falling back to disk for never-committed files. */
function readRepoJson(repo, name) {
  const disk = resolve(repo, name);
  let committed = null;
  try {
    committed = execFileSync('git', ['-C', repo, 'show', `HEAD:${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch { /* not tracked, or not a git repo */ }
  const onDisk = existsSync(disk) ? readFileSync(disk, 'utf8') : null;
  if (committed !== null && !worktree) {
    if (onDisk !== null && onDisk !== committed) {
      console.warn(`  ! ${name} in ${repo} has uncommitted changes; using the committed version (pass --worktree to use the file on disk)`);
    }
    return JSON.parse(committed);
  }
  if (onDisk === null) return null;
  if (committed === null) console.warn(`  ! ${name} in ${repo} isn't committed; reading it from disk`);
  return JSON.parse(onDisk);
}

const hash = (s) => createHash('sha1').update(String(s ?? '')).digest('hex').slice(0, 12);
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Every visitor-facing text field we rewrite, as [path, getter, setter] over a doc. */
function* textFields(doc) {
  const field = (path, obj, key) => [path, () => obj[key], (v) => { obj[key] = v; }];
  yield field('tagline', doc, 'tagline');
  yield field('summary', doc, 'summary');
  for (const f of doc.features) {
    for (const k of ['name', 'summary', 'description', 'underTheHood']) yield field(`features.${f.id}.${k}`, f, k);
    for (const [i, s] of f.steps.entries()) {
      yield field(`features.${f.id}.steps.${i}.label`, s, 'label');
      yield field(`features.${f.id}.steps.${i}.narration`, s, 'narration');
    }
  }
  // The deep dive is visitor-facing too, so corrections to it are kept the same way.
  for (const f of doc.features) {
    if (f.deep) {
      for (const k of ['algorithm', 'idea', 'example', 'why', 'cost']) yield field(`features.${f.id}.deep.${k}`, f.deep, k);
      for (const i of (f.deep.how ?? []).keys()) yield field(`features.${f.id}.deep.how.${i}`, f.deep.how, i);
    }
    for (const k of Object.keys(f.stepNotes ?? {})) yield field(`features.${f.id}.stepNotes.${k}`, f.stepNotes, k);
    for (const k of Object.keys(f.nodeNotes ?? {})) yield field(`features.${f.id}.nodeNotes.${k}`, f.nodeNotes, k);
  }
  for (const n of doc.nodes) for (const k of ['summary', 'details', 'interesting']) yield field(`nodes.${n.id}.${k}`, n, k);
  for (const z of doc.zones ?? []) yield field(`zones.${z.id}.description`, z, 'description');
  for (const e of doc.edges ?? []) yield field(`edges.${e.id}.details`, e, 'details');
}

/** Curate a source doc down to what the popup shows. Returns the doc plus anything worth flagging. */
function curate(src, project) {
  const notes = [];
  const byId = new Map(src.features.map((f) => [f.id, f]));
  const wanted = project.groups.flatMap(([, , ids]) => ids);
  for (const id of wanted) if (!byId.has(id)) notes.push(`feature "${id}" is in the curation but no longer in the repo`);
  const unlisted = src.features.map((f) => f.id).filter((id) => !wanted.includes(id));
  if (unlisted.length) notes.push(`${unlisted.length} repo features aren't shown (add them to tools/architecture/projects.mjs if wanted)`);

  const doc = structuredClone(src);
  if (project.name) doc.project = project.name;
  doc.features = wanted.filter((id) => byId.has(id)).map((id) => structuredClone(byId.get(id)));
  doc.groups = project.groups.map(([id, label, ids]) => ({ id, label, features: ids.filter((x) => byId.has(x)) }));
  const drop = new Set(project.dropNodes ?? []);
  doc.nodes = doc.nodes.filter((n) => !drop.has(n.id));
  const ids = new Set(doc.nodes.map((n) => n.id));
  doc.edges = (doc.edges ?? []).filter((e) => ids.has(e.from) && ids.has(e.to));
  doc.zones = (doc.zones ?? []).filter((z) => doc.nodes.some((n) => n.zone === z.id));
  // Code-verified corrections for things the repo's doc hasn't caught up with yet.
  for (const [kind, byKey] of Object.entries(project.patches ?? {})) {
    const list = doc[kind] ?? [];
    for (const [id, fields] of Object.entries(byKey)) {
      const item = list.find((x) => x.id === id);
      if (item) Object.assign(item, structuredClone(fields));
      else notes.push(`patch for ${kind}.${id} has nothing to apply to`);
    }
  }
  for (const f of doc.features) for (const s of f.steps) {
    for (const end of [s.from, s.to]) if (!ids.has(end)) notes.push(`feature "${f.id}" step uses missing part "${end}"`);
  }
  return { doc, notes };
}

function attachDeepDive(doc, dd) {
  for (const f of doc.features) {
    delete f.deep; delete f.stepNotes; delete f.nodeNotes;
    if (dd?.features?.[f.id]) f.deep = dd.features[f.id];
    if (dd?.steps?.[f.id]) f.stepNotes = dd.steps[f.id];
    if (dd?.nodes?.[f.id]) f.nodeNotes = dd.nodes[f.id];
  }
}

for (const project of PROJECTS) {
  const repo = resolve(ROOT, project.repo);
  const srcPath = resolve(repo, 'ARCHITECTURE.portfolio.json');
  const src = readRepoJson(repo, 'ARCHITECTURE.portfolio.json');
  if (!src) { console.warn(`! ${project.key}: ${srcPath} not found, skipped`); continue; }
  const dd = readRepoJson(repo, 'ARCHITECTURE.deepdive.json');

  const { doc, notes } = curate(src, project);
  // A feature the popup shows has vanished upstream. That usually means the repo's file was
  // regenerated in an older or different shape, not that the feature was deleted, so refuse to
  // overwrite good popup data with it. Fix the repo file (or the curation) and sync again.
  const vanished = notes.filter((n) => n.includes('no longer in the repo'));
  if (vanished.length && !process.argv.includes('--force')) {
    console.warn(`! ${project.key}: not updated. ${vanished.length} shown feature(s) are missing from ${srcPath}:`);
    for (const n of vanished) console.warn(`    ${n}`);
    console.warn('    Restore the repo file or edit tools/architecture/projects.mjs, then run again (or pass --force).');
    continue;
  }
  attachDeepDive(doc, dd);
  const sourceText = new Map([...textFields(doc)].map(([path, get]) => [path, get()]));

  if (init) {
    // Record what the popup shows today as the copy baseline, pinned to today's source text.
    const current = read(OUT(project.key));
    const overrides = {};
    for (const [path, get] of textFields(current)) {
      const v = get(), s = sourceText.get(path);
      if (v != null && s !== undefined && v !== s) overrides[path] = { text: v, src: hash(s) };
    }
    writeFileSync(COPY(project.key), JSON.stringify(overrides, null, 2) + '\n');
    console.log(`  ${project.key}: recorded ${Object.keys(overrides).length} copy overrides`);
  }

  const overrides = existsSync(COPY(project.key)) ? read(COPY(project.key)) : {};
  const stale = [];
  let applied = 0;
  for (const [path, , set] of textFields(doc)) {
    const o = overrides[path];
    if (!o) continue;
    if (o.src === hash(sourceText.get(path))) { set(o.text); applied++; } else stale.push(path);
  }
  writeFileSync(OUT(project.key), JSON.stringify(doc, null, 2) + '\n');

  console.log(`✓ ${project.key}: ${doc.features.length} features, ${doc.nodes.length} parts, ${applied} rewrites applied${dd ? ', deep dive attached' : ', no deep dive file'}`);
  for (const n of notes) console.log(`    note: ${n}`);
  if (stale.length) {
    console.log(`    ${stale.length} field(s) changed in the repo since they were rewritten; showing the repo's text until rewritten:`);
    for (const p of stale.slice(0, 30)) console.log(`      - ${p}`);
    if (stale.length > 30) console.log(`      … and ${stale.length - 30} more`);
  }
}
