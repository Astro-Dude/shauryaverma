import { defineConfig } from 'vite';
import { archiveInDev } from './tools/archive-dev-plugin.mjs';

/**
 * The page's repeating sections are generated from src/data/* at build time and injected into
 * index.html, so the shipped file is static, complete HTML: the motion layer enhances real
 * markup rather than producing it.
 *
 * Both the dark and red layers come out of the same templates, which is what guarantees they
 * occupy identical geometry. The cursor-tracking mask reveal depends on that.
 */
function renderPage() {
  const entry = '/src/templates/page.mjs';
  const entryUrl = new URL('./src/templates/page.mjs', import.meta.url).href;

  /** @type {import('vite').ViteDevServer | null} */
  let server = null;

  return {
    name: 'render-page',

    configureServer(devServer) {
      server = devServer;
    },

    async transformIndexHtml(html) {
      /*
       * In dev, load through Vite's SSR module runner rather than a plain dynamic import.
       * A bare `import()` caches transitively: appending `?t=<now>` reloads page.mjs but its
       * imports (sections.mjs, the data modules) come straight from Node's module cache, so
       * edits to the copy silently do nothing until the server restarts. ssrLoadModule walks
       * Vite's module graph and invalidates dependents properly.
       */
      const mod = server
        ? await server.ssrLoadModule(entry)
        : await import(entryUrl);

      return html
        .replace('<!--@head-->', mod.renderHead())
        .replace('<!--@body-->', mod.renderBody());
    },

    // The generated markup is not in the browser's module graph, so nothing would otherwise
    // tell the page to reload when the copy changes.
    configResolved() {},

    handleHotUpdate({ file, server: devServer }) {
      if (/src\/(data|templates)\//.test(file)) {
        devServer.ws.send({ type: 'full-reload' });
        return [];
      }
      return undefined;
    },
  };
}

/**
 * Vite doesn't run Vercel functions, so in dev /api/github is answered by the same module.
 * It uses GITHUB_TOKEN if set, else the token of whoever is signed in to the gh CLI.
 */
function apiInDev() {
  return {
    name: 'api-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/github', async (_req, res) => {
        try {
          const { getStats } = await server.ssrLoadModule('/api/github.js');
          let token = process.env.GITHUB_TOKEN;
          if (!token) {
            const { execFileSync } = await import('node:child_process');
            token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
          }
          const stats = await getStats(token);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(stats));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err?.message ?? err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [renderPage(), archiveInDev(), apiInDev()],
  server: { port: 5173 },
  build: { target: 'es2020', assetsInlineLimit: 2048 },
});
