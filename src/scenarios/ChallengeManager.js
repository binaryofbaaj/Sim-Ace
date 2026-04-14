import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

/**
 * ChallengeManager — defines and tracks player objectives.
 */
export class ChallengeManager {
  constructor() {
    this.activeChallenge = null;
    this.timer = 0;
    this.isComplete = false;

    this.challenges = {
      'patience': {
        id: 'patience',
        title: 'Steady Orbiting',
        description: 'Maintain a stable system for 30 seconds.',
        condition: () => gameState.stability > 0.85 && gameState.bodies.size >= 3,
        targetTime: 30,
      },
      'collapse': {
        id: 'collapse',
        title: 'Great Heat Death',
        description: 'Cause the system to collapse within 10 seconds.',
        condition: () => gameState.stability < 0.2,
        targetTime: 10,
      },
      'starseed': {
        id: 'starseed',
        title: 'Star Cluster',
        description: 'Have at least 5 stars in the system simultaneously.',
        condition: () => gameState.getBodies().filter(b => b.type === 'star').length >= 5,
        targetTime: 1,
      }
    };
  }

  start(challengeId) {
    const c = this.challenges[challengeId];
    if (!c) return;
    this.activeChallenge = c;
    this.timer = 0;
    this.isComplete = false;
    eventBus.emit('alert:show', { message: `Challenge Started: ${c.title}`, severity: 'info' });
  }

  stop() {
    this.activeChallenge = null;
    this.timer = 0;
  }

  update(dt) {
    if (!this.activeChallenge || this.isComplete) return;

    if (this.activeChallenge.condition()) {
      this.timer += dt;
      if (this.timer >= this.activeChallenge.targetTime) {
        this._complete();
      }
    } else {
      // For some challenges, resetting timer on condition fail might be needed
      if (this.activeChallenge.id === 'patience') {
          this.timer = 0;
      }
    }
  }

  _complete() {
    this.isComplete = true;
    const reward = 500;
    gameState.addXP(reward);
    eventBus.emit('alert:show', { 
      message: `🏆 Challenge Complete: ${this.activeChallenge.title}! (+${reward} XP)`, 
      severity: 'success' 
    });
    eventBus.emit('challenge:complete', { id: this.activeChallenge.id });
  }

  get progress() {
    if (!this.activeChallenge) return 0;
    return Math.min(1.0, this.timer / this.activeChallenge.targetTime);
  }
}
