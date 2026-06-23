<script setup>
import { ref, onMounted } from 'vue'

const emits = defineEmits(['loaded'])
const visible = ref(true)

onMounted(() => {
  setTimeout(() => {
    visible.value = false
    setTimeout(() => emits('loaded'), 800)
  }, 2200)
})
</script>

<template>
  <Transition name="loading">
    <div v-if="visible" class="loading-screen">
      <div class="loading-content">
        <!-- Mark -->
        <div class="mark-wrap">
          <div class="loading-mark">M</div>
        </div>

        <div class="loading-bar-track">
          <div class="loading-bar-fill"></div>
        </div>

        <div class="loading-label">MANTLE</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--color-bg);
  display: grid;
  place-items: center;
  overflow: hidden;
}

/* ─── Mark ─── */
.mark-wrap {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: var(--space-6);
}

.loading-mark {
  font-family: var(--font-display);
  font-size: var(--text-7xl);
  font-style: italic;
  color: var(--color-cyber);
  text-shadow:
    0 0 20px rgba(232, 184, 48, 0.25),
    0 0 60px rgba(232, 184, 48, 0.08);
  animation: mark-reveal 1.6s var(--ease-out-expo) forwards;
  opacity: 0;
  transform: translateY(8px);
}

@keyframes mark-reveal {
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Progress bar ─── */
.loading-bar-track {
  width: 160px;
  height: 1px;
  background: var(--color-border);
  overflow: hidden;
  border-radius: 1px;
  margin-bottom: var(--space-6);
  animation: bar-fade-in 0.6s 0.4s var(--ease-out-expo) forwards;
  opacity: 0;
}

@keyframes bar-fade-in {
  to { opacity: 1; }
}

.loading-bar-fill {
  width: 100%;
  height: 100%;
  background: var(--color-cyber);
  transform-origin: left;
  transform: scaleX(0);
  animation: fill-bar 1.8s 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes fill-bar {
  to { transform: scaleX(1); }
}

/* ─── Text ─── */
.loading-content {
  text-align: center;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.loading-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  letter-spacing: 0.3em;
  animation: label-reveal 0.8s 0.8s var(--ease-out-expo) forwards;
  opacity: 0;
  transform: translateY(4px);
}

@keyframes label-reveal {
  to { opacity: 0.5; transform: translateY(0); }
}

/* ─── Exit transition ─── */
.loading-enter-active,
.loading-leave-active {
  transition:
    opacity 0.6s var(--ease-out-expo),
    transform 0.6s var(--ease-out-expo);
}

.loading-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
</style>
