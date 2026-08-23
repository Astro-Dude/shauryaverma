/**
 * Serve the archived portfolio under /netflix on the dev server.
 *
 * Without this, `npm run dev` answers /netflix with the CURRENT site: Vite's SPA fallback hands any
 * unmatched path to the root index.html, so the archive appears to have been overwritten when in fact
 * the dev server has simply never heard of it. That is a confusing way to find out, and it is the
 * kind of thing you only discover by visiting the URL you were least worried about.
 *
 * The archive is a separate Vite app with its own build, so there is nothing to compile here: this
 * serves `netflix/dist` if it has been built, and says so plainly if it has not. Same two rules as
 * production - real file first, then fall back to the SPA's index.html - so what you see in dev is
 * what Vercel will serve.
 */
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const DIST = 'netflix/dist';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const MISSING = `<!doctype html><meta charset="utf-8"><title>Archive not built</title>
<style>body{background:#0d0d0d;color:#b7ab98;font:15px/1.6 ui-sans-serif,system-ui,sans-serif;
display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}
code{color:#eb5939;font-size:14px}div{max-width:34rem;padding:2rem}</style>
<div><p>The archived portfolio has not been built yet, so there is nothing to serve at
<code>/netflix</code>.</p><p>Build it once with</p><p><code>npm run build:netflix</code></p>
<p style="opacity:.6">It is a separate app with its own build, so this only needs redoing when you
change something inside <code>netflix/</code>.</p></div>`;

/** Resolve a request path inside DIST, refusing anything that climbs out of it. */
async function find(rel) {
  const base = resolve(DIST);
  const full = resolve(base, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (full !== base && !full.startsWith(base + sep)) return null;
  try {
    const s = await stat(full);
    if (s.isDirectory()) return find(join(rel, 'index.html'));
    return full;
  } catch {
    return null;
  }
}

export function archiveInDev() {
  return {
    name: 'archive-in-dev',
    /* Dev only. In a real build the archive is staged into dist/netflix by tools/stage-netflix.mjs. */
    apply: 'serve',

    configureServer(server) {
      /*
       * Registered inside configureServer rather than in the returned post-hook, so it runs BEFORE
       * Vite's own middlewares. The SPA fallback is one of those, and it would otherwise answer first.
       */
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path !== '/netflix' && !path.startsWith('/netflix/')) return next();

        try {
          await stat(DIST);
        } catch {
          res.statusCode = 503;
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end(MISSING);
          return;
        }

        const rel = path.replace(/^\/netflix\/?/, '');
        /* Real file first, then the SPA's entry, which is the order Vercel applies. */
        const file = (rel && (await find(rel))) || (await find('index.html'));
        if (!file) return next();

        const body = await readFile(file);
        res.statusCode = 200;
        res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
        res.setHeader('accept-ranges', 'bytes');

        /* Ranges, because <audio> uses them and the archive plays four mp3s. */
        const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
        if (m) {
          const start = m[1] ? Number(m[1]) : 0;
          const end = m[2] ? Number(m[2]) : body.length - 1;
          res.statusCode = 206;
          res.setHeader('content-range', `bytes ${start}-${end}/${body.length}`);
          res.end(body.subarray(start, end + 1));
          return;
        }

        res.end(body);
      });
    },
  };
}
