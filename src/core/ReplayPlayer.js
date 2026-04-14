/**
 * ReplayPlayer — plays back recorded simulation frames.
 */
export class ReplayPlayer {
  constructor(gameState) {
    this.gameState = gameState;
    this.frames = [];
    this.currentFrame = 0;
    this.isPlaying = false;
    this.loop = false;
  }

  load(framesJsonOrArray) {
    if (typeof framesJsonOrArray === 'string') {
      try {
        this.frames = JSON.parse(framesJsonOrArray);
      } catch (e) {
        console.error('[ReplayPlayer] Failed to parse replay JSON:', e);
        return;
      }
    } else {
      this.frames = framesJsonOrArray;
    }
    this.currentFrame = 0;
    console.log(`[ReplayPlayer] Loaded ${this.frames.length} frames.`);
  }

  play() {
    if (this.frames.length === 0) return;
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
    this.currentFrame = 0;
  }

  /**
   * Update the simulation state with the current replay frame.
   * @param {number} dt
   */
  update(dt) {
    if (!this.isPlaying || this.frames.length === 0) return;

    const frame = this.frames[this.currentFrame];
    if (frame) {
      // Direct state update for replay
      this.gameState.bodies.clear();
      for (const b of frame) {
        this.gameState.bodies.set(b.id, { ...b });
      }
    }

    this.currentFrame++;
    if (this.currentFrame >= this.frames.length) {
      if (this.loop) {
        this.currentFrame = 0;
      } else {
        this.isPlaying = false;
      }
    }
  }

  setProgress(percent) {
    if (this.frames.length === 0) return;
    this.currentFrame = Math.floor(percent * (this.frames.length - 1));
  }

  get progress() {
    if (this.frames.length === 0) return 0;
    return this.currentFrame / (this.frames.length - 1);
  }
}
