import { eventBus } from '../core/EventBus.js';

/**
 * AlertSystem — toast notifications for events.
 */
export class AlertSystem {
  constructor() {
    this.container = document.getElementById('alert-container');
    this._alerts = [];
    this._maxAlerts = 3;
    this._cooldown = new Map(); // Prevent spam
    this._bindEvents();
  }

  _bindEvents() {
    eventBus.on('collision', (c) => {
      if (c.type === 'explode') {
        this.show('💥 Explosion!', 'critical', 2000);
      } else if (c.type === 'merge') {
        this.show('🔄 Bodies merged', 'info', 1500);
      } else if (c.type === 'absorb') {
        this.show('🕳️ Body absorbed', 'warning', 1500);
      }
    });
  }

  /**
   * Show an alert toast.
   * @param {string} message
   * @param {'info'|'warning'|'critical'} severity
   * @param {number} [durationMs=2000]
   */
  show(message, severity = 'info', durationMs = 2000) {
    // Cooldown — don't show same message within 500ms
    const now = Date.now();
    if (this._cooldown.has(message) && now - this._cooldown.get(message) < 500) return;
    this._cooldown.set(message, now);

    // Remove oldest if at max
    while (this._alerts.length >= this._maxAlerts) {
      this._removeOldest();
    }

    const toast = document.createElement('div');
    toast.className = `alert-toast alert-${severity}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    this._alerts.push(toast);

    // Auto-dismiss
    setTimeout(() => {
      this._dismiss(toast);
    }, durationMs);
  }

  _dismiss(toast) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
      const idx = this._alerts.indexOf(toast);
      if (idx >= 0) this._alerts.splice(idx, 1);
    });
  }

  _removeOldest() {
    const oldest = this._alerts.shift();
    if (oldest) {
      oldest.remove();
    }
  }
}
