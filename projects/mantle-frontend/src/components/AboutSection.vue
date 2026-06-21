<script setup>
import AppearTransition from './AppearTransition.vue'
</script>

<template>
  <section class="section about-section water-bg" id="about">
    <div class="about-layout">
      <div class="about-left">
        <AppearTransition>
          <span class="section-label">Who we are</span>
        </AppearTransition>
        <AppearTransition :idx="1">
          <h2 class="section-title about-title">We believe the best work happens at the intersection of discipline and play.</h2>
        </AppearTransition>
      </div>
      <div class="about-right">
        <AppearTransition :idx="2">
          <p class="about-text">
            Mantle is a small creative agency founded on a simple idea: <em>craft matters</em>. We partner with
            ambitious brands to design and build digital products that feel as good as they function.
          </p>
        </AppearTransition>
        <AppearTransition :idx="3">
          <p class="about-text">
            Based in Nowhere, working worldwide. Our team brings together expertise from design, engineering,
            and strategy — because great digital experiences don't happen in silos.
          </p>
        </AppearTransition>
        <AppearTransition :idx="4">
          <div class="about-stats">
            <div class="stat">
              <span class="stat-num">50+</span>
              <span class="stat-label">Projects delivered</span>
            </div>
            <div class="stat">
              <span class="stat-num">8</span>
              <span class="stat-label">Years in business</span>
            </div>
            <div class="stat">
              <span class="stat-num">12</span>
              <span class="stat-label">Team members</span>
            </div>
          </div>
        </AppearTransition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-section {
  z-index: 1;
  position: relative;
}

.about-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  align-items: start;
}

@media (max-width: 768px) {
  .about-layout {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}

.about-title {
  font-size: clamp(var(--text-3xl), 4vw, var(--text-5xl));
  line-height: 1.1;
}

.about-right {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.about-text {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  line-height: 1.8;
}

.about-text em {
  color: var(--color-water-surface);
  font-style: italic;
}

.about-stats {
  display: flex;
  gap: var(--space-8);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-4);
  position: relative;
}

.about-stats::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  width: 80px;
  height: 1px;
  background: var(--color-water-surface);
  box-shadow: 0 0 8px var(--color-water-dim);
}

@media (max-width: 640px) {
  .about-stats {
    flex-direction: column;
    gap: var(--space-4);
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-num {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-style: italic;
  color: var(--color-water-surface);
  line-height: 1;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  letter-spacing: 0.05em;
}
</style>
