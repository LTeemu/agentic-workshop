# Frontend Performance Lab

The **Frontend Performance Lab** is a lightweight, client‑side experience that lets you audit a website’s performance and assess a wide range of best‑practice checks. It runs on the browser with `Lit`/`Vite` and talks to our lightweight Node.js Express backend that uses **Lighthouse** and a set of **12 custom audit modules**.

## Features

| Feature                      | Description                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lighthouse**               | Runs an official Lighthouse audit locally. Results are saved to disk for historical comparison.                                                                                                                                                                                 |
| **12 Custom Audits**         | - Page Anatomy (bytes & requests) <br> - Compression <br> - Caching <br> - Render Blocking <br> - Images <br> - Security headers <br> - HTML quality <br> - Third‑party domains <br> - Font loading <br> - HTTP protocol <br> - Carbon estimate <br> - Accessibility (axe‑core) |
| **Screenshot**               | Captures a full‑page screenshot during the accessibility run and serves it via `/api/screenshot`.                                                                                                                                                                               |
| **Batch Audits**             | Execute multiple URLs in sequence with progress reporting.                                                                                                                                                                                                                      |
| **Compare**                  | Compare two audit runs side‑by‑side or view a trend for a single hostname.                                                                                                                                                                                                      |
| **No external dependencies** | Only `express`, `compression`, `lighthouse`, `puppeteer‑core` and `@axe-core/puppeteer`.                                                                                                                                                                                        |

## Getting Started

```bash
# install deps
cd projects/frontend-performance-lab
npm install

# dev server (frontend + API)
npm run dev

# build dist for production
npm run build

# start API only
npm start

# run the tests
npm test
```

The application will be available at `http://localhost:3001` after running the dev or start scripts. All audit assets are stored in `projects/frontend-performance-lab/data/audits`.

## Running the tests

The project uses Node's built‑in test runner. The tests verify core audit logic and HTTP endpoints:

```bash
npm test
```

All tests should pass.

## Extending the Project

- Add new audit modules under `server/audit/` and import them in `index.js`.
- Update the UI in the `src/components/` directory.
- Ensure the makefile remains critical‑path: audits are only written to disk when Lighthouse succeeds.

## Project structure

```
frontend-performance-lab/
├─ src/        ← Lit / Vite front‑end
├─ server/     ← Express API & audit logic
├─ data/       ← audit artefacts (json, png)
├─ dist/       ← built front‑end
├─ test/       ← unit tests
└─ README.md   ← this file
```
