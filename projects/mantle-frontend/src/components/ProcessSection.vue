<script setup>
import AppearTransition from './AppearTransition.vue'

const steps = [
  {
    title: 'Discover',
    desc: 'We dive into your vision, audience, and market. Research, stakeholder workshops, and competitive audits uncover the real problem to solve.',
  },
  {
    title: 'Define',
    desc: 'Strategy takes shape. Sitemaps, user flows, creative briefs, and technical architecture — aligned with your goals and timeline.',
  },
  {
    title: 'Create',
    desc: 'Design meets engineering. Visual identity, interface design, frontend development, and motion — built in parallel with constant feedback.',
  },
  {
    title: 'Launch',
    desc: 'Deployment, testing, and optimization. We ensure every detail works across devices, browsers, and real-world conditions.',
  },
  {
    title: 'Grow',
    desc: 'Analytics, iteration, and ongoing support. We stay with you to measure impact and evolve the product over time.',
  },
]
</script>

<template>
  <section class="section process-section" id="process">
    <AppearTransition>
      <span class="section-label">How we work</span>
    </AppearTransition>
    <AppearTransition :idx="1">
      <h2 class="section-title">Process</h2>
    </AppearTransition>

    <div class="steps-track">
      <template v-for="(step, i) in steps" :key="step.title">
        <AppearTransition :idx="i + 2" tag="div" class="step-card">
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
        </AppearTransition>
        <div v-if="i < steps.length - 1" class="step-connector" aria-hidden="true">
          <span class="connector-dot"></span>
          <span class="connector-line"></span>
          <span class="connector-dot"></span>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.process-section {
  z-index: 1;
  position: relative;
}

.steps-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

@media (max-width: 900px) {
  .steps-track {
    flex-direction: column;
    gap: var(--space-8);
  }
}

.step-card {
  flex: 1;
  min-width: 0;
  padding: var(--space-6) var(--space-5);
  position: relative;
  border-top: 1px solid var(--color-border);
  transition: background var(--duration-normal) var(--ease-out-expo);
}

.step-card:hover {
  background: rgba(255, 255, 255, 0.015);
}

.step-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text);
  margin-bottom: var(--space-3);
  line-height: 1.2;
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.7;
}

/* Connector between steps */
.step-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-6) 0;
  flex-shrink: 0;
  width: 24px;
}

@media (max-width: 900px) {
  .step-connector {
    flex-direction: row;
    width: auto;
    height: 24px;
    padding: 0 var(--space-6);
  }
}

.connector-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-water-surface);
  opacity: 0.3;
  flex-shrink: 0;
}

.connector-line {
  flex: 1;
  width: 1px;
  background: linear-gradient(180deg, var(--color-water-surface), transparent);
  opacity: 0.15;
}

@media (max-width: 900px) {
  .connector-line {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, var(--color-water-surface), transparent);
  }
}
</style>
