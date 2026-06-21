<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function scrollTo(id) {
  close()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function onKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'reflection', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]
</script>

<template>
  <div class="tldr-wrap">
    <button
      class="tldr-toggle"
      :aria-label="isOpen ? 'Close navigation' : 'Open navigation'"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="tldr-icon">
        <span class="tldr-bar" :class="{ open: isOpen }"></span>
        <span class="tldr-bar" :class="{ open: isOpen }"></span>
      </span>
    </button>

    <Transition name="tldr">
      <div v-if="isOpen" class="tldr-overlay" @click.self="close">
        <div class="tldr-modal">
          <div class="tldr-header">
            <span class="tldr-label">TL;DR</span>
            <span class="tldr-sub">too long; didn't read</span>
          </div>
          <nav class="tldr-nav">
            <button
              v-for="(s, i) in sections"
              :key="s.id"
              class="tldr-link"
              :style="{ '--idx': i }"
              @click="scrollTo(s.id)"
            >
              <span class="tldr-num">{{ String(i).padStart(2, '0') }}</span>
              <span class="tldr-name">{{ s.label }}</span>
            </button>
          </nav>
          <div class="tldr-footer">
            <span class="tldr-close-hint">Press ESC to close</span>
          </div>
        </div>
        <div class="tldr-grid-bg"></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tldr-wrap {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1000;
}

.tldr-toggle {
  position: fixed;
  top: var(--space-6);
  right: var(--space-6);
  z-index: 1001;
  width: 48px;
  height: 48px;
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid var(--color-border);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--duration-fast) var(--ease-out-expo);
}

.tldr-toggle:hover {
  background: rgba(0, 240, 255, 0.1);
  border-color: var(--color-cyber);
}

.tldr-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 20px;
}

.tldr-bar {
  height: 1.5px;
  background: var(--color-text);
  transition: all var(--duration-normal) var(--ease-out-expo);
  transform-origin: center;
}

.tldr-bar.open:nth-child(1) {
  transform: rotate(45deg) translateY(4.5px);
}

.tldr-bar.open:nth-child(2) {
  transform: rotate(-45deg) translateY(-4.5px);
}

.tldr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 10, 8, 0.95);
  z-index: 1000;
  display: grid;
  place-items: center;
}

.tldr-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

.tldr-modal {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: var(--space-8);
}

.tldr-header {
  margin-bottom: var(--space-12);
}

.tldr-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-cyber);
  letter-spacing: 0.25em;
  display: block;
  margin-bottom: var(--space-2);
}

.tldr-sub {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  font-style: italic;
}

.tldr-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tldr-link {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-8);
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: var(--text-xl);
  text-align: left;
  transition: all var(--duration-fast) var(--ease-out-expo);
  opacity: 0;
  animation: fade-up 0.4s var(--ease-out-expo) forwards;
  animation-delay: calc(var(--idx) * 0.08s);
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

.tldr-link:hover {
  color: var(--color-cyber);
  padding-left: calc(var(--space-8) + var(--space-2));
}

.tldr-num {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  min-width: 2rem;
}

.tldr-name {
  font-family: var(--font-display);
  font-size: clamp(var(--text-2xl), 3vw, var(--text-4xl));
  font-style: italic;
}

.tldr-footer {
  margin-top: var(--space-12);
}

.tldr-close-hint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
}

/* Transition */
.tldr-enter-active {
  transition: opacity 0.4s var(--ease-out-expo);
}

.tldr-leave-active {
  transition: opacity 0.3s var(--ease-out-expo);
}

.tldr-enter-from,
.tldr-leave-to {
  opacity: 0;
}
</style>
