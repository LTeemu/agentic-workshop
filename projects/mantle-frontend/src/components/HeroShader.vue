<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { useThreeScene } from '../composables/useThreeScene'

const canvas = ref(null)

// ─── Shader ──────────────────────────────────────────
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;

  // Corrected distance where x is adjusted for pixel aspect ratio
  float sd(vec2 a, vec2 b) {
    vec2 d = a - b;
    d.x *= uAspect;
    return length(d);
  }

  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(0.004, 0.012, 0.028);
    float gridSz = 0.04; // 25 cells across — bigger grid

    // Rotated UV for 45° diamond grid
    const float rt = 0.7071; // cos(45°) = sin(45°)
    vec2 gridUv = vec2(
        (uv.x - 0.5) * rt - (uv.y - 0.5) * rt,
        (uv.x - 0.5) * rt + (uv.y - 0.5) * rt
    ) + 0.5;

    for (int i = 0; i < 3; i++) {
      float fi = float(i);

      float hue = fract(fi * 0.3456 + 0.7890);
      float period = 3.5 + fract(fi * 0.2345 + 0.5678) * 2.5;
      float maxSize = 0.025 + fract(fi * 0.6789 + 0.1234) * 0.04;

      vec3 starColor = mix(vec3(0.25, 0.7, 0.9), vec3(0.9, 0.55, 0.2), hue);

      // New random position each cycle
      float cycle = floor(uTime / period);
      float sx = fract(cycle * 0.7123 + fi * 0.3631);
      float sy = fract(cycle * 0.5637 + fi * 0.3179);

      float t = fract(uTime / period);
      float grow = t * t;
      float size = 0.003 + grow * maxSize;

      // Wobble
      float ws = 0.001 + t * 0.025;
      float wx = sin(t * 8.0 + fi * 4.1) * ws;
      float wy = cos(t * 6.0 + fi * 6.3) * ws;
      vec2 pos = vec2(sx + wx, sy + wy);

      float d = sd(uv, pos);
      float core = exp(-d * d / (size * size));
      float glow = exp(-d * d / (size * size * 8.0)) * 0.5;
      float halo = exp(-d * d / (size * size * 20.0)) * 0.12;

      // ── Explosion (blends in as t→1) ──
      float explode = smoothstep(0.6, 1.0, t);
      float e = 1.0 - t;

      // Direction from star to current pixel
      vec2 dirToPixel = uv - pos;
      float pixelAngle = atan(dirToPixel.y, dirToPixel.x);

      // Wavy expanding ring
      float wave = sin(pixelAngle * 3.0 + fi * 2.0 + e * 2.0) * 0.025;
      float ringR = abs(d - (e * 0.2 + wave));
      float ring = exp(-ringR * ringR * 300.0) * explode * 0.35;

      // Central flash
      float flash = exp(-d * d / (size * size * 2.0)) * exp(-e * 8.0) * 0.5;

      // 4 debris particles — curved trajectories
      float debris = 0.0;
      for (int j = 0; j < 4; j++) {
        float fj = float(j);
        float angle = fj * 1.5708 + fi;
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 perp = vec2(-dir.y, dir.x);
        float arc = (fj - 1.5) * 0.12;
        vec2 dp = pos + dir * e * 0.25 + perp * arc * e * e * 0.25;
        float dd = sd(uv, dp);
        debris += exp(-dd * dd * 500.0);
      }
      debris *= explode * 0.28;

      // ── 2.5D Crater dent — immediate impact flash, gone before first shockwave ring ──
      float craterActive = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.08, 0.15, t));
      float craterSize = e * 0.25 + 0.02;
      float cd = d / craterSize;

      float craterDark = exp(-cd * cd * 2.0) * 0.2;

      vec2 lightOffset = vec2(0.08, 0.04);
      float rimD = sd(uv, pos + lightOffset * craterSize) / craterSize;
      float craterLight = exp(-(rimD - 1.0) * (rimD - 1.0) * 150.0) * 0.12;

      vec3 crater = (vec3(0.2, 0.22, 0.26) * craterLight - vec3(craterDark)) * craterActive;

      // ── Grid cell paint + shockwave — lit cells around the hit ──
      float prevCycle = floor(uTime / period) - 1.0;
      float pSx = fract(prevCycle * 0.7123 + fi * 0.3631);
      float pSy = fract(prevCycle * 0.5637 + fi * 0.3179);
      float pWx = sin(1.0 * 8.0 + fi * 4.1) * 0.026;
      float pWy = cos(1.0 * 6.0 + fi * 6.3) * 0.026;
      vec2 hitPos = vec2(pSx + pWx, pSy + pWy);
      vec2 hitGridPos = vec2(
          (hitPos.x - 0.5) * rt - (hitPos.y - 0.5) * rt,
          (hitPos.x - 0.5) * rt + (hitPos.y - 0.5) * rt
      ) + 0.5;

      float paintAge = exp(-t * 3.0); // fades over ~1s
      vec2 hitCell = floor(hitGridPos / gridSz);
      vec2 myCell = floor(gridUv / gridSz);
      vec2 cellDist = abs(hitCell - myCell);
      float gridDist = length(cellDist); // Euclidean — round rings

      // Expanding shockwave ring in grid space
      float ringRadius = t * 5.0; // expands from 0 to 5 cells outward
      float ringWidth = 0.6;
      float shockRing = exp(-(gridDist - ringRadius) * (gridDist - ringRadius) / (ringWidth * ringWidth));
      shockRing *= paintAge * 1.5;

      // Center hot cell — brief flash, gone before first shockwave ring
      float centerGlow = paintAge * 2.0 * (1.0 - step(0.5, gridDist)) * (1.0 - smoothstep(0.0, 0.12, t));

      // Fill area inside the ring with a dimmer glow
      float innerGlow = paintAge * 0.4 * (1.0 - step(ringRadius, gridDist)) * exp(-gridDist * 0.5);

      float fade = 1.0 - smoothstep(0.92, 1.0, t);

      color += starColor * ((core * 1.5 + glow + halo) * fade + flash + ring + debris) +
               crater +
               starColor * (centerGlow + shockRing + innerGlow);
    }

    // ── Ambient — warm bioluminescent pool glow ──
    color += vec3(0.04, 0.15, 0.2) * exp(-sd(uv, vec2(0.5, 0.5)) * sd(uv, vec2(0.5, 0.5)) * 2.5) * 0.025;

    // ── Pixel glass grid — anti-aliased, diamond edges ──
    vec2 gf = fract(gridUv / gridSz);
    vec2 fw = fwidth(gridUv / gridSz);
    vec2 distToEdge = min(gf, 1.0 - gf);
    float gridLine = 1.0 - smoothstep(0.0, max(fw.x, fw.y) * 2.0, min(distToEdge.x, distToEdge.y));
    color += vec3(0.03, 0.05, 0.07) * gridLine;

    // ── Vignette — gentler darkening ──
    float vig = 1.0 - length(uv - 0.5) * 0.5;
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
  }
`

const uniforms = {
  uTime: { value: 0 },
  uAspect: { value: 1 },
}

// ─── Shared Three.js boilerplate — scene, camera, renderer,
//      ResizeObserver, IntersectionObserver pause, rAF loop, cleanup ──
const { start } = useThreeScene(canvas, {
  onSetup: ({ scene }) => {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    })

    // Full-screen quad
    const geo = new THREE.BufferGeometry()
    const verts = new Float32Array([-1, -1, 0,  1, -1, 0,  -1, 1, 0,  1, 1, 0])
    const uvs = new Float32Array([0, 0,  1, 0,  0, 1,  1, 1])
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex([0, 1, 2, 2, 1, 3])
    scene.add(new THREE.Mesh(geo, material))
  },
  onAnimate: () => {
    uniforms.uTime.value += 0.01
  },
  onResize: (w, h) => {
    uniforms.uAspect.value = w / h
  },
})

onMounted(() => start())
</script>

<template>
  <canvas ref="canvas" class="hero-canvas"></canvas>
</template>

<style scoped>
.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
