# spectra-glass-ui

A Lit 3 Web Component library with glassmorphism aesthetics and semi-transparent spectral gradients. 30+ production-ready components with Storybook, Vitest browser tests, and a live theme builder.

## Quick start

```sh
npm install spectra-glass-ui lit
```

```html
<link rel="stylesheet" href="node_modules/spectra-glass-ui/themes/sg-theme-spectra-default.css" />
<script type="module">
  import 'spectra-glass-ui';
</script>

<sg-button variant="primary">Hello</sg-button>
```

## Components

### Tier 0 — Core (14)

| Component    | Description                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `sg-button`  | Variants: primary, secondary, ghost; sizes: sm, md, lg; `border` (gradient edge), `pill` (fully rounded) |
| `sg-card`    | Elevated, outlined, ghost; optional accent and selected state                                            |
| `sg-badge`   | Pill labels — default, success, warning, error, info, spectral                                           |
| `sg-input`   | Text input — outlined, ghost; label, error, clearable                                                    |
| `sg-toggle`  | Switch toggle with label                                                                                 |
| `sg-spinner` | Sizes: sm, md, lg; spectral (conic-gradient ring), glass variants                                        |
| `sg-divider` | Horizontal rule — solid, glass, gradient variants                                                        |
| `sg-avatar`  | Circular image with initials fallback and status dot                                                     |
| `sg-icon`    | Feather-style SVG icon wrapper with 30+ built-in icons                                                   |
| `sg-dialog`  | Portal-based modal with backdrop blur, focus trap, accent gradient border, header/body/footer slots      |
| `sg-section` | Layout container — padding, max-width, glass, accent edges                                               |
| `sg-hero`    | Hero section with heading, subtitle, CTAs, media                                                         |
| `sg-header`  | Sticky nav bar with responsive mobile drawer                                                             |
| `sg-footer`  | Multi-column footer (1–4 columns), social links, copyright                                               |

### Tier 1 — Form Suite (5)

| Component                     | Description                                                      |
| ----------------------------- | ---------------------------------------------------------------- |
| `sg-textarea`                 | Multi-line text input — outlined, ghost; auto-resize             |
| `sg-checkbox`                 | Glass-styled checkbox with spectral checked state                |
| `sg-radio` / `sg-radio-group` | Glass radio button with managed group state                      |
| `sg-select`                   | Custom dropdown select with portal dropdown, keyboard navigation |

### Tier 2 — Common UI Patterns (7)

| Component                         | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `sg-tabs`                         | Tabbed container — underline, pills, glass variants            |
| `sg-tooltip`                      | Hover/focus tooltip with portal popup, arrow, auto-positioning |
| `sg-toast` / `sg-toast-container` | Toast notification with stacking container, dismiss animation  |
| `sg-skeleton`                     | Loading placeholder — text, circle, rect, card variants        |
| `sg-progress`                     | Progress bar — default, spectral; indeterminate animation      |
| `sg-breadcrumb`                   | Navigation breadcrumbs with separator                          |
| `sg-pagination`                   | Page navigation with ellipsis and sibling logic                |

### Legacy

| Component      | Description                |
| -------------- | -------------------------- |
| `sg-accordion` | Expand/collapse FAQ panels |

## Themes

Two ready-to-use CSS themes ship with the library:

| Theme               | File                           | Description                                 |
| ------------------- | ------------------------------ | ------------------------------------------- |
| **Spectra Default** | `sg-theme-spectra-default.css` | Light glass with bright spectral gradients  |
| **Spectra Dark**    | `sg-theme-spectra-dark.css`    | Dark variant with muted jewel-tone spectral |

Import in your CSS:

```css
@import 'spectra-glass-ui/themes/sg-theme-spectra-default.css';
```

All CSS custom properties can be overridden on `:root`:

```css
:root {
  --sg-gradient-spectral: linear-gradient(
    135deg,
    rgba(212, 134, 159, 0.5),
    rgba(196, 160, 80, 0.5),
    rgba(127, 168, 141, 0.5),
    rgba(109, 115, 178, 0.5)
  );
  --sg-glass-bg: rgba(255, 255, 255, 0.08);
  --sg-glass-blur: blur(20px);
}
```

### Theme Builder

A full WYSIWYG theme editor at `sg-theme-builder` — tweak every CSS variable in real time with a live preview gallery. Useful for prototyping custom themes.

## Development

```sh
npm install
npm run dev        # Storybook at localhost:4812
npm run test       # Vitest browser tests (Playwright)
npm run test:watch # Watch mode
npm run build      # Production build + custom-elements.json
```

### Project structure

```
src/
  components/    → 30+ Lit components (ts + stories + tests)
  styles/        → Shared style tokens
  themes/        → CSS theme files + theme builder
  index.ts       → Public API exports
dist/            → Built output (js + css + types)
scripts/         → Build helpers (copy-assets.mjs)
```

### Testing

26 component test files run via Vitest + `@vitest/browser` with Playwright. Tests cover rendering, accessibility attributes, variant/property toggling, and interaction.

```sh
npm run test
```

### Storybook

27 story files provide interactive playgrounds for every component at `localhost:4812`.

## License

MIT
