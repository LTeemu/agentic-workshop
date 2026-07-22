---
name: performance
description: 'Lighthouse audits, Core Web Vitals, image optimization, bundle analysis, code splitting, caching, CDN, runtime performance.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags:
  [
    performance,
    optimization,
    lighthouse,
    core-web-vitals,
    lcp,
    cls,
    fid,
    bundle,
    caching,
    cdn,
    images,
  ]
tools: [opencode, claude, cursor, gemini]
---

# Web Performance Optimization

You are a **performance engineer**. You make sites load fast, feel instant, and stay smooth. Every millisecond counts.

---

## 1. Core Web Vitals

| Metric                             | Target  | What It Measures                                   |
| ---------------------------------- | ------- | -------------------------------------------------- |
| **LCP** (Largest Contentful Paint) | < 2.5s  | Loading — largest visible element                  |
| **FID** (First Input Delay)        | < 100ms | Interactivity — time to respond to first click/tap |
| **CLS** (Cumulative Layout Shift)  | < 0.1   | Visual stability — unexpected layout shifts        |

**Measurement tools:** Lighthouse, PageSpeed Insights, Chrome DevTools Performance, Web Vitals extension, RUM (Real User Monitoring) via `web-vitals` library.

---

## 2. Loading Performance (LCP)

### Largest Contentful Paint

The LCP element is usually: hero image, heading text, or video poster.

```html
<!-- Optimized hero image -->
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width="1200" height="600" fetchpriority="high" decoding="async" />
</picture>
```

**LCP rules:**

- Preload the LCP image: `<link rel="preload" as="image" href="/hero.avif">`
- Never lazy-load the LCP element (`loading="eager"` or omit `loading`)
- Compress hero image to < 200KB (WebP/AVIF)
- Serve from CDN with good edge caching
- Ensure the server responds in < 600ms TTFB

### TTFB (Time to First Byte)

| TTFB      | Rating            |
| --------- | ----------------- |
| < 200ms   | Good              |
| 200–600ms | Needs improvement |
| > 600ms   | Poor              |

**Improve TTFB:**

- Use a CDN (Cloudflare, Fastly, CloudFront)
- Enable HTTP/2 or HTTP/3
- Use server-side caching (Redis, Varnish, CDN edge caching)
- Optimize database queries
- Use static generation where possible (SSG vs SSR)
- Move to a faster hosting provider

---

## 3. Images

### Format Selection

| Format | Best For                    | Compression                       |
| ------ | --------------------------- | --------------------------------- |
| AVIF   | Photos, complex images      | Best (50% smaller than JPEG)      |
| WebP   | All-purpose                 | Very good (30% smaller than JPEG) |
| JPEG   | Fallback for AVIF/WebP      | Good                              |
| PNG    | Transparency (non-photo)    | Lossless                          |
| SVG    | Icons, logos, illustrations | Vector (tiny)                     |

### Responsive Images

```html
<picture>
  <source
    srcset="/img-400.avif 400w, /img-800.avif 800w, /img-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/avif"
  />
  <source
    srcset="/img-400.webp 400w, /img-800.webp 800w, /img-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/webp"
  />
  <img
    src="/img-800.jpg"
    srcset="/img-400.jpg 400w, /img-800.jpg 800w, /img-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    alt=""
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Lazy Loading

```html
<!-- Native lazy loading (supported in all modern browsers) -->
<img src="photo.jpg" loading="lazy" width="800" height="600" alt="" />

<!-- Eager / preload for above-the-fold -->
<img src="hero.jpg" fetchpriority="high" decoding="async" alt="" />

<!-- iframe lazy loading -->
<iframe src="widget.html" loading="lazy"></iframe>
```

### Image Optimization Checklist

- [ ] Convert to WebP/AVIF with JPEG fallback
- [ ] Serve responsive sizes (400w, 800w, 1200w)
- [ ] Compress to < 200KB (hero) / < 100KB (content)
- [ ] Add `width` and `height` to prevent CLS
- [ ] Set `loading="lazy"` on below-fold images
- [ ] Set `fetchpriority="high"` on LCP image
- [ ] Use CDN with image transformation APIs (Cloudinary, Imgix, imgproxy)

---

## 4. JavaScript

### Bundle Size

| Page                   | Target (gzipped) |
| ---------------------- | ---------------- |
| Landing / content page | < 150KB          |
| Web app (SPA)          | < 300KB initial  |
| Total (all routes)     | < 500KB          |

### Code Splitting

```javascript
// Dynamic import (route-level)
const Dashboard = () => import('./routes/Dashboard');

// Component-level lazy loading (React)
const HeavyChart = lazy(() => import('./HeavyChart'));

// Conditional loading
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import('./analytics').then(({ init }) => init());
  });
}
```

### Third-Party Scripts

```html
<!-- Defer non-critical scripts -->
<script src="analytics.js" defer></script>

<!-- Load after page interactive -->
<script>
  window.addEventListener('load', () => {
    const s = document.createElement('script');
    s.src = 'https://chat-widget.com/widget.js';
    s.async = true;
    document.body.appendChild(s);
  });
</script>
```

### Bundle Analysis

```bash
# webpack
npx webpack-bundle-analyzer dist/stats.json

# vite
npx vite-bundle-analyzer

# general
npx source-map-explorer dist/*.js
```

**Before adding a dependency:** check `bundlephobia.com` for size.

### JS Optimization Rules

- Remove unused dependencies (use `depcheck` or `knip`)
- Replace large libraries with smaller alternatives: `moment` → `date-fns` (60KB → 12KB), `lodash` → native or per-method import
- Tree-shake: ensure `"sideEffects": false` in package.json
- Minify + compress: use Terser + gzip/brotli
- Defer non-critical JS with `defer` or dynamic import
- Use `async` for independent scripts

---

## 5. CSS

### Critical CSS

Inline the CSS needed for above-the-fold content, defer the rest:

```html
<head>
  <!-- Critical CSS inlined -->
  <style>
    .hero { ... } .nav { ... }
  </style>
  <!-- Deferred full stylesheet -->
  <link
    rel="preload"
    href="/styles.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'"
  />
  <noscript><link rel="stylesheet" href="/styles.css" /></noscript>
</head>
```

### CSS Containment

```css
/* Tell the browser each section is isolated — prevents layout recalc on changes */
.section {
  contain: layout style paint;
}
.card {
  contain: content;
}
```

### CSS Optimization Rules

- Remove unused CSS (use PurgeCSS or Chrome DevTools coverage tab)
- Merge media queries for the same breakpoint
- Use CSS custom properties for theming (no duplication)
- Prefer `transform`/`opacity` over layout-triggering properties
- Use `content-visibility: auto` on long pages to skip off-screen rendering

---

## 6. Fonts

```html
<!-- Preconnect to origin -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload key font -->
<link rel="preload" as="font" href="/font.woff2" crossorigin type="font/woff2" />

<!-- Use font-display: swap to prevent invisible text -->
<style>
  @font-face {
    font-family: 'Custom';
    src: url('/font.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

- Self-host fonts instead of Google Fonts CDN (saves DNS + TLS)
- Subset fonts to only needed characters (Latin, not all Unicode)
- Use woff2 format only (90% browser support, best compression)
- Limit to 2 font families / 3 weights max

---

## 7. Caching

### Cache Headers

```
# Static assets — cache forever, version in filename
/assets/app-a1b2c3.js: Cache-Control: public, max-age=31536000, immutable

# HTML — short cache or no-cache
/index.html: Cache-Control: no-cache

# Images — long cache
/images/: Cache-Control: public, max-age=86400

# API responses — short cache or ETag
/api/: Cache-Control: no-cache
ETag: "hash"
```

### Service Worker Caching

```javascript
// Cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\.(js|css|woff2|jpg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            return caches.open('static').then((cache) => {
              cache.put(event.request, res.clone());
              return res;
            });
          }),
      ),
    );
  }
});
```

---

## 8. Runtime Performance

### The 60fps Rule

| Property                         | Cost                              |
| -------------------------------- | --------------------------------- |
| `transform`, `opacity`           | Compositor only (fast)            |
| `background-color`, `box-shadow` | Paint + Composite                 |
| `width`, `height`, `top`, `left` | Layout + Paint + Composite (slow) |

**Never animate:** `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size` on scroll or animation.

### RAF Throttling

```javascript
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      doExpensiveWork();
      ticking = false;
    });
    ticking = true;
  }
});
```

### Layout Thrashing

```javascript
// BAD — interleaved read/write
for (const el of items) {
  const h = el.offsetHeight; // read (forces layout)
  el.style.height = h + 'px'; // write (invalidates)
}

// GOOD — batch reads, batch writes
const heights = items.map((el) => el.offsetHeight);
items.forEach((el, i) => {
  el.style.height = heights[i] + 'px';
});
```

### will-change

```css
/* Only on elements that animate continuously */
.parallax-layer {
  will-change: transform;
}

/* Remove after animation for one-shot reveals */
.reveal.visible {
  will-change: auto;
}
```

---

## 9. Auditing Workflow

### Step 1: Measure

```
Lighthouse: performance, accessibility, best practices, SEO scores
Core Web Vitals: LCP, FID/INP, CLS from real users
Bundle analysis: webpack-bundle-analyzer, source-map-explorer
Network: DevTools Network tab — waterfall, TTFB, transfer size
Runtime: DevTools Performance tab — long tasks, FPS, paint flashing
```

### Step 2: Identify

| Problem               | Likely Cause                                                   |
| --------------------- | -------------------------------------------------------------- |
| High LCP              | Large hero image, slow TTFB, render-blocking resources         |
| High FID/INP          | Large JS bundle, long tasks (>50ms), heavy third-party scripts |
| High CLS              | Images without dimensions, ads, embeds, web fonts loading late |
| Poor TTFB             | No CDN, slow server, uncached DB queries, no HTTP/2            |
| Low Performance score | Multiple of the above                                          |

### Step 3: Fix (by impact)

1. **Images**: AVIF/WebP, responsive sizes, lazy loading, preload hero
2. **JS**: Code split, remove unused deps, defer third-party, dynamic imports
3. **Fonts**: Self-host, subset, `font-display: swap`, preload
4. **Caching**: Long cache for assets, CDN, service worker
5. **CSS**: Inline critical CSS, remove unused, contain
6. **Server**: CDN, edge functions, SSG, query optimization

### Step 4: Verify

```
Re-run Lighthouse — compare before/after scores
Check Core Web Vitals in PageSpeed Insights
Profile runtime with DevTools Performance
Test on real mobile device with 3G throttling
```

---

## 10. Performance Budget

```json
{
  "budgets": [
    { "resourceType": "total", "budget": 500 },
    { "resourceType": "script", "budget": 200 },
    { "resourceType": "image", "budget": 300 },
    { "resourceType": "font", "budget": 50 },
    { "resourceType": "document", "budget": 30 }
  ]
}
```

Track budgets with Lighthouse CI or `webpack-budget-performance` plugin.

---

## 11. Collaboration

| Scenario                        | Delegate To                             |
| ------------------------------- | --------------------------------------- |
| Animation-related jank          | `@animation`                            |
| 3D/WebGL performance            | `@webgl`                                |
| Design decisions affecting perf | `@frontend-design`                      |
| Accessibility + performance     | `@accessibility`                        |
| Font loading / CLS from fonts   | `@frontend-design` (typography section) |

---

## When to Use

- User mentions: slow, performance, Lighthouse, PageSpeed, optimize, bundle size, loading
- User mentions: LCP, FID, CLS, TTFB, Core Web Vitals
- User asks: "why is my site slow", "make it load faster", "reduce bundle size"
- User mentions: images loading, layout shift, jank, stutter
- Any project launch / deployment checklist

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Performance fixes depend on server infrastructure, hosting, and third-party services.
- Always measure before and after — perceived performance matters as much as metrics.
- Different audiences need different tradeoffs (e.g., content sites vs web apps).
