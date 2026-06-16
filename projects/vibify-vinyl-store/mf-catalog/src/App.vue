<template>
  <div class="catalog-shell">
  <h1 class="catalog-title">Album Catalog</h1>
  <p class="catalog-sub">Browse our collection — click a disc to preview</p>
    <GenreFilter :genres="genres" v-model="activeGenre" />
    <AlbumGrid :albums="filteredAlbums" @select="playAlbum" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { albums, genres } from '../../shared/data.js';
import { emit } from '../../shared/bus.js';
import AlbumGrid from './components/AlbumGrid.vue';
import GenreFilter from './components/GenreFilter.vue';

const activeGenre = ref('All');
const filteredAlbums = computed(() =>
  activeGenre.value === 'All'
    ? albums
    : albums.filter((a) => a.genre === activeGenre.value)
);

  function playAlbum(album) {
    emit('player:playAlbum', album);
    // Store globally so the Player can pick it up on mount (bus event fires before Player mounts)
    window.__vibify_selectedAlbum = album;
    window.location.hash = '#/player';
  }
</script>

<style>
*,
*::before,
*::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #000;
  --text: #ccc;
  --text-heading: #fff;
  --yellow: #daff00;
  --charcoal: #1e1e1e;
  --font-mono: 'Courier New', monospace;
  --font-serif: 'Georgia', serif;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-mono);
  -webkit-font-smoothing: antialiased;
}

.catalog-shell {
  padding: 2rem 1.25rem 4rem;
  max-width: 64rem;
  margin: 0 auto;
}

.catalog-title {
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--text-heading);
  margin-bottom: 0.25rem;
}

.catalog-sub {
  font-size: 0.75rem;
  color: var(--text);
  margin-bottom: 1.5rem;
}
</style>
