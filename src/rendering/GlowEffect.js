import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * GlowEffect — Unreal Bloom post-processing for stars and black holes.
 */
export class GlowEffect {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Create the effect composer
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.8,   // strength — brighter glow
      0.5,   // radius — wider bloom spread
      0.7    // threshold — catch more bright objects
    );
    this.composer.addPass(this.bloomPass);

    // Output pass (needed for correct color output)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /**
   * Set bloom intensity based on chaos level.
   */
  setChaosIntensity(chaosLevel) {
    // Higher chaos → stronger bloom
    const t = chaosLevel / 100;
    this.bloomPass.strength = 0.6 + t * 1.0;
    this.bloomPass.radius = 0.4 + t * 0.3;
  }

  /**
   * Resize the composer.
   */
  resize(width, height) {
    this.composer.setSize(width, height);
  }

  /**
   * Render with bloom.
   */
  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
