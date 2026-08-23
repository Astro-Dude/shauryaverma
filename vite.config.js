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

export default defineConfig({
  plugins: [renderPage(), archiveInDev()],
  server: { port: 5173 },
  build: { target: 'es2020', assetsInlineLimit: 2048 },
});
