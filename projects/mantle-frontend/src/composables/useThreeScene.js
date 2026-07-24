import { onBeforeUnmount } from 'vue';
import * as THREE from 'three';

/**
 * Shared Three.js scene boilerplate: creates an orthographic scene + camera + WebGL
 * renderer, manages a requestAnimationFrame loop with pause-on-scroll-out-of-view,
 * handles ResizeObserver on the parent element, and cleans up on unmount.
 *
 * @param {import('vue').Ref<HTMLCanvasElement|null>} canvasRef - shallowRef to the <canvas>
 * @param {object} options
 * @param {(ctx: { scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer }) => void} [options.onSetup]
 *        Called once after scene/camera/renderer are created, before animation starts.
 *        Use this to add meshes / materials to the scene.
 * @param {(ctx: { scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer, time: number }) => void} [options.onAnimate]
 *        Called every frame. Update uniforms here. `renderer.render()` is called
 *        automatically after this callback.
 * @param {(w: number, h: number) => void} [options.onResize]
 *        Called whenever the parent element resizes. Use this to update aspect uniforms.
 * @returns {{ start: () => void, stop: () => void }}
 */
export function useThreeScene(canvasRef, options = {}) {
  const { onSetup, onAnimate, onResize } = options;

  let scene = null;
  let camera = null;
  let renderer = null;
  let animId = null;
  let paused = false;
  let resizeObserver = null;
  let visibilityObserver = null;
  let time = 0;

  function syncSize() {
    if (!renderer || !canvasRef.value) return;
    const parent = canvasRef.value.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    renderer.setSize(w, h, false);
    if (onResize) onResize(w, h);
  }

  function animate() {
    if (paused) {
      animId = null;
      return;
    }

    // Fixed-step time accumulator (~60 fps equivalent)
    time += 0.016;
    if (onAnimate) onAnimate({ scene, camera, renderer, time });
    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }

  function start() {
    if (!canvasRef.value) return;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: false,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Let the component add its own meshes before the first frame
    if (onSetup) onSetup({ scene, camera, renderer });

    // Initial size sync — deferred so the parent layout is settled
    requestAnimationFrame(() => syncSize());

    const parent = canvasRef.value.parentElement;
    if (parent) {
      // Resize observer — sync renderer size when the container changes
      resizeObserver = new ResizeObserver(() => syncSize());
      resizeObserver.observe(parent);

      // Pause animation when scrolled out of view — saves GPU/CPU
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            paused = !entry.isIntersecting;
            if (!paused && !animId) {
              animId = requestAnimationFrame(animate);
            }
          }
        },
        { threshold: 0 },
      );
      visibilityObserver.observe(parent);
    }

    animId = requestAnimationFrame(animate);
  }

  function stop() {
    if (animId) cancelAnimationFrame(animId);
    if (visibilityObserver) visibilityObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (renderer) renderer.dispose();
    scene = null;
    camera = null;
    renderer = null;
    animId = null;
    paused = false;
  }

  onBeforeUnmount(stop);

  return { start, stop };
}
