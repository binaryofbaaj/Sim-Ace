/**
 * EventBus — pub/sub for decoupled communication.
 */
class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const wrapper = (data) => { this.off(event, wrapper); fn(data); };
    this.on(event, wrapper);
  }

  off(event, fn) {
    const set = this._listeners.get(event);
    if (set) { set.delete(fn); if (set.size === 0) this._listeners.delete(event); }
  }

  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) for (const fn of set) {
      try { fn(data); } catch (e) { console.error(`[EventBus] "${event}":`, e); }
    }
  }

  clear(event) {
    event ? this._listeners.delete(event) : this._listeners.clear();
  }
}

export const eventBus = new EventBus();
export default EventBus;
