<template>
<div class="album-card" @click="$emit('select', album)">
    <div class="album-thumb" :style="{ backgroundImage: `url(${album.coverUrl || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: album.gradient }">

    </div>
  <div class="album-info">
    <h3 class="album-title">{{ album.title }}</h3>
    <p class="album-artist">{{ album.artist }}</p>
    <div class="album-meta">
      <span class="album-genre">{{ album.genre }}</span>
      <span class="album-meta-right">
        <span class="album-price">${{ album.price.toFixed(2) }}</span>
        <button
          class="album-cart-btn"
          :class="inCart ? 'in-cart' : ''"
          @click.stop="toggleCart"
          :aria-label="inCart ? 'Remove from cart' : 'Add to cart'"
        >{{ inCart ? '×' : '+' }}</button>
      </span>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { on } from '../../../shared/bus.js';
import { addToCart, removeFromCart, isInCart } from '../../../shared/cart.js';

const props = defineProps({
  album: { type: Object, required: true },
});
defineEmits(['select']);

// Track in-cart state as a plain ref — toggled synchronously on click.
// Bus listeners keep it in sync when another MF modifies the cart.
const inCart = ref(isInCart(props.album.id));

let unsubs;
onMounted(() => {
  unsubs = [
    on('cart:add', () => { inCart.value = isInCart(props.album.id); }),
    on('cart:remove', () => { inCart.value = isInCart(props.album.id); }),
    on('cart:clear', () => { inCart.value = isInCart(props.album.id); }),
  ];
});
onUnmounted(() => {
  unsubs?.forEach((u) => u());
});

function toggleCart() {
  if (inCart.value) {
    removeFromCart(props.album.id);
    inCart.value = false;
  } else {
    addToCart(props.album);
    inCart.value = true;
  }
}
</script>

<style scoped>
.album-card {
  cursor: pointer;
  transition: transform 0.3s;
}
.album-card:hover {
  transform: translateY(-4px);
}

  .album-thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0;
    position: relative;
    background-size: cover;
    background-position: center;
    transition: transform 0.3s;
  }
  .album-thumb:hover {
    transform: translateY(-4px);
  }
  .album-hole {
    width: 22%;
    height: 22%;
    border-radius: 50%;
    background: var(--bg);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .album-label {
    position: absolute;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.04em;
    z-index: 1;
    pointer-events: none;
    top: 5%;
    left: 5%;
  }


.album-info {
  margin-top: 0.75rem;
}
.album-title {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--text-heading);
  line-height: 1.2;
}
.album-artist {
  font-size: 0.7rem;
  color: var(--text);
  margin-top: 0.15rem;
}
.album-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  color: var(--text);
  opacity: 0.5;
  margin-top: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  align-items: center;
}
.album-meta-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.album-cart-btn {
  background: transparent;
  border: 1px solid var(--text);
  color: var(--text);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color 0.3s, color 0.3s, background 0.3s;
  opacity: 0.6;
}
.album-card:hover .album-cart-btn {
  opacity: 1;
}
.album-cart-btn:hover {
  border-color: var(--yellow, #daff00);
  color: var(--yellow, #daff00);
  background: rgba(218, 255, 0, 0.1);
}
.album-cart-btn.in-cart {
  border-color: #e74c3c;
  color: #e74c3c;
}
.album-cart-btn.in-cart:hover {
  background: rgba(231, 76, 60, 0.15);
}
</style>
