import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { vec } from '../utils/math.js';

/**
 * HUD — high-fidelity civilization inspector and system stats.
 */
export class HUD {
  constructor(container) {
    this.container = container;
    this._selectedId = null;
    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.classList.add('panel', 'hud-panel');
    this.container.innerHTML = `
      <div class="panel-title">SCANNER / INSPECTOR</div>
      <div class="hud-empty" id="hud-empty">
        <span class="hud-label">IDLE</span>
        <span class="hud-val">AWAITING INPUT...</span>
      </div>
      
      <div class="hud-body-info" id="hud-body-info" style="display:none;">
        <div class="hud-row">
          <span class="hud-label">OBJ_TYPE</span>
          <span class="hud-val" id="hud-type">—</span>
        </div>
        
        <div class="hud-divider"></div>

        <!-- Life Stats -->
        <div class="life-container" id="life-container">
           <div class="hud-row">
             <span class="hud-label">HABITABILITY</span>
             <span class="hud-val" id="hud-hab">0%</span>
           </div>
           <div class="data-gauge"><div class="data-fill" id="hab-bar"></div></div>
           
           <div class="hud-row" style="margin-top:12px;">
             <span class="hud-label">POPULATION</span>
             <span class="hud-val" id="hud-pop">0</span>
           </div>
           <div class="hud-row">
             <span class="hud-label">STATUS</span>
             <span class="hud-val life-status" id="hud-civ-level">BARREN</span>
           </div>
        </div>

        <div class="hud-divider"></div>

        <div class="hud-row">
          <span class="hud-label">VELOCITY</span>
          <span class="hud-val" id="hud-speed">—</span>
        </div>
        <div class="hud-row">
          <span class="hud-label">NEAREST_REF</span>
          <span class="hud-val" id="hud-nearest">—</span>
        </div>
        
        <div class="hud-actions" style="margin-top:16px;">
          <button class="btn btn-sm" id="hud-focus">TARGET LOCK</button>
          <button class="btn btn-sm btn-danger" id="hud-delete">DISINTEGRATE</button>
        </div>
      </div>

      <div class="hud-divider"></div>

      <div class="panel-title">SYSTEM ANALYTICS</div>
      <div class="stability-container">
        <div class="hud-row">
          <span class="hud-label">STABILITY</span>
          <span class="hud-val" id="hud-stability">NOMINAL</span>
        </div>
        <div class="data-gauge"><div class="data-fill" id="hud-stability-bar"></div></div>
      </div>

      <div class="hud-row">
        <span class="hud-label">PILOT_LEVEL</span>
        <span class="hud-val" id="hud-level">1</span>
      </div>
      <div class="xp-container">
        <div class="data-gauge"><div class="data-fill" id="hud-xp-bar"></div></div>
      </div>
    `;
  }

  _bindEvents() {
    eventBus.on('body:selected', (data) => {
      this._selectedId = data ? data.id : null;
      const empty = this.container.querySelector('#hud-empty');
      const info = this.container.querySelector('#hud-body-info');
      if (this._selectedId) {
        empty.style.display = 'none';
        info.style.display = 'block';
      } else {
        empty.style.display = 'block';
        info.style.display = 'none';
      }
    });

    this.container.querySelector('#hud-focus')?.addEventListener('click', () => {
      const b = gameState.getBody(this._selectedId);
      if (b) eventBus.emit('camera:focus', { x: b.x, y: b.y, id: b.id });
    });

    this.container.querySelector('#hud-delete')?.addEventListener('click', () => {
      if (this._selectedId) gameState.removeBody(this._selectedId);
    });
  }

  update(gameLoop) {
    // ---- Top bar stats ----
    const bodiesEl = document.getElementById('stat-bodies');
    const fpsEl = document.getElementById('stat-fps');
    if (bodiesEl) bodiesEl.textContent = gameState.bodies.size;
    if (fpsEl) fpsEl.textContent = gameLoop.fps;

    if (this._selectedId) {
      const b = gameState.getBody(this._selectedId);
      if (b) {
        this.container.querySelector('#hud-type').textContent = b.type.toUpperCase();
        this.container.querySelector('#hud-speed').textContent = Math.round(vec.mag({ x: b.vx, y: b.vy }));
        
        // Life Stats
        const hab = (b.habitability || 0) * 100;
        this.container.querySelector('#hud-hab').textContent = `${Math.round(hab)}%`;
        this.container.querySelector('#hab-bar').style.width = `${hab}%`;
        
        const pop = b.population || 0;
        this.container.querySelector('#hud-pop').textContent = this._fmtPop(pop);
        
        const civ = b.civLevel || 'NONE';
        const civEl = this.container.querySelector('#hud-civ-level');
        civEl.textContent = civ.toUpperCase();
        civEl.style.color = pop > 0 ? 'var(--accent-bio)' : 'var(--text-muted)';

        const nearestData = gameState.getNearest(this._selectedId);
        this.container.querySelector('#hud-nearest').textContent = nearestData ? nearestData.body.type.toUpperCase() : 'NONE';
      }
    }

    // System Analytics
    const s = gameState.stability;
    const stabEl = this.container.querySelector('#hud-stability');
    stabEl.textContent = s > 0.8 ? 'NOMINAL' : (s > 0.4 ? 'UNSTABLE' : 'CRITICAL');
    stabEl.style.color = s > 0.8 ? 'var(--accent-primary)' : (s > 0.4 ? 'var(--accent-warn)' : 'var(--accent-danger)');
    this.container.querySelector('#hud-stability-bar').style.width = `${s * 100}%`;
    this.container.querySelector('#hud-stability-bar').style.backgroundColor = stabEl.style.color;

    this.container.querySelector('#hud-level').textContent = gameState.level;
    const xpProgress = gameState.xp / (gameState.level * 500);
    this.container.querySelector('#hud-xp-bar').style.width = `${xpProgress * 100}%`;
  }

  _fmtPop(n) {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return Math.round(n).toString();
  }
}
