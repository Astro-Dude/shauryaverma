import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  /*
   * This app is no longer the site root. It is served under /netflix/ alongside the current
   * portfolio, so every emitted asset URL has to carry that prefix.
   *
   * Setting it here covers the bundler's own output and index.html, and it is also what
   * `import.meta.env.BASE_URL` resolves to, which is how src/App.jsx feeds the same value to
   * React Router. One place to change if the route ever moves.
   */
  base: '/netflix/',
  plugins: [react(), tailwindcss()],
})
