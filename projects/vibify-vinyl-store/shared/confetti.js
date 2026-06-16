/**
 * Vibify — canvas-based confetti blast effect.
 * No dependencies. Creates a full-viewport overlay, fires particles with
 * random colors/velocities, then self-destructs.
 */

const COLORS = ['#daff00', '#7c4dff', '#ce93d8', '#ffb74d', '#ff4d4d', '#4dffb8', '#4da6ff'];

/**
 * Fire a confetti burst from the center of the viewport.
 * @param {Object} [options]
 * @param {number} [options.count=120]  - Number of confetti pieces
 * @param {number} [options.spread=90]  - Degrees of spread (360 = full circle)
 * @param {number} [options.duration=3000] - How long before cleanup (ms)
 */
export function confetti(options = {}) {
  const { count = 120, spread = 90, duration = 3000 } = options;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    pointer-events: none; width: 100vw; height: 100vh;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const startAngle = (90 - spread / 2) * (Math.PI / 180);
  const angleRange = spread * (Math.PI / 180);

  /** @type {Array<{x: number, y: number, vx: number, vy: number, size: number, color: string, rotation: number, rotSpeed: number, opacity: number}>} */
  const particles = [];

  for (let i = 0; i < count; i++) {
    const angle = startAngle + Math.random() * angleRange;
    const speed = 4 + Math.random() * 6;
    const size = 4 + Math.random() * 8;
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - 2 + Math.random() * -2,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Fade out in the last 40%
    const fadeOut = Math.max(0, 1 - (progress - 0.6) / 0.4);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravity
      p.rotation += p.rotSpeed;
      p.vx *= 0.99;
      p.opacity = fadeOut;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * (Math.PI / 180));
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      // Draw a small rectangle (like a confetti piece)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
