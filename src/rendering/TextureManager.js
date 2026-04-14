import * as THREE from 'three';

/**
 * TextureManager — procedurally generates high-fidelity surface and light maps.
 */
export class TextureManager {
  constructor() {
    this._cache = new Map();
  }

  /**
   * Generate a surface texture based on body type and habitability.
   */
  generatePlanetTexture(type, habitability = 0) {
    const key = `${type}_${Math.round(habitability * 10)}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    let primary, secondary;
    if (type === 'star') {
      primary = '#FFD93D'; secondary = '#FF8C42';
    } else if (type === 'asteroid') {
      primary = '#7F8C8D'; secondary = '#4A4E51';
    } else if (habitability > 0.5) {
      // Lush Habitability (Green/Blue)
      primary = '#1B4D3E'; secondary = '#4ECDC4';
    } else if (habitability > 0.1) {
      // Arid Habitability (Brown/Red)
      primary = '#8E44AD'; secondary = '#9B59B6';
    } else {
      // Barren (Grey/Red)
      primary = '#2C3E50'; secondary = '#E74C3C';
    }

    // Fill background
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 512, 512);

    // Procedural Noise/Terrain
    for (let i = 0; i < 40; i++) {
       const x = Math.random() * 512;
       const y = Math.random() * 512;
       const r = 20 + Math.random() * 80;
       const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
       grad.addColorStop(0, secondary + '44');
       grad.addColorStop(1, 'transparent');
       ctx.fillStyle = grad;
       ctx.beginPath();
       ctx.arc(x, y, r, 0, Math.PI * 2);
       ctx.fill();
    }

    // Add "Civilization Lights" for habitable planets
    if (habitability > 0.7) {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            if (Math.random() > 0.4) {
               ctx.globalAlpha = 0.8;
               ctx.fillRect(x, y, 1, 1);
            }
        }
        ctx.globalAlpha = 1.0;
    }

    const texture = new THREE.CanvasTexture(canvas);
    this._cache.set(key, texture);
    return texture;
  }

  dispose() {
    this._cache.forEach(t => t.dispose());
    this._cache.clear();
  }
}

export const textureManager = new TextureManager();
