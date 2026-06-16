# Vibify Vinyl Store

> AI-generated code. Built entirely by agentic LLM tooling as a micro-frontend demo.

A micro-frontend vinyl record store demo built with Module Federation. Three independently-deployed micro-frontends (Vue, Svelte, React) are composed into a single shell app.

## Architecture

```
http://localhost:4007  ─┐ shell        (React/19)    — tabbed layout, mounts MFs
http://localhost:40071 ─├ mf-catalog   (Vue/3)       — album grid, filter by genre, add to cart
http://localhost:40072 ─├ mf-player    (Svelte/5)    — disc carousel, playback, add to cart
http://localhost:40073 ─├ mf-checkout  (React/19)    — cart items, quantity, fake purchase + confetti
```

Each MF runs its own Vite dev server and exposes a `remoteEntry.js` consumed by the shell via `@originjs/vite-plugin-federation`.

## Features

- **Album catalog** — browse vinyl by genre, see cover art and pricing
- **Disc player** — spinning disc carousel with play/pause, track navigation, per-disc glow colors
- **Shopping cart** — add/remove items from catalog or player, adjust quantity (0–99), shared global state
- **Fake checkout** — pre-filled locked form, confetti blast on purchase

## Getting Started

```bash
# Install dependencies (workspaces)
npm install

# Start development
npm run dev
```

The shell runs on `http://localhost:4007`. A dashboard at `http://localhost:3000` can also proxy to it (run from the workspace root).

### How the dev script works

1. Build all three remotes (`mf-catalog`, `mf-player`, `mf-checkout`)
2. Preview each remote on its assigned port (`40071`, `40072`, `40073`)
3. Wait for all `remoteEntry.js` files to become available
4. Start the shell in dev mode on port `4007`

Remotes must be built (not dev-served) because `@originjs/vite-plugin-federation` generates `remoteEntry.js` at build time.

## Project Structure

```
shared/                  — code shared across all MFs
  albums/*/              — per-album metadata, tracks, cover art
  bus.js                 — cross-MF event bus (window.__vibify_bus)
  cart.js                — global-backed cart state
  confetti.js            — canvas confetti blast (no deps)
  data.js                — album data loader (import.meta.glob)
shell/                   — host application (React)
mf-catalog/              — album catalog MF (Vue)
mf-player/               — disc player MF (Svelte)
mf-checkout/             — checkout cart MF (React)
```

## Cart State

Cart data lives in `window.__vibify_cart` so it survives MF unmount/remount when switching tabs. The `shared/cart.js` module provides `addToCart`, `removeFromCart`, `setItemQty`, `getCart`, `clearCart`, etc. — each mutation fires a bus event so the currently mounted MF can re-sync.

## Albums

Three albums are bundled:

| Album              | Artist         | Genre        | Price  |
| ------------------ | -------------- | ------------ | ------ |
| Echoes in the Code | Aldous Ichnite | Electronic   | $14.99 |
| Corporate World    | BoDleasons     | Instrumental | $4.99  |
| Endless Timeout    | Lobo Loco      | Jazz         | $9.99  |

Each includes cover art, 6–7 MP3 tracks, and a disc color for the player's glow effect.
