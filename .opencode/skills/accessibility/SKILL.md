---
name: accessibility
description: 'WCAG 2.2, ARIA, focus management, keyboard nav, screen reader testing, color contrast, inclusive design patterns.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [accessibility, a11y, wcag, aria, screen-reader, keyboard, contrast, inclusive-design]
tools: [opencode, claude, cursor, gemini]
---

# Accessibility (a11y)

You are an **accessibility engineer**. You ensure every interface works for everyone — keyboard-only users, screen reader users, users with low vision, users with vestibular disorders, and users with cognitive disabilities.

---

## 1. WCAG 2.2 Compliance Levels

| Level   | Conformance                                 | Target For                    |
| ------- | ------------------------------------------- | ----------------------------- |
| **A**   | Minimum — essential barriers removed        | Baseline                      |
| **AA**  | Acceptable — most common barriers addressed | **Standard target**           |
| **AAA** | Premium — best possible experience          | Optional, not always feasible |

**Rule of thumb:** WCAG 2.2 AA is the legal and industry standard. Always target AA.

---

## 2. Semantic HTML (The Foundation)

Almost all accessibility problems are fixed by using the right HTML element.

```html
<!-- ❌ Bad -->
<div class="nav">
  <div class="nav-item" onclick="navigate()">Home</div>
</div>
<div class="main">
  <div class="heading">Title</div>
  <div class="section">Content</div>
</div>
<div class="btn" onclick="submit()">Submit</div>

<!-- ✅ Good -->
<nav>
  <a href="/">Home</a>
</nav>
<main>
  <h1>Title</h1>
  <section>
    <h2>Section heading</h2>
    <p>Content</p>
  </section>
</main>
<button type="submit">Submit</button>
```

### Landmarks

| Element     | Role            | Use For                              |
| ----------- | --------------- | ------------------------------------ |
| `<header>`  | `banner`        | Site header (not section headers)    |
| `<nav>`     | `navigation`    | Navigation blocks                    |
| `<main>`    | `main`          | Primary content (one per page)       |
| `<section>` | `region`        | Themed content groups (with heading) |
| `<article>` | `article`       | Self-contained content               |
| `<aside>`   | `complementary` | Sidebar, related content             |
| `<footer>`  | `contentinfo`   | Site footer                          |

### Headings

- One `<h1>` per page
- Don't skip levels (`h1 → h2 → h3`, never `h1 → h3`)
- Headings should describe the content that follows (not "Click Here")

---

## 3. ARIA (Accessible Rich Internet Applications)

### When to Use ARIA

```
First rule of ARIA: If you can use a native HTML element, do not use ARIA.
```

| Situation                         | Action                                  |
| --------------------------------- | --------------------------------------- |
| Native element exists             | Use the native element (no ARIA needed) |
| No native element for the pattern | Add ARIA roles + states                 |
| Adding supplementary info         | Add ARIA labels or descriptions         |
| Live region updates               | Use `aria-live`                         |

### Common ARIA Patterns

```html
<!-- Button with icon only -->
<button aria-label="Close menu">
  <svg>...</svg>
</button>

<!-- Toggle / accordion -->
<button aria-expanded="false" aria-controls="panel-1">Section 1</button>
<div id="panel-1" role="region" aria-labelledby="..." hidden>Content</div>

<!-- Tab panel -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1">Content 1</div>
<div role="tabpanel" id="panel-2" hidden>Content 2</div>

<!-- Alert / live region -->
<div aria-live="polite" aria-atomic="true">
  <!-- Screen reader announces changes here -->
</div>

<!-- Progress bar -->
<div role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">40%</div>
```

### ARIA Labels

```html
<!-- Descriptive label for screen reader only -->
<button aria-label="Add item to shopping cart">+</button>

<!-- Labelled by another element -->
<div role="group" aria-labelledby="group-heading">
  <h2 id="group-heading">Shipping Options</h2>
</div>

<!-- Described by another element -->
<input type="password" aria-describedby="pw-hint" />
<p id="pw-hint">Must be at least 8 characters</p>
```

---

## 4. Keyboard Navigation

### Focus Indicators

```css
/* Default outline — visible but subtle */
:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Keyboard-only focus (preferred) */
:focus:not(:focus-visible) {
  outline: none;
}
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Custom focus with glow */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px var(--color-bg),
    0 0 0 5px var(--color-accent);
  border-radius: 4px;
}
```

### Focus Management

```javascript
// Trap focus in modal
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') closeModal();
  });
  first.focus();
}

// Skip link
document.querySelector('.skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector('#main-content').focus();
});
```

### Tab Order

```html
<!-- ❌ Bad: positive tabindex values create maintenance headaches -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>

<!-- ✅ Good: source order determines tab order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- Remove from tab order intentionally -->
<div aria-hidden="true" tabindex="-1">Decorative content</div>
```

### Keyboard Handlers

```javascript
// Enter/Space activate buttons/links (native elements handle this automatically)
// Custom element needs manual handler:
customButton.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activate();
  }
});

// Arrow keys for tab/radio/carousel
carousel.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') prevSlide();
  if (e.key === 'ArrowRight') nextSlide();
});
```

---

## 5. Color & Contrast

### Ratios (WCAG 2.2)

| Text Type                          | Minimum Ratio | Enhanced Ratio (AAA) |
| ---------------------------------- | ------------- | -------------------- |
| Normal text (< 18px)               | 4.5:1         | 7:1                  |
| Large text (≥ 18px bold or ≥ 24px) | 3:1           | 4.5:1                |
| UI components / graphical objects  | 3:1           | —                    |

### Testing Contrast

```javascript
function getContrastRatio(hex1, hex2) {
  const luminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
// getContrastRatio('#f4f4f5', '#18181b') → ~15.1 ✅
```

### Tools

- **Local**: DevTools color picker (built-in contrast checker)
- **Automated**: axe DevTools, WAVE, Lighthouse
- **Design**: Stark (Figma), Contrast (macOS)

---

## 6. Screen Readers

### Testing Matrix

| Browser | Screen Reader | Platform |
| ------- | ------------- | -------- |
| Chrome  | VoiceOver     | macOS    |
| Safari  | VoiceOver     | macOS    |
| Chrome  | NVDA          | Windows  |
| Firefox | NVDA          | Windows  |
| Chrome  | JAWS          | Windows  |
| Chrome  | TalkBack      | Android  |
| Safari  | VoiceOver     | iOS      |

### Common Patterns

```html
<!-- Hide decorative content from screen readers -->
<div aria-hidden="true">
  <svg>...</svg>
</div>

<!-- Announce dynamic content -->
<div aria-live="polite">Cart updated: 3 items</div>

<!-- Indicate required fields -->
<label for="email">Email <span aria-hidden="true">*</span></label>
<input id="email" type="email" required aria-required="true" />

<!-- Error summary -->
<div role="alert" aria-live="assertive">
  <h2>3 errors in your form</h2>
  <ul>
    <li><a href="#name">Name is required</a></li>
    <li><a href="#email">Invalid email format</a></li>
  </ul>
</div>
```

### What Screen Readers Hear

```
<nav> → "Navigation landmark"
<h1> → "Heading level 1"
<button> → "Button"
<a href=""> → "Link"
<img alt=""> → (no announcement — decorative)
<img alt="Product photo"> → "Product photo, image"
<button aria-label="Close">×</button> → "Close, button"
```

---

## 7. Motion & Vestibular Disorders

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### JavaScript-Controlled Animations

```javascript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  initScrollAnimations();
  initParallax();
} else {
  // Set all animated elements to their final visible state
  document.querySelectorAll('.reveal').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}
```

---

## 8. Audit Workflow

### Step 1: Automated Scan

```bash
# axe CLI
npx axe http://localhost:4002 --save report.json

# Lighthouse (built into DevTools)
# Chrome DevTools → Lighthouse → Check "Accessibility"

# WAVE browser extension
```

### Step 2: Manual Check

- Tab through the entire page — can you see the focus indicator at every stop?
- Navigate with screen reader (VoiceOver: `Ctrl+Option+Right`, NVDA: `NVDA+Down`)
- Zoom to 200% — is content still readable without horizontal scroll?
- Test with high contrast mode (OS setting)
- Test with custom colors (OS setting, or DevTools CSS override)
- Disable CSS — is content still in logical order?

### Step 3: Fix by Severity

| Severity | WCAG Ref | Common Issue                                  |
| -------- | -------- | --------------------------------------------- |
| Critical | 2.4.3    | No focus indicator                            |
| Critical | 1.1.1    | Missing alt text on informative images        |
| Critical | 4.1.2    | Button with no accessible name                |
| High     | 1.4.3    | Low contrast text                             |
| High     | 2.1.1    | Keyboard trap                                 |
| High     | 3.3.2    | Form inputs without labels                    |
| Medium   | 2.4.1    | No skip link                                  |
| Medium   | 1.4.12   | Text spacing breaks layout                    |
| Low      | 1.4.1    | Color-only meaning (red = error with no text) |

---

## 9. Accessibility Checklist

### Structure

- [ ] Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] One `<h1>` per page, heading levels don't skip
- [ ] Content reads logically when CSS is disabled

### Keyboard

- [ ] All interactive elements reachable with Tab
- [ ] Focus indicator visible (not just browser default)
- [ ] No keyboard traps
- [ ] Custom components have correct keyboard handlers (Enter, Space, Arrow)

### Screen Reader

- [ ] Images have appropriate alt text (informative or `alt=""`)
- [ ] Icon buttons have `aria-label`
- [ ] Form inputs have associated `<label>` elements
- [ ] Dynamic regions use `aria-live`
- [ ] Status messages use `role="alert"`
- [ ] Custom controls have correct roles/states (`aria-expanded`, `aria-selected`, etc.)

### Visual

- [ ] Text contrast ≥ 4.5:1 (normal) / 3:1 (large)
- [ ] UI component contrast ≥ 3:1
- [ ] Information is not conveyed by color alone
- [ ] Touch targets ≥ 44×44px (mobile)
- [ ] Text can be zoomed to 200% without loss of function

### Motion

- [ ] `prefers-reduced-motion: reduce` respected
- [ ] All content visible without JavaScript
- [ ] No auto-playing video/audio (or has pause control)
- [ ] Flash rate < 3Hz (no seizure risk)

---

## 10. Collaboration

| Scenario                              | Delegate To        |
| ------------------------------------- | ------------------ |
| Color palette / visual design         | `@frontend-design` |
| Animation / reduced motion            | `@animation`       |
| Performance + accessibility tradeoffs | `@performance`     |
| 3D scene fallbacks for a11y           | `@webgl`           |

---

## When to Use

- User mentions: accessibility, a11y, WCAG, screen reader, keyboard nav, focus, contrast
- User mentions: 508 compliance, ADA, inclusive design, universal design
- User asks: "is this accessible", "make it work for everyone", "add ARIA"
- User mentions: skip link, tab order, aria-label, focus trap
- Any project launch checklist

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Automated tools catch ~30% of issues — manual testing with screen readers and keyboard is essential.
- Accessibility is not a one-time fix. It must be maintained as features are added.
- WCAG 2.2 compliance does not guarantee usability for all disabilities — test with real users when possible.
- Different jurisdictions have different legal requirements (ADA, EN 301 549, Equality Act).
