import { lerp } from '../utils/math.js';

/**
 * ScreenShake — camera shake on collisions with smooth decay.
 */
export class ScreenShake {
  constructor() {
    this._intensity = 0;
    this._decay = 8; // decay speed
    this._offsetX = 0;
    this._offsetY = 0;
    this._maxIntensity = 15;
  }

  /**
   * Trigger a shake.
   * @param {number} force — collision force (mass-based)
   */
  shake(force) {
    // Map force to intensity (capped)
    const intensity = Math.min(force * 0.002, this._maxIntensity);
    this._intensity = Math.max(this._intensity, intensity);
  }

  /**
   * Update shake — call every frame.
   * @param {number} dt
   * @returns {{ x: number, y: number }} offset to apply to camera
   */
  update(dt) {
    if (this._intensity > 0.01) {
      this._offsetX = (Math.random() - 0.5) * this._intensity * 2;
      this._offsetY = (Math.random() - 0.5) * this._intensity * 2;
      this._intensity *= Math.exp(-this._decay * dt);
    } else {
      this._intensity = 0;
      this._offsetX = lerp(this._offsetX, 0, 0.3);
      this._offsetY = lerp(this._offsetY, 0, 0.3);
    }

    return { x: this._offsetX, y: this._offsetY };
  }

  get isShaking() {
    return this._intensity > 0.01;
  }
}
