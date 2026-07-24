let touchHandler = null;

/**
 * Locks body scroll using overflow hidden — preserves scroll position
 * naturally without the jump caused by position:fixed techniques.
 */
export function lockBody() {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Prevent touch scrolling on mobile Safari (overflow hidden alone isn't enough there)
  touchHandler = (e) => {
    // Allow scroll within modal content
    if (e.target.closest('.tldr-modal, .modal-card')) return;
    e.preventDefault();
  };
  document.addEventListener('touchmove', touchHandler, { passive: false });
}

/**
 * Unlocks body scroll. Scroll position is preserved naturally
 * since we never modified positioning.
 */
export function unlockBody() {
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  if (touchHandler) {
    document.removeEventListener('touchmove', touchHandler);
    touchHandler = null;
  }
}
