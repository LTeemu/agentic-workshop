<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const canvas = ref(null)
let scene, camera, renderer, material, mesh
let mouseX = 0.5
let mouseY = 0.5

// ─── Shader ──────────────────────────────────────────
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;

  // Simple 2D value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Fractal Brownian Motion for rock texture
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 pos = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    // ── Cave darkness base ──
    vec3 caveDark = vec3(0.018, 0.012, 0.008);
    vec3 color = caveDark;

    // ── Cave wall texture ──
    float rock = fbm(uv * 6.0 + 1.7);
    float rockDetail = fbm(uv * 14.0 + 3.2);
    float rockMix = rock * 0.7 + rockDetail * 0.3;

    // Rock formations — ridges and veins
    float ridge = abs(sin(uv.x * 12.0 + fbm(uv * 4.0) * 3.0)) * 0.06;
    float wall = smoothstep(0.35, 0.5, rockMix + ridge);

    vec3 rockColor = mix(
      vec3(0.035, 0.025, 0.018),  // dark brown rock
      vec3(0.06, 0.04, 0.03),     // lighter rock
      wall * 0.5
    );

    // Add subtle horizontal strata (cave formations)
    float strata = sin(uv.y * 50.0 + fbm(uv * 3.0) * 5.0) * 0.5 + 0.5;
    rockColor += vec3(0.01, 0.008, 0.005) * strata * 0.3;

    color = mix(color, rockColor, 0.6);

    // ── Bioluminescent glow spots ──
    // 12 glow worms / luminous fungi at fixed pseudo-random positions
    vec3 glowColor = vec3(0.0, 0.0, 0.0);

    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 seed = vec2(fi * 7.17, fi * 13.31 + 3.7);

      // Position in UV space, biased toward upper/mid (cave ceiling)
      vec2 gp = vec2(
        hash(seed + 1.0),
        0.15 + hash(seed + 2.0) * 0.6
      );

      // Size variation
      float size = 0.03 + hash(seed + 3.0) * 0.06;

      // Pulse — each glows at its own rhythm
      float phase = hash(seed + 4.0) * 6.28;
      float speed = 0.4 + hash(seed + 5.0) * 0.6;
      float pulse = 0.5 + 0.5 * sin(uTime * speed + phase);

      // Distance from fragment to glow point
      vec2 dPos = (uv - gp) / vec2(1.0, 0.7);
      float dist = length(dPos);

      // Gaussian glow falloff
      float glow = exp(-dist * dist * 3.0 / (size * size));
      glow *= pulse;

      // Color — cyan to teal with slight variation
      float hueShift = hash(seed + 6.0) * 0.2;
      vec3 gCol = mix(
        vec3(0.0, 0.5, 0.8),  // teal
        vec3(0.0, 0.9, 1.0),  // bright cyan
        hash(seed + 7.0)
      );

      // Inner bright core
      float core = exp(-dist * dist * 12.0 / (size * size));
      glowColor += gCol * glow * 0.25;
      glowColor += vec3(0.0, 0.8, 1.0) * core * pulse * 0.12;
    }

    // ── Ambient glow — distant bioluminescent haze near bottom ──
    float ambientGlow = smoothstep(1.0, 0.2, uv.y) * 0.015;
    ambientGlow *= 0.6 + 0.4 * sin(uTime * 0.2 + uv.x * 5.0);
    glowColor += vec3(0.0, 0.3, 0.5) * ambientGlow;

    // ── Mouse interaction — gentle light reveal ──
    vec2 mouseUv = uMouse;
    float mouseDist = length(uv - mouseUv);
    float mouseLight = exp(-mouseDist * 6.0) * 0.15;
    mouseLight += exp(-mouseDist * 20.0) * 0.1;

    // Reveal rock color under mouse
    color += rockColor * mouseLight * 0.5;
    // Reveal bioluminescence under mouse
    glowColor *= 1.0 + mouseLight * 0.8;

    // ── Atmospheric fog (bottom is darker) ──
    float fog = smoothstep(0.0, 1.0, uv.y) * 0.15;
    color *= 1.0 - fog;

    // ── Combine ──
    color += glowColor;

    // ── Vignette ──
    float vig = 1.0 - length(uv - 0.5) * 0.7;
    color *= vig;

    // ── Subtle film grain (reduces banding) ──
    float grain = hash(uv + uTime * 0.01) * 0.02;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`

const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
}

// ─── Scene setup ────────────────────────────────────
function initScene() {
  if (!canvas.value) return

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    alpha: false,
    antialias: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  })

  const geometry = new THREE.PlaneGeometry(2, 2)
  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
}

function resize() {
  if (!renderer) return
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
}

let animId = null

function animate() {
  if (material) {
    uniforms.uTime.value += 0.01
    uniforms.uMouse.value.x += (mouseX - uniforms.uMouse.value.x) * 0.05
    uniforms.uMouse.value.y += (mouseY - uniforms.uMouse.value.y) * 0.05
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
  animId = requestAnimationFrame(animate)
}

function onMouseMove(e) {
  mouseX = e.clientX / window.innerWidth
  mouseY = 1.0 - e.clientY / window.innerHeight
}

onMounted(() => {
  initScene()
  animate()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove)
})

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
  if (renderer) renderer.dispose()
})
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
