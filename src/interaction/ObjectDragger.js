import * as THREE from 'three';
import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { vec } from '../utils/math.js';

/**
 * ObjectDragger — select bodies, drag to reposition, and edit velocity.
 */
export class ObjectDragger {
  constructor(raycaster, scene) {
    this.raycaster = raycaster;
    this.scene = scene;

    this._isDragging = false;
    this._isEditingVelocity = false;
    this._dragBody = null;
    this._selectedBody = null;

    this.enabled = true;
    this.deleteMode = false;
    this._velScale = 0.5;

    // ---- Selection visuals ----
    // Selection ring
    const ringGeo = new THREE.RingGeometry(1.1, 1.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ECDC4,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this._selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this._selectionRing.visible = false;
    this.scene.add(this._selectionRing);

    // Velocity edit arrow
    const arrowGeo = new THREE.BufferGeometry();
    arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const arrowMat = new THREE.LineBasicMaterial({
      color: 0xFFD93D,
      transparent: true,
      opacity: 0.8,
      linewidth: 3,
    });
    this._velocityArrow = new THREE.Line(arrowGeo, arrowMat);
    this._velocityArrow.visible = false;
    this.scene.add(this._velocityArrow);

    this._bindEvents();
  }

  _bindEvents() {
    eventBus.on('body:removed', ({ id }) => {
      if (this._selectedBody?.id === id) {
        this._deselect();
      }
    });

    eventBus.on('clear:all', () => this._deselect());
  }

  /**
   * Try to select/start dragging a body at screen position.
   */
  trySelect(screenX, screenY, bodies) {
    if (!this.enabled) return false;

    const hit = this.raycaster.pickBody(screenX, screenY, bodies);

    if (hit) {
      if (this.deleteMode) {
        gameState.removeBody(hit.id);
        return true;
      }

      // If already selected, maybe start velocity editing?
      // Logic: if click near the body center -> drag (reposition)
      // If click further away (if I had a handle) -> edit velocity
      // For now: first click selects. Second drag on body repositions. 
      // Right-drag or similar? Let's use Shift+Drag for velocity edit.

      this._selectedBody = hit;
      this._dragBody = hit;
      this._isDragging = true;
      gameState.selectedId = hit.id;
      eventBus.emit('body:selected', { id: hit.id, body: hit });
      
      this._updateVisuals();
      return true;
    }

    this._deselect();
    return false;
  }

  /**
   * Handle secondary interaction (e.g. Right click or Shift+Drag) to edit velocity.
   */
  tryStartVelocityEdit(screenX, screenY, bodies) {
     const hit = this.raycaster.pickBody(screenX, screenY, bodies);
     if (hit && hit.id === this._selectedBody?.id) {
       this._isEditingVelocity = true;
       return true;
     }
     return false;
  }

  updateDrag(screenX, screenY) {
    if (!this._selectedBody) return;
    const world = this.raycaster.screenToWorld(screenX, screenY);
    const body = gameState.getBody(this._selectedBody.id);
    if (!body) return;

    if (this._isEditingVelocity) {
       // Dragging away from body center sets velocity
       const dx = world.x - body.x;
       const dy = world.y - body.y;
       body.vx = dx * this._velScale;
       body.vy = dy * this._velScale;
       this._updateVisuals();
    } else if (this._isDragging) {
       // Dragging body center repositions it
       body.x = world.x;
       body.y = world.y;
       body.vx = 0;
       body.vy = 0;
       this._updateVisuals();
    }
  }

  endDrag() {
    this._isDragging = false;
    this._isEditingVelocity = false;
    this._dragBody = null;
  }

  deleteSelected() {
    if (this._selectedBody) {
      gameState.removeBody(this._selectedBody.id);
      this._deselect();
    }
  }

  _deselect() {
    this._selectedBody = null;
    gameState.selectedId = null;
    this._isDragging = false;
    this._isEditingVelocity = false;
    this._updateVisuals();
    eventBus.emit('body:selected', null);
  }

  _updateVisuals() {
    if (!this._selectedBody) {
      this._selectionRing.visible = false;
      this._velocityArrow.visible = false;
      return;
    }

    const body = gameState.getBody(this._selectedBody.id);
    if (!body) return;

    const r = body.radius;
    this._selectionRing.scale.set(r, r, 1);
    this._selectionRing.position.set(body.x, body.y, 2);
    this._selectionRing.visible = true;

    // Show current velocity as an arrow
    if (this._isEditingVelocity || (Math.abs(body.vx) + Math.abs(body.vy) > 0.1)) {
        const pos = this._velocityArrow.geometry.attributes.position;
        pos.array[0] = body.x;
        pos.array[1] = body.y;
        pos.array[2] = 5;
        pos.array[3] = body.x + (body.vx / this._velScale);
        pos.array[4] = body.y + (body.vy / this._velScale);
        pos.array[5] = 5;
        pos.needsUpdate = true;
        this._velocityArrow.visible = true;
    } else {
        this._velocityArrow.visible = false;
    }
  }

  get isDragging() {
    return this._isDragging || this._isEditingVelocity;
  }
}
