import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

/**
 * InputManager — unified mouse/touch event handler.
 * Routes events to ObjectPlacer, ObjectDragger, and CameraControls.
 */
export class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./ObjectPlacer.js').ObjectPlacer} placer
   * @param {import('./ObjectDragger.js').ObjectDragger} dragger
   * @param {import('../rendering/CameraControls.js').CameraControls} cameraControls
   * @param {Function} getBodies — returns array of bodies
   */
  constructor(canvas, placer, dragger, cameraControls, getBodies) {
    this.canvas = canvas;
    this.placer = placer;
    this.dragger = dragger;
    this.cam = cameraControls;
    this.getBodies = getBodies;

    this._activeAction = null; // 'place' | 'drag' | 'edit_vel'
    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
    window.addEventListener('mousemove', this._onMouseMove.bind(this));
    window.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this._onContextMenu.bind(this));

    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd.bind(this));
  }

  _onMouseDown(e) {
    if (e.button === 1) return; // middle click
    if (e.button === 2) return; // right click handled by contextmenu

    const bodies = this.getBodies();

    // SHIFT or ALT could be used for velocity editing
    if (e.shiftKey || e.altKey) {
       // Only allow velocity editing if clicking on a body
       if (this.dragger.tryStartVelocityEdit(e.clientX, e.clientY, bodies)) {
           this._activeAction = 'drag';
           return;
       }
       // If not on body, let it bubble (likely for Camera pan)
       return;
    }

    // Normal selection/drag
    if (this.dragger.trySelect(e.clientX, e.clientY, bodies)) {
      this._activeAction = 'drag';
      return;
    }

    // Spawn new
    if (this.placer.startPlace(e.clientX, e.clientY, bodies)) {
      this._activeAction = 'place';
    }
  }

  _onMouseMove(e) {
    if (this.cam._isPanning) return;

    if (this._activeAction === 'drag') {
      this.dragger.updateDrag(e.clientX, e.clientY);
    } else if (this._activeAction === 'place') {
      this.placer.updatePlace(e.clientX, e.clientY);
    }
  }

  _onMouseUp(e) {
    this.dragger.endDrag();
    if (this._activeAction === 'place') {
      this.placer.endPlace(e.clientX, e.clientY);
    }
    this._activeAction = null;
  }

  _onContextMenu(e) {
    e.preventDefault();
    const bodies = this.getBodies();
    const hit = this.placer.raycaster.pickBody(e.clientX, e.clientY, bodies);
    if (hit) {
      gameState.removeBody(hit.id);
    }
  }

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const bodies = this.getBodies();

    if (this.dragger.trySelect(t.clientX, t.clientY, bodies)) {
      this._activeAction = 'drag';
      e.preventDefault();
      return;
    }

    if (this.placer.startPlace(t.clientX, t.clientY, bodies)) {
      this._activeAction = 'place';
      e.preventDefault();
    }
  }

  _onTouchMove(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];

    if (this._activeAction === 'drag') {
      this.dragger.updateDrag(t.clientX, t.clientY);
      e.preventDefault();
    } else if (this._activeAction === 'place') {
      this.placer.updatePlace(t.clientX, t.clientY);
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    this.dragger.endDrag();
    if (this._activeAction === 'place') {
      const t = e.changedTouches[0];
      this.placer.endPlace(t.clientX, t.clientY);
    }
    this._activeAction = null;
  }
}
