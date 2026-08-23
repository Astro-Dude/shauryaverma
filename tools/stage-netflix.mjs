/**
 * Fold the archived portfolio's build into this one's output.
 *
 * Vercel serves a single directory, so the two apps have to become one tree: the current site at
 * `dist/` and the archive at `dist/netflix/`. The archive is built with `base: '/netflix/'`, so its
 * asset URLs already expect to live there and nothing has to be rewritten on the way in.
 *
 * Run after both builds, by `npm run build:netflix`.
 */
import { cp, rm, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const FROM = 'netflix/dist';
const INTO = 'dist/netflix';

try {
  await access(FROM);
} catch {
  console.error(`stage-netflix: ${FROM} does not exist. Did "npm --prefix netflix run build" run?`);
  process.exit(1);
}

/* Cleared first, so a rename or a removal upstream cannot leave a stale file behind. */
await rm(INTO, { recursive: true, force: true });
await cp(FROM, INTO, { recursive: true });

const top = await readdir(INTO);
console.log(`stage-netflix: ${FROM} -> ${INTO}  (${top.length} entries: ${top.join(', ')})`);
