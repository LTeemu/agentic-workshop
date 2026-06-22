<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const waterCanvas = ref(null)
const rippleCanvas = ref(null)
let scene, camera, renderer, material, mesh
let animId = null
let texture = null
let resizeObserver = null
let rippleCtx = null
let ripples = []
let rippleW = 0
let rippleH = 0

const BG_IMAGE = '/images/water-bg.jpg'

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.blob() })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        new THREE.TextureLoader().load(blobUrl, tex => {
          URL.revokeObjectURL(blobUrl)
          resolve(tex)
        }, undefined, err => {
          URL.revokeObjectURL(blobUrl)
          reject(err)
        })
      })
      .catch(reject)
  })
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ─── Full water shader: multi-layer distortion + caustic light + surface shimmer ──
const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uRipplePos[15];
  uniform float uRippleAge[15];
  uniform float uRippleCount;

  void main() {
    vec2 uv = vUv;

    // ── Slow breathing zoom — feels like looking through rising/falling water ──
    float zoom = 1.0 + sin(uTime * 0.12) * 0.02;
    uv = (uv - 0.5) * zoom + 0.5;

    // ── Slow circular drift — shifts viewpoint, reveals depth ──
    uv.x += sin(uTime * 0.05) * 0.01;
    uv.y += cos(uTime * 0.07) * 0.008;

    // ── Multi-layer wave distortion (reduced strength) ──
    float w1 = sin(uv.y * 14.0 + uTime * 0.7) * 0.0035;
    float w2 = sin(uv.y * 7.0 + uv.x * 5.0 + uTime * 0.5) * 0.0025;
    float w3 = sin(uv.y * 22.0 - uv.x * 4.0 + uTime * 1.1) * 0.002;
    float w4 = sin((uv.x + uv.y) * 9.0 + uTime * 0.35) * 0.0015;

    // Gentle oscillating sway — breathes left-right, never drifts off
    float sway = sin(uTime * 0.15) * 0.008;

    uv.x += w1 + w2 + sway;
    uv.y += w3 + w4;

    // ── Ripple UV displacement — distorts texture at each ripple center ──
    vec2 disp = vec2(0.0);
    for (int i = 0; i < 15; i++) {
      if (float(i) >= uRippleCount) break;
      vec2 rp = uRipplePos[i];
      float age = uRippleAge[i];
      vec2 delta = uv - rp;
      float d = length(delta);
      vec2 dir = d > 0.001 ? normalize(delta) : vec2(0.0);
      // Radial ring wave — expands outward, fades with distance and age
      float wave = sin((d - age * 0.04) * 30.0 - age * 2.0) * exp(-d * 8.0) * exp(-age * 1.5);
      disp += dir * wave * 0.003;
    }
    uv += disp;

    // Sample distorted texture
    vec4 tex = texture2D(uTexture, uv);

    // ── Slow pulse for surface breathing ──
    float pulse = sin(uTime * 0.25) * 0.25 + 0.75;

    // ── Area illumination (wave interference — no visible lines) ──
    float t = uTime * 0.3;
    float wx = uv.x * 9.0 + sin(uv.y * 4.0 + t) * 0.7;
    float wy = uv.y * 9.0 + sin(uv.x * 4.0 + t * 0.7) * 0.7;
    // Smooth wave interference for area lighting
    float illum = sin(wx * 1.8 + wy + t * 0.4) * sin(wy * 1.8 - wx + t * 0.6);
    illum = illum * 0.06 + 0.94; // 0.88 – 1.0 range, subtle

    // ── Surface ripple shimmer ──
    float ripple = sin(uv.x * 15.0 + uv.y * 10.0 + uTime * 0.8) *
                   sin(uv.x * 10.0 - uv.y * 15.0 + uTime * 0.6) * 0.08 + 0.92;
    ripple = ripple * pulse * 0.5 + (1.0 - pulse * 0.5);

    // ── Water shading (dark/light wave bands) ──
    float shade1 = sin(uv.x * 9.0 + uv.y * 7.0 + uTime * 0.4) * 0.5 + 0.5;
    float shade2 = sin(uv.x * 13.0 - uv.y * 11.0 + uTime * 0.7) * 0.5 + 0.5;
    float shade = (shade1 * 0.6 + shade2 * 0.4) * 0.25 + 0.75;

    // ── Compose final color ──
    vec3 result = tex.rgb;

    // Underwater darkening (reduce brightness)
    result *= 0.75;

    // Water tint (deep cyan-blue, submerged feel)
    vec3 waterTint = vec3(0.0, 0.12, 0.18);
    result = mix(result, waterTint, 0.25);

    // Area illumination from wave interference (subtle bright/dark areas)
    result *= illum;

    // Surface ripple shimmer (very subtle)
    vec3 shimmer = vec3(0.05, 0.15, 0.2);
    result += shimmer * (ripple - 0.92) * 0.3;

    // Water shadow bands
    result *= shade;

    // Subtle vignette
    float vig = 1.0 - length(vUv - 0.5) * 0.3;
    result *= vig;

    gl_FragColor = vec4(result, 1.0);
  }
`

const uniforms = {
  uTexture: { value: null },
  uTime: { value: 0 },
  uRipplePos: { value: Array.from({ length: 15 }, () => new THREE.Vector2(-1, -1)) },
  uRippleAge: { value: new Array(15).fill(0) },
  uRippleCount: { value: 0 },
}

async function initWater() {
  if (!waterCanvas.value) return

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  renderer = new THREE.WebGLRenderer({
    canvas: waterCanvas.value,
    alpha: false,
    antialias: true,
  })
  syncWaterSize()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  try {
    texture = await loadTexture(BG_IMAGE)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    uniforms.uTexture.value = texture
  } catch (err) {
    console.warn('[WaterMarquee] texture failed, using fallback')
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0a2a3a'
    ctx.fillRect(0, 0, 64, 64)
    texture = new THREE.CanvasTexture(canvas)
    uniforms.uTexture.value = texture
  }

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  })

  const geometry = new THREE.PlaneGeometry(2, 2)
  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  animate()
}

let time = 0

// ─── Wave displacement (same math as the shader's distortion, no texture drift) ──
function waveDisp(x, y, t) {
  const w1 = Math.sin(y * 14.0 + t * 0.7) * 0.014
  const w2 = Math.sin(y * 7.0 + x * 5.0 + t * 0.5) * 0.01
  const w3 = Math.sin(y * 22.0 - x * 4.0 + t * 1.1) * 0.008
  const w4 = Math.sin((x + y) * 9.0 + t * 0.35) * 0.006
  return { dx: (w1 + w2) * 1.2, dy: (w3 + w4) * 1.2 }
}

// ─── Card pool — each card drifts independently, recycles when off-screen ──
const sectionRef = ref(null)
const sectionHovered = ref(false)
const selectedWork = ref(null)
const CARD_W = 300
const GAP = 80
const POOL_SIZE = 8
const Y_RANGE = 120 // ±px from center

const works = [
  { title: 'Lumina — Brand Identity', medium: 'Branding', size: '2026', image: 'https://placehold.co/600x450/1a1410/00b4d8?text=Lumina', client: 'Lumina Tech', desc: 'A complete visual identity for an AI-driven lighting startup. From logo and color systems to typography and brand guidelines — a cohesive system across digital and print.' },
  { title: 'Verdant — E-Commerce', medium: 'Web Dev', size: '2025', image: 'https://placehold.co/600x450/0d201a/00b4d8?text=Verdant', client: 'Verdant Plants', desc: 'Custom e-commerce experience with real-time inventory, AR plant previews, and seamless checkout. Built with a headless CMS for flexible content management.' },
  { title: 'Pulse — Digital Platform', medium: 'Platform', size: '2025', image: 'https://placehold.co/600x450/0a1218/00b4d8?text=Pulse', client: 'Pulse Health', desc: 'Patient-facing health platform with interactive dashboards, appointment scheduling, telemedicine integration, and secure messaging between patients and providers.' },
  { title: 'Nomad — Travel App', medium: 'App', size: '2025', image: 'https://placehold.co/600x450/1a1410/00b4d8?text=Nomad', client: 'Nomad Co.', desc: 'Cross-platform travel companion app with interactive maps, itinerary building, social features, and real-time collaboration for group trip planning.' },
  { title: 'Form — Design System', medium: 'Design', size: '2024', image: 'https://placehold.co/600x450/0d1810/00b4d8?text=Form', client: 'Form Studio', desc: 'Comprehensive design system with 200+ components, interactive documentation, Figma integration, and themeable tokens for multi-brand use.' },
  { title: 'Cipher — Brand Campaign', medium: 'Campaign', size: '2024', image: 'https://placehold.co/600x450/1a1408/00b4d8?text=Cipher', client: 'Cipher Security', desc: 'Multi-channel brand campaign including a redesigned website, motion identity, print materials, and social media assets for a cybersecurity company.' },
  { title: 'Aether — Music Visualiser', medium: 'Interactive', size: '2026', image: 'https://placehold.co/600x450/0a1218/00b4d8?text=Aether', client: 'Aether Labs', desc: 'Real-time music visualisation experience using WebGL and audio analysis. Custom shaders, particle systems, and reactive lighting that respond to any audio input.' },
  { title: 'Drift — Mobile Game', medium: 'Game', size: '2025', image: 'https://placehold.co/600x450/150a10/00b4d8?text=Drift', client: 'Drift Studio', desc: 'A meditative mobile game about guiding a paper boat through procedurally generated water landscapes. Minimalist art style with ambient generative soundscapes.' },
  { title: 'Ember — Design Studio', medium: 'Branding', size: '2026', image: 'https://placehold.co/600x450/1a0e08/00b4d8?text=Ember', client: 'Ember Studio', desc: 'A bold visual identity for a boutique design studio. Custom typography, warm earthy palette, and a modular component library spanning web, print, and environmental graphics.' },
  { title: 'Tide — Analytics Dashboard', medium: 'Platform', size: '2026', image: 'https://placehold.co/600x450/081a1e/00b4d8?text=Tide', client: 'Tide Analytics', desc: 'Real-time business intelligence dashboard with interactive data visualisation, custom report builder, team collaboration tools, and live data streaming from multiple sources.' },
]

const colors = [
  ['#0a2a3a', '#051520'],
  ['#1a3a30', '#0d201a'],
  ['#2d1f12', '#1a1410'],
  ['#2a1a2a', '#150a15'],
  ['#1a2a20', '#0d1810'],
  ['#2a2010', '#1a1408'],
  ['#1a202a', '#0a1218'],
  ['#2a1a20', '#150a10'],
  ['#2a0e08', '#1a0804'],
  ['#081a20', '#040e12'],
]

let nextWorkIndex = 0

function randY() { return (Math.random() * 2 - 1) * Y_RANGE }
function randFlag() { return Math.floor(Math.random() * 6) }

// Linear constant speed based on viewport width
function getScrollSpeed(_t, vw) {
  return vw * 0.03 // 3% of viewport per second
}

const cards = ref(
  Array.from({ length: POOL_SIZE }, (_, i) => ({
    id: i,
    workIndex: nextWorkIndex++ % works.length,
    flagIndex: randFlag(),
    x: -0 + i * (CARD_W + GAP),
    y: randY(),
  }))
)

function animate() {
  time += 0.01
  if (uniforms.uTime) uniforms.uTime.value = time
  if (renderer && scene && camera) renderer.render(scene, camera)

  const w = window.innerWidth
  const h = window.innerHeight
  const speed = getScrollSpeed(time, w)

  const items = document.querySelectorAll('[data-card-id]')
  const cardMap = new Map()
  for (const el of items) cardMap.set(Number(el.dataset.cardId), el)

  // First pass: find rightmost card position for gap spacing
  let maxX = -Infinity
  for (const card of cards.value) {
    if (card.x > maxX) maxX = card.x
  }

  // Second pass: update and recycle
  for (const card of cards.value) {
    if (!sectionHovered.value) {
      card.x -= speed * 0.016
    }

    if (card.x + CARD_W < -50) {
      card.x = Math.max(w + 50, maxX + CARD_W + GAP)
      maxX = card.x
      card.y = randY()
      card.flagIndex = randFlag()
      card.workIndex = nextWorkIndex++ % works.length
    }

    // Apply position + wave displacement + flag clip-path
    const el = cardMap.get(card.id)
    if (el) {
      const cy = (card.y + Y_RANGE) / h + 0.4
      const { dy } = waveDisp(0.5, cy, time)
      el.style.transform = `translate(${card.x}px, ${card.y + dy * h}px)`

      const visual = el.querySelector('.marquee-item-visual')
      if (visual) visual.style.clipPath = `url(#flag-${card.flagIndex})`
    }
  }

  // ── Update & draw 2D ripple overlay ──
  syncRippleUniforms()
  drawRipples()

  animId = requestAnimationFrame(animate)
}

function syncWaterSize() {
  if (!renderer || !waterCanvas.value) return
  const parent = waterCanvas.value.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  renderer.setSize(rect.width, rect.height, false)
}

function closeModal() {
  selectedWork.value = null
}

// ─── 2D Ripple overlay — expanding stroke circles (like CodePen) ───
const RIPPLE_SPEED = 2
const RIPPLE_MAX = 50
const RIPPLE_COLOR = [46, 46, 46]

class Ripple {
  constructor(x, y, startSize) {
    this.x = x
    this.y = y
    this.size = startSize
    this.opacity = 1
    this.born = performance.now()
    this.opacityStep = (RIPPLE_SPEED / (RIPPLE_MAX - startSize)) / 2
  }
  update() {
    this.size += RIPPLE_SPEED
    this.opacity -= this.opacityStep
  }
  draw(ctx) {
    if (this.opacity <= 0) return
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${RIPPLE_COLOR[0]}, ${RIPPLE_COLOR[1]}, ${RIPPLE_COLOR[2]}, ${this.opacity})`
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function initRippleCanvas() {
  if (!rippleCanvas.value) return
  rippleCtx = rippleCanvas.value.getContext('2d')
  syncRippleSize()
}

function syncRippleSize() {
  if (!rippleCanvas.value || !sectionRef.value) return
  const rect = sectionRef.value.getBoundingClientRect()
  rippleW = rect.width
  rippleH = rect.height
  const dpr = Math.min(window.devicePixelRatio, 2)
  rippleCanvas.value.width = rippleW * dpr
  rippleCanvas.value.height = rippleH * dpr
  if (rippleCtx) {
    rippleCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}

function drawRipples() {
  if (!rippleCtx) return
  rippleCtx.clearRect(0, 0, rippleW, rippleH)

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    r.update()
    r.draw(rippleCtx)
    if (r.opacity <= 0) {
      ripples.splice(i, 1)
    }
  }
}

// Sync current ripple positions/ages to shader uniforms for UV displacement
function syncRippleUniforms() {
  if (rippleW === 0 || rippleH === 0) return
  const count = Math.min(ripples.length, 15)
  uniforms.uRippleCount.value = count
  const now = performance.now()
  for (let i = 0; i < count; i++) {
    const r = ripples[i]
    uniforms.uRipplePos.value[i].set(r.x / rippleW, 1.0 - r.y / rippleH)
    uniforms.uRippleAge.value[i] = (now - r.born) / 1000
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal()
}

// ─── Mouse tracking for ripple canvas ───
function onMouseEnter() {}
function onMouseLeave() {}
function onMouseMove(e) {
  if (!sectionRef.value || !rippleCtx) return
  const rect = sectionRef.value.getBoundingClientRect()
  ripples.push(new Ripple(e.clientX - rect.left, e.clientY - rect.top, 2))
}

onMounted(() => {
  requestAnimationFrame(() => initWater())
  requestAnimationFrame(() => initRippleCanvas())

  // Observe parent for size changes (handles initial & resize robustly)
  if (waterCanvas.value) {
    const parent = waterCanvas.value.parentElement
    if (parent) {
      resizeObserver = new ResizeObserver(() => {
        syncWaterSize()
        syncRippleSize()
      })
      resizeObserver.observe(parent)
    }
  }

  window.addEventListener('keydown', onKeydown)

  const section = sectionRef.value
  if (section) {
    section.addEventListener('mouseenter', onMouseEnter)
    section.addEventListener('mouseleave', onMouseLeave)
    section.addEventListener('mousemove', onMouseMove)
  }
})

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId)
  if (renderer) renderer.dispose()
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('keydown', onKeydown)

  const section = sectionRef.value
  if (section) {
    section.removeEventListener('mouseenter', onMouseEnter)
    section.removeEventListener('mouseleave', onMouseLeave)
    section.removeEventListener('mousemove', onMouseMove)
  }
})
</script>

<template>
  <section
    ref="sectionRef"
    class="marquee-section"
    id="reflection"
  >
    <!-- Water-eroded rock edge top — masked to show bg-brown texture -->
    <div class="rock-edge-divider rock-edge-divider-top bg-brown" style="mask: url(#marquee-rock-mask-top); -webkit-mask: url(#marquee-rock-mask-top);"></div>

    <!-- Fallback image behind Three.js canvas -->
    <div class="marquee-bg-layer">
      <img :src="BG_IMAGE" alt="" class="marquee-bg-img" loading="lazy" />
    </div>
    <!-- Three.js canvas with water-distorted image -->
    <canvas ref="waterCanvas" class="water-canvas"></canvas>
    <!-- Dark gradient overlay -->
    <div class="marquee-overlay"></div>
    <!-- 2D ripple overlay — expanding stroke circles, CSS-blurred -->
    <canvas ref="rippleCanvas" class="ripple-canvas"></canvas>
    <div class="marquee-overlay"></div>

    <div class="marquee-content">
      <div class="marquee-header">
        <h2 class="marquee-title">
          Reflection
          <span class="marquee-sub-text">Of</span>
          Work
        </h2>
      </div>

      <div class="marquee-scroll">
        <div
          v-for="card in cards"
          :key="card.id"
          :data-card-id="card.id"
          class="marquee-item"
          @mouseenter="sectionHovered = true"
          @mouseleave="sectionHovered = false"
          @click="selectedWork = card.workIndex"
        >
          <div
            class="marquee-item-visual"
            :style="{
              background: `linear-gradient(135deg, ${colors[card.workIndex][0]}, ${colors[card.workIndex][1]})`,
            }"
          >
            <img
              :src="works[card.workIndex].image"
              :alt="works[card.workIndex].title"
              class="marquee-item-img"
              loading="lazy"
            />
          </div>
          <div class="marquee-item-info">
            <div class="marquee-item-title">{{ works[card.workIndex].title }}</div>
            <div class="marquee-item-meta">{{ works[card.workIndex].medium }} &mdash; {{ works[card.workIndex].size }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project detail modal -->
    <Transition name="modal">
      <div v-if="selectedWork !== null" class="modal-backdrop" @click.self="closeModal">
        <article class="modal-card">
          <button class="modal-close" @click="closeModal" aria-label="Close">&times;</button>
          <div class="modal-visual" :style="{ background: `linear-gradient(135deg, ${colors[selectedWork][0]}, ${colors[selectedWork][1]})` }">
            <img :src="works[selectedWork].image" :alt="works[selectedWork].title" class="modal-img" />
            <div class="modal-img-overlay"></div>
          </div>
          <div class="modal-body">
            <div class="modal-meta">
              <span class="modal-medium">{{ works[selectedWork].medium }}</span>
              <span class="modal-size">{{ works[selectedWork].size }}</span>
            </div>
            <h3 class="modal-title">{{ works[selectedWork].title }}</h3>
            <p class="modal-client">{{ works[selectedWork].client }}</p>
            <p class="modal-desc">{{ works[selectedWork].desc }}</p>
          </div>
        </article>
      </div>
    </Transition>

    <!-- Water-eroded rock edge bottom — masked to show bg-brown texture -->
    <div class="rock-edge-divider rock-edge-divider-bottom bg-brown" style="mask: url(#marquee-rock-mask-bottom); -webkit-mask: url(#marquee-rock-mask-bottom);"></div>

    <!-- Hidden SVG defs for rock-edge masks + flag-shaped clip-paths -->
    <svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
      <defs>
        <mask id="marquee-rock-mask-top">
          <path d="M0,0 L1440,0 C1440,6 1380,14 1320,8 C1260,2 1200,10 1140,16 C1080,22 1020,8 960,4 C900,0 840,18 780,22 C720,26 660,10 600,6 C540,2 480,20 420,24 C360,28 300,12 240,8 C180,4 120,16 60,12 C40,10 20,6 0,8 Z" fill="white" />
        </mask>
        <mask id="marquee-rock-mask-bottom">
          <path d="M0,32 L1440,32 C1440,26 1380,18 1320,24 C1260,30 1200,22 1140,16 C1080,10 1020,24 960,28 C900,32 840,14 780,10 C720,6 660,22 600,26 C540,30 480,12 420,8 C360,4 300,20 240,24 C180,28 120,16 60,20 C40,22 20,26 0,24 Z" fill="white" />
        </mask>
        <clipPath id="flag-0" clipPathUnits="objectBoundingBox">
          <path d="M0,0.01 C0.15,-0.015 0.35,0.035 0.5,0.01 C0.65,-0.015 0.85,0.035 1,0.01 L1,0.99 L0,0.99 Z" />
        </clipPath>
        <clipPath id="flag-1" clipPathUnits="objectBoundingBox">
          <path d="M0,0.01 L1,0.01 L1,0.99 C0.85,1.015 0.65,0.965 0.5,0.99 C0.35,1.015 0.15,0.965 0,0.99 Z" />
        </clipPath>
        <clipPath id="flag-2" clipPathUnits="objectBoundingBox">
          <path d="M0,0.01 C0.15,-0.015 0.35,0.035 0.5,0.01 C0.65,-0.015 0.85,0.035 1,0.01 L1,0.99 C0.85,1.015 0.65,0.965 0.5,0.99 C0.35,1.015 0.15,0.965 0,0.99 Z" />
        </clipPath>
        <clipPath id="flag-3" clipPathUnits="objectBoundingBox">
          <path d="M0,0.01 L0.99,0.01 C1.015,0.15 0.965,0.35 0.99,0.5 C1.015,0.65 0.965,0.85 0.99,0.99 L0,0.99 Z" />
        </clipPath>
        <clipPath id="flag-4" clipPathUnits="objectBoundingBox">
          <path d="M0,0.01 C0.2,-0.005 0.4,0.025 0.6,0.01 C0.8,-0.005 1,0.025 1,0.015 L1,0.99 C0.8,0.975 0.6,1.005 0.4,0.99 C0.2,0.975 0,1.005 0,0.99 Z" />
        </clipPath>
        <clipPath id="flag-5" clipPathUnits="objectBoundingBox">
          <path d="M0.005,0.01 C0.3,0 0.7,0.02 0.995,0.01 L0.995,0.99 C0.7,1.01 0.3,0.99 0.005,0.99 Z" />
        </clipPath>
      </defs>
    </svg>
  </section>
</template>

<style scoped>
.marquee-section {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #081a22;
}

/* ── Water-eroded rock edges — smooth flowing curves ── */
.rock-edge-divider {
  position: absolute;
  left: 0;
  width: 100%;
  height: 32px;
  z-index: 20;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  mask-size: 100% 100%;
  -webkit-mask-size: 100% 100%;
}

.rock-edge-divider-top {
  top: -1px;
}

.rock-edge-divider-bottom {
  bottom: -1px;
}

.marquee-bg-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.marquee-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.5;
  pointer-events: none;
}

.water-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* 2D ripple overlay — CSS-blurred expanding rings */
.ripple-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  z-index: 1;
  filter: blur(5px);
}

.marquee-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(5, 10, 15, 0.25) 0%,
    rgba(5, 10, 15, 0.08) 50%,
    rgba(5, 10, 15, 0.35) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.marquee-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-16) var(--space-8) 0;
}

.marquee-header {
  text-align: center;
  flex-shrink: 0;
}

.marquee-title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-5xl), 8vw, var(--text-7xl));
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.03em;
  line-height: 1.08;
  color: var(--color-text);
}

.marquee-sub-text {
  color: var(--color-text-dim);
  font-size: 0.65em;
  vertical-align: middle;
  display: inline-block;
  margin: 0 0.15em;
}

.marquee-scroll {
  flex: 1;
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 8%,
    #000 92%,
    transparent 100%
  );
}

.marquee-item {
  position: absolute;
  top: calc(50% - 120px);
  width: 280px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity var(--duration-normal) var(--ease-out-expo);
  will-change: transform;
}

.marquee-item:hover {
  opacity: 1;
}

.marquee-item-visual {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  margin-bottom: var(--space-3);
  transition: transform var(--duration-normal) var(--ease-out-expo);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* Image — submerged look via screen blend with the dark gradient bg */
.marquee-item-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: screen;
  opacity: 0.7;
  transition: opacity var(--duration-normal) var(--ease-out-expo);
}

.marquee-item:hover .marquee-item-img {
  opacity: 0.9;
}

/* Water depth gradient overlay */
.marquee-item-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(2, 10, 14, 0.35) 0%,
    rgba(0, 180, 216, 0.08) 40%,
    rgba(0, 180, 216, 0.03) 60%,
    rgba(2, 10, 14, 0.4) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.marquee-item:hover .marquee-item-visual {
  transform: scale(1.03);
}

.marquee-item-info {
  padding: 0 var(--space-1);
}

.marquee-item-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-style: italic;
  color: var(--color-text);
  margin-bottom: var(--space-1);
  line-height: 1.2;
}

.marquee-item-meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .marquee-content {
    padding: var(--space-12) var(--space-4) 0;
  }
}

/* ─── Project detail modal ─── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(5, 3, 2, 0.85);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-8);
}

.modal-card {
  max-width: 640px;
  width: 100%;
  background: var(--color-cave-dark);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  position: relative;
}

.modal-close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 2;
  background: rgba(5, 3, 2, 0.6);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  width: 36px;
  height: 36px;
  font-size: var(--text-xl);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--duration-fast) var(--ease-out-expo);
  line-height: 1;
}

.modal-close:hover {
  background: var(--color-cyber);
  color: var(--color-bg);
  border-color: var(--color-cyber);
}

.modal-visual {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.modal-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: screen;
}

.modal-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(10, 7, 6, 0.4) 80%,
    rgba(10, 7, 6, 0.9) 100%
  );
  pointer-events: none;
}

.modal-body {
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.modal-meta {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.modal-medium {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-water-surface);
  letter-spacing: 0.1em;
}

.modal-size {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  font-style: italic;
  color: var(--color-text);
  line-height: 1.2;
}

.modal-client {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.7;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s var(--ease-out-expo);
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.3s var(--ease-out-expo);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card {
  transform: translateY(8px) scale(0.98);
}

.modal-leave-to .modal-card {
  transform: translateY(-8px) scale(0.98);
}
</style>
