# Shaurya Verma, portfolio

A rebuild of the interaction design of [minhpham.design](https://minhpham.design) with my own
content. Vite + TypeScript + GSAP + Lenis + Three.js, no framework.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + static build to dist/
```

## The idea

The page exists **twice**. `.layer__dark` is the real site; `.layer__red` is a complete
duplicate with alternate copy, sitting directly on top and revealed only through a circle that
follows the cursor. Move the pointer over a paragraph and the circle opens to read the other
version through it.

Everything else is a wipe rather than a fade: text is rendered twice, once dimmed and once
clipped to nothing, and the animation opens the clip.

| Effect | Where |
|---|---|
| Cursor-tracked red spotlight | [`src/modules/masker.ts`](src/modules/masker.ts) |
| Row hover band (skills, projects, contact) | [`heading-mask.ts`](src/modules/heading-mask.ts) + `masks.css` |
| Per-line paragraph wipe, char/line reveals | [`reveals.ts`](src/modules/reveals.ts) |
| Smooth scroll + element parallax | [`smooth-scroll.ts`](src/modules/smooth-scroll.ts) |
| Procedural backgrounds and the orb | [`webgl.ts`](src/modules/webgl.ts) |

## Editing content

All copy lives in [`src/data/`](src/data/) as plain data. Sections are generated from it at
**build time** and injected into `index.html`, so the shipped page is static HTML and the
animations are enhancement rather than a requirement.

Adding a project is one appended object in [`projects.mjs`](src/data/projects.mjs); the rows,
the orb parallax and the dots all count off that array.

### The one rule when editing copy

Both layers are generated from the same templates, so they always have the same *structure*.
Alignment also needs the same *shape*: a `red` field must wrap to the same number of lines as
the field it sits on top of. That is why the hero says "breaking" rather than "debugging", it
is the same eight characters as "shipping", so the two headlines land exactly on each other.

Run `npm run parity` after any copy change. It measures every corresponding block in both
layers and fails if anything drifts more than 2px or gets clipped:

```
layer height   dark 9742px   red 9742px   drift 0.0px
worst drift 0.0px · 0 block(s) over 2px · 0 clipped
```

The clipping half matters: two blocks cropped to the same wrong height measure as perfectly
aligned, which is exactly the bug that hid half of every paragraph during development.

## Tooling

| Command | Purpose |
|---|---|
| `npm run parity` | Layer alignment + clipping audit (the important one) |
| `npm run check` | Typecheck + parity |
| `npm run sections` | Screenshot every section to `/tmp/sec` for review |
| `npm run verify` | Shoot the local build and diff it against `reference/` |
| `npm run capture` | Re-record `reference/` from the original site |

`verify` and `capture` share one routine ([`shoot.mjs`](tools/shoot.mjs)) so both runs frame
identical shots, which is what makes the side-by-side contact sheet worth reading.

## Notes

- **Fonts.** The original sets ITC Avant Garde Gothic, which is licensed and not mine to
  redistribute. Jost has the same geometric, wide-round character at display sizes. Nunito Sans
  is what the original actually uses for body text and is freely available.
- **Imagery.** Every image slot is generated in a fragment shader: nothing to license, nothing
  to download, resolution-independent. Three.js is code-split and loads after the page is
  interactive.
- **Reduced motion.** `prefers-reduced-motion` disables the spotlight, the scrubs and the
  staggers, and reveals all masked text statically.
- **Touch.** There is no cursor to follow, so the spotlight is replaced by a hold-to-reveal
  ring button, as in the original.
- `reference/` is local measurement material, not shipped.

## Two sites, one deployment

This repository serves two independent apps from a single Vercel project.

| Route | App | Stack |
|---|---|---|
| `/` | the current portfolio | Vite, vanilla TypeScript, GSAP, Three.js |
| `/netflix` | the previous portfolio, archived | Vite, React 19, React Router 7, Tailwind 4 |

The archive lives in `netflix/` with its own `package.json` and lockfile. It is not a workspace and
nothing is hoisted, so the two apps cannot break each other's dependency tree.

### How the routing works

`npm run build` builds both and folds the archive into `dist/netflix/`, because Vercel serves one
directory. The archive is built with `base: '/netflix/'` so its asset URLs already expect to live
there, and `src/App.jsx` passes the same value to React Router as `basename` - `base` alone only
rewrites asset URLs, and without the matching `basename` the router matches nothing and renders a
blank page.

`vercel.json` then hands any unmatched path under `/netflix` to the archive's `index.html`, which is
what a client-side router needs. No exclusion is needed for `/netflix/assets`: Vercel serves static
files before it applies rewrites, so the real bundles win and only routes fall through. The current
site at `/` is a single static page and needs no fallback of its own, so an unknown top-level path
correctly 404s.

That explanation lives here rather than in `vercel.json` because it cannot live there. JSON has no
comments, and Vercel validates the file with `additionalProperties: false` - a `"//"` key used as a
comment fails the deploy with `rewrites[0] should NOT have additional property "//"`. Which is
exactly how this was found out.

`npm run check` validates `vercel.json` against Vercel's published schema, so that class of mistake
is caught before a push rather than by a failed build. It is not part of `npm run build`, because a
deploy should not depend on fetching a schema from a third party; offline it reports that it could not
check and passes.

### Running it

```
npm run dev              # both apps, / and /netflix
npm run build            # both, into dist/
npm run preview:deploy   # serve dist/ the way Vercel will
```

`npm run dev` serves the archive from its last build rather than compiling it, so run
`npm run build:netflix` once, and again only if you change something inside `netflix/`. Until you do,
`/netflix` says so instead of quietly showing the wrong site.

`npm run preview:deploy` exists because `vite preview` knows nothing about `vercel.json`: it would
404 every deep link into the archive, which is the part most worth checking. The preview server
applies the same rules in the same order Vercel does.
