import * as THREE from 'three';

/**
 * Raycaster — converts screen coordinates to world and picks objects.
 */
export class Raycaster {
  /**
   * @param {import('../rendering/SceneManager.js').SceneManager} sceneManager
   */
  constructor(sceneManager) {
    this.sm = sceneManager;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
  }

  /**
   * Convert screen (pixel) coordinates to 2D world coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{ x: number, y: number }}
   */
  screenToWorld(screenX, screenY) {
    return this.sm.screenToWorld(screenX, screenY);
  }

  /**
   * Find the body at a screen position.
   * Checks distance from each body center in world space.
   * @param {number} screenX
   * @param {number} screenY
   * @param {Array} bodies — array of body objects with { id, x, y, radius }
   * @param {number} [padding=5] — extra pixels of tolerance
   * @returns {Object|null} — the body, or null
   */
  pickBody(screenX, screenY, bodies, padding = 8) {
    const world = this.screenToWorld(screenX, screenY);

    // Scale padding from screen pixels to world units
    const cam = this.sm.camera;
    const worldPerPx = (cam.right - cam.left) / window.innerWidth;
    const worldPadding = padding * worldPerPx;

    let closest = null;
    let closestDist = Infinity;

    for (const body of bodies) {
      const dx = world.x - body.x;
      const dy = world.y - body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = body.radius + worldPadding;

      if (dist < hitRadius && dist < closestDist) {
        closest = body;
        closestDist = dist;
      }
    }

    return closest;
  }
}
