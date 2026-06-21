<script setup>
import AppearTransition from './AppearTransition.vue'

const services = [
  { title: 'Branding & Identity', desc: 'Visual identities that tell compelling stories. Logos, color systems, typography, and brand guidelines.' },
  { title: 'Web Design & Dev', desc: 'Custom websites and web apps built with modern frameworks, sharp design, and thoughtful engineering.' },
  { title: 'Motion & Animation', desc: 'Bringing interfaces to life with purposeful motion, micro-interactions, and scroll-driven experiences.' },
  { title: 'Digital Strategy', desc: 'Roadmaps, audits, and consulting to align your digital presence with your product goals.' },
  { title: 'E-Commerce', desc: 'Online stores that convert — from headless Shopify to fully custom cart and checkout experiences.' },
  { title: 'Creative Consulting', desc: 'Fractional creative direction and design leadership for teams that need a fresh perspective.' },
]
</script>

<template>
  <section class="section services-section water-bg" id="services">
    <AppearTransition>
      <span class="section-label">What we do</span>
    </AppearTransition>
    <AppearTransition :idx="1">
      <h2 class="section-title">Services</h2>
    </AppearTransition>

    <div class="services-grid">
      <AppearTransition
        v-for="(s, i) in services"
        :key="s.title"
        :idx="i + 2"
        tag="article"
        class="service-card"
      >
        <div class="service-body">
          <h3 class="service-title">{{ s.title }}</h3>
          <p class="service-desc">{{ s.desc }}</p>
        </div>
      </AppearTransition>
    </div>
  </section>
</template>

<style scoped>
.services-section {
  z-index: 1;
  position: relative;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: transparent;
}

@media (max-width: 860px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 540px) {
  .services-grid {
    grid-template-columns: 1fr;
  }
}

.service-card {
  background: transparent;
  padding: var(--space-8) var(--space-6);
  position: relative;
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  z-index: 0;
}

/* Gradient overlay — fades in on hover */
.service-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-card) 0%, #0f1a20 100%);
  opacity: 0;
  transition: opacity var(--duration-slow) var(--ease-out-expo);
  pointer-events: none;
  z-index: -1;
}

.service-card:hover::after {
  opacity: 1;
}

.service-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.service-card:nth-child(3n) {
  border-right: none;
}

@media (max-width: 860px) {
  .service-card:nth-child(3n) {
    border-right: 1px solid var(--color-border);
  }
  .service-card:nth-child(2n) {
    border-right: none;
  }
}

@media (max-width: 540px) {
  .service-card {
    border-right: none;
  }
}

.service-card:hover {
  background: rgba(255, 255, 255, 0.02);
}

.service-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.service-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text);
  line-height: 1.2;
}

.service-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.7;
  max-width: 36ch;
}

/* Vertical accent on hover — thin cyan line */
.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 0;
  background: var(--color-water-surface);
  box-shadow: 0 0 6px var(--color-water-dim);
  transition: height var(--duration-slow) var(--ease-out-expo);
}

.service-card:hover::before {
  height: 100%;
}
</style>
