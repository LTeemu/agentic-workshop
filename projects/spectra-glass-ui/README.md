# spectra-glass-ui

A Lit 3 Web Component library with glassmorphism aesthetics and semi-transparent spectral gradients.

## Components

| Component                         | Description                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `sg-accordion`                    | Expand/collapse FAQ panels                                                                                              |
| `sg-avatar`                       | Circular image with initials fallback and status dot                                                                    |
| `sg-badge`                        | Pill labels — default, success, warning, error, info, spectral                                                          |
| `sg-breadcrumb`                   | Navigation breadcrumbs with separator                                                                                   |
| `sg-button`                       | Variants: primary (dim spectral), secondary, ghost; sizes: sm, md, lg; `border` (gradient edge), `pill` (fully rounded) |
| `sg-card`                         | Elevated, outlined, ghost; optional accent and selected state                                                           |
| `sg-checkbox`                     | Glass-styled checkbox with spectral checked state                                                                       |
| `sg-dialog`                       | Portal-based modal with backdrop blur, focus trap, accent gradient border, header/body/footer slots                     |
| `sg-divider`                      | Horizontal rule — solid, glass, gradient variants                                                                       |
| `sg-footer`                       | Multi-column footer (1–4 columns), social links, copyright                                                              |
| `sg-header`                       | Sticky nav bar with responsive mobile drawer                                                                            |
| `sg-hero`                         | Hero section with heading, subtitle, CTAs, media                                                                        |
| `sg-icon`                         | Feather-style SVG icon wrapper with 30+ built-in icons                                                                  |
| `sg-input`                        | Text input — outlined, ghost; label, error, clearable                                                                   |
| `sg-pagination`                   | Page navigation with ellipsis and sibling logic                                                                         |
| `sg-progress`                     | Progress bar — default, spectral; indeterminate animation                                                               |
| `sg-radio` / `sg-radio-group`     | Glass radio button with managed group state                                                                             |
| `sg-section`                      | Layout container — padding, max-width, glass, accent edges                                                              |
| `sg-select`                       | Custom dropdown select with portal dropdown, keyboard navigation                                                        |
| `sg-skeleton`                     | Loading placeholder — text, circle, rect, card variants                                                                 |
| `sg-spinner`                      | Sizes: sm, md, lg; spectral (conic-gradient ring), glass variants                                                       |
| `sg-tabs`                         | Tabbed container — underline, pills, glass variants                                                                     |
| `sg-textarea`                     | Multi-line text input — outlined, ghost; auto-resize                                                                    |
| `sg-toast` / `sg-toast-container` | Toast notification with stacking container, dismiss animation                                                           |
| `sg-toggle`                       | Switch toggle with label                                                                                                |
| `sg-tooltip`                      | Hover/focus tooltip with portal popup, arrow, auto-positioning                                                          |

## Quick start

```sh
npm install spectra-glass-ui lit
```

```html
<link rel="stylesheet" href="node_modules/spectra-glass-ui/themes/glass.css" />
<script type="module">
  import 'spectra-glass-ui';
</script>

<sg-button variant="primary">Hello</sg-button>
```

## Development

```sh
npm install
npm run dev      # Storybook at localhost:4812
npm run test     # Vitest browser tests
npm run build    # Production build
```

## Theme

All components expose CSS custom properties — override any value on `:root`:

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

## License

MIT
