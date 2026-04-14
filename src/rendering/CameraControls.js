import * as THREE from 'three';
import { lerp, clamp } from '../utils/math.js';
import { eventBus } from '../core/EventBus.js';

/**
 * CameraControls — zoom, pan, focus-on-object with smooth transitions.
 * Enhanced with Reset and Cinematic Mode.
 */
export class CameraControls {
  /**
   * @param {import('./SceneManager.js').SceneManager} sceneManager
   * @param {HTMLCanvasElement} canvas
   */
  constructor(sceneManager, canvas) {
    this.sm = sceneManager;
    this.canvas = canvas;

    this.defaultZoom = sceneManager.viewSize;
    this.zoom = this.defaultZoom;
    this.targetZoom = this.zoom;
    this.minZoom = 20;
    this.maxZoom = 8000;

    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    this._isPanning = false;
    this._panStartScreen = { x: 0, y: 0 };
    this._panStartWorld = { x: 0, y: 0 };

    this._focusBodyId = null;
    this._smoothing = 0.12;
    
    // Cinematic Mode state
    this.cinematicMode = false;
    this._cinematicTimer = 0;

    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
    window.addEventListener('mousemove', this._onMouseMove.bind(this));
    window.addEventListener('mouseup', this._onMouseUp.bind(this));

    eventBus.on('camera:reset', () => this.reset());
    eventBus.on('camera:cinematic', (enabled) => { this.cinematicMode = enabled; });
  }

  /**
   * Reset camera to default view.
   */
  reset() {
    this.targetPanX = 0;
    this.targetPanY = 0;
    this.targetZoom = this.defaultZoom;
    this._focusBodyId = null;
    this.cinematicMode = false;
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    this.targetZoom = clamp(this.targetZoom * factor, this.minZoom, this.maxZoom);
    this.cinematicMode = false; // user interaction breaks cinematic
  }

  _onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this._startPan(e.clientX, e.clientY);
      e.preventDefault();
      this.cinematicMode = false;
    }
  }

  _onMouseMove(e) {
    if (this._isPanning) {
      this._updatePan(e.clientX, e.clientY);
    }
  }

  _onMouseUp() {
    this._isPanning = false;
  }

  _startPan(sx, sy) {
    this._isPanning = true;
    this._panStartScreen = { x: sx, y: sy };
    this._panStartWorld = { x: this.targetPanX, y: this.targetPanY };
    this._focusBodyId = null;
  }

  _updatePan(sx, sy) {
    if (!this._isPanning) return;
    const dx = sx - this._panStartScreen.x;
    const dy = sy - this._panStartScreen.y;
    const cam = this.sm.camera;
    const worldPerPxX = (cam.right - cam.left) / window.innerWidth;
    const worldPerPxY = (cam.top - cam.bottom) / window.innerHeight;
    this.targetPanX = this._panStartWorld.x - dx * worldPerPxX;
    this.targetPanY = this._panStartWorld.y + dy * worldPerPxY;
  }

  focusOn(x, y) {
    this.targetPanX = x;
    this.targetPanY = y;
  }

  followBody(bodyId) {
    this._focusBodyId = bodyId;
    this.cinematicMode = false;
  }

  update(dt, bodies) {
    // Cinematic logic: pick a body with high mass or velocity if active
    if (this.cinematicMode && bodies.size > 0) {
      this._cinematicTimer -= dt;
      if (this._cinematicTimer <= 0) {
        const list = Array.from(bodies.values());
        const target = list[Math.floor(Math.random() * list.length)];
        if (target) {
            this.targetPanX = target.x;
            this.targetPanY = target.y;
            this.targetZoom = Math.max(200, target.radius * 20);
        }
        this._cinematicTimer = 3 + Math.random() * 5;
      }
    }

    // Follow a body if locked
    if (this._focusBodyId && bodies) {
      const body = bodies.get(this._focusBodyId);
      if (body) {
        this.targetPanX = body.x;
        this.targetPanY = body.y;
      } else {
        this._focusBodyId = null;
      }
    }

    // Smooth interpolation
    const s = 1 - Math.pow(1 - this._smoothing, dt * 60);
    this.zoom = lerp(this.zoom, this.targetZoom, s);
    this.panX = lerp(this.panX, this.targetPanX, s);
    this.panY = lerp(this.panY, this.targetPanY, s);

    this.sm.setZoom(this.zoom);
    this.sm.panTo(this.panX, this.panY);
  }
}
