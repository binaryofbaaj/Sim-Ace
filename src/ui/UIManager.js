import { ControlPanel } from './ControlPanel.js';
import { TimeControls } from './TimeControls.js';
import { ChaosSlider } from './ChaosSlider.js';
import { HUD } from './HUD.js';
import { AlertSystem } from './AlertSystem.js';
import { ModeSelector } from './ModeSelector.js';

/**
 * UIManager — initializes and coordinates all UI panels.
 */
export class UIManager {
  /**
   * @param {Object} deps
   * @param {import('../interaction/ObjectPlacer.js').ObjectPlacer} deps.placer
   * @param {import('../core/GameLoop.js').GameLoop} deps.gameLoop
   * @param {import('../scenarios/ScenarioManager.js').ScenarioManager} deps.scenarioManager
   */
  constructor({ placer, gameLoop, scenarioManager }) {
    const controlPanelEl = document.getElementById('control-panel');

    this.controlPanel = new ControlPanel(controlPanelEl, placer);

    // Chaos slider — injected into the control panel
    this.chaosSlider = new ChaosSlider(controlPanelEl);

    this.timeControls = new TimeControls(
      document.getElementById('time-controls'),
      gameLoop
    );

    this.hud = new HUD(document.getElementById('hud-panel'));
    this.alerts = new AlertSystem();
    this.modeSelector = new ModeSelector(
      document.getElementById('mode-selector'),
      scenarioManager
    );
  }

  /**
   * Update UI elements that need frame-by-frame updates.
   */
  update(gameLoop) {
    this.hud.update(gameLoop);
  }
}
