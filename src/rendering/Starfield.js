import * as THREE from 'three';

/**
 * Starfield — multi-layered parallax background with colored stars,
 * nebula patches, and subtle twinkling for a deep-space atmosphere.
 */
export class Starfield {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this._nebulae = [];
    this._time = 0;

    // Layer 1: Distant tiny cool-white stars
    this._createStarLayer(4000, 0.6, [
      { color: 0xC5CAE9, weight: 0.5 },
      { color: 0xFFFFFF, weight: 0.3 },
      { color: 0xB3E5FC, weight: 0.2 },
    ], -2000, 8000, 0.7);

    // Layer 2: Mid-distance blue/indigo stars
    this._createStarLayer(1800, 1.0, [
      { color: 0x42A5F5, weight: 0.3 },
      { color: 0x7986CB, weight: 0.3 },
      { color: 0xE1F5FE, weight: 0.25 },
      { color: 0x80DEEA, weight: 0.15 },
    ], -1500, 7000, 0.75);

    // Layer 3: Nearer warm stars
    this._createStarLayer(800, 1.5, [
      { color: 0xFFD54F, weight: 0.35 },
      { color: 0xFFAB40, weight: 0.25 },
      { color: 0xFFFFFF, weight: 0.25 },
      { color: 0xFFCC80, weight: 0.15 },
    ], -1000, 6000, 0.8);

    // Layer 4: Sparse bright nearby stars
    this._createStarLayer(200, 2.5, [
      { color: 0xFFFFFF, weight: 0.4 },
      { color: 0x80DEEA, weight: 0.25 },
      { color: 0xFFF176, weight: 0.2 },
      { color: 0xEF9A9A, weight: 0.15 },
    ], -500, 5000, 0.9);

    // Nebula-like background patches
    this._createNebulae();
  }

  _createStarLayer(count, baseSize, colorWeights, depth, range, baseOpacity) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range;
      positions[i * 3 + 1] = (Math.random() - 0.5) * range;
      positions[i * 3 + 2] = depth;

      // Pick color based on accumulated weights
      let r = Math.random();
      let accumulated = 0;
      for (const cw of colorWeights) {
        accumulated += cw.weight;
        if (r <= accumulated) {
          c.setHex(cw.color);
          break;
        }
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: baseSize,
      vertexColors: true,
      transparent: true,
      opacity: baseOpacity,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = -10;
    this.scene.add(points);
    this.layers.push({
      points,
      depthFactor: Math.abs(depth) / 2000,
      baseOpacity,
    });
  }

  _createNebulae() {
    const nebulaConfigs = [
      { color: 0x1A237E, opacity: 0.025, size: 500 },
      { color: 0x311B92, opacity: 0.02,  size: 400 },
      { color: 0x0D47A1, opacity: 0.018, size: 600 },
      { color: 0x880E4F, opacity: 0.015, size: 350 },
      { color: 0x004D40, opacity: 0.012, size: 450 },
      { color: 0x1B5E20, opacity: 0.01,  size: 380 },
      { color: 0x4A148C, opacity: 0.02,  size: 550 },
      { color: 0x0D47A1, opacity: 0.015, size: 420 },
    ];

    for (const cfg of nebulaConfigs) {
      const geo = new THREE.CircleGeometry(cfg.size + Math.random() * 200, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity + Math.random() * 0.01,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 5000,
        (Math.random() - 0.5) * 5000,
        -1900
      );
      mesh.renderOrder = -11;
      this.scene.add(mesh);
      this._nebulae.push(mesh);
    }
  }

  /**
   * Update star positions for parallax and subtle twinkling.
   */
  update(camX, camY) {
    this._time += 0.016; // ~60fps

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      // Parallax: further layers move less
      layer.points.position.x = -camX * (1 - layer.depthFactor);
      layer.points.position.y = -camY * (1 - layer.depthFactor);

      // Subtle twinkling via opacity variation
      const twinkle = Math.sin(this._time * (0.3 + i * 0.15)) * 0.05;
      layer.points.material.opacity = layer.baseOpacity + twinkle;
    }

    // Nebulae slow drift
    for (const neb of this._nebulae) {
      neb.position.x += Math.sin(this._time * 0.01) * 0.05;
      neb.position.y += Math.cos(this._time * 0.008) * 0.03;
    }
  }

  dispose() {
    for (const layer of this.layers) {
      this.scene.remove(layer.points);
      layer.points.geometry.dispose();
      layer.points.material.dispose();
    }
    for (const neb of this._nebulae) {
      this.scene.remove(neb);
      neb.geometry.dispose();
      neb.material.dispose();
    }
  }
}
