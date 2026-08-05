<script setup>
import AppearTransition from './AppearTransition.vue';

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
];
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
  }
}

.step-card {
  flex: 1;
  min-width: 0;
  padding: var(--space-6) var(--space-5);
  position: relative;
  transition:
    background var(--duration-normal) var(--ease-out-expo),
    transform var(--duration-normal) var(--ease-out-expo);
}

/* Gradient reveal from the left, stays visible on hover */
.step-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--color-water-dim), transparent 90%);
  transform: scaleX(0);
  transform-origin: left center;
  pointer-events: none;
  transition: transform var(--duration-normal) var(--ease-out-expo);
}

.step-card:hover::before {
  transform: scaleX(1);
}

.step-card:hover {
  background: rgba(255, 255, 255, 0.015);
  transform: translateY(-2px);
}

.step-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text);
  margin-top: var(--space-2);
  margin-bottom: var(--space-3);
  line-height: 1.2;
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.7;
}

/* Connector between steps — decoration only, reserves no layout space */
.step-connector {
  position: relative;
  width: 0;
  align-self: stretch;
  flex-shrink: 0;
  overflow: visible;
}

/* Continuous vertical line behind the dot */
.step-connector::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--color-water-surface) 25%,
    var(--color-water-surface) 75%,
    transparent 100%
  );
  opacity: 0.18;
}

.connector-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-water-surface);
  opacity: 0.55;
  z-index: 1;
  box-shadow: 0 0 8px var(--color-water-glow);
}

@media (max-width: 900px) {
  .step-connector {
    width: 100%;
    height: 0;
    align-self: center;
  }

  .step-connector::before {
    top: 50%;
    left: 12px;
    right: 12px;
    bottom: auto;
    width: auto;
    height: 1px;
    transform: translateY(-50%);
    opacity: 0.25;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-water-surface) 10%,
      var(--color-water-surface) 90%,
      transparent 100%
    );
  }

  .connector-dot {
    width: 10px;
    height: 10px;
    opacity: 0.65;
  }
}
</style>
