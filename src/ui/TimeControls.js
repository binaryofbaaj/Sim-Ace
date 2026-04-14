import { eventBus } from '../core/EventBus.js';

/**
 * TimeControls — bottom bar with play/pause, speed slider.
 */
export class TimeControls {
  /**
   * @param {HTMLElement} container — #time-controls
   * @param {import('../core/GameLoop.js').GameLoop} gameLoop
   */
  constructor(container, gameLoop) {
    this.container = container;
    this.gameLoop = gameLoop;
    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.classList.add('panel', 'time-panel');
    this.container.innerHTML = `
      <button class="btn btn-icon time-btn" id="btn-play-pause" title="Play / Pause (Space)">
        ⏸️
      </button>

      <div class="time-speed-group">
        <button class="btn time-speed-preset" data-speed="0.25" title="Slow motion">0.25×</button>
        <button class="btn time-speed-preset" data-speed="0.5">0.5×</button>
        <button class="btn time-speed-preset active" data-speed="1">1×</button>
        <button class="btn time-speed-preset" data-speed="2">2×</button>
        <button class="btn time-speed-preset" data-speed="5">5×</button>
      </div>

      <div class="time-slider-group">
        <span class="time-label mono" id="time-speed-label">1.0×</span>
        <input type="range" id="time-slider" min="0" max="100" value="40" class="time-slider" />
      </div>
    `;
  }

  _bindEvents() {
    // Play/Pause
    const playBtn = this.container.querySelector('#btn-play-pause');
    playBtn.addEventListener('click', () => {
      this.gameLoop.paused = !this.gameLoop.paused;
      playBtn.textContent = this.gameLoop.paused ? '▶️' : '⏸️';
      eventBus.emit('time:changed', { paused: this.gameLoop.paused });
    });

    // Listen for keyboard toggle too
    eventBus.on('time:toggle', () => {
      this.gameLoop.paused = !this.gameLoop.paused;
      playBtn.textContent = this.gameLoop.paused ? '▶️' : '⏸️';
    });

    // Speed presets
    const presetBtns = this.container.querySelectorAll('.time-speed-preset');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.gameLoop.timeScale = speed;
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateSpeedLabel(speed);
        // Sync slider
        this.container.querySelector('#time-slider').value = this._speedToSlider(speed);
      });
    });

    // Speed slider (exponential mapping: 0.1 to 5)
    const slider = this.container.querySelector('#time-slider');
    slider.addEventListener('input', () => {
      const t = slider.value / 100;
      // Exponential: 0.1 at t=0, 1 at t=0.4, 5 at t=1
      const speed = 0.1 * Math.pow(50, t);
      this.gameLoop.timeScale = Math.round(speed * 100) / 100;
      this._updateSpeedLabel(this.gameLoop.timeScale);
      // Deselect presets
      presetBtns.forEach(b => b.classList.remove('active'));
    });

    this._updateSpeedLabel(1.0);
  }

  _updateSpeedLabel(speed) {
    const label = this.container.querySelector('#time-speed-label');
    label.textContent = `${speed.toFixed(speed < 1 ? 2 : 1)}×`;
  }

  _speedToSlider(speed) {
    // Inverse of 0.1 * 50^t → t = log(speed/0.1) / log(50)
    return Math.round((Math.log(speed / 0.1) / Math.log(50)) * 100);
  }
}
