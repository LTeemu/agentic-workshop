<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import HeroShader from './HeroShader.vue'

const caveRef = ref(null)
const heroRef = ref(null)
const scrollProgress = ref(0)

function onScroll() {
  if (!heroRef.value) return
  const rect = heroRef.value.getBoundingClientRect()
  const heroH = rect.height
  // scrollProgress: 0 when hero is fully in view, 1 when scrolled past hero
  const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / heroH))
  scrollProgress.value = progress
}

let ticking = false
function handleScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      onScroll()
      ticking = false
    })
    ticking = true
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <section ref="heroRef" class="hero" id="hero">
    <HeroShader />

    <!-- Cave ceiling — jagged overhang with stalactites, slides up on scroll -->
    <div
      class="cave-ceiling"
      :style="{ transform: `translateY(${-scrollProgress * 55}%)` }"
    >
      <svg viewBox="0 0 1440 400" preserveAspectRatio="none" class="ceiling-svg">
        <path d="M1440,400 L1440,40 C1380,60 1320,20 1260,45 C1200,15 1140,35 1080,10 C1020,30 960,50 900,25 C840,5 780,40 720,15 C660,35 600,55 540,30 C480,10 420,45 360,20 C300,40 240,60 180,35 C120,15 60,50 0,25 L0,400 Z"
          fill="var(--color-cave-deep)" />
        <!-- Stalactite layer 1 — large formations -->
        <path d="M0,40 L40,160 L80,50 L120,180 L160,30 L220,200 L280,25 L340,140 L400,20 L450,170 L510,35 L560,190 L620,30 L680,150 L740,45 L800,210 L860,20 L920,160 L980,40 L1040,200 L1100,25 L1160,180 L1220,30 L1280,140 L1340,50 L1400,190 L1440,35 L1440,0 L0,0 Z"
          fill="#080504" opacity="0.9" />
        <!-- Stalactite layer 2 — sharper, smaller spikes -->
        <path d="M60,25 L90,90 L120,30 L160,110 L200,20 L250,130 L290,15 L340,100 L380,18 L420,120 L470,28 L520,105 L560,22 L610,95 L650,32 L700,115 L740,25 L790,100 L830,20 L880,110 L920,28 L960,95 L1000,18 L1050,130 L1090,22 L1140,105 L1180,30 L1230,120 L1270,15 L1320,100 L1360,25 L1410,110 L1440,30 L1440,0 L0,0 Z"
          fill="#0a0706" opacity="0.7" />
        <!-- Bioluminescent drip tips -->
        <path d="M120,180 L125,195 L130,180 Z M280,25 L284,38 L288,25 Z M450,170 L454,185 L458,170 Z M620,30 L624,42 L628,30 Z M800,210 L804,225 L808,210 Z M1040,200 L1044,215 L1048,200 Z M1160,180 L1164,195 L1168,180 Z M1400,190 L1404,205 L1408,190 Z"
          fill="var(--color-pool-surface)" opacity="0.15" />
      </svg>
    </div>

    <!-- Side cave walls — fade in on scroll -->
    <div class="cave-wall-left" :style="{ opacity: scrollProgress * 0.7 }"></div>
    <div class="cave-wall-right" :style="{ opacity: scrollProgress * 0.7 }"></div>

    <!-- Ambient cave particles -->
    <div class="cave-particles" aria-hidden="true">
      <span v-for="i in 20" :key="i" class="particle" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
        opacity: 0.1 + Math.random() * 0.2,
        width: `${1 + Math.random() * 2}px`,
        height: `${1 + Math.random() * 2}px`,
      }"></span>
    </div>

    <div class="hero-overlay"></div>

    <div
      class="hero-text"
      :style="{ transform: `translateY(${scrollProgress * 4}%)` }"
    >
      <span class="hero-label">Mantle</span>
      <h1 class="hero-title">
        <span class="hero-line">Where craft</span>
        <span class="hero-line hero-line-accent">meets code.</span>
      </h1>
      <p class="hero-sub">
        We design and build digital experiences that live at the intersection
        of art and engineering.
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

    <!-- Water-eroded rock edge bottom -->
    <svg class="rock-edge-bottom" viewBox="0 0 1440 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hero-edge-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-cave-deep)" />
          <stop offset="100%" stop-color="var(--color-bg)" />
        </linearGradient>
      </defs>
      <path d="M0,32 L1440,32 C1440,26 1380,18 1320,24 C1260,30 1200,22 1140,16 C1080,10 1020,24 960,28 C900,32 840,14 780,10 C720,6 660,22 600,26 C540,30 480,12 420,8 C360,4 300,20 240,24 C180,28 120,16 60,20 C40,22 20,26 0,24 Z"
        fill="url(#hero-edge-grad)" />
    </svg>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--color-cave-deep);
}

/* ── Cave Ceiling ── */
.cave-ceiling {
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 400px;
  z-index: 4;
  pointer-events: none;
  will-change: transform;
}

.ceiling-svg {
  width: 100%;
  height: 100%;
}

/* ── Side Walls ── */
.cave-wall-left,
.cave-wall-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: clamp(40px, 6vw, 120px);
  z-index: 3;
  pointer-events: none;
  will-change: opacity;
}

.cave-wall-left {
  left: 0;
  background: linear-gradient(90deg,
    var(--color-cave-dark) 0%,
    transparent 100%
  );
}

.cave-wall-right {
  right: 0;
  background: linear-gradient(-90deg,
    var(--color-cave-dark) 0%,
    transparent 100%
  );
}

/* ── Ambient Cave Particles ── */
.cave-particles {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: var(--color-glow-cyan);
  animation: particle-float linear infinite;
}

@keyframes particle-float {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  20% { opacity: 0.15; }
  80% { opacity: 0.15; }
  100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
}

/* ── Overlay ── */
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 50%,
    var(--color-cave-deep) 100%
  );
  pointer-events: none;
  z-index: 2;
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
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
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
  text-shadow: 0 0 30px rgba(0, 240, 255, 0.15);
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
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
}

.btn-primary:hover {
  background: var(--color-text);
  color: var(--color-cave-deep);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.25);
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
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.1);
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
  0%, 100% { opacity: 0.3; transform: scaleY(1); }
  50% { opacity: 0.8; transform: scaleY(1.3); }
}

/* ── Water-eroded rock edge bottom ── */
.rock-edge-bottom {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 32px;
  z-index: 20;
  pointer-events: none;
}
</style>
