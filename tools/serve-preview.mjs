/**
 * Serve `dist/` the way Vercel will, so the two-app deploy can be validated before it is pushed.
 *
 *   node tools/serve-preview.mjs [port]
 *
 * `vite preview` is not enough here: it knows nothing about vercel.json, so every deep link into the
 * archived SPA would 404 and the thing most worth checking would go unchecked. This applies the same
 * two rules in the same order Vercel does - real file first, rewrite second - so what passes here is
 * what ships.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = 'dist';
const PORT = Number(process.argv[2] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const resolve = async (p) => {
  /* Refuse to climb out of dist/, however the request is spelled. */
  const safe = normalize(p).replace(/^(\.\.[/\\])+/, '');
  const full = join(ROOT, safe);
  try {
    const s = await stat(full);
    if (s.isDirectory()) return resolve(join(safe, 'index.html'));
    return full;
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);

  /* 1. filesystem, exactly as Vercel does it. */
  let file = await resolve(url === '/' ? '/index.html' : url);

  /* 2. then the rewrites from vercel.json. */
  let rewritten = false;
  if (!file && (url === '/netflix' || url.startsWith('/netflix/'))) {
    file = await resolve('/netflix/index.html');
    rewritten = true;
  }

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
    console.log(`404      ${url}`);
    return;
  }

  const body = await readFile(file);
  const type = TYPES[extname(file)] ?? 'application/octet-stream';

  /*
   * Range requests, because <audio> and <video> use them and a 200-with-everything makes the browser
   * abandon the request. The archive plays four mp3s, and without this they showed up as failed
   * loads here while working perfectly on Vercel - a false alarm from the test rig, which is worse
   * than no test rig.
   */
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Number(m[2]) : body.length - 1;
      res.writeHead(206, {
        'content-type': type,
        'accept-ranges': 'bytes',
        'content-range': `bytes ${start}-${end}/${body.length}`,
        'content-length': end - start + 1,
      });
      res.end(body.subarray(start, end + 1));
      return;
    }
  }

  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes' });
  res.end(body);
  if (extname(file) === '.html') console.log(`200${rewritten ? ' (rw)' : '     '} ${url} -> ${file}`);
}).listen(PORT, () => {
  console.log(`preview on http://localhost:${PORT}`);
  console.log(`  /          the current portfolio`);
  console.log(`  /netflix   the archive`);
});
