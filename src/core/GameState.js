import { eventBus } from './EventBus.js';

/**
 * GameState — central store for all simulation data.
 * Enhanced for Life & Realness Expansion.
 */
class GameState {
  constructor() {
    /** @type {Map<string, Object>} */
    this.bodies = new Map();

    this.params = {
      gravityMultiplier: 1.0,
      chaosLevel: 0,
      timeScale: 1.0,
      paused: false,
      collisionMode: 'mixed',
    };

    this.selectedId = null;

    /** Progression State */
    this.xp = 0;
    this.level = 1;
    this.unlocks = {
      blackHole: false,
    };

    /** System status */
    this.stability = 1.0;

    this._loadProgress();
  }

  /**
   * Add a body with life-related fields.
   */
  addBody(body) {
    const lifeProps = {
      habitability: 0,
      population: 0,
      civLevel: 'None',
      timeInZone: 0,
    };
    this.bodies.set(body.id, { ...body, ...lifeProps });
    eventBus.emit('body:added', { body });
    this.addXP(10);
  }

  removeBody(id) {
    this.bodies.delete(id);
    if (this.selectedId === id) {
      this.selectedId = null;
      eventBus.emit('body:selected', null);
    }
    eventBus.emit('body:removed', { id });
  }

  /**
   * Get the nearest body to a given body.
   */
  getNearest(bodyId) {
    const target = this.bodies.get(bodyId);
    if (!target) return null;
    let nearest = null;
    let nearestDist = Infinity;
    this.bodies.forEach(b => {
      if (b.id === bodyId) return;
      const dx = b.x - target.x;
      const dy = b.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { body: b, distance: dist };
      }
    });
    return nearest;
  }

  updateBody(id, params) {
    const body = this.bodies.get(id);
    if (body) {
      Object.assign(body, params);
      eventBus.emit('body:updated', { id, body });
    }
  }

  getBody(id) {
    return this.bodies.get(id) || null;
  }

  getBodies() {
    return Array.from(this.bodies.values());
  }

  /**
   * Calculate habitability for a body based on radiance from stars.
   */
  getRadiance(id) {
    const target = this.bodies.get(id);
    if (!target || target.type === 'star' || target.type === 'blackhole') return 0;

    let totalRadiance = 0;
    this.bodies.forEach(b => {
      if (b.type === 'star' && b.id !== id) {
        const dx = b.x - target.x;
        const dy = b.y - target.y;
        const distSq = dx * dx + dy * dy;
        // Radiance L = M / d^2
        totalRadiance += b.mass / Math.max(100, distSq);
      }
    });

    return totalRadiance;
  }

  addXP(amount) {
    this.xp += amount;
    const nextLevelXP = this.level * 500;
    if (this.xp >= nextLevelXP) {
      this.level++;
      this.xp -= nextLevelXP;
      this._checkUnlocks();
      eventBus.emit('level:up', { level: this.level });
    }
    this._saveProgress();
  }

  _checkUnlocks() {
    if (this.level >= 3 && !this.unlocks.blackHole) {
      this.unlocks.blackHole = true;
      eventBus.emit('unlock', { item: 'blackHole' });
    }
  }

  _saveProgress() {
    const data = { xp: this.xp, level: this.level, unlocks: this.unlocks };
    localStorage.setItem('sim_ace_progress', JSON.stringify(data));
  }

  _loadProgress() {
    const saved = localStorage.getItem('sim_ace_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.xp = data.xp ?? 0;
        this.level = data.level ?? 1;
        this.unlocks = data.unlocks ?? this.unlocks;
      } catch (e) {
        console.warn('Failed to load progress', e);
      }
    }
  }

  applyPhysicsUpdate(updates) {
    for (const u of updates) {
      const body = this.bodies.get(u.id);
      if (body) {
        body.x = u.x;
        body.y = u.y;
        body.vx = u.vx;
        body.vy = u.vy;
        if (u.radius !== undefined) body.radius = u.radius;
        if (u.mass !== undefined) body.mass = u.mass;
      }
    }
    this._updateStability();
  }

  _updateStability() {
    if (this.bodies.size < 2) {
      this.stability = 1.0;
      return;
    }
    const bodies = this.getBodies();
    let totalVel = 0;
    bodies.forEach(b => { totalVel += Math.sqrt(b.vx * b.vx + b.vy * b.vy); });
    const avgVel = totalVel / bodies.size;
    const chaosImpact = this.params.chaosLevel / 100;
    const velImpact = Math.min(avgVel / 500, 0.5);
    this.stability = Math.max(0, 1.0 - (chaosImpact * 0.7 + velImpact));
  }

  setParam(key, value) {
    if (this.params[key] === value) return;
    this.params[key] = value;
    eventBus.emit('params:changed', { key, value });
  }

  clearAll() {
    const ids = [...this.bodies.keys()];
    for (const id of ids) this.removeBody(id);
  }

  serializeForWorker() {
    const bodies = this.getBodies();
    const count = bodies.length;
    const data = {
      count,
      ids: new Array(count),
      types: new Array(count),
      x: new Float64Array(count),
      y: new Float64Array(count),
      vx: new Float64Array(count),
      vy: new Float64Array(count),
      mass: new Float64Array(count),
      radius: new Float64Array(count),
    };
    for (let i = 0; i < count; i++) {
      const b = bodies[i];
      data.ids[i] = b.id;
      data.types[i] = b.type;
      data.x[i] = b.x;
      data.y[i] = b.y;
      data.vx[i] = b.vx;
      data.vy[i] = b.vy;
      data.mass[i] = b.mass;
      data.radius[i] = b.radius;
    }
    return data;
  }
}

export const gameState = new GameState();
export default GameState;
