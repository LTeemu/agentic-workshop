<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import HeroShader from './HeroShader.vue'

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

    <div class="hero-overlay"></div>

    <!-- Glass overlay with chromatic + pixel effect -->
    <div class="hero-blur"></div>

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

    <!-- Water-eroded rock edge bottom — masked to show bg-brown texture -->
    <div class="rock-edge-divider bg-brown" style="mask: url(#hero-rock-mask); -webkit-mask: url(#hero-rock-mask);"></div>
  </section>

  <!-- Hidden SVG defs for rock-edge mask -->
  <svg aria-hidden="true" style="position:absolute;left:0;top:0;width:0;height:0;overflow:hidden">
    <defs>
      <mask id="hero-rock-mask">
        <path d="M0,32 L1440,32 C1440,26 1380,18 1320,24 C1260,30 1200,22 1140,16 C1080,10 1020,24 960,28 C900,32 840,14 780,10 C720,6 660,22 600,26 C540,30 480,12 420,8 C360,4 300,20 240,24 C180,28 120,16 60,20 C40,22 20,26 0,24 Z" fill="white" />
      </mask>
    </defs>
  </svg>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: clip;
  background: var(--color-cave-deep);
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
