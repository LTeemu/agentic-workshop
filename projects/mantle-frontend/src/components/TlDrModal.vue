<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { lockBody, unlockBody } from '../composables/useBodyLock'

const isOpen = ref(false)

const modalRef = ref(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function trapFocus(e) {
  if (e.key !== 'Tab' || !modalRef.value) return
  const focusable = modalRef.value.querySelectorAll(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  )
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(isOpen, (open) => {
  if (open) {
    lockBody()
    // Auto-focus first nav link
    requestAnimationFrame(() => {
      if (!modalRef.value) return
      const first = modalRef.value.querySelector('button, a')
      if (first) first.focus()
    })
    window.addEventListener('keydown', trapFocus)
  } else {
    unlockBody()
    window.removeEventListener('keydown', trapFocus)
  }
})

function scrollTo(id) {
  close()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function onKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  unlockBody()
})

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
        <div ref="modalRef" class="tldr-modal">
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
  background: rgba(232, 184, 48, 0.06);
  border: 1px solid var(--color-border);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--duration-fast) var(--ease-out-expo);
}

.tldr-toggle:hover {
  background: rgba(232, 184, 48, 0.12);
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
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1000;
  display: grid;
  place-items: center;
  max-height: 100dvh;
  overscroll-behavior: contain;
}

.tldr-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    /* Warm organic grain */
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 1px,
      rgba(139, 107, 74, 0.06) 1px,
      rgba(139, 107, 74, 0.06) 2px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(139, 107, 74, 0.04) 1px,
      rgba(139, 107, 74, 0.04) 2px
    ),
    /* Honey grid lines */
    linear-gradient(rgba(232, 184, 48, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 184, 48, 0.04) 1px, transparent 1px);
  background-size: 3px 3px, 3px 3px, 60px 60px, 60px 60px;
  pointer-events: none;
  animation: grid-drift 8s linear infinite;
}

@keyframes grid-drift {
  from { background-position: 0 0, 0 0, 0 0, 0 0; }
  to   { background-position: -3px -3px, -3px -3px, -60px -60px, -60px -60px; }
}

.tldr-modal {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: var(--space-8);
  max-height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-cave-wall-light) transparent;
}

.tldr-modal::-webkit-scrollbar {
  width: 4px;
}

.tldr-modal::-webkit-scrollbar-thumb {
  background: var(--color-cave-wall-light);
  border-radius: 2px;
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
  will-change: transform;
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
  transform: translateX(var(--space-2));
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
