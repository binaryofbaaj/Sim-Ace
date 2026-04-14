/**
 * Sim-Ace — Main Entry Point (v7.0 Aesthetic)
 * High-fidelity space simulation with life mechanics and premium HUD.
 */

import './styles/index.css';
import './styles/ui.css';
import './styles/animations.css';

import { SceneManager } from './rendering/SceneManager.js';
import { ObjectRenderer } from './rendering/ObjectRenderer.js';
import { Starfield } from './rendering/Starfield.js';
import { TrailRenderer } from './rendering/TrailRenderer.js';
import { CameraControls } from './rendering/CameraControls.js';
import { ParticleSystem } from './rendering/ParticleSystem.js';
import { GlowEffect } from './rendering/GlowEffect.js';
import { GameLoop } from './core/GameLoop.js';
import { gameState } from './core/GameState.js';
import { eventBus } from './core/EventBus.js';
import { PhysicsAPI } from './physics/PhysicsAPI.js';
import { PHYSICS_DT } from './physics/constants.js';
import { ScreenShake } from './utils/screenShake.js';
import { createBody } from './objects/CelestialBody.js';
import { Raycaster } from './interaction/Raycaster.js';
import { ObjectPlacer } from './interaction/ObjectPlacer.js';
import { ObjectDragger } from './interaction/ObjectDragger.js';
import { InputManager } from './interaction/InputManager.js';
import { UIManager } from './ui/UIManager.js';
import { ScenarioManager } from './scenarios/ScenarioManager.js';
import { ChallengeManager } from './scenarios/ChallengeManager.js';
import { LifeSimulator } from './physics/LifeSimulator.js';

// ============================================================
// Init Rendering & Depth
// ============================================================

const canvas = document.getElementById('sim-canvas');
const sceneManager = new SceneManager(canvas);

// High-Fidelity visual layers
const starfield = new Starfield(sceneManager.scene);
const objectRenderer = new ObjectRenderer(sceneManager.scene);
const trailRenderer = new TrailRenderer(sceneManager.scene);
const cameraControls = new CameraControls(sceneManager, canvas);
const particleSystem = new ParticleSystem(sceneManager.scene);
const screenShake = new ScreenShake();

let glowEffect = null;
try {
  glowEffect = new GlowEffect(sceneManager.renderer, sceneManager.scene, sceneManager.camera);
  const origResize = sceneManager._onResize.bind(sceneManager);
  sceneManager._onResize = () => {
    origResize();
    if (glowEffect) glowEffect.resize(window.innerWidth, window.innerHeight);
  };
} catch (e) { console.warn('[Sim-Ace] Bloom fallback'); }

// ============================================================
// Init Systems
// ============================================================

const physics = new PhysicsAPI();
physics.init();

const lifeSimulator = new LifeSimulator();
const scenarioManager = new ScenarioManager();
const challengeManager = new ChallengeManager();

let latestPhysicsResult = null;
physics.onUpdate((result) => { latestPhysicsResult = result; });

// Interactions
const raycaster = new Raycaster(sceneManager);
const objectPlacer = new ObjectPlacer(sceneManager, raycaster, sceneManager.scene);
const objectDragger = new ObjectDragger(raycaster, sceneManager.scene);
const inputManager = new InputManager(canvas, objectPlacer, objectDragger, cameraControls, () => gameState.getBodies());

// ============================================================
// Game Loop
// ============================================================

const gameLoop = new GameLoop({
  onPhysicsTick(dt) {
    if (latestPhysicsResult) {
      const r = latestPhysicsResult;
      latestPhysicsResult = null;

      // Guard: skip stale results after a clear-all
      const hasRelevantBodies = r.bodies.some(u => gameState.bodies.has(u.id));
      if (!hasRelevantBodies && gameState.bodies.size === 0) {
        // Stale result after clear, discard
      } else {
        // Apply position/velocity updates for surviving bodies
        gameState.applyPhysicsUpdate(r.bodies);

      // Remove destroyed bodies
      if (r.removed) {
        for (const id of r.removed) {
          gameState.removeBody(id);
        }
      }

      // Spawn fragments from explosions
      if (r.spawned && r.spawned.length > 0) {
        for (const config of r.spawned) {
          gameState.addBody(createBody(config));
        }
      }

      // Emit collision events for VFX
      if (r.collisions) {
        for (const c of r.collisions) {
          eventBus.emit('collision', c);
        }
        if (r.collisions.length > 0) gameState.addXP(r.collisions.length * 20);
      }
      } // end stale guard
    }

    const bodies = gameState.getBodies();
    if (bodies.length > 0) {
      physics.step(gameState.serializeForWorker(), PHYSICS_DT, {
        gravityMultiplier: gameState.params.gravityMultiplier,
        chaosLevel: gameState.params.chaosLevel,
        collisionMode: gameState.params.collisionMode,
      });
    }

    lifeSimulator.update(dt);
    challengeManager.update(dt);
  },

  onRender(dt) {
    const bodies = gameState.getBodies();

    cameraControls.update(dt, gameState.bodies);
    starfield.update(cameraControls.panX, cameraControls.panY);
    objectRenderer.update(bodies, dt);
    trailRenderer.update(bodies);
    particleSystem.update(dt);
    uiManager.update(gameLoop);

    const shakeOffset = screenShake.update(dt);
    if (screenShake.isShaking) {
      sceneManager.camera.position.x = cameraControls.panX + shakeOffset.x;
      sceneManager.camera.position.y = cameraControls.panY + shakeOffset.y;
    }

    if (glowEffect) glowEffect.render();
    else sceneManager.render();
  },
});

// ============================================================
// Final UI Integration
// ============================================================

const uiManager = new UIManager({
  placer: objectPlacer,
  gameLoop,
  scenarioManager,
});

// Collision VFX
eventBus.on('collision', (c) => {
  if (!c.position) return;
  if (c.type === 'explode') {
    particleSystem.explode(c.position.x, c.position.y, c.force, 0xFF6B6B);
    screenShake.shake(c.force * 0.5);
    triggerFlash('explosion');
  } else {
    particleSystem.explode(c.position.x, c.position.y, c.force * 0.2, 0x00F2FF);
    screenShake.shake(c.force * 0.2);
    triggerFlash('merge');
  }
});

eventBus.on('level:up', ({ level }) => {
    uiManager.alerts.show(`🌟 Pilot Rank: Level ${level}`, 'success');
});
eventBus.on('unlock', ({ item }) => {
    uiManager.alerts.show(`🔓 TECH UNLOCKED: ${item.toUpperCase()}`, 'info');
});

function triggerFlash(type) {
  const flash = document.createElement('div');
  flash.className = `screen-flash ${type}`;
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

// Global UI wiring
eventBus.on('params:changed', ({ key, value }) => gameState.setParam(key, value));
eventBus.on('clear:all', () => {
  gameState.clearAll();
  trailRenderer.clearAll();
  particleSystem.clearAll();
  latestPhysicsResult = null; // Prevent stale worker results from re-adding bodies
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space': e.preventDefault(); eventBus.emit('time:toggle'); break;
    case 'KeyC': eventBus.emit('clear:all'); break;
    case 'KeyR': eventBus.emit('camera:reset'); break;
    case 'KeyV': eventBus.emit('camera:cinematic', !cameraControls.cinematicMode); break;
    case 'Delete': case 'Backspace': objectDragger.deleteSelected(); break;
    case 'Escape': objectPlacer.cancel(); break;
  }
});

gameLoop.start();
console.log('%c🌌 Sim-Ace Life & Realness Expansion Active', 'color: #00F2FF; font-weight: bold;');
