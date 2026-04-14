import * as THREE from 'three';

const STAR_COUNT = 600;
const GRID_SIZE = 4000;
const GRID_SPACING = 80;

/**
 * GridBackground — procedural starfield + subtle dot grid.
 */
export class GridBackground {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    // ---- Starfield (point cloud) ----
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);
    const starColors = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * GRID_SIZE * 2;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * GRID_SIZE * 2;
      starPositions[i * 3 + 2] = -10; // behind everything

      starSizes[i] = Math.random() * 2 + 0.5;

      // Slight color variation: white/blue/warm
      const temp = Math.random();
      if (temp < 0.6) {
        // Cool white/blue
        starColors[i * 3] = 0.7 + Math.random() * 0.3;
        starColors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        starColors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      } else if (temp < 0.85) {
        // Warm yellow
        starColors[i * 3] = 0.9 + Math.random() * 0.1;
        starColors[i * 3 + 1] = 0.8 + Math.random() * 0.1;
        starColors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
      } else {
        // Faint blue
        starColors[i * 3] = 0.4 + Math.random() * 0.2;
        starColors[i * 3 + 1] = 0.5 + Math.random() * 0.2;
        starColors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._stars = new THREE.Points(starGeo, starMat);
    this._stars.renderOrder = -10;
    this.scene.add(this._stars);

    // ---- Dot grid ----
    const gridDots = [];
    const halfGrid = GRID_SIZE / 2;

    for (let gx = -halfGrid; gx <= halfGrid; gx += GRID_SPACING) {
      for (let gy = -halfGrid; gy <= halfGrid; gy += GRID_SPACING) {
        gridDots.push(gx, gy, -5);
      }
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridDots, 3));

    const dotMat = new THREE.PointsMaterial({
      size: 1,
      color: 0x2a2a4a,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: false,
      depthWrite: false,
    });

    this._grid = new THREE.Points(dotGeo, dotMat);
    this._grid.renderOrder = -9;
    this.scene.add(this._grid);

    this._time = 0;
  }

  /**
   * Animate starfield (subtle twinkle).
   */
  update(dt) {
    this._time += dt;
    // Very subtle twinkle via opacity
    this._stars.material.opacity = 0.5 + Math.sin(this._time * 0.5) * 0.1;
  }

  dispose() {
    this._stars.geometry.dispose();
    this._stars.material.dispose();
    this.scene.remove(this._stars);

    this._grid.geometry.dispose();
    this._grid.material.dispose();
    this.scene.remove(this._grid);
  }
}
