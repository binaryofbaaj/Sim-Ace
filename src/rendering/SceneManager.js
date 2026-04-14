import * as THREE from 'three';

/**
 * SceneManager — Three.js scene, orthographic camera, renderer setup.
 */
export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;

    // ---- Renderer ----
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x020208, 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // ---- Scene ----
    this.scene = new THREE.Scene();

    // ---- Orthographic camera (2D top-down view) ----
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 500; // half-extent of the visible world in units
    this.viewSize = viewSize;

    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize,
      0.1, 3000
    );
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    // Lighting is managed by ObjectRenderer — no duplicate lights here

    // ---- Handle resize ----
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;

    this.camera.left = -this.viewSize * aspect;
    this.camera.right = this.viewSize * aspect;
    this.camera.top = this.viewSize;
    this.camera.bottom = -this.viewSize;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  }

  /**
   * Set the zoom level (viewSize).
   */
  setZoom(viewSize) {
    this.viewSize = viewSize;
    this._onResize();
  }

  /**
   * Pan camera to a world position.
   */
  panTo(x, y) {
    this.camera.position.x = x;
    this.camera.position.y = y;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get the current camera world bounds.
   */
  getBounds() {
    return {
      left: this.camera.position.x + this.camera.left,
      right: this.camera.position.x + this.camera.right,
      top: this.camera.position.y + this.camera.top,
      bottom: this.camera.position.y + this.camera.bottom,
    };
  }

  /**
   * Convert screen coordinates to world coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{ x: number, y: number }}
   */
  screenToWorld(screenX, screenY) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Normalized device coordinates
    const ndcX = (screenX / w) * 2 - 1;
    const ndcY = -(screenY / h) * 2 + 1;
    // Map to world
    const worldX = this.camera.position.x + ndcX * (this.camera.right);
    const worldY = this.camera.position.y + ndcY * (this.camera.top);
    return { x: worldX, y: worldY };
  }

  /**
   * Render the scene.
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
