<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { albums } from '../../shared/data.js';
  import { on } from '../../shared/bus.js';
  import { addToCart, removeFromCart, isInCart } from '../../shared/cart.js';

  let currentAlbumIndex = $state(0);
  let currentTrackIndex = $state(0);
  let isPlaying = $state(false);
  let audio;
  let discRowContainer;

  // Rotation animation state
  let rotation = $state(0);
  let targetSpeed = $state(0);
  let currentSpeed = $state(0);
  let animationFrame = null;
  let lastTime = 0;

  let currentAlbum = $derived(albums[currentAlbumIndex]);
  let tracks = $derived(currentAlbum?.tracks ?? []);
  let currentTrack = $derived(currentAlbum?.tracks[currentTrackIndex] ?? null);

  let unsub;

  // Track in-cart state as plain $state — toggled synchronously on click.
  // Bus listeners keep it in sync when another MF modifies the cart.
  let inCart = $state(false);

  function syncInCart() {
    inCart = currentAlbum ? isInCart(currentAlbum.id) : false;
  }

  function toggleCart() {
    if (!currentAlbum) return;
    if (inCart) {
      removeFromCart(currentAlbum.id);
      inCart = false;
    } else {
      addToCart(currentAlbum);
      inCart = true;
    }
  }

  // Sync inCart when navigating to a different album
  $effect(() => {
    currentAlbum;
    syncInCart();
  });

  // Handle spin animation
  $effect(() => {
    if (isPlaying) {
      targetSpeed = 0.2; // degrees per millisecond
      if (!animationFrame) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(spin);
      }
    } else {
      targetSpeed = 0;
    }
  });

  function spin(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    // Smooth acceleration/deceleration
    const acceleration = 0.001;
    if (currentSpeed < targetSpeed) {
      currentSpeed = Math.min(currentSpeed + acceleration, targetSpeed);
    } else if (currentSpeed > targetSpeed) {
      currentSpeed = Math.max(currentSpeed - acceleration, targetSpeed);
    }

    // Update rotation
    rotation = (rotation + (currentSpeed * delta)) % 360;

    // Apply rotation to all spinning discs
    const discs = document.querySelectorAll('.disc.spinning');
    discs.forEach(disc => {
      disc.style.transform = `rotate(${rotation}deg)`;
    });

    // Continue animation if still spinning or decelerating
    if (currentSpeed > 0.001 || targetSpeed > 0) {
      animationFrame = requestAnimationFrame(spin);
    } else {
      animationFrame = null;
      currentSpeed = 0;
    }
  }

  // Clean up animation on destroy
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  });

  onMount(() => {
    syncInCart();
    const unsubs = [
      on('cart:add', () => syncInCart()),
      on('cart:remove', () => syncInCart()),
      on('cart:clear', () => syncInCart()),
      on('player:playAlbum', (album) => {
        const idx = albums.findIndex((a) => a.id === album.id);
        if (idx < 0) return;
        currentAlbumIndex = idx;
        currentTrackIndex = 0;
        playCurrent();
        setTimeout(centerActiveDisc, 50);
      }),
    ];
    unsub = () => unsubs.forEach((u) => u());

    // Check if a pending album was stored globally (Catalog does this before navigating)
    const pendingAlbum = window.__vibify_selectedAlbum;
    if (pendingAlbum) {
      const idx = albums.findIndex((a) => a.id === pendingAlbum.id);
      if (idx >= 0) {
        currentAlbumIndex = idx;
        currentTrackIndex = 0;
        playCurrent();
        delete window.__vibify_selectedAlbum;
        setTimeout(centerActiveDisc, 100);
        return;
      }
      delete window.__vibify_selectedAlbum;
    }
    playCurrent();
    setTimeout(centerActiveDisc, 100);
  });

  onDestroy(() => {
    unsub?.();
    audio?.pause();
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  });

  function playCurrent() {
    const url = currentTrack?.url;
    if (audio) audio.pause();
    audio = new Audio(url);
    audio.addEventListener('ended', () => { isPlaying = false; nextTrack(); });
    audio.play().then(() => { isPlaying = true; }).catch(() => {});
  }

  function togglePlay() {
    if (isPlaying) {
      audio?.pause();
      isPlaying = false;
    } else if (audio) {
      audio.play().then(() => { isPlaying = true; }).catch(() => {});
    } else {
      playCurrent();
    }
  }

  function nextTrack() {
    if (currentTrackIndex < tracks.length - 1) {
      currentTrackIndex += 1;
    } else {
      nextAlbum();
    }
    playCurrent();
  }

  function prevTrack() {
    if (currentTrackIndex > 0) {
      currentTrackIndex -= 1;
    } else {
      prevAlbum();
    }
    playCurrent();
  }

  function nextAlbum() {
    if (currentAlbumIndex < albums.length - 1) {
      currentAlbumIndex += 1;
    } else {
      currentAlbumIndex = 0;
    }
    currentTrackIndex = 0;
    playCurrent();
    setTimeout(centerActiveDisc, 50);
  }

  function prevAlbum() {
    if (currentAlbumIndex > 0) {
      currentAlbumIndex -= 1;
    } else {
      currentAlbumIndex = albums.length - 1;
    }
    currentTrackIndex = 0;
    playCurrent();
    setTimeout(centerActiveDisc, 50);
  }

  function selectAlbum(index) {
    currentAlbumIndex = index;
    currentTrackIndex = 0;
    playCurrent();
    setTimeout(centerActiveDisc, 50);
  }

  function centerActiveDisc() {
    if (!discRowContainer) return;
    
    const activeDisc = discRowContainer.querySelector('.disc-wrapper-active');
    if (!activeDisc) return;
    
    const containerWidth = discRowContainer.offsetWidth;
    const discOffset = activeDisc.offsetLeft;
    const discWidth = activeDisc.offsetWidth;
    
    // Calculate the scroll position to center the active disc
    let scrollPosition = discOffset - (containerWidth / 2) + (discWidth / 2);
    
    // Get the maximum scroll position
    const maxScroll = discRowContainer.scrollWidth - containerWidth;
    
    // Clamp the scroll position so first and last items can be centered
    scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
    
    discRowContainer.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  }

  function pad(n) { return String(n + 1).padStart(2, '0'); }

  const FALLBACK_DISC_COLOR = '#daff00';
</script>

<div class="player-shell">
  <!-- 1. Title and track text -->
  {#if currentAlbum}
    <div class="track-info-header">
      <div class="track-title-wrapper">
        {#key `${currentAlbumIndex}-${currentTrackIndex}`}
          <p class="track-title fade-up">
            {currentTrack?.title ?? '—'}
          </p>
        {/key}
      </div>
      <div class="track-artist-wrapper">
        <p class="track-artist">
          {currentAlbum.artist}
        </p>
      </div>
      <div class="track-album-wrapper">
        {#key currentAlbumIndex}
          <p class="track-album fade-up">
            {currentAlbum.title}
          </p>
        {/key}
      </div>
      <div class="track-cart-row">
        <span class="track-price">${currentAlbum.price.toFixed(2)}</span>
        <button class="track-cart-btn" class:in-cart={inCart} onclick={toggleCart} aria-label={inCart ? 'Remove from cart' : 'Add to cart'}>
          {#if inCart}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- 2. Disc row -->
  <div class="disc-row-container">
    <div 
      class="disc-row" 
      bind:this={discRowContainer}
    >
      <div class="disc-spacer"></div>
      {#each albums as album, i}
        <div
          class="disc-wrapper"
          class:disc-wrapper-active={i === currentAlbumIndex}
          class:disc-playing={i === currentAlbumIndex && isPlaying}
          style:--gc={album.discColor || FALLBACK_DISC_COLOR}
          onclick={() => selectAlbum(i)}
        >
            <div class="disc" 
            class:spinning={i === currentAlbumIndex && isPlaying}
            style="background-image: url({album.coverUrl}); background-color: {album.gradient}; background-size: cover; background-position: center; transform: rotate({i === currentAlbumIndex ? rotation : 0}deg)"
            class:fade-in={i === currentAlbumIndex}
          >
            <div class="disc-hole"></div>
            
            {#if i === currentAlbumIndex}
              <div class="disc-active-indicator"></div>
            {/if}
          </div>
        </div>
      {/each}
      <div class="disc-spacer"></div>
    </div>
  </div>

  <!-- 3. Player controls -->
  {#if currentAlbum}
    <div class="player-controls">
      <button class="ctrl-btn ctrl-prev" onclick={prevTrack} aria-label="Previous">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>
      <button class="ctrl-btn ctrl-play" onclick={togglePlay} aria-label="Play/Pause">
        {#if !isPlaying}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        {:else}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        {/if}
      </button>
      <button class="ctrl-btn ctrl-next" onclick={nextTrack} aria-label="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>
  {/if}

  <!-- 4. Track list -->
  {#if tracks.length}
    <div class="tracklist">
      {#each tracks as track, i}
        <div
          class="track"
          class:track-active={i === currentTrackIndex}
          onclick={() => { currentTrackIndex = i; playCurrent(); }}
        >
          <span class="track-num">{pad(i)}</span>
          <div class="track-info">
            <span class="track-name">{track.title}</span>
          </div>
          <span class="track-dur">{track.duration}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  :host {
    display: block;
    padding: 2rem 1.25rem 4rem;
    max-width: 48rem;
    margin: 0 auto;
  }

  .player-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
  }

  /* 1. Track info header */
  .track-info-header {
    width: 100%;
    text-align: center;
    min-height: 5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    margin-top: 2rem;
  }

  .track-title-wrapper,
  .track-artist-wrapper,
  .track-album-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .track-title {
    font-family: Georgia, serif;
    font-size: 1.5rem;
    color: #fff;
    line-height: 1.2;
    margin: 0;
  }

  .track-artist {
    font-size: 0.9rem;
    color: #aaa;
    margin: 0;
  }

  .track-album {
    font-size: 0.8125rem;
    color: #666;
    margin: 0;
  }

  .track-cart-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }

  .track-price {
    font-size: 0.8rem;
    color: #999;
    font-family: 'Courier New', monospace;
  }

  .track-cart-btn {
    background: transparent;
    border: 1px solid #555;
    color: #aaa;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: border-color 0.25s, color 0.25s, background 0.25s, transform 0.2s;
  }

  .track-cart-btn:hover {
    border-color: #daff00;
    color: #daff00;
    background: rgba(218, 255, 0, 0.08);
    transform: scale(1.1);
  }

  .track-cart-btn.in-cart {
    border-color: #e74c3c;
    color: #e74c3c;
  }

  .track-cart-btn.in-cart:hover {
    background: rgba(231, 76, 60, 0.12);
  }

  .fade-up {
    animation: fadeUp 220ms ease-out;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 2. Disc Row Container */
  .disc-row-container {
    position: relative;
    width: 100%;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    overflow: hidden;
  }

  .disc-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    overflow-x: auto;
    overflow-y: visible;
    padding: 1rem 0;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    height: 100%;
    scroll-snap-type: x mandatory;
  }
  
  .disc-row::-webkit-scrollbar { 
    display: none; 
  }

  /* Spacers to allow first and last items to center */
  .disc-spacer {
    flex: 0 0 calc(50% - 70px);
    flex-shrink: 0;
    scroll-snap-align: none;
  }

  /* Disc styles - bigger */
  .disc-wrapper {
    flex-shrink: 0;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    filter: grayscale(0.8) brightness(0.5);
    opacity: 0.4;
    transform: scale(0.7);
    scroll-snap-align: center;
    will-change: transform, filter, opacity;
  }

  .disc-wrapper:hover {
    transform: scale(0.85);
    filter: grayscale(0.5) brightness(0.7);
    opacity: 0.7;
  }

  .disc-wrapper-active {
    transform: scale(1);
    filter: grayscale(0) brightness(1);
    opacity: 1;
    z-index: 2;
    box-shadow: 0 0 30px color-mix(in srgb, var(--gc) 15%, transparent);
  }

  .disc-wrapper-active:hover {
    transform: scale(1.05);
  }

  /* Pulse animation when playing */
  .disc-wrapper-active.disc-playing {
    animation: discPulse 2s ease-in-out infinite;
  }

  @keyframes discPulse {
    0%, 100% { 
      box-shadow: 0 0 30px color-mix(in srgb, var(--gc) 15%, transparent);
    }
    50% { 
      box-shadow: 0 0 50px color-mix(in srgb, var(--gc) 30%, transparent);
    }
  }

  .disc {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--gc) 15%, rgba(255,255,255,0.15)), 0 4px 30px rgba(0,0,0,0.6);
    transition: box-shadow 0.5s ease;
    will-change: transform, box-shadow;
  }

  .disc-wrapper-active .disc {
    box-shadow: 0 0 0 2px var(--gc), 0 0 40px color-mix(in srgb, var(--gc) 20%, transparent);
    animation: discGlow 2s ease-in-out infinite;
  }

  .disc-wrapper-active.disc-playing .disc {
    box-shadow: 0 0 0 2px var(--gc), 0 0 50px color-mix(in srgb, var(--gc) 30%, transparent);
    animation: discGlow 2s ease-in-out infinite;
  }

  .disc.fade-in {
    animation: discFadeIn 0.5s ease-in-out;
  }

  .disc.fade-in.spinning {
    animation: discFadeIn 0.5s ease-in-out, discGlow 2s ease-in-out infinite;
  }

  @keyframes discFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes discGlow {
    0%, 100% { box-shadow: 0 0 0 2px var(--gc), 0 0 30px color-mix(in srgb, var(--gc) 15%, transparent); }
    50% { box-shadow: 0 0 0 3px var(--gc), 0 0 50px color-mix(in srgb, var(--gc) 30%, transparent); }
  }

  .disc-hole {
    width: 20%;
    height: 20%;
    border-radius: 50%;
    background: #000;
    position: absolute;
    border: 4px solid color-mix(in srgb, var(--gc) 25%, rgba(255,255,255,0.1));
  }

  .disc-label {
    position: absolute;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.06em;
    z-index: 1;
    pointer-events: none;
    text-shadow: 0 1px 5px rgba(0,0,0,0.9);
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    max-width: 70%;
    transition: color 0.5s ease;
  }

  .disc-wrapper-active .disc-label {
    color: #fff;
  }

  .disc-active-indicator {
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gc);
    box-shadow: 0 0 15px color-mix(in srgb, var(--gc) 50%, transparent);
    animation: indicatorPulse 1.5s ease-in-out infinite;
  }

  @keyframes indicatorPulse {
    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.5; transform: translateX(-50%) scale(0.8); }
  }

  /* 3. Player Controls */
  .player-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .ctrl-btn {
    background: transparent;
    border: 1px solid #1e1e1e;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.3s, background 0.3s, color 0.3s, transform 0.2s;
  }

  .ctrl-btn:hover { 
    border-color: #daff00; 
    color: #daff00; 
  }

  .ctrl-btn:active { 
    transform: scale(0.9); 
  }

  .ctrl-play {
    width: 56px;
    height: 56px;
    background: #daff00;
    color: #000;
    border-color: #daff00;
  }

  .ctrl-play:hover { 
    background: #c4e000; 
    color: #000; 
    border-color: #c4e000; 
  }

  /* 4. Track list */
  .tracklist {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1px;
    border: 1px solid #1e1e1e;
    background: #1e1e1e;
    margin-top: 0.5rem;
  }

  .track {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #000;
    gap: 1rem;
    cursor: pointer;
    transition: background 0.3s;
  }

  .track:hover { 
    background: #0a0a0a; 
  }

  .track-active {
    background: #0a0a0a;
    border-left: 2px solid #daff00;
  }

  .track-num {
    font-size: 0.75rem;
    color: #ccc;
    min-width: 1.5rem;
    opacity: 0.5;
  }

  .track-info { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    gap: 0.1rem; 
  }

  .track-name { 
    font-size: 0.875rem; 
    color: #fff; 
  }

  .track-dur { 
    font-size: 0.75rem; 
    color: #ccc; 
    opacity: 0.5; 
  }

  @media (max-width: 480px) {
    .disc-row-container {
      height: 170px;
    }

    .disc-wrapper {
      width: 100px;
      height: 100px;
    }

    .disc-label {
      font-size: 0.6rem;
    }

    .disc-row {
      gap: 1rem;
    }

    .disc-spacer {
      flex: 0 0 calc(50% - 50px);
    }

    .track-info-header {
      min-height: 4rem;
    }

    .track-title {
      font-size: 1.2rem;
    }

    .track-artist {
      font-size: 0.8rem;
    }

    .track-album {
      font-size: 0.75rem;
    }
  }
</style>