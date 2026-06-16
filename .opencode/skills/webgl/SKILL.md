---
name: webgl
description: '3D web experiences with Three.js, WebGL, React Three Fiber. Scene setup, geometry, materials, lighting, loaders, post-processing, shaders, and WebGL performance.'
risk: unknown
source: community patterns
date_added: 2026-06-14
tags: [threejs, webgl, 3d, shader, r3f, react-three-fiber, gpu, glsl]
tools: [opencode, claude, cursor, gemini]
---

# WebGL & 3D Web Experiences

You are a **3D web engineer**. You translate spatial ideas into interactive, performant WebGL experiences. You know when to reach for Three.js, when React Three Fiber is the right abstraction, and when a CSS 3D transform is all that's needed.

---

## 1. Tool Selection

| Need                         | Tool                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| Simple 3D (card flip, depth) | CSS `perspective` + `transform`                              |
| Full 3D scene (no framework) | Three.js                                                     |
| 3D in React                  | React Three Fiber (R3F) + Drei                               |
| Declarative 3D scenes        | R3F primitives                                               |
| High-quality post-processing | Three.js EffectComposer or R3F `@react-three/postprocessing` |
| Physics                      | cannon-es, Rapier, or `@react-three/rapier`                  |
| 3D model viewing             | drei `useGLTF` + `Environment`                               |
| GPU particles                | Three.js Points or R3F `<Points>`                            |
| Custom shaders               | Three.js `ShaderMaterial` or drei `shaderMaterial`           |
| Spline / Playcanvas export   | drei `Spline` / glTF pipeline                                |
| No-code 3D → web             | Spline → export React/vanilla                                |

---

## 2. Three.js Scene Setup

### Basic Scene

```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0b);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### Responsive Pixel Ratio

```javascript
// Always cap at 2 — retina is already sharp, 3x wastes GPU
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

---

## 3. Geometry & Meshes

### Primitives

```javascript
// Box
new THREE.BoxGeometry(1, 1, 1)

// Sphere (radius, widthSegments, heightSegments)
new THREE.SphereGeometry(1, 32, 32)

// Plane
new THREE.PlaneGeometry(2, 2)

// Cone / Cylinder
new THREE.ConeGeometry(1, 2, 32)
new THREE.CylinderGeometry(1, 1, 2, 32)

// Torus / TorusKnot
new THREE.TorusGeometry(1, 0.3, 16, 100)
new THREE.TorusKnotGeometry(1, 0.3, 100, 16)

// Custom BufferGeometry
const geo = new THREE.BufferGeometry()
const vertices = new Float32Array([...])
geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
geo.computeVertexNormals()
```

### Instancing (performance)

```javascript
const count = 10000;
const mesh = new THREE.InstancedMesh(geometry, material, count);
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
  dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  dummy.scale.setScalar(Math.random() * 0.5);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
```

---

## 4. Materials

### Built-in Materials

```javascript
// MeshBasicMaterial — no lighting, flat color
new THREE.MeshBasicMaterial({ color: 0x64b5f6, wireframe: false });

// MeshStandardMaterial — PBR, needs lights
new THREE.MeshStandardMaterial({
  color: 0x64b5f6,
  roughness: 0.3,
  metalness: 0.1,
  envMap: envTexture,
  transparent: true,
  opacity: 0.8,
});

// MeshPhysicalMaterial — highest quality PBR
new THREE.MeshPhysicalMaterial({
  color: 0x64b5f6,
  roughness: 0.2,
  metalness: 0.0,
  clearcoat: 0.1,
  clearcoatRoughness: 0.2,
  transparent: true,
  opacity: 0.9,
  envMap: envTexture,
  envMapIntensity: 1.0,
});

// PointsMaterial — for particle systems
new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.05,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
});
```

### Custom ShaderMaterial

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x64b5f6) },
    uMouse: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 2.0 + uTime) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uTime;
    void main() {
      float glow = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
      gl_FragColor = vec4(uColor * glow, 1.0);
    }
  `,
});
```

### Shader Patterns (GLSL)

```glsl
// Sine wave distortion
pos.z += sin(pos.x * freq + uTime) * amplitude;

// Fresnel (rim light)
float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);

// Noise (simplified)
float noise = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);

// Glow pulse
float pulse = sin(uTime * speed) * 0.5 + 0.5;

// Vertex displacement
pos += normal * noise * strength;
```

---

## 5. Lighting

```javascript
// Ambient — base fill
const ambient = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambient);

// Directional — sun light
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

// Point — local glow
const point = new THREE.PointLight(0x64b5f6, 2, 10);
point.position.set(0, 2, 0);
scene.add(point);

// Hemisphere — sky/ground gradient
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.6);
scene.add(hemi);

// Environment map (preferred for PBR)
// Use HDR or PMREMGenerator
```

---

## 6. Loading Models

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(draco);

loader.load(
  '/model.glb',
  (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  },
  undefined,
  (err) => console.error(err),
);
```

### Model Optimization

- Use Draco compression for delivery (80% smaller)
- Limit vertex count: < 100k for hero models, < 30k for secondary
- Bake lighting into textures instead of real-time lights
- Use `MeshStandardMaterial` not `MeshPhysicalMaterial` on mobile
- Merge geometries when possible (`BufferGeometryUtils.mergeGeometries`)

---

## 7. Post-Processing

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3, // strength
  0.2, // radius
  0.1, // threshold
);
composer.addPass(bloom);

// In animate loop: composer.render() instead of renderer.render()
```

---

## 8. Particles

```javascript
const count = 2000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);

for (let i = 0; i < count; i++) {
  const r = 5 * Math.cbrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);

  colors[i * 3] = 0.4 + Math.random() * 0.6;
  colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
  colors[i * 3 + 2] = 1.0;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const mat = new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);
```

---

## 9. React Three Fiber

### Setup

```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';

function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, alpha: false }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <mesh castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#64b5f6" roughness={0.3} metalness={0.1} />
      </mesh>
      <ContactShadows position={[0, -1, 0]} opacity={0.4} blur={3} />
      <Environment preset="city" />
      <OrbitControls />
    </Canvas>
  );
}
```

### Scroll-Driven 3D (R3F + Framer Motion)

```jsx
import { useScroll } from 'framer-motion';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function ScrollControlledMesh() {
  const mesh = useRef();
  const { scrollYProgress } = useScroll();

  useFrame(() => {
    mesh.current.rotation.x = scrollYProgress.current * Math.PI * 2;
    mesh.current.position.y = scrollYProgress.current * -2;
  });

  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[1, 0.3, 128, 16]} />
      <meshStandardMaterial color="#64b5f6" />
    </mesh>
  );
}
```

### Mouse Tracking (R3F)

```jsx
function MouseTracker({ children }) {
  const group = useRef();
  useFrame((state) => {
    group.current.rotation.x = state.pointer.y * 0.1;
    group.current.rotation.y = state.pointer.x * 0.2;
  });
  return <group ref={group}>{children}</group>;
}
```

---

## 10. WebGL Performance

| Rule                                   | Why                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| Cap pixel ratio at 2                   | 3x wastes GPU for imperceptible gain                  |
| Limit draw calls < 100                 | Merge geometries, use instancing                      |
| Limit shader complexity                | Avoid branching, use `#define` flags                  |
| Use `BufferGeometry` not `Geometry`    | `Geometry` is removed in r125                         |
| Dispose unused resources               | `geo.dispose()`, `mat.dispose()`, `texture.dispose()` |
| Reduce shadow map size                 | 1024×1024 is enough for most scenes                   |
| Use LOD for distant objects            | `THREE.LOD` — swap geometry by distance               |
| Avoid `MeshPhysicalMaterial` on mobile | Use `MeshStandardMaterial` instead                    |
| Limit post-processing passes           | Each pass = full-screen render                        |
| Use `Stats.js` during development      | Monitor draw calls, FPS, GPU memory                   |

### Performance Budget

| Metric                | Target     |
| --------------------- | ---------- |
| Draw calls            | < 100      |
| Triangles             | < 500k     |
| Textures total        | < 50MB GPU |
| Shader variants       | < 20       |
| FPS (desktop)         | 60         |
| FPS (mobile)          | 30+        |
| Load time (3D assets) | < 3s on 4G |

---

## 11. Accessibility in 3D

- Provide static fallback images for reduced-motion users
- Ensure 3D scenes are not the only way to access content
- Use `aria-label` on the canvas
- Disable `pointer-events` on decorative 3D backgrounds
- Add `tabindex` and keyboard controls for interactive 3D

---

## 12. Collaboration

| Scenario                       | Delegate To            |
| ------------------------------ | ---------------------- |
| Scroll-driven 3D animation     | `@animation`           |
| Visual design / color / layout | `@frontend-design`     |
| Performance audit (page-level) | `@performance`         |
| Canvas rendering (2D)          | Canvas 2D API or p5.js |
| Accessibility compliance       | `@accessibility`       |

---

## When to Use

- User mentions: 3D, Three.js, WebGL, R3F, React Three Fiber, shader, GLSL
- User mentions: particles, model, glTF, GLB, blender, spline
- User requests: interactive scene, 3D background, product viewer, WebGL experience
- User mentions: mountain, terrain, landscape, starfield, galaxy

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Not a substitute for environment-specific validation, testing, or expert review.
- Browser WebGL support varies — test on Safari and mobile WebGL.
- `THREE.BufferGeometry` only — deprecated `THREE.Geometry` should never be used.
- WebGL 2.0 recommended over WebGL 1.0 (Safari now supports it).
