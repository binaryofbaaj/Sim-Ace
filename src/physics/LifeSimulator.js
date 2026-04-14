import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

/**
 * LifeSimulator — calculates habitability and simulates population trends.
 */
export class LifeSimulator {
  constructor() {
    this._tickRate = 1.0; // Life moves slow
    this._accumulator = 0;
    
    // Goldilocks constants based on sim scale (L = M / d^2)
    this.IDEAL_MIN = 0.08;
    this.IDEAL_MAX = 0.45;
  }

  update(dt) {
    if (gameState.params.paused) return;

    this._accumulator += dt;
    if (this._accumulator >= this._tickRate) {
      this._simulateTick(this._accumulator);
      this._accumulator = 0;
    }
  }

  _simulateTick(dt) {
    const bodies = gameState.getBodies();
    
    for (const b of bodies) {
      if (b.type === 'star' || b.type === 'blackhole' || b.type === 'asteroid') continue;

      const radiance = gameState.getRadiance(b.id);
      
      // Calculate habitability (0-1) based on proximity to Goldilocks range
      let hab = 0;
      if (radiance >= this.IDEAL_MIN && radiance <= this.IDEAL_MAX) {
        // Linear peak at center of range
        const center = (this.IDEAL_MIN + this.IDEAL_MAX) / 2;
        const dist = Math.abs(radiance - center);
        const range = (this.IDEAL_MAX - this.IDEAL_MIN) / 2;
        hab = 1.0 - (dist / range);
      } else {
        hab = 0; // Too hot or too cold
      }

      // Stability impact: Chaos kills life
      const chaosImpact = gameState.params.chaosLevel / 100;
      hab *= (1.0 - chaosImpact * 0.5);

      b.habitability = hab;

      // ---- Population Simulation ----
      if (hab > 0.4) {
        // Growth phase
        if (b.population === 0) b.population = 1000;
        else b.population *= (1.0 + (hab * 0.05 * dt));
        
        b.timeInZone += dt;
      } else if (b.population > 0) {
        // Decline phase (starvation/freezing)
        b.population *= (0.9 - (1.0 - hab) * 0.2);
        if (b.population < 100) {
          b.population = 0;
          if (b.civLevel !== 'None') {
             eventBus.emit('alert:show', { 
               message: `Extinction Event: Civilization on ${b.id.slice(0,4)} has fallen.`, 
               severity: 'danger' 
             });
          }
        }
      }

      // ---- Civilization Progression ----
      const oldLevel = b.civLevel;
      if (b.population > 1e9) b.civLevel = 'Type I';
      else if (b.population > 1e7) b.civLevel = 'Advanced';
      else if (b.population > 1e5) b.civLevel = 'Developing';
      else if (b.population > 1000) b.civLevel = 'Primitive';
      else b.civLevel = 'None';

      if (oldLevel !== b.civLevel && b.civLevel !== 'None') {
         eventBus.emit('alert:show', { 
           message: `Progression: ${b.civLevel} life detected on ${b.id.slice(0,4)}`, 
           severity: 'success' 
         });
         gameState.addXP(200);
      }
    }
  }
}
