# cutframe

A static site styled as **The Daily Cut** — a digital newspaper for a faux editing &
motion studio. Newsprint paper, ink rules, serif mastheads, orange and pink ink-pots,
and flat SVG "photographs" in the spirit of a hand-printed comic.

## Run

Select **cutframe** in the dashboard, or serve the folder statically:

```bash
npx serve --single .
```

The site is fully client-side — no build step, no dependencies. Views are **path-routed**
via the History API, so any deep link must be served by `index.html` — the workshop
dashboard's static server does this automatically, and for standalone servers use the
SPA-fallback flag (as in `npx serve --single`).

## Pages

| Path            | Page                                       |
| --------------- | ------------------------------------------ |
| `/`             | Front page — masthead, lead story, sidebar |
| `/work`         | The Index — all stories                    |
| `/about`        | About the house                            |
| `/contact`      | Classifieds                                |
| `/night-drive`  | Article — Night Drive (film)               |
| `/pulse-noise`  | Article — Pulse / Noise (music video)      |
| `/the-meridian` | Article — Meridian (brand film)            |
| `/static-bloom` | Article — Static Bloom (short)             |
| `/chorus-line`  | Article — Chorus Line (music video)        |
| `/last-print`   | Article — Last Print (short)               |
| `/reel-to-reel` | Article — Reel to Reel (brand film)        |
| `/the-courier`  | Article — The Courier (short)              |
| `/tide-line`    | Article — Tide Line (film)                 |

## Transitions

Clicking a story flies you **into the photograph**: the card artwork on the front page
morphs into the article's hero image (View Transitions API shared element), and heading
back flies you out of it again.

Three styles, cycled with the `T` key or the mode button (top-right on desktop,
under the date line on mobile):

| Mode     | Effect                                               |
| -------- | ---------------------------------------------------- |
| `blinds` | Shutter: three vertical strips shut across (default) |
| `wipe`   | Directional slide — follows your navigation flow     |
| `drop`   | Old view drops back, new view drops in from below    |

- Uses the **View Transitions API** where available, with a fallback shutter-curtain
  (Firefox) and instant swaps under `prefers-reduced-motion`.
- The chosen style persists in `localStorage`.
- The article artwork lives once in a hidden SVG `<symbol>` library and is reused on
  cards and heroes, so the shared-element morph is seamless.
- Views remain readable without JavaScript.

## Test

```bash
npm test
```
