<template>
  <div class="genre-filter">
     <button
      class="genre-btn"
      :class="{ active: modelValue === 'All' }"
      @click="$emit('update:modelValue', 'All')"
    >
      All
    </button>
    <button
      v-for="g in genres"
      :key="g"
      :class="['genre-btn', { active: modelValue === g }]"
      @click="$emit('update:modelValue', g)"
    >
      {{ g }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  genres: { type: Array, required: true },
  modelValue: { type: String, default: 'All' },
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.genre-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}
.genre-btn {
  font-family: inherit;
  font-size: 0.7rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--charcoal);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: border-color 0.3s, color 0.3s, background 0.3s;
}
.genre-btn:hover {
  border-color: var(--yellow);
  color: var(--yellow);
}
.genre-btn.active {
  border-color: var(--yellow);
  background: var(--yellow);
  color: var(--bg);
}
</style>
