# 🚀 Sim-Ace — Interactive Space Physics Sandbox

> **A real-time N-body gravitational simulation** with procedural celestial bodies, life mechanics, and a premium space console UI. Spawn planets, stars, asteroids, and black holes — then watch gravitational chaos unfold.

![Space Simulation](https://img.shields.io/badge/simulation-space_physics-blue?style=for-the-badge)
![Three.js](https://img.shields.io/badge/engine-Three.js-000000?style=for-the-badge&logo=three.js)
![Vite](https://img.shields.io/badge/build-Vite-646CFF?style=for-the-badge&logo=vite)

---

## 🌌 Overview

Sim-Ace is a high-fidelity space sandbox that lets you create and simulate gravitational systems in real-time. Every celestial body exerts gravitational pull on every other body (N-body simulation), resulting in emergent orbital mechanics, collisions, and chaotic gravitational interactions.

### Key Features

- **N-Body Gravity** — Every body attracts every other body using Newtonian gravity, calculated in a dedicated Web Worker for smooth 60fps performance
- **Procedural Rendering** — Planets have GLSL-shader-generated surfaces with continents, oceans, clouds, and ice caps. Stars have plasma turbulence with core brightening. Black holes feature event horizons with photon sphere rims
- **Life Mechanics** — Planets in the habitable zone of stars develop biospheres, grow populations, and advance through civilization stages
- **Collision Physics** — Bodies merge (gaining mass) or explode (creating debris fields) based on collision mode
- **Chaos Engine** — A chaos slider introduces random perturbations to stable systems, creating unpredictable gravitational interactions
- **Scenarios & Challenges** — Pre-built gravitational setups and achievement-based objectives
- **Premium UI** — Glassmorphism command center with real-time telemetry, parallax starfield, and bloom effects

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    MAIN THREAD                       │
│                                                      │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │ GameLoop │──│  GameState  │──│  UIManager      │  │
│  │ (60fps)  │  │ (bodies,   │  │ (ControlPanel,  │  │
│  │          │  │  params)   │  │  HUD, Alerts)   │  │
│  └────┬─────┘  └─────┬──────┘  └─────────────────┘  │
│       │              │                                │
│  ┌────┴─────┐  ┌─────┴──────┐  ┌─────────────────┐  │
│  │ Renderer │  │ Interaction│  │ Scenarios/      │  │
│  │ Pipeline │  │ (Placer,   │  │ Challenges      │  │
│  │ (Three.js│  │  Dragger,  │  │                 │  │
│  │  + Bloom)│  │  Camera)   │  │                 │  │
│  └──────────┘  └────────────┘  └─────────────────┘  │
│                      │                                │
│            ┌─────────┴──────────┐                    │
│            │     EventBus       │                    │
│            │  (pub/sub comms)   │                    │
│            └────────────────────┘                    │
└───────────────────────┬─────────────────────────────┘
                        │ postMessage / onMessage
┌───────────────────────┴─────────────────────────────┐
│                  WEB WORKER THREAD                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │              PhysicsWorker                    │    │
│  │  • N-body gravity calculation                │    │
│  │  • Collision detection (AABB + radius)       │    │
│  │  • Merge / Explode resolution                │    │
│  │  • Chaos Engine perturbations                │    │
│  │  • Boundary wrapping                         │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Thread Architecture

| Thread | Responsibility | Frequency |
|--------|---------------|-----------|
| **Main** | Rendering, UI, input, state management | 60fps (vsync) |
| **Worker** | Physics calculation, collision detection | Fixed timestep (1/60s) |

The physics simulation runs in a **Web Worker** to prevent heavy N-body calculations from blocking the UI. The main thread sends serialized body data to the worker each tick, and receives updated positions/velocities plus collision events back asynchronously.

---

## 🎮 Controls

### Mouse / Trackpad

| Action | Control |
|--------|---------|
| **Spawn body** | Click on canvas |
| **Drag body** | Click & drag existing body |
| **Pan camera** | Shift + drag, or middle mouse drag |
| **Zoom** | Scroll wheel / pinch |
| **Select body** | Click on body (shows inspector data) |

### Keyboard

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume simulation |
| `C` | Clear all bodies |
| `R` | Reset camera position |

### UI Controls

| Control | Description |
|---------|-------------|
| **Type Selector** | Choose body type: Planet, Star, Asteroid, Black Hole |
| **Mass Slider** | Set mass of next spawned body (affects size & gravity) |
| **Gravity Multiplier** | Scale gravitational constant globally |
| **Collision Mode** | `Mixed` (realistic), `Merge` (always combine), `Explode` (always fragment) |
| **Chaos Slider** | Random perturbation intensity (0% = stable, 100% = chaotic) |
| **Time Controls** | Speed presets (0.25×–5×), pause/play, custom speed slider |
| **Scenarios** | Load preset configurations (Earth + 2 Moons, Jupiter as Sun, Black Hole vs Earth) |
| **Challenges** | Achievement objectives (steady orbit, system collapse, star cluster) |

---

## 🔬 Physics Engine

### Gravitational Force

Each body pair experiences force:

```
F = G × m₁ × m₂ / (r² + ε²)
```

Where:
- `G` = gravitational constant (tuned for simulation scale)
- `m₁, m₂` = masses of two bodies
- `r` = distance between centers
- `ε` = softening parameter (prevents singularity at r→0)

### Collision Detection

1. **Broad phase** — Distance check between all body pairs (O(n²))
2. **Narrow phase** — Radius overlap test: `distance < (r₁ + r₂) × 0.9`

### Collision Resolution

| Mode | Behavior |
|------|----------|
| **Merge** | Smaller body absorbed; survivor gains mass, weighted-average velocity |
| **Explode** | Both bodies destroyed; 3–6 asteroid fragments spawned with random velocities |
| **Mixed** | Star/planet merges absorb; asteroid collisions explode |

### Chaos Engine

When enabled (Chaos > 0%), each body receives random velocity perturbations per tick:

```
v += randomDirection × chaosLevel × dt × massFactor
```

This simulates gravitational disturbances from unseen massive objects, leading to orbital decay and system instability.

---

## 🌍 Life Simulation

Planets near stars can develop life through a multi-stage process:

### Habitability Calculation

```
habitability = temperatureFactor × distanceFactor × massFactor
```

- **Temperature**: Based on distance to nearest star and star's luminosity
- **Goldilocks Zone**: Optimal distance range where water can exist as liquid
- **Mass**: Larger planets retain atmospheres better

### Civilization Stages

| Stage | Population | Description |
|-------|-----------|-------------|
| **Microbes** | 0–1K | Single-celled life emerges |
| **Tribal** | 1K–1M | Multi-cellular, basic social structures |
| **Industrial** | 1M–1B | Technology and resource extraction |
| **Spacefaring** | 1B+ | Advanced civilization |

Population growth rate scales with habitability and current civilization level. Removing a planet from the habitable zone causes population decline and potential extinction.

---

## 🎨 Rendering Pipeline

### Celestial Body Shaders

Each body type uses a **custom GLSL shader** for procedural rendering:

#### Planets
- **FBM noise** generates continent/ocean patterns
- **Instance color** drives the base palette (water tint, land color)
- **Polar ice caps** at sphere poles with noise-modulated boundaries
- **Cloud layer** animated with slow drift
- **Atmospheric rim glow** (Fresnel-like effect at sphere edges)
- **Hemisphere lighting** for 3D depth

#### Stars
- **Plasma turbulence** from layered FBM noise
- **Core brightening** at sphere center
- **Limb darkening** at sphere edges (realistic solar physics)
- **Solar flare spots** from high-frequency noise thresholding
- **Self-luminous** — minimum brightness ensures stars always glow

#### Black Holes
- **Nearly black core** — absorbs all light
- **Event horizon rim** with violet swirling accretion
- **Photon sphere** — bright ring at extreme rim edge
- **Accretion ring** mesh with additive blending

#### Asteroids
- Standard PBR material (rough, non-metallic)
- Tumbling rotation animation
- Per-instance color variation

### Post-Processing

- **Unreal Bloom Pass** — HDR glow for stars and bright surfaces
- **ACES Filmic Tone Mapping** — cinematic color grading
- **Multi-layer parallax starfield** with twinkling and nebula patches

---

## 📁 Project Structure

```
Sim-Ace/
├── index.html              # Entry HTML with UI overlay structure
├── package.json            # Dependencies (Three.js, Vite)
├── vite.config.js          # Vite dev server config (port 3000)
│
├── src/
│   ├── main.js             # App entry — initializes all systems, game loop
│   │
│   ├── core/
│   │   ├── GameState.js    # Central state: bodies map, params, XP/level
│   │   ├── GameLoop.js     # Fixed-timestep physics + render loop
│   │   └── EventBus.js     # Pub/sub event system for decoupled communication
│   │
│   ├── rendering/
│   │   ├── SceneManager.js     # Three.js scene, camera, renderer setup
│   │   ├── ObjectRenderer.js   # GLSL shaders + instanced mesh rendering
│   │   ├── Starfield.js        # 4-layer parallax background with nebulae
│   │   ├── TrailRenderer.js    # Orbital trail lines behind moving bodies
│   │   ├── GlowEffect.js       # UnrealBloomPass post-processing
│   │   ├── ParticleSystem.js   # Collision explosion particles
│   │   └── TextureManager.js   # Canvas-based procedural texture generation
│   │
│   ├── physics/
│   │   ├── PhysicsAPI.js       # Main-thread wrapper for worker communication
│   │   ├── PhysicsWorker.js    # Web Worker: N-body gravity + collisions
│   │   └── constants.js        # G, timestep, softening parameters
│   │
│   ├── objects/
│   │   ├── CelestialBody.js    # Body factory: createBody() with type configs
│   │   ├── ObjectFactory.js    # Mass/radius/color assignment by type
│   │   └── ColorPalette.js     # Curated color sets per body type
│   │
│   ├── interaction/
│   │   ├── InputManager.js     # Mouse/keyboard event routing
│   │   ├── CameraControls.js   # Pan, zoom, cinematic follow mode
│   │   ├── ObjectPlacer.js     # Ghost preview + click-to-spawn
│   │   ├── ObjectDragger.js    # Click-drag to reposition bodies
│   │   └── Raycaster.js        # Screen-to-world coordinate mapping
│   │
│   ├── ui/
│   │   ├── UIManager.js        # Coordinates all UI sub-systems
│   │   ├── ControlPanel.js     # Left sidebar: type/mass/gravity/chaos controls
│   │   ├── HUD.js              # Right sidebar: body inspector + system analytics
│   │   ├── TimeControls.js     # Bottom bar: play/pause + speed presets
│   │   ├── ModeSelector.js     # Top center: sandbox/scenarios/challenges tabs
│   │   └── AlertSystem.js      # Toast notifications for events
│   │
│   ├── scenarios/
│   │   ├── ScenarioManager.js  # Loads preset body configurations
│   │   ├── ChallengeManager.js # Achievement system with conditions/timers
│   │   ├── TwoMoons.js         # Earth + 2 moons + debris field
│   │   ├── JupiterSun.js       # Giant star + 5 orbital planets + asteroid belt
│   │   └── BlackHoleEarth.js   # Earth-Moon system vs approaching black hole
│   │
│   ├── life/
│   │   ├── LifeSimulator.js    # Habitability calculation + population growth
│   │   ├── TechTree.js         # Unlock progression (types gated by level)
│   │   └── Progression.js      # XP and leveling system
│   │
│   ├── utils/
│   │   ├── math.js             # lerp, clamp, orbitalSpeed, radiusFromMass
│   │   └── screenShake.js      # Camera shake on collisions with decay
│   │
│   └── styles/
│       ├── index.css           # Design tokens, palette, typography, base reset
│       ├── ui.css              # Panel, slider, button, HUD component styles
│       └── animations.css      # Chaos pulse, screen flash, spawn ripple VFX
│
└── public/                     # Static assets
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
git clone https://github.com/your-username/Sim-Ace.git
cd Sim-Ace
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Three.js** r172 | 3D rendering engine (WebGL) |
| **Vite** 6.3 | Build tool & dev server (HMR) |
| **Web Workers** | Off-thread physics computation |
| **GLSL** | Custom vertex/fragment shaders |
| **InstancedMesh** | GPU-efficient rendering of many bodies |
| **UnrealBloomPass** | HDR glow post-processing |
| **CSS Custom Properties** | Design system tokens |
| **EventBus** | Decoupled pub/sub architecture |

---

## 🎯 Scenarios

### Earth + 2 Moons
A planet with two moons in different orbits demonstrating orbital resonance. The outer moon has slight eccentricity — watch for gravitational perturbation over time.

### Jupiter as Sun
A massive star with 5 planets in circular orbits and an asteroid belt. Demonstrates a stable multi-body solar system.

### Black Hole vs Earth
An Earth-Moon system with debris, and a 30,000-mass black hole approaching from the side. Watch as the black hole tears apart the system.

---

## 🏆 Challenges

| Challenge | Goal | Time |
|-----------|------|------|
| **Steady Orbiting** | Maintain system stability (>85%) with 3+ bodies | 30s |
| **Great Heat Death** | Cause system collapse (stability <20%) | 10s |
| **Star Cluster** | Have 5+ stars simultaneously | 1s |

---

## 📐 Design Decisions

### Why Web Worker for Physics?
N-body gravity is O(n²) per tick — with 100 bodies, that's 10,000 force calculations per frame. Running this on the main thread would block rendering. The Web Worker provides a dedicated thread, keeping the UI responsive at 60fps.

### Why Custom GLSL Shaders?
`InstancedMesh` requires all instances to share one material. Custom shaders use FBM noise seeded by each instance's world position, creating unique procedural surfaces (continents, plasma) while maintaining GPU instancing performance.

### Why EventBus Instead of Direct Coupling?
The EventBus pattern decouples UI, physics, and rendering systems. The control panel doesn't need to import the physics worker — it emits events like `params:changed` that any subscriber can handle. This makes the codebase modular and testable.

### Why Orthographic Camera?
While the simulation is rendered in 3D (with sphere geometry for depth), the physics are 2D (x, y plane). An orthographic camera provides a clean top-down view without perspective distortion, making it easier to judge distances and orbits.

---

## 📜 License

made by Gurman Singh (Baaj
