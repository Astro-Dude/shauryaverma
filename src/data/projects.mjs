/**
 * Projects, rendered as `heading-mask` rows: the name sits in the dark layer, and hovering
 * opens a red band from the centre line outward to reveal the description.
 *
 * `desc` shows in the band. `redDesc` is the alternate-layer copy for the same row.
 * Adding a project is one appended object — the rows, the WebGL orb parallax and the dots
 * pagination all count off this array.
 */

/**
 * @typedef {object} Project
 * @property {string} name    Display name, set in the big display face.
 * @property {string} desc    One line, revealed by the hover band.
 * @property {string} redDesc Alternate-layer line.
 * @property {string} stack   Technologies, shown small alongside the date.
 * @property {string} date    Human-readable month/year.
 * @property {string} [repo]  Source URL.
 * @property {string} [live]  Deployed URL.
 */

/** @type {Project[]} */
export const projects = [
  {
    name: 'BYOS',
    desc:
      'A full cloud drive whose files live in your own Telegram account, so the database holds ' +
      'only metadata. Permanent links you can repoint forever, and a BYOK AI agent that ' +
      'plans changes instead of making them.',
    redDesc: 'I built a cloud drive that stores your files in Telegram. On purpose.',
    stack: 'Next.js 15, FastAPI, PostgreSQL, Telethon',
    date: 'Aug. 2026',
    repo: 'https://github.com/Astro-Dude/BYOS',
    live: 'https://byos-web.onrender.com/',
  },
  {
    name: 'DOM Heist',
    desc:
      'A Chrome extension that lifts any UI component off any page, Shadow DOM, iframes and ' +
      'hover states included, and exports it as standalone, pixel-perfect markup.',
    redDesc: 'I built a tool that steals UI components. This portfolio is the live demo.',
    stack: 'JavaScript, Chrome Extensions',
    date: 'Nov. 2025',
    repo: 'https://github.com/Astro-Dude/VibeExtract',
  },
  {
    name: 'Waves',
    desc:
      'An anonymous chat app on a hybrid P2P + WebSocket architecture, built to keep working ' +
      'when the connection doesn’t.',
    redDesc: 'A chat app for bad internet, stress-tested on hostel Wi-Fi.',
    stack: 'MERN, Socket.io, WebRTC',
    date: 'May 2025',
    repo: 'https://github.com/Astro-Dude',
    live: 'https://waves-c53a.onrender.com/',
  },
  {
    name: 'Vector',
    desc:
      'A full-stack ed-tech platform with CBT assessments and an AI interviewer that ' +
      'remembers what you said and grades you on it.',
    redDesc: 'I built an AI that interviews people, because the real ones weren’t calling back.',
    stack: 'MERN + TS, Supabase',
    date: 'Mar. 2025',
    repo: 'https://github.com/Astro-Dude',
    live: 'https://vector-ewgs.onrender.com/',
  },
  {
    name: 'Portfolio',
    desc:
      'This page. A ground-up build on GSAP, Lenis and Three.js: two complete copies of it, one ' +
      'revealed through a mask that follows your cursor.',
    redDesc: 'See project two. The name was not subtle.',
    stack: 'Vite, TypeScript, GSAP, Three.js',
    date: 'Aug. 2026',
  },
];
