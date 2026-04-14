/**
 * ReplayRecorder — records snapshots of body positions/velocities over time.
 */
export class ReplayRecorder {
  constructor() {
    this.frames = [];
    this.isRecording = false;
    this._maxFrames = 1800; // 30 seconds at 60fps
  }

  start() {
    this.frames = [];
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
  }

  record(bodies) {
    if (!this.isRecording) return;

    const snapshot = bodies.map(b => ({
      id: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      mass: b.mass,
      radius: b.radius,
      colorHex: b.colorHex,
    }));

    this.frames.push(snapshot);

    if (this.frames.length > this._maxFrames) {
      this.frames.shift();
    }
  }

  getSnapshot() {
    return JSON.stringify(this.frames);
  }

  clear() {
    this.frames = [];
  }
}
