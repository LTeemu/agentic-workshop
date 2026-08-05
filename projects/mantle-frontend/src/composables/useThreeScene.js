import { onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { createAnimationLoop } from './createAnimationLoop';

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
 * @param {(ctx: { scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer, time: number, delta: number }) => void} [options.onAnimate]
 *        Called every frame with `time` (seconds, monotonically increasing) and `delta`
 *        (seconds since last frame). Update uniforms here; renderer.render() runs after.
 * @param {(w: number, h: number) => void} [options.onResize]
 *        Called whenever the parent element resizes. Use this to update aspect uniforms.
 * @param {object} [options.config] - extra createOptions for the WebGLRenderer.
 * @returns {{ start: () => void, stop: () => void }}
 */
export function useThreeScene(canvasRef, options = {}) {
  const { onSetup, onAnimate, onResize, config = {} } = options;

  let scene = null;
  let camera = null;
  let renderer = null;
  let resizeObserver = null;
  let visibilityObserver = null;
  let loop = null;
  let staticTime = 0;

  function renderFrame(time) {
    if (onAnimate) onAnimate({ scene, camera, renderer, time, delta: 0 });
    renderer.render(scene, camera);
  }

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

  function start() {
    if (!canvasRef.value) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: false,
      // Full-screen shader quad — antialias provides no benefit here
      antialias: false,
      ...config,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Let the component add its own meshes before the first frame
    if (onSetup) onSetup({ scene, camera, renderer });

    // Sync size before any render — the static frame below needs a real buffer
    syncSize();

    const parent = canvasRef.value.parentElement;
    if (parent) {
      // Resize observer — sync renderer size when the container changes
      resizeObserver = new ResizeObserver(() => {
        syncSize();
        // Redraw the static frame so it doesn't blank out on resize
        if (reducedMotion) renderFrame(staticTime);
      });
      resizeObserver.observe(parent);
    }

    // Honor reduced-motion: render a single mid-animation frame, no loop
    if (reducedMotion) {
      staticTime = 1000 + Math.random() * 500;
      renderFrame(staticTime);
      return;
    }

    loop = createAnimationLoop(({ time, delta }) => {
      if (onAnimate) onAnimate({ scene, camera, renderer, time, delta });
      renderer.render(scene, camera);
    });

    // Pause animation when scrolled out of view — saves GPU/CPU
    if (parent) {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) loop.start();
            else loop.stop();
          }
        },
        { threshold: 0 },
      );
      visibilityObserver.observe(parent);
    }

    loop.start();
  }

  function stop() {
    if (loop) loop.stop();
    if (visibilityObserver) visibilityObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (renderer) renderer.dispose();
    scene = null;
    camera = null;
    renderer = null;
    loop = null;
  }

  onBeforeUnmount(stop);

  return { start, stop };
}
