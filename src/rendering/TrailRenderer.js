import * as THREE from 'three';

const MAX_TRAIL_LENGTH = 80;
const MAX_TRAILS = 200;

/**
 * TrailRenderer — orbit trail lines per body using ring buffers.
 */
export class TrailRenderer {
  constructor(scene) {
    this.scene = scene;
    /** @type {Map<string, { positions: Array, line: THREE.Line, color: THREE.Color }>} */
    this._trails = new Map();
    this._frameCounter = 0;
    this._recordEvery = 2; // record trail point every N frames
  }

  /**
   * Update trails from current body positions.
   * @param {Array} bodies
   */
  update(bodies) {
    this._frameCounter++;
    const shouldRecord = this._frameCounter % this._recordEvery === 0;
    const activeIds = new Set();

    for (const body of bodies) {
      activeIds.add(body.id);

      let trail = this._trails.get(body.id);
      if (!trail) {
        // Create new trail
        const color = new THREE.Color(body.colorHex);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(MAX_TRAIL_LENGTH * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);

        const material = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const line = new THREE.Line(geometry, material);
        line.renderOrder = -2;
        line.frustumCulled = false;
        this.scene.add(line);

        trail = {
          points: [], // [{ x, y }]
          line,
          geometry,
          positions,
          color,
        };
        this._trails.set(body.id, trail);
      }

      // Record position
      if (shouldRecord) {
        trail.points.push({ x: body.x, y: body.y });
        if (trail.points.length > MAX_TRAIL_LENGTH) {
          trail.points.shift();
        }
      }

      // Update geometry
      const pts = trail.points;
      const pos = trail.positions;
      for (let i = 0; i < pts.length; i++) {
        pos[i * 3] = pts[i].x;
        pos[i * 3 + 1] = pts[i].y;
        pos[i * 3 + 2] = -2;
      }
      trail.geometry.attributes.position.needsUpdate = true;
      trail.geometry.setDrawRange(0, pts.length);
    }

    // Remove trails for bodies that no longer exist
    for (const [id, trail] of this._trails) {
      if (!activeIds.has(id)) {
        this.scene.remove(trail.line);
        trail.geometry.dispose();
        trail.line.material.dispose();
        this._trails.delete(id);
      }
    }
  }

  /**
   * Clear trail for a specific body.
   */
  clearTrail(bodyId) {
    const trail = this._trails.get(bodyId);
    if (trail) {
      trail.points.length = 0;
      trail.geometry.setDrawRange(0, 0);
    }
  }

  /**
   * Clear all trails.
   */
  clearAll() {
    for (const [id, trail] of this._trails) {
      this.scene.remove(trail.line);
      trail.geometry.dispose();
      trail.line.material.dispose();
    }
    this._trails.clear();
  }

  dispose() {
    this.clearAll();
  }
}
