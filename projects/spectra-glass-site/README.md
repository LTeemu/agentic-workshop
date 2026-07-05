# spectra-glass-site

Landing page showcasing all 26 components of the [spectra-glass-ui](https://github.com/LTeemu/agentic-workshop/tree/main/projects/spectra-glass-ui) library — a Lit 3 Web Component library with glassmorphism aesthetics and semi-transparent spectral gradients.

## Features

- **Full component showcase** — buttons, badges, inputs, toggles, spinners, avatars, cards, dialog, dividers, textarea, checkbox, radio, select, tabs, progress, skeleton, breadcrumb, toast, tooltip, pagination, header, hero, section, footer, accordion, icons
- **Theme switcher** — toggle between Spectra Default (light) and Spectra Dark in the header; selection saved to `localStorage`
- **Interactive demos** — live accordion, dialog with portal/backdrop, toast notifications, select menus, tabs, breadcrumbs, pagination
- **Responsive layout** — single-page design with sticky header, feature cards grid, multi-column footer

## Development

```sh
npm install
npm run dev      # Vite dev server at localhost:4245
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview the production build
```

Port can be overridden with the `PORT` env var.

## Dependencies

- `spectra-glass-ui` — linked locally via `file:../spectra-glass-ui`. Rebuild the library (`npm run build` in `projects/spectra-glass-ui`) before running the site to pick up changes.
