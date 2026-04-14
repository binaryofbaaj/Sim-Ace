import PhysicsWorker from './PhysicsWorker.js?worker';
import { G, SOFTENING, MAX_FORCE_DISTANCE } from './constants.js';

/**
 * PhysicsAPI — main-thread interface to the physics Web Worker.
 */
export class PhysicsAPI {
  constructor() {
    this._worker = null;
    this._onUpdate = null;
    this._busy = false;
  }

  /**
   * Initialize the worker.
   */
  init() {
    this._worker = new PhysicsWorker();
    this._worker.onmessage = (e) => {
      this._busy = false;
      if (this._onUpdate) this._onUpdate(e.data);
    };
    this._worker.postMessage({
      type: 'init',
      params: { G, SOFTENING, MAX_FORCE_DISTANCE },
    });
  }

  /**
   * Register callback for physics updates.
   * @param {Function} fn — receives { type, bodies, collisions, removed, spawned }
   */
  onUpdate(fn) {
    this._onUpdate = fn;
  }

  /**
   * Send bodies to the worker for one simulation step.
   * @param {Object} serializedBodies — from gameState.serializeForWorker()
   * @param {number} dt — timestep
   * @param {Object} params — { gravityMultiplier, chaosLevel }
   */
  step(serializedBodies, dt, params) {
    if (!this._worker || this._busy) return;
    this._busy = true;

    // Transfer typed arrays for zero-copy perf
    const transferable = [
      serializedBodies.x.buffer,
      serializedBodies.y.buffer,
      serializedBodies.vx.buffer,
      serializedBodies.vy.buffer,
      serializedBodies.mass.buffer,
      serializedBodies.radius.buffer,
    ];

    this._worker.postMessage(
      { type: 'step', bodies: serializedBodies, dt, params },
      transferable
    );
  }

  /**
   * Clean up the worker.
   */
  destroy() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }
}
