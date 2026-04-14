import { gameState } from '../core/GameState.js';
import { createBody } from '../objects/CelestialBody.js';
import { eventBus } from '../core/EventBus.js';
import { twoMoons } from './TwoMoons.js';
import { jupiterSun } from './JupiterSun.js';
import { blackHoleEarth } from './BlackHoleEarth.js';

const scenarios = {
  twoMoons,
  jupiterSun,
  blackHoleEarth,
};

/**
 * ScenarioManager — load scenario presets.
 */
export class ScenarioManager {
  constructor() {
    eventBus.on('scenario:load', ({ name }) => {
      this.load(name);
    });
  }

  /**
   * Load a scenario by name.
   */
  load(name) {
    const scenarioFn = scenarios[name];
    if (!scenarioFn) {
      console.warn(`[ScenarioManager] Unknown scenario: ${name}`);
      return;
    }

    // Clear current sim
    gameState.clearAll();
    eventBus.emit('trails:clear');

    // Get scenario config and spawn bodies
    const bodies = scenarioFn();
    for (const config of bodies) {
      const body = createBody(config);
      gameState.addBody(body);
    }

    console.log(`[ScenarioManager] Loaded: ${name} (${bodies.length} bodies)`);
  }
}
