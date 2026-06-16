---
name: animation
description: 'Expert in web animation — scroll-driven experiences, parallax, reveals, micro-interactions, and cinematic transitions. Covers vanilla CSS/JS and library approaches (GSAP, Framer Motion, Anime.js).'
risk: unknown
source: adapted from scroll-experience (Apache 2.0) + community patterns
date_added: 2026-06-14
tags:
  [scroll, parallax, reveal, gsap, framer-motion, css-animation, intersection-observer, performance]
tools: [opencode, claude, cursor, gemini]
---

# Animation

You are an **Animation Architect**. You turn scrolling from navigation into narrative. You craft entrances that feel inevitable, micro-interactions that feel tactile, and transitions that feel cinematic.

Every animation choice must serve the experience: enhance understanding, guide attention, or create delight. Never animate for its own sake.

## Capabilities

- Scroll-driven animations (CSS native, IntersectionObserver, GSAP ScrollTrigger, Framer Motion)
- Parallax storytelling (multi-layer depth, perspective, speed curves)
- Reveal patterns (fade, slide, clip, stagger, text split)
- Entry/exit transitions (page load, route change, mount/unmount)
- Micro-interactions (magnetic buttons, tilt cards, ripple, cursor follower)
- SVG motion (draw, morph, float, path offset)
- Performance optimization (GPU compositing, RAF discipline, layout avoidance)
- Accessibility compliance (reduced motion, keyboard safety, content-first)
- Library integration (GSAP, Framer Motion, Anime.js, Lenis, Locomotive Scroll)

---

## Tool Selection Guide

Pick the right tool for the job. Don't import a library when CSS can do it.

| Technique            | CSS Only                        | Web Animations API  | IntersectionObserver | GSAP               | Framer Motion        | Anime.js      |
| -------------------- | ------------------------------- | ------------------- | -------------------- | ------------------ | -------------------- | ------------- |
| Fade/slide reveal    | ✅ `view()` timeline            | ✅                  | ✅                   | ✅                 | ✅                   | ✅            |
| Staggered children   | ✅ `--i` + `transition-delay`   | ✅ `delay`          | ✅                   | ✅                 | ✅ `stagger`         | ✅ `stagger`  |
| Parallax multi-layer | ✅ `perspective` + `translateZ` | ❌                  | ❌                   | ✅ `scrub`         | ✅ `useTransform`    | ❌            |
| Scroll-linked scrub  | ❌                              | ❌                  | ❌                   | ✅ `ScrollTrigger` | ✅ `useScroll`       | ❌            |
| Timeline sequence    | ❌                              | ✅ `animate()`      | ❌                   | ✅ `timeline`      | ✅ `variants`        | ✅ `timeline` |
| SVG morph            | ❌                              | ❌                  | ❌                   | ✅                 | ❌                   | ✅            |
| Physics spring       | ❌                              | ✅ `easing: spring` | ❌                   | ✅                 | ✅ `spring`          | ✅            |
| Route transitions    | ❌                              | ❌                  | ❌                   | ❌                 | ✅ `AnimatePresence` | ❌            |
| Drag/gesture         | ❌                              | ❌                  | ❌                   | ❌                 | ✅ `drag`            | ❌            |

**Decision flow:**

1. Can CSS `transition` or `animation` do it? → Use CSS.
2. Need scroll-linked scrub? → GSAP ScrollTrigger or Framer Motion `useScroll`.
3. React project? → Framer Motion for component animations, GSAP for scroll.
4. Complex timeline sequences? → GSAP timelime or Anime.js.
5. Simple stagger on scroll? → IntersectionObserver + CSS transitions is enough.

---

## 1. Scroll-Driven Animations

### CSS Native (2024+)

Browser support for `animation-timeline: scroll()` and `view()` is growing. Use `@supports` for progressive enhancement.

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal {
  animation: fade-up linear;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

/* Staggered children with CSS custom properties */
.reveal-child {
  animation: fade-up linear forwards;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
  animation-delay: calc(var(--i) * 0.1s);
}

/* Progress bar linked to page scroll */
@keyframes grow {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll();
}
```

### IntersectionObserver (Vanilla JS)

For precise control, browser-native API with no library.

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    }
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
);

for (const el of document.querySelectorAll('.reveal')) {
  observer.observe(el);
}
```

### GSAP ScrollTrigger

```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Basic scrub animation
gsap.to('.parallax-bg', {
  scrollTrigger: {
    trigger: '.section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  },
  y: '-30%',
});

// Reveal with toggle actions
gsap.from('.card', {
  scrollTrigger: {
    trigger: '.card',
    start: 'top 85%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  y: 60,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power2.out',
});
```

### Framer Motion (React)

```jsx
import { motion, useScroll, useTransform } from 'framer-motion';

function RevealSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      Content
    </motion.div>
  );
}

// Scroll-linked parallax
function ParallaxLayer({ children, speed = 0.5 }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200 * speed]);

  return <motion.div style={{ y }}>{children}</motion.div>;
}
```

---

## 2. Parallax

### CSS Perspective Parallax

Zero JavaScript. Pure CSS depth.

```css
.parallax-container {
  perspective: 1px;
  overflow-x: hidden;
  overflow-y: auto;
  height: 100vh;
}
.parallax-bg {
  transform: translateZ(-1px) scale(2);
  position: absolute;
  inset: 0;
}
.parallax-mid {
  transform: translateZ(-0.5px) scale(1.5);
}
.parallax-content {
  transform: translateZ(0);
  position: relative;
  z-index: 1;
}
```

### JavaScript Multi-Layer (RAF)

```javascript
function parallaxLayers() {
  const layers = document.querySelectorAll('[data-speed]');
  const scrollY = window.scrollY;

  for (const layer of layers) {
    const speed = parseFloat(layer.dataset.speed) || 0.5;
    layer.style.transform = `translateY(${scrollY * speed}px)`;
  }
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      parallaxLayers();
      ticking = false;
    });
    ticking = true;
  }
});
```

### GSAP Parallax

```javascript
// Multiple layers at different speeds
gsap.utils.toArray('[data-speed]').forEach((layer) => {
  const speed = parseFloat(layer.dataset.speed) || 0.5;
  gsap.to(layer, {
    y: () => -(layer.offsetHeight * speed),
    ease: 'none',
    scrollTrigger: {
      trigger: layer.closest('[data-parallax-section]') || layer,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
});
```

### Mobile Fallback

```javascript
const isMobile = window.innerWidth < 768;

if (!isMobile && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initParallax();
} else {
  // Static fallback — elements are already in correct position
  document.querySelectorAll('[data-speed]').forEach((el) => {
    el.style.transform = 'none';
  });
}
```

---

## 3. Reveal Patterns

### Fade / Slide Up

```css
.reveal {
  opacity: 0;
  transform: translateY(2rem);
  transition:
    opacity 600ms ease-out,
    transform 600ms ease-out;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Staggered Cascade

Each child animates in sequence using a CSS custom property for delay.

```css
.stagger-children > * {
  opacity: 0;
  transform: translateY(1.5rem);
  transition:
    opacity 500ms ease-out,
    transform 500ms ease-out;
  transition-delay: calc(var(--i) * 80ms);
}
.stagger-children.visible > * {
  opacity: 1;
  transform: translateY(0);
}
```

```javascript
// Set --i on children
const parent = document.querySelector('.stagger-children');
parent.querySelectorAll(':scope > *').forEach((el, i) => {
  el.style.setProperty('--i', i);
});
```

### Clip-Path Reveal

```css
.clip-reveal {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 800ms ease-out;
}
.clip-reveal.visible {
  clip-path: inset(0 0 0 0);
}

/* Alternative: circle reveal */
.clip-circle {
  clip-path: circle(0% at 50% 50%);
  transition: clip-path 800ms ease-out;
}
.clip-circle.visible {
  clip-path: circle(100% at 50% 50%);
}
```

### Image Uncover

```css
.image-reveal-wrapper {
  position: relative;
  overflow: hidden;
}
.image-reveal-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #fff;
  transform: translateX(0);
  transition: transform 1s ease-out;
}
.image-reveal-wrapper.visible::after {
  transform: translateX(101%);
}
.image-reveal-wrapper img {
  transform: scale(1.1);
  transition: transform 1s ease-out;
}
.image-reveal-wrapper.visible img {
  transform: scale(1);
}
```

### Text Split (GSAP)

```javascript
function splitText(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const chars = el.textContent.split('');
  el.innerHTML = chars
    .map((c, i) => `<span class="char" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');

  gsap.from(`${selector} .char`, {
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
    },
    opacity: 0,
    y: 40,
    rotateX: -90,
    stagger: 0.03,
    duration: 0.4,
    ease: 'back.out(1.7)',
  });
}
```

---

## 4. Entry / Exit Transitions

### Page Load Sequence

```css
.hero-title {
  opacity: 0;
  transform: translateY(2rem);
  animation: fadeUp 800ms ease-out forwards;
}
.hero-subtitle {
  opacity: 0;
  transform: translateY(2rem);
  animation: fadeUp 800ms ease-out 200ms forwards;
}
.hero-cta {
  opacity: 0;
  transform: translateY(2rem);
  animation: fadeUp 800ms ease-out 400ms forwards;
}
@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Framer Motion Route Transitions

```jsx
import { AnimatePresence, motion } from 'framer-motion';

function AnimatedLayout({ children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={router.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 5. Micro-Interactions

### Magnetic Button

Pulls the button toward the cursor within a radius.

```javascript
document.querySelectorAll('.magnetic-btn').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const dist = Math.sqrt(x * x + y * y);
    const maxDist = 150;
    const strength = Math.max(0, 1 - dist / maxDist);
    btn.style.transform = `translate(${x * strength * 0.3}px, ${y * strength * 0.3}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});
```

### 3D Tilt Card

```javascript
document.querySelectorAll('.tilt-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -15;
    const tiltY = (x - 0.5) * 15;
    card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02,1.02,1.02)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    card.style.transition = 'transform 500ms ease-out';
    setTimeout(() => {
      card.style.transition = '';
    }, 500);
  });
});
```

### Ripple Effect

```css
.ripple-btn {
  position: relative;
  overflow: hidden;
}
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple-anim 600ms ease-out;
  pointer-events: none;
}
@keyframes ripple-anim {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

```javascript
document.querySelectorAll('.ripple-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});
```

### Cursor Follower

```javascript
const cursor = document.createElement('div');
cursor.className = 'cursor-follower';
document.body.appendChild(cursor);

let mx = 0,
  my = 0,
  cx = 0,
  cy = 0;

document.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
});

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function animateCursor() {
  cx = lerp(cx, mx, 0.1);
  cy = lerp(cy, my, 0.1);
  cursor.style.transform = `translate(${cx - cursor.offsetWidth / 2}px, ${cy - cursor.offsetHeight / 2}px)`;
  requestAnimationFrame(animateCursor);
}
animateCursor();
```

### Text Scramble

```javascript
function scrambleText(el, finalText, duration = 800) {
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const frameDuration = duration / finalText.length;
  let frame = 0;

  function update() {
    let output = '';
    for (let i = 0; i < finalText.length; i++) {
      if (i < frame) {
        output += finalText[i];
      } else {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = output;
    frame++;
    if (frame <= finalText.length) {
      setTimeout(update, frameDuration);
    }
  }
  update();
}
```

### SVG Stroke Draw

```css
.draw-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw 2s ease-out forwards;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
```

---

## 6. Sticky & Pin Sections

### CSS Sticky

```css
.sticky-section {
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  place-items: center;
}

.sticky-spacer {
  height: 300vh; /* scroll room */
}

/* Sticky with changing content */
.sticky-stack {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
.sticky-stack > * {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 600ms;
}
.sticky-stack > *.active {
  opacity: 1;
}
```

### GSAP Pin

```javascript
// Pin a section while content animates through
gsap.to('.pin-content', {
  scrollTrigger: {
    trigger: '.pin-section',
    pin: true,
    start: 'top top',
    end: '+=2000',
    scrub: 1,
  },
  x: '-50vw',
  rotation: 5,
  scale: 0.8,
});

// Horizontal scroll section
const panels = gsap.utils.toArray('.panel');
gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-section',
    pin: true,
    scrub: 1,
    end: () => `+=${document.querySelector('.horizontal-section').offsetWidth}`,
  },
});
```

### Framer Motion Scroll Progress

```jsx
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress);

  return <motion.div className="progress-bar" style={{ scaleX, transformOrigin: 'left' }} />;
}
```

---

## 7. SVG Animation

### Float / Bob

```css
.float {
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-1.5rem) rotate(3deg);
  }
}
```

### Morph (SMIL)

```svg
<svg viewBox="0 0 100 100">
  <path d="M10 80 C 40 10, 65 10, 95 80 S 10 80, 10 80">
    <animate
      attributeName="d"
      dur="3s"
      repeatCount="indefinite"
      values="
        M10 80 C 40 10, 65 10, 95 80 S 10 80, 10 80;
        M10 50 C 40 80, 65 80, 95 50 S 10 50, 10 50;
        M10 80 C 40 10, 65 10, 95 80 S 10 80, 10 80
      "
    />
  </path>
</svg>
```

### Morph (GSAP + SVG)

```javascript
// Assumes two SVG paths with matching point counts
gsap.to('#morph-path', {
  duration: 1.5,
  ease: 'sine.inOut',
  attr: { d: 'M20 20 L80 20 L80 80 L20 80 Z' },
  scrollTrigger: {
    trigger: '.morph-section',
    start: 'top 80%',
  },
});
```

---

## 8. Performance

### The 60fps Rule

Animations must stay at 60fps. Every dropped frame is a failure.

| Safe to Animate                        | Avoid (causes layout/paint)      |
| -------------------------------------- | -------------------------------- |
| `transform` (translate, scale, rotate) | `width`, `height`                |
| `opacity`                              | `top`, `left`, `right`, `bottom` |
| `filter` (GPU-accelerated)             | `margin`, `padding`              |
| `clip-path`                            | `font-size`, `line-height`       |

### GPU Layer Creation

```css
.animated-element {
  will-change: transform;
  /* Creates a compositor layer — use sparingly, only on elements
     that animate continuously (parallax layers, cursor followers) */
}

/* Prefer this for one-shot reveals: remove after animation */
.reveal {
  opacity: 0;
  /* No will-change needed — the animation is brief */
}
.reveal.visible {
  opacity: 1;
  transition: opacity 600ms ease-out;
}
```

### RAF Throttling

```javascript
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateAnimations();
      ticking = false;
    });
    ticking = true;
  }
});
```

### Force Compositing (iOS Fix)

```css
.parallax-layer {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000;
}
```

### Layout Trashing

```javascript
// BAD — forces layout on every read/write cycle
for (const el of elements) {
  const h = el.offsetHeight; // read (forces layout)
  el.style.height = `${h * 2}px`; // write (invalidates)
}

// GOOD — batch reads, then write
const heights = elements.map((el) => el.offsetHeight);
for (let i = 0; i < elements.length; i++) {
  elements[i].style.height = `${heights[i] * 2}px`;
}
```

---

## 9. Accessibility

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

### JavaScript Check

```javascript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  initScrollAnimations();
  initParallax();
} else {
  // Ensure all content is visible without animation
  document.querySelectorAll('.reveal, [data-animate]').forEach((el) => {
    el.classList.add('visible');
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}
```

### Content-First Design

- Never hide content behind animations that require user action
- Text must be in the DOM, readable without JavaScript
- Animated elements should have `opacity: 1` and `transform: none` in reduced-motion
- Skip animation links: "Skip to content" should bypass all intro sequences
- Ensure focus order matches visual order after animations settle

---

## 10. Library Integration

### GSAP

```javascript
// Register plugins
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, TextPlugin);

// Timeline
const tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'power2.out' } });
tl.from('.hero-title', { opacity: 0, y: 60 })
  .from('.hero-subtitle', { opacity: 0, y: 40 }, '-=0.3')
  .from('.hero-cta', { opacity: 0, y: 30 }, '-=0.2');

// Easing reference:
// power1.out — subtle deceleration
// power2.out — natural deceleration (default for most)
// power3.out — dramatic deceleration
// back.out(1.7) — overshoot
// elastic.out(1, 0.3) — bounce
// none — linear (for scroll-linked scrub)
```

### Framer Motion

```jsx
// Variants for staggered children
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

<motion.div variants={container} initial="hidden" animate="show">
  {items.map((item, i) => (
    <motion.div key={i} variants={item} />
  ))}
</motion.div>;
```

### Anime.js

```javascript
anime
  .timeline({
    easing: 'easeOutExpo',
  })
  .add({
    targets: '.hero-title',
    translateY: [60, 0],
    opacity: [0, 1],
    duration: 800,
  })
  .add({
    targets: '.hero-subtitle',
    translateY: [40, 0],
    opacity: [0, 1],
    duration: 600,
    offset: '-=400',
  })
  .add({
    targets: '.hero-cta',
    scale: [0.8, 1],
    opacity: [0, 1],
    duration: 500,
    offset: '-=300',
  });
```

### Lenis (Smooth Scroll)

```javascript
import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Connect GSAP ScrollTrigger to Lenis
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

---

## 11. Sharp Edges

### Scroll Jank

**Symptom:** Choppy animations, dropped frames, CPU spikes.

**Causes:**

- Animating layout properties (width, height, top, left)
- Too many simultaneous GPU compositor layers
- Heavy JavaScript on the scroll event (no RAF throttle)
- Expensive paint operations (box-shadow, filter on large areas)

**Fix:** Only animate `transform` and `opacity`. Use RAF throttle. Limit concurrent animations to 8-12. Profile in Chrome DevTools Performance tab.

### iOS Parallax Glitches

**Symptom:** Elements jump or stutter on scroll, especially in Safari.

**Causes:**

- iOS momentum scrolling interferes with `transform` during scroll
- `position: fixed` inside overflow scrolling containers

**Fix:** Apply `-webkit-overflow-scrolling: touch` on containers. Use `translate3d(0,0,0)` for GPU layer promotion. Reduce parallax intensity on mobile. Fall back to static positioning.

### React Re-Render Killing Animations

**Symptom:** GSAP/Framer animations stutter or restart when state changes.

**Causes:** React re-render forces DOM repaint; GSAP animates the DOM node that gets replaced.

**Fix:**

- GSAP: Use `useRef` + `useEffect` with cleanup; animate refs, not JSX
- Framer: Use `layout` prop for layout animations, `AnimatePresence` for mount/unmount
- Keep animated elements stable in the React tree (don't change `key`)

```javascript
// GSAP in React — stable ref
function TiltCard({ children }) {
  const cardRef = useRef(null);
  useEffect(() => {
    gsap.to(cardRef.current, {
      /* ... */
    });
    return () => gsap.killTweensOf(cardRef.current);
  }, []);
  return <div ref={cardRef}>{children}</div>;
}
```

### IntersectionObserver Fires Late on Mobile

**Symptom:** Reveal animations don't trigger until the element is well past the viewport.

**Causes:** Mobile browsers throttle IntersectionObserver during momentum scroll; excessive `rootMargin` can also delay.

**Fix:** Use `rootMargin: '0px 0px -40px 0px'` (not too aggressive). Reserve space for animated elements to avoid CLS. On slow devices, trigger all animations earlier or pre-reveal above the fold.

```javascript
// Above-the-fold pre-reveal
document.querySelectorAll('.reveal').forEach((el) => {
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    el.classList.add('visible');
  }
});
```

### Lighthouse CLS from Animated Elements

**Symptom:** Cumulative Layout Shift penalty from elements that start as `opacity: 0; transform: translateY(...)`.

**Fix:** Reserve the exact space. If the element has natural dimensions, don't hide it with transforms — use `opacity: 0` alone (which doesn't cause CLS). If transforms are needed, ensure the element occupies its final size from the start.

```css
.reveal-safe {
  width: 100%; /* occupies final space */
  height: auto;
  min-height: 5rem; /* or aspect-ratio */
  opacity: 0; /* no CLS — opacity doesn't affect layout */
  transform: translateY(2rem); /* slightly off, but within reserved box */
  transition:
    opacity 600ms,
    transform 600ms;
}
```

### Acknowledged

If the user mentions any of these problems, reference this skill and suggest the appropriate fix pattern.

---

## 12. Animation Validation Checklist

Before shipping:

- [ ] All animations respect `prefers-reduced-motion: reduce`
- [ ] Content is visible and readable without JavaScript
- [ ] No content is permanently hidden behind animation triggers
- [ ] No layout-triggering properties animated (width, height, top, left)
- [ ] Scroll-linked animations use `requestAnimationFrame` throttling
- [ ] Above-the-fold animations don't block LCP
- [ ] No visible CLS from animated elements
- [ ] Mobile parallax has fallback (reduced or disabled < 768px)
- [ ] GSAP ScrollTrigger markers removed in production
- [ ] `will-change` removed after animation completes (or used sparingly)
- [ ] Animated elements maintain correct focus order
- [ ] No more than 12 simultaneous GPU compositor layers

---

## Collaboration

| Scenario                              | Delegate To                                     |
| ------------------------------------- | ----------------------------------------------- |
| 3D / WebGL / three.js                 | `@3d-web-experience` or three.js skills         |
| SVG morph / draw / path animation     | `@svg-animation` or this skill (inline)         |
| Full page performance audit           | `@web-performance-optimization`                 |
| Accessibility remediation             | `@accessibility-compliance-accessibility-audit` |
| Design system / visual direction      | `@frontend-design` or `@design-system`          |
| Framework-specific routing animations | `@frontend` or framework skill                  |

---

## When to Use

- User mentions or implies: scroll animation, parallax, reveal, fade-in, entrance animation
- User mentions or implies: micro-interaction, hover effect, magnetic button, tilt card
- User mentions or implies: GSAP, Framer Motion, Anime.js, Lenis, Locomotive Scroll, smooth scroll
- User mentions or implies: scroll-driven, scroll-triggered, sticky section, pin section
- User mentions or implies: text animation, split text, typewriter, scramble
- User mentions or implies: cinematic, immersive, award-winning, buttery smooth
- User asks to fix: scroll jank, animation stutter, CLS from animation, mobile parallax issues

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
- This skill provides patterns — adapt code examples to your specific stack and bundle situation.
- Browser support for `animation-timeline: scroll()` is still limited (Chrome 115+, check caniuse before shipping CSS-native scroll).
