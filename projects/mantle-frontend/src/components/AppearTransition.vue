<script setup>
import { useIntersectionObserver } from '../composables/useIntersectionObserver.js'

const props = defineProps({
  tag: { type: String, default: 'div' },
  idx: { type: Number, default: 0 },
})

const { el, isVisible } = useIntersectionObserver()
</script>

<template>
  <component :is="tag" ref="el" class="appear" :class="{ visible: isVisible }" :style="{ '--idx': props.idx }">
    <slot />
  </component>
</template>

<style scoped>
.appear {
  opacity: 0;
  transform: translateY(2rem);
  transition:
    opacity 700ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--idx, 0) * 80ms);
}

.appear.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
