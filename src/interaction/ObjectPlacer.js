import * as THREE from 'three';
import { createBody } from '../objects/CelestialBody.js';
import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { vec } from '../utils/math.js';
import { radiusFromMass } from '../physics/constants.js';

/**
 * ObjectPlacer — click-to-spawn with drag-to-set-velocity.
 */
export class ObjectPlacer {
  constructor(sceneManager, raycaster, scene) {
    this.sm = sceneManager;
    this.raycaster = raycaster;
    this.scene = scene;

    this.selectedType = 'planet';
    this.selectedMass = 100;

    this._isPlacing = false;
    this._spawnWorld = { x: 0, y: 0 };
    this._currentWorld = { x: 0, y: 0 };
    this._velScale = 0.5;
    this._dragThreshold = 5;
    this._startScreen = { x: 0, y: 0 };

    // ---- Preview visuals ----
    const ghostGeo = new THREE.CircleGeometry(1, 32);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x4ECDC4,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    this._ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this._ghostMesh.visible = false;
    this._ghostMesh.renderOrder = 5;
    this.scene.add(this._ghostMesh);

    const arrowGeo = new THREE.BufferGeometry();
    arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const arrowMat = new THREE.LineBasicMaterial({
      color: 0xFFD93D,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    this._arrowLine = new THREE.Line(arrowGeo, arrowMat);
    this._arrowLine.visible = false;
    this._arrowLine.renderOrder = 6;
    this.scene.add(this._arrowLine);

    const headGeo = new THREE.CircleGeometry(4, 3);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xFFD93D,
      transparent: true,
      opacity: 0.8,
    });
    this._arrowHead = new THREE.Mesh(headGeo, headMat);
    this._arrowHead.visible = false;
    this._arrowHead.renderOrder = 6;
    this.scene.add(this._arrowHead);

    this.enabled = true;
  }

  startPlace(screenX, screenY, bodies) {
    if (!this.enabled) return false;

    const hit = this.raycaster.pickBody(screenX, screenY, bodies);
    if (hit) return false;

    this._isPlacing = true;
    this._startScreen = { x: screenX, y: screenY };
    this._spawnWorld = this.raycaster.screenToWorld(screenX, screenY);
    this._currentWorld = { ...this._spawnWorld };

    this._updateGhost();
    this._ghostMesh.visible = true;

    return true;
  }

  updatePlace(screenX, screenY) {
    if (!this._isPlacing) return;
    this._currentWorld = this.raycaster.screenToWorld(screenX, screenY);

    const dx = screenX - this._startScreen.x;
    const dy = screenY - this._startScreen.y;
    const isDragging = Math.sqrt(dx * dx + dy * dy) > this._dragThreshold;

    if (isDragging) {
      const pos = this._arrowLine.geometry.attributes.position;
      pos.array[0] = this._spawnWorld.x;
      pos.array[1] = this._spawnWorld.y;
      pos.array[2] = 5;
      pos.array[3] = this._currentWorld.x;
      pos.array[4] = this._currentWorld.y;
      pos.array[5] = 5;
      pos.needsUpdate = true;
      this._arrowLine.visible = true;

      this._arrowHead.position.set(this._currentWorld.x, this._currentWorld.y, 5);
      const angle = Math.atan2(
        this._currentWorld.y - this._spawnWorld.y,
        this._currentWorld.x - this._spawnWorld.x
      );
      this._arrowHead.rotation.z = angle - Math.PI / 2;
      this._arrowHead.visible = true;
    }
  }

  endPlace(screenX, screenY) {
    if (!this._isPlacing) return;
    this._isPlacing = false;
    this._ghostMesh.visible = false;
    this._arrowLine.visible = false;
    this._arrowHead.visible = false;

    const endWorld = this.raycaster.screenToWorld(screenX, screenY);
    const dragVec = vec.sub(endWorld, this._spawnWorld);
    const velocity = vec.scale(dragVec, this._velScale);

    const body = createBody({
      type: this.selectedType,
      mass: this.selectedMass,
      x: this._spawnWorld.x,
      y: this._spawnWorld.y,
      vx: velocity.x,
      vy: velocity.y,
    });

    gameState.addBody(body);
    eventBus.emit('body:spawned', { body });
  }

  cancel() {
    this._isPlacing = false;
    this._ghostMesh.visible = false;
    this._arrowLine.visible = false;
    this._arrowHead.visible = false;
  }

  _updateGhost() {
    const r = radiusFromMass(this.selectedType, this.selectedMass);
    this._ghostMesh.scale.set(r, r, 1);
    this._ghostMesh.position.set(this._spawnWorld.x, this._spawnWorld.y, 2);

    const colors = {
      star: 0xFFD93D,
      planet: 0x4ECDC4,
      asteroid: 0x95A5A6,
      blackhole: 0x9B59B6,
    };
    this._ghostMesh.material.color.setHex(colors[this.selectedType] || 0x4ECDC4);
  }

  setType(type) {
    this.selectedType = type;
  }

  setMass(mass) {
    this.selectedMass = mass;
  }

  dispose() {
    this.scene.remove(this._ghostMesh);
    this.scene.remove(this._arrowLine);
    this.scene.remove(this._arrowHead);
  }
}
