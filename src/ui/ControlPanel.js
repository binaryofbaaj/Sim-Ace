import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { BODY_DEFAULTS } from '../physics/constants.js';

/**
 * ControlPanel — left sidebar for object spawning controls.
 */
export class ControlPanel {
  /**
   * @param {HTMLElement} container — #control-panel
   * @param {import('../interaction/ObjectPlacer.js').ObjectPlacer} placer
   */
  constructor(container, placer) {
    this.container = container;
    this.placer = placer;
    this.selectedType = 'planet';
    this.mass = BODY_DEFAULTS.planet.mass;
    this.gravityMultiplier = 1.0;
    this.deleteMode = false;
    this.collisionMode = 'mixed';

    this._build();
    this._bindEvents();
    this._updateLockStatus();
  }

  _build() {
    this.container.classList.add('panel', 'control-panel');
    this.container.innerHTML = `
      <div class="panel-title">SPAWN OBJECT</div>

      <div class="type-selector" id="type-selector">
        <button class="type-btn active" data-type="planet" id="btn-planet" title="Planet">
          <span class="type-icon">🪐</span>
          <span class="type-label">Planet</span>
        </button>
        <button class="type-btn" data-type="star" id="btn-star" title="Star">
          <span class="type-icon">⭐</span>
          <span class="type-label">Star</span>
        </button>
        <button class="type-btn" data-type="asteroid" id="btn-asteroid" title="Asteroid">
          <span class="type-icon">🪨</span>
          <span class="type-label">Asteroid</span>
        </button>
        <button class="type-btn locked" data-type="blackhole" id="btn-blackhole" title="Black Hole (Unlock at Level 3)">
          <span class="type-icon">🕳️</span>
          <span class="type-label">Locked</span>
        </button>
      </div>

      <div class="control-divider"></div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Mass</span>
          <span class="slider-value mono" id="mass-value">${this.mass}</span>
        </div>
        <input type="range" id="mass-slider" min="0" max="100" value="50" />
      </div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Gravity</span>
          <span class="slider-value mono" id="gravity-value">1.0×</span>
        </div>
        <input type="range" id="gravity-slider" min="1" max="100" value="50" />
      </div>

      <div class="control-divider"></div>

      <div class="panel-title">PHYSICS OPTIONS</div>
      <div class="mode-toggle-group">
        <span class="hud-label">Collision Mode</span>
        <div class="mode-btns">
          <button class="btn btn-sm mode-toggle active" data-mode="mixed">Mixed</button>
          <button class="btn btn-sm mode-toggle" data-mode="merge">Merge</button>
          <button class="btn btn-sm mode-toggle" data-mode="explode">Explode</button>
        </div>
      </div>

      <div class="control-divider"></div>

      <div class="control-actions">
        <button class="btn btn-action" id="btn-delete-mode" title="Delete Mode">
          <span>🗑️</span> Delete Mode
        </button>
        <button class="btn btn-sm btn-action" id="btn-reset-cam" title="Reset Camera">
          <span>🎯</span> Reset View
        </button>
        <button class="btn btn-danger btn-action" id="btn-clear-all" title="Clear All">
          <span>✕</span> Clear All
        </button>
      </div>

      <div class="control-help">
        <span class="help-text">Click to spawn • Drag to set velocity</span>
        <span class="help-text">Shift+Drag to pan • Scroll to zoom</span>
        <span class="help-text">Right-click to delete</span>
      </div>
    `;
  }

  _bindEvents() {
    // Type selection
    const typeButtons = this.container.querySelectorAll('.type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
          eventBus.emit('alert:show', { message: 'Reach Level 3 to unlock Black Holes!', severity: 'warning' });
          return;
        }
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedType = btn.dataset.type;
        this.placer.setType(this.selectedType);
        this._updateMassSlider();
      });
    });

    // Mass slider (logarithmic mapping)
    const massSlider = this.container.querySelector('#mass-slider');
    const massValue = this.container.querySelector('#mass-value');
    massSlider.addEventListener('input', () => {
      const t = massSlider.value / 100; // 0–1
      const defaults = BODY_DEFAULTS[this.selectedType];
      const logMin = Math.log(defaults.minMass);
      const logMax = Math.log(defaults.maxMass);
      this.mass = Math.round(Math.exp(logMin + t * (logMax - logMin)));
      massValue.textContent = this._formatMass(this.mass);
      this.placer.setMass(this.mass);
    });

    // Gravity slider
    const gravSlider = this.container.querySelector('#gravity-slider');
    const gravValue = this.container.querySelector('#gravity-value');
    gravSlider.addEventListener('input', () => {
      const t = gravSlider.value / 100;
      this.gravityMultiplier = 0.1 + t * t * 4.9;
      this.gravityMultiplier = Math.round(this.gravityMultiplier * 10) / 10;
      gravValue.textContent = `${this.gravityMultiplier}×`;
      eventBus.emit('params:changed', { key: 'gravityMultiplier', value: this.gravityMultiplier });
    });

    // Collision Mode
    const modeBtns = this.container.querySelectorAll('.mode-toggle');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.collisionMode = btn.dataset.mode;
        eventBus.emit('params:changed', { key: 'collisionMode', value: this.collisionMode });
      });
    });

    // Reset Camera
    this.container.querySelector('#btn-reset-cam').addEventListener('click', () => {
      eventBus.emit('camera:reset');
    });

    // Delete mode toggle
    const deleteBtn = this.container.querySelector('#btn-delete-mode');
    deleteBtn.addEventListener('click', () => {
      this.deleteMode = !this.deleteMode;
      deleteBtn.classList.toggle('active', this.deleteMode);
      eventBus.emit('deleteMode:changed', { enabled: this.deleteMode });
    });

    // Clear all
    this.container.querySelector('#btn-clear-all').addEventListener('click', () => {
      eventBus.emit('clear:all');
    });

    // Unlock listener
    eventBus.on('unlock', () => this._updateLockStatus());
    eventBus.on('level:up', () => this._updateLockStatus());

    this._updateMassSlider();
  }

  _updateLockStatus() {
    const bhBtn = this.container.querySelector('#btn-blackhole');
    if (gameState.unlocks.blackHole) {
      bhBtn.classList.remove('locked');
      bhBtn.querySelector('.type-label').textContent = 'Black Hole';
      bhBtn.title = 'Black Hole';
    }
  }

  _updateMassSlider() {
    const defaults = BODY_DEFAULTS[this.selectedType];
    const massSlider = this.container.querySelector('#mass-slider');
    const massValue = this.container.querySelector('#mass-value');
    massSlider.value = 50;
    this.mass = defaults.mass;
    massValue.textContent = this._formatMass(this.mass);
    this.placer.setMass(this.mass);
  }

  _formatMass(m) {
    if (m >= 10000) return `${(m / 1000).toFixed(1)}k`;
    if (m >= 1000) return `${(m / 1000).toFixed(1)}k`;
    return `${m}`;
  }
}
