import { eventBus } from '../core/EventBus.js';

/**
 * ChaosSlider — instability control (0–100%).
 * At 0%: standard gravity. At 100%: 3× gravity + random perturbations.
 */
export class ChaosSlider {
  /**
   * @param {HTMLElement} parentPanel — the control panel container
   */
  constructor(parentPanel) {
    this.value = 0;

    // Build DOM
    this.el = document.createElement('div');
    this.el.className = 'chaos-group';
    this.el.innerHTML = `
      <div class="slider-label chaos-label">
        <span>⚡ Chaos</span>
        <span class="slider-value mono chaos-value" id="chaos-value">0%</span>
      </div>
      <input type="range" id="chaos-slider" min="0" max="100" value="0" class="chaos-range" />
      <div class="chaos-bar" id="chaos-bar"></div>
    `;

    // Insert before the control-actions section
    const actions = parentPanel.querySelector('.control-actions');
    if (actions) {
      parentPanel.insertBefore(this.el, actions);
      // Add a divider before chaos
      const divider = document.createElement('div');
      divider.className = 'control-divider';
      parentPanel.insertBefore(divider, this.el);
    } else {
      parentPanel.appendChild(this.el);
    }

    this._slider = this.el.querySelector('#chaos-slider');
    this._valueEl = this.el.querySelector('#chaos-value');
    this._bar = this.el.querySelector('#chaos-bar');

    this._bindEvents();
  }

  _bindEvents() {
    this._slider.addEventListener('input', () => {
      this.value = parseInt(this._slider.value);
      this._valueEl.textContent = `${this.value}%`;
      this._updateVisuals();

      eventBus.emit('chaos:changed', { level: this.value });
      eventBus.emit('params:changed', { key: 'chaosLevel', value: this.value });
    });
  }

  _updateVisuals() {
    const t = this.value / 100;

    // Color transition: accent-planet → accent-warning → accent-danger
    let color;
    if (t < 0.5) {
      const u = t * 2;
      const r = Math.round(78 + (243 - 78) * u);
      const g = Math.round(205 + (156 - 205) * u);
      const b = Math.round(196 + (18 - 196) * u);
      color = `rgb(${r},${g},${b})`;
    } else {
      const u = (t - 0.5) * 2;
      const r = Math.round(243 + (231 - 243) * u);
      const g = Math.round(156 + (76 - 156) * u);
      const b = Math.round(18 + (60 - 18) * u);
      color = `rgb(${r},${g},${b})`;
    }

    // Update slider thumb color
    this._slider.style.setProperty('--chaos-color', color);

    // Glow bar intensity
    this._bar.style.background = `linear-gradient(90deg, transparent, ${color})`;
    this._bar.style.opacity = t * 0.8;
    this._bar.style.width = `${this.value}%`;

    // Value text color
    this._valueEl.style.color = color;

    // Pulse effect at high chaos
    if (this.value > 70) {
      this.el.classList.add('chaos-high');
    } else {
      this.el.classList.remove('chaos-high');
    }
  }
}
