<template>
  <div class="album-grid">
    <AlbumCard
      v-for="album in albums"
      :key="album.id"
      :album="album"
      @select="$emit('select', album)"
    />
  </div>
</template>

<script setup>
import AlbumCard from './AlbumCard.vue';

const props = defineProps({
  albums: { type: Array, required: true },
});
defineEmits(['playAlbum']);
</script>

<style scoped>
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1.5rem;
}
</style>
