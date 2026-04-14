import * as THREE from 'three';

const MAX_PARTICLES = 500;

/**
 * ParticleSystem — explosion and absorption particle effects.
 * Uses a single Points mesh with pooled particles.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Particle data arrays
    this._positions = new Float32Array(MAX_PARTICLES * 3);
    this._velocities = new Float32Array(MAX_PARTICLES * 3);
    this._colors = new Float32Array(MAX_PARTICLES * 3);
    this._sizes = new Float32Array(MAX_PARTICLES);
    this._lifetimes = new Float32Array(MAX_PARTICLES); // remaining life (seconds)
    this._maxLifetimes = new Float32Array(MAX_PARTICLES);
    this._active = new Uint8Array(MAX_PARTICLES); // 0 = inactive, 1 = active
    this._nextIndex = 0;

    // Geometry
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this._colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this._sizes, 1));

    // Material
    const mat = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    });

    this._points = new THREE.Points(geo, mat);
    this._points.frustumCulled = false;
    this._points.renderOrder = 10;
    this.scene.add(this._points);
  }

  /**
   * Spawn an explosion burst at a position.
   * @param {number} x
   * @param {number} y
   * @param {number} force — determines particle count and speed
   * @param {number} color — hex color
   */
  explode(x, y, force, color = 0xFFD93D) {
    const count = Math.min(Math.floor(8 + force * 0.02), 40);
    const speed = 30 + Math.min(force * 0.05, 100);
    const col = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const idx = this._allocate();
      if (idx === -1) break;

      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);

      this._positions[idx * 3] = x + (Math.random() - 0.5) * 5;
      this._positions[idx * 3 + 1] = y + (Math.random() - 0.5) * 5;
      this._positions[idx * 3 + 2] = 5;

      this._velocities[idx * 3] = Math.cos(angle) * s;
      this._velocities[idx * 3 + 1] = Math.sin(angle) * s;
      this._velocities[idx * 3 + 2] = 0;

      // Slight color variation
      this._colors[idx * 3] = col.r * (0.8 + Math.random() * 0.4);
      this._colors[idx * 3 + 1] = col.g * (0.8 + Math.random() * 0.4);
      this._colors[idx * 3 + 2] = col.b * (0.8 + Math.random() * 0.4);

      this._sizes[idx] = 2 + Math.random() * 3;
      this._lifetimes[idx] = 0.5 + Math.random() * 1.0;
      this._maxLifetimes[idx] = this._lifetimes[idx];
      this._active[idx] = 1;
    }
    // Restore draw range in case it was zeroed by clearAll
    this._points.geometry.setDrawRange(0, MAX_PARTICLES);
  }

  /**
   * Spawn absorption particles spiraling toward a point.
   */
  absorb(x, y, fromX, fromY, color = 0x9B59B6) {
    const count = 6;
    const col = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const idx = this._allocate();
      if (idx === -1) break;

      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;

      this._positions[idx * 3] = fromX + Math.cos(angle) * dist;
      this._positions[idx * 3 + 1] = fromY + Math.sin(angle) * dist;
      this._positions[idx * 3 + 2] = 5;

      // Velocity toward target with spiral component
      const dx = x - this._positions[idx * 3];
      const dy = y - this._positions[idx * 3 + 1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 50 + Math.random() * 30;

      this._velocities[idx * 3] = (dx / d) * speed + (Math.random() - 0.5) * 20;
      this._velocities[idx * 3 + 1] = (dy / d) * speed + (Math.random() - 0.5) * 20;
      this._velocities[idx * 3 + 2] = 0;

      this._colors[idx * 3] = col.r;
      this._colors[idx * 3 + 1] = col.g;
      this._colors[idx * 3 + 2] = col.b;

      this._sizes[idx] = 1.5 + Math.random() * 2;
      this._lifetimes[idx] = 0.3 + Math.random() * 0.5;
      this._maxLifetimes[idx] = this._lifetimes[idx];
      this._active[idx] = 1;
    }
    // Restore draw range in case it was zeroed by clearAll
    this._points.geometry.setDrawRange(0, MAX_PARTICLES);
  }

  /**
   * Update all particles — called every frame.
   */
  update(dt) {
    let hasActive = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this._active[i]) continue;
      hasActive = true;

      this._lifetimes[i] -= dt;
      if (this._lifetimes[i] <= 0) {
        this._active[i] = 0;
        this._positions[i * 3 + 2] = -1000; // hide
        continue;
      }

      // Move
      this._positions[i * 3] += this._velocities[i * 3] * dt;
      this._positions[i * 3 + 1] += this._velocities[i * 3 + 1] * dt;

      // Slow down
      this._velocities[i * 3] *= 0.98;
      this._velocities[i * 3 + 1] *= 0.98;

      // Fade out (via size reduction)
      const lifeRatio = this._lifetimes[i] / this._maxLifetimes[i];
      this._sizes[i] *= 0.98;
    }

    if (hasActive) {
      this._points.geometry.attributes.position.needsUpdate = true;
      this._points.geometry.attributes.color.needsUpdate = true;
      this._points.geometry.attributes.size.needsUpdate = true;
    }
  }

  /**
   * Clear all active particles immediately.
   */
  clearAll() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._active[i] = 0;
      this._lifetimes[i] = 0;
      this._sizes[i] = 0;
      // Move far away
      this._positions[i * 3] = 0;
      this._positions[i * 3 + 1] = 0;
      this._positions[i * 3 + 2] = -9999;
      // Zero out velocity
      this._velocities[i * 3] = 0;
      this._velocities[i * 3 + 1] = 0;
      this._velocities[i * 3 + 2] = 0;
      // Set color to black (invisible with additive blending)
      this._colors[i * 3] = 0;
      this._colors[i * 3 + 1] = 0;
      this._colors[i * 3 + 2] = 0;
    }
    this._nextIndex = 0;
    // Mark all buffers dirty
    this._points.geometry.attributes.position.needsUpdate = true;
    this._points.geometry.attributes.color.needsUpdate = true;
    this._points.geometry.attributes.size.needsUpdate = true;
    // Set draw range to 0 so nothing renders
    this._points.geometry.setDrawRange(0, 0);
  }

  /**
   * Allocate the next available particle slot.
   */
  _allocate() {
    // Try from nextIndex
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this._nextIndex + i) % MAX_PARTICLES;
      if (!this._active[idx]) {
        this._nextIndex = (idx + 1) % MAX_PARTICLES;
        return idx;
      }
    }
    // All full — overwrite oldest (nextIndex)
    const idx = this._nextIndex;
    this._nextIndex = (idx + 1) % MAX_PARTICLES;
    return idx;
  }

  dispose() {
    this._points.geometry.dispose();
    this._points.material.dispose();
    this.scene.remove(this._points);
  }
}
