import { eventBus } from '../core/EventBus.js';

/**
 * ModeSelector — toggle between Sandbox, Scenarios, and Challenges.
 */
export class ModeSelector {
  constructor(container, scenarioManager) {
    this.container = container;
    this.scenarioManager = scenarioManager;
    this.mode = 'sandbox';
    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.classList.add('panel', 'mode-panel');
    this.container.innerHTML = `
      <div class="mode-tabs">
        <button class="mode-tab active" data-mode="sandbox">🧪 Sandbox</button>
        <button class="mode-tab" data-mode="scenario">🎬 Scenarios</button>
        <button class="mode-tab" data-mode="challenge">🏆 Challenges</button>
      </div>
      
      <div class="mode-content">
        <div class="scenario-list" id="scenario-list" style="display:none;">
          <button class="btn scenario-btn" data-scenario="twoMoons">🌍 Earth + 2 Moons</button>
          <button class="btn scenario-btn" data-scenario="jupiterSun">☀️ Jupiter as Sun</button>
          <button class="btn scenario-btn" data-scenario="blackHoleEarth">🕳️ Black Hole vs Earth</button>
        </div>

        <div class="challenge-list" id="challenge-list" style="display:none;">
          <button class="btn challenge-btn" data-challenge="patience">⚖️ Steady Orbiting</button>
          <button class="btn challenge-btn" data-challenge="starseed">✨ Star Cluster</button>
          <button class="btn challenge-btn" data-challenge="collapse">☄️ Great Heat Death</button>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    const tabs = this.container.querySelectorAll('.mode-tab');
    const scenarioList = this.container.querySelector('#scenario-list');
    const challengeList = this.container.querySelector('#challenge-list');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        
        scenarioList.style.display = this.mode === 'scenario' ? 'flex' : 'none';
        challengeList.style.display = this.mode === 'challenge' ? 'flex' : 'none';
      });
    });

    // Scenario buttons
    this.container.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.scenario;
        eventBus.emit('scenario:load', { name });
      });
    });

    // Challenge buttons
    this.container.querySelectorAll('.challenge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.challenge;
        eventBus.emit('challenge:start', { id });
      });
    });
  }
}
