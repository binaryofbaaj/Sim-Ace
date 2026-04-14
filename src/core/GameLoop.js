import { PHYSICS_DT, MAX_SUBSTEPS } from '../physics/constants.js';

/**
 * GameLoop — fixed-timestep physics, variable-rate rendering.
 */
export class GameLoop {
  /**
   * @param {Object} opts
   * @param {Function} opts.onPhysicsTick - called each fixed physics step (dt)
   * @param {Function} opts.onRender - called each frame (dt, interpolation)
   */
  constructor({ onPhysicsTick, onRender }) {
    this._onPhysicsTick = onPhysicsTick;
    this._onRender = onRender;
    this._running = false;
    this._rafId = null;
    this._lastTime = 0;
    this._accumulator = 0;
    this._timeScale = 1.0;
    this._paused = false;

    // FPS tracking
    this._frames = 0;
    this._fpsTime = 0;
    this.fps = 60;

    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._fpsTime = this._lastTime;
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  set timeScale(v) { this._timeScale = v; }
  get timeScale() { return this._timeScale; }

  set paused(v) { this._paused = v; }
  get paused() { return this._paused; }

  _tick(now) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick);

    // Delta time in seconds, capped to avoid spiral of death
    let dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    // FPS counter
    this._frames++;
    if (now - this._fpsTime >= 1000) {
      this.fps = this._frames;
      this._frames = 0;
      this._fpsTime = now;
    }

    // Physics — fixed timestep accumulator
    if (!this._paused) {
      dt *= this._timeScale;
      this._accumulator += dt;

      let steps = 0;
      while (this._accumulator >= PHYSICS_DT && steps < MAX_SUBSTEPS) {
        this._onPhysicsTick(PHYSICS_DT);
        this._accumulator -= PHYSICS_DT;
        steps++;
      }
      // Drain excess to prevent spiral
      if (steps >= MAX_SUBSTEPS) this._accumulator = 0;
    }

    // Render every frame
    const alpha = this._accumulator / PHYSICS_DT; // interpolation factor
    this._onRender(dt, alpha);
  }
}
