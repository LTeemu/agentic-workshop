<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import HeroShader from './HeroShader.vue';
import { createAnimationLoop } from '../composables/createAnimationLoop';

const heroRef = ref(null);
const scrollProgress = ref(0);
const constellationCanvas = ref(null);

function onScroll() {
  if (!heroRef.value) return;
  const rect = heroRef.value.getBoundingClientRect();
  const heroH = rect.height;
  // scrollProgress: 0 when hero is fully in view, 1 when scrolled past hero
  const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / heroH));
  scrollProgress.value = progress;
}

let ticking = false;
function handleScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
    ticking = true;
  }
}

// ── Constellation effect ────────────────────────────
const HONEY_RGB = [232, 184, 48];
let nodes = [];
let connLoop = null;
let connVisibilityObserver = null;
let connResizeObserver = null;

// Pre-rendered glow sprite — avoids creating radial gradients every frame
let glowSprite = null;
function getGlowSprite() {
  if (glowSprite) return glowSprite;
  const [cr, cg, cb] = HONEY_RGB;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 1)`);
  grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  glowSprite = c;
  return glowSprite;
}

function spawnNodes(cw, ch) {
  const count = 28;
  nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * cw,
      y: Math.random() * ch,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      baseSize: 1.5 + Math.random() * 2,
    });
  }
}

function drawConstellation(ctx, cw, ch, t) {
  ctx.clearRect(0, 0, cw, ch);

  // Drift nodes slowly
  for (const n of nodes) {
    n.x += n.vx * 0.3;
    n.y += n.vy * 0.3;
    if (n.x < 0 || n.x > cw) n.vx *= -1;
    if (n.y < 0 || n.y > ch) n.vy *= -1;
  }

  const maxDist = Math.min(cw, ch) * 0.22;
  const maxDistSq = maxDist * maxDist;
  const [cr, cg, cb] = HONEY_RGB;

  // Draw lines between nearby nodes — squared distance first to skip sqrt
  ctx.lineCap = 'round';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq) {
        const dist = Math.sqrt(distSq);
        const fade = 1 - dist / maxDist;
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${fade * 0.25})`;
        ctx.lineWidth = 0.5 + fade * 0.8;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw glowing nodes — blit the cached sprite instead of building gradients
  const sprite = getGlowSprite();
  if (sprite) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const n of nodes) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + n.phase);
      const size = n.baseSize * (0.7 + pulse * 0.3);
      const alpha = (0.3 + pulse * 0.35) * 0.3;

      // Outer glow — same radius/alpha as the old radial gradient
      const glowR = size * 4;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, n.x - glowR, n.y - glowR, glowR * 2, glowR * 2);

      // Core dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.3 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function startConstellation() {
  const canvas = constellationCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  // Cached size — avoids layout reads during the animation loop
  const size = { width: 0, height: 0 };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // Mid-cycle time so a static frame shows a lively constellation, not an empty one
  const staticTime = Math.random() * 1000;

  function drawStaticFrame() {
    drawConstellation(ctx, size.width, size.height, staticTime);
  }

  function resize() {
    const rect = parent.getBoundingClientRect();
    size.width = rect.width;
    size.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    // Reset transform before scaling (setTransform replaces cumulative scale)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawnNodes(rect.width, rect.height);
    // Resize clears the canvas — redraw the static frame for reduced-motion users
    if (reducedMotion) drawStaticFrame();
  }

  resize();
  connResizeObserver = new ResizeObserver(() => resize());
  connResizeObserver.observe(parent);

  // Render a single static frame for users who prefer reduced motion
  if (reducedMotion) {
    drawStaticFrame();
    return;
  }

  connLoop = createAnimationLoop(({ time }) => {
    drawConstellation(ctx, size.width, size.height, time);
  });

  // Visibility pause using IntersectionObserver on the hero section
  connVisibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) connLoop.start();
        else connLoop.stop();
      }
    },
    { threshold: 0 },
  );
  if (heroRef.value) connVisibilityObserver.observe(heroRef.value);

  connLoop.start();
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  onScroll();
  startConstellation();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
  if (connLoop) connLoop.stop();
  if (connVisibilityObserver) connVisibilityObserver.disconnect();
  if (connResizeObserver) connResizeObserver.disconnect();
});
</script>

<template>
  <section ref="heroRef" class="hero" id="hero">
    <HeroShader />

    <div class="hero-overlay"></div>

    <!-- Glass overlay with chromatic + pixel effect -->
    <div class="hero-blur"></div>

    <div class="hero-text" :style="{ transform: `translateY(${scrollProgress * 4}%)` }">
      <canvas ref="constellationCanvas" class="constellation-canvas" aria-hidden="true"></canvas>
      <span class="hero-label">Mantle</span>
      <h1 class="hero-title">
        <span class="hero-line">Where craft</span>
        <span class="hero-line hero-line-accent">meets code.</span>
      </h1>
      <p class="hero-sub">
        We design and build digital experiences that live at the intersection of art and
        engineering.
      </p>
      <div class="hero-cta">
        <a href="#reflection" class="btn-primary">See our work</a>
        <a href="#contact" class="btn-ghost">Get in touch</a>
      </div>
    </div>

    <div class="hero-scroll" :style="{ opacity: Math.max(0, 0.4 - scrollProgress * 0.8) }">
      <span class="hero-scroll-text">Descend</span>
      <span class="hero-scroll-line"></span>
    </div>

    <!-- Water-eroded rock edge bottom — masked to show bg-brown texture -->
    <div
      class="rock-edge-divider bg-brown"
      style="mask: url(#hero-rock-mask); -webkit-mask: url(#hero-rock-mask)"
    ></div>
  </section>

  <!-- Hidden SVG defs for rock-edge mask -->
  <svg
    aria-hidden="true"
    style="position: absolute; left: 0; top: 0; width: 0; height: 0; overflow: hidden"
  >
    <defs>
      <mask id="hero-rock-mask" maskContentUnits="objectBoundingBox">
        <path
          d="M0,1 L1,1 C1,0.8125 0.9583,0.5625 0.9167,0.75 C0.875,0.9375 0.8333,0.6875 0.7917,0.5 C0.75,0.3125 0.7083,0.75 0.6667,0.875 C0.625,1 0.5833,0.4375 0.5417,0.3125 C0.5,0.1875 0.4583,0.6875 0.4167,0.8125 C0.375,0.9375 0.3333,0.375 0.2917,0.25 C0.25,0.125 0.2083,0.625 0.1667,0.75 C0.125,0.875 0.0833,0.5 0.0417,0.625 C0.0278,0.6875 0.0139,0.8125 0,0.75 Z"
          fill="white"
        />
      </mask>
    </defs>
  </svg>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 660px;
  height: 80vmin;
  display: grid;
  place-items: center;
  overflow: clip;
  background: var(--color-cave-deep);
}

/* ── Overlay ── */
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, transparent 50%, var(--color-cave-deep) 100%);
  pointer-events: none;
  z-index: 2;
}

/* ── Glass overlay — darkening for text readability ── */
.hero-blur {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgba(5, 3, 2, 0.1) 0%,
    rgba(10, 7, 6, 0.2) 50%,
    rgba(5, 3, 2, 0.15) 100%
  );
}

/* ── Constellation canvas ── */
.constellation-canvas {
  position: absolute;
  inset: -40px -60px -20px;
  width: calc(100% + 120px);
  height: calc(100% + 60px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}

/* ── Text ── */
.hero-text {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  max-width: 800px;
  will-change: transform;
}

.hero-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-glow-cyan);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(232, 184, 48, 0.25);
}

.hero-title {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hero-line {
  font-family: var(--font-display);
  font-weight: 400;
  font-style: italic;
  font-size: clamp(3rem, 8vw, var(--text-7xl));
  letter-spacing: -0.04em;
  line-height: 1.05;
  color: var(--color-text);
}

.hero-line-accent {
  color: var(--color-glow-cyan);
  text-shadow: 0 0 30px rgba(232, 184, 48, 0.2);
}

.hero-sub {
  font-size: clamp(var(--text-base), 1.5vw, var(--text-lg));
  color: var(--color-text-muted);
  max-width: 480px;
  line-height: 1.7;
}

.hero-cta {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}

.btn-primary {
  display: inline-block;
  padding: var(--space-3) var(--space-8);
  background: var(--color-glow-cyan);
  color: var(--color-cave-deep);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-expo);
  box-shadow: 0 0 25px rgba(232, 184, 48, 0.2);
}

.btn-primary:hover {
  background: var(--color-text);
  color: var(--color-cave-deep);
  box-shadow: 0 0 35px rgba(232, 184, 48, 0.3);
}

.btn-ghost {
  display: inline-block;
  padding: var(--space-3) var(--space-8);
  border: 1px solid var(--color-cave-wall-light);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-expo);
}

.btn-ghost:hover {
  border-color: var(--color-glow-cyan);
  color: var(--color-glow-cyan);
  box-shadow: 0 0 15px rgba(232, 184, 48, 0.15);
}

/* ── Scroll Indicator ── */
.hero-scroll {
  position: absolute;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  transition: opacity var(--duration-normal) var(--ease-out-expo);
}

.hero-scroll-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  letter-spacing: 0.15em;
}

.hero-scroll-line {
  width: 1px;
  height: 30px;
  background: var(--color-text-muted);
  animation: scroll-pulse 2s ease-in-out infinite;
}

@keyframes scroll-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.8;
    transform: scaleY(1.3);
  }
}

/* ── Water-eroded rock edge bottom ── */
.rock-edge-divider {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 32px;
  z-index: 20;
  pointer-events: none;
  mask-size: 100% 100%;
  -webkit-mask-size: 100% 100%;
}
</style>
