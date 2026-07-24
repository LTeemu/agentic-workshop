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

<style scoped></style>
