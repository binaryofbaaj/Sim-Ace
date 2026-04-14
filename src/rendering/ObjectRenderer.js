import * as THREE from 'three';

const MAX_BODIES = 200;
const SPHERE_DETAIL = 32;

// ============================================================
// GLSL Noise Library (shared across all shaders)
// ============================================================

const NOISE_LIB = /* glsl */`
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p *= 2.01;
    f += 0.2500 * noise(p); p *= 2.02;
    f += 0.1250 * noise(p); p *= 2.03;
    f += 0.0625 * noise(p);
    return f / 0.9375;
  }
`;

// ============================================================
// Common Vertex Shader (shared by planet, star, black hole)
// ============================================================

const BODY_VERTEX = /* glsl */`
  varying vec3 vNorm;
  varying vec3 vPos;
  varying vec3 vSeed;
  varying vec3 vCol;

  void main() {
    vPos = position;

    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #else
      vCol = vec3(0.5, 0.6, 0.7);
    #endif

    vec4 worldPos = vec4(position, 1.0);

    #ifdef USE_INSTANCING
      // Instance center position as unique seed for procedural generation
      vSeed = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      vNorm = normalize(mat3(instanceMatrix) * normal);
      worldPos = instanceMatrix * worldPos;
    #else
      vSeed = vec3(0.0);
      vNorm = normalize(normal);
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
  }
`;

// ============================================================
// Planet Fragment Shader
// Procedural continents, oceans, clouds, ice caps, atmosphere rim
// ============================================================

const PLANET_FRAGMENT = /* glsl */`
  precision highp float;

  uniform float uTime;

  varying vec3 vNorm;
  varying vec3 vPos;
  varying vec3 vSeed;
  varying vec3 vCol;

  ${NOISE_LIB}

  void main() {
    // Unique seed per planet from center world position
    vec3 seed = vSeed * 0.005;

    // Slow planetary rotation
    float angle = uTime * 0.08 + seed.x * 100.0;
    float c = cos(angle);
    float s = sin(angle);
    vec3 rp = vPos;
    rp.x = vPos.x * c - vPos.z * s;
    rp.z = vPos.x * s + vPos.z * c;

    // Surface terrain noise (FBM)
    float terrain = fbm(rp * 3.0 + seed * 50.0);

    // Land/water threshold
    float landMask = smoothstep(0.38, 0.54, terrain);

    // Color palette derived from instance color
    vec3 waterColor = mix(vec3(0.02, 0.06, 0.18), vCol * 0.25, 0.35);
    vec3 landColor = vCol * 0.9;
    vec3 mountColor = vCol * 1.3 + vec3(0.08);

    // Mountain highlights at high terrain values
    float mountains = smoothstep(0.62, 0.76, terrain);
    vec3 terrainColor = mix(landColor, mountColor, mountains);

    // Combine land and water
    vec3 surface = mix(waterColor, terrainColor, landMask);

    // Polar ice caps
    float polar = abs(vPos.y);
    float iceNoise = fbm(rp * 5.0 + seed * 20.0) * 0.15;
    float ice = smoothstep(0.72, 0.88, polar + iceNoise);
    surface = mix(surface, vec3(0.82, 0.88, 0.95), ice * 0.65);

    // Cloud layer (slow drift)
    float clouds = fbm(rp * 2.5 + seed * 30.0 + uTime * 0.012);
    clouds = smoothstep(0.48, 0.68, clouds);
    surface = mix(surface, vec3(0.88, 0.90, 0.94), clouds * 0.30);

    // Hemisphere lighting
    vec3 lightDir = normalize(vec3(0.2, 0.15, 1.0));
    float diff = max(dot(vNorm, lightDir), 0.0);
    float ambient = 0.18;
    surface *= ambient + diff * (1.0 - ambient);

    // Atmospheric rim glow
    float rim = 1.0 - max(dot(vNorm, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, 2.2);
    vec3 atmColor = mix(vec3(0.3, 0.5, 1.0), vCol * 0.4 + vec3(0.15, 0.3, 0.7), 0.5);
    surface += atmColor * rim * 0.45;

    gl_FragColor = vec4(surface, 1.0);
  }
`;

// ============================================================
// Star Fragment Shader
// Plasma turbulence, core brightening, limb darkening, flare spots
// ============================================================

const STAR_FRAGMENT = /* glsl */`
  precision highp float;

  uniform float uTime;

  varying vec3 vNorm;
  varying vec3 vPos;
  varying vec3 vSeed;
  varying vec3 vCol;

  ${NOISE_LIB}

  void main() {
    vec3 seed = vSeed * 0.005;

    // Animated plasma turbulence
    float turb1 = fbm(vPos * 4.0 + uTime * 0.25 + seed * 20.0);
    float turb2 = fbm(vPos * 7.0 - uTime * 0.15 + seed * 40.0);

    // Color variation — hot and warm zones
    vec3 hotColor = vCol * 1.4 + vec3(0.15, 0.1, 0.0);
    vec3 warmColor = vCol * 0.8;
    vec3 surface = mix(warmColor, hotColor, turb1);

    // Surface granulation
    surface += (turb2 - 0.5) * 0.15;

    // Core brightening (center is brighter)
    float centerDist = length(vPos.xy);
    float core = 1.0 - smoothstep(0.0, 0.65, centerDist);
    surface += vec3(0.25, 0.2, 0.1) * core;

    // Limb darkening (edges are dimmer)
    float facing = max(dot(vNorm, vec3(0.0, 0.0, 1.0)), 0.0);
    surface *= 0.45 + facing * 0.55;

    // Solar flare / sunspot bright spots
    float flare = noise(vPos * 5.0 + uTime * 0.4 + seed * 50.0);
    surface += vCol * max(0.0, flare - 0.82) * 5.0;

    // Ensure minimum brightness (stars are self-luminous)
    surface = max(surface, vCol * 0.35);

    gl_FragColor = vec4(surface, 1.0);
  }
`;

// ============================================================
// Black Hole Fragment Shader
// Event horizon, photon sphere rim, swirling accretion
// ============================================================

const BLACKHOLE_FRAGMENT = /* glsl */`
  precision highp float;

  uniform float uTime;

  varying vec3 vNorm;
  varying vec3 vPos;
  varying vec3 vSeed;
  varying vec3 vCol;

  ${NOISE_LIB}

  void main() {
    // Rim / facing
    float facing = max(dot(vNorm, vec3(0.0, 0.0, 1.0)), 0.0);
    float rim = 1.0 - facing;
    rim = pow(rim, 1.8);

    // Swirling distortion at event horizon
    float ang = atan(vPos.y, vPos.x);
    float swirl = fbm(vec3(ang * 2.0, length(vPos.xy) * 3.0, uTime * 0.3) + vSeed * 0.01);

    // Nearly pure black core
    vec3 color = vec3(0.003, 0.001, 0.008);

    // Violet event horizon glow at rim
    vec3 horizonColor = vec3(0.35, 0.08, 0.55) * swirl;
    color += horizonColor * rim * 1.2;

    // Photon sphere — bright ring at extreme rim
    float photonRing = smoothstep(0.82, 0.92, rim) * smoothstep(1.0, 0.95, rim);
    color += vec3(0.5, 0.15, 0.75) * photonRing * 2.5;

    // Faint inner accretion glow
    float accretion = smoothstep(0.5, 0.8, rim) * swirl;
    color += vec3(0.15, 0.03, 0.25) * accretion;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================================
// ObjectRenderer — high-fidelity celestial body rendering
// ============================================================

export class ObjectRenderer {
  constructor(scene) {
    this.scene = scene;
    this._bodyMap = new Map();
    this._time = 0;
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    const sphereGeo = new THREE.SphereGeometry(1, SPHERE_DETAIL, SPHERE_DETAIL / 2);

    // ============================================================
    // Lighting
    // ============================================================
    this._ambient = new THREE.AmbientLight(0x181830, 0.7);
    this.scene.add(this._ambient);

    this._hemiLight = new THREE.HemisphereLight(0x1a237e, 0x000005, 0.2);
    this.scene.add(this._hemiLight);

    this._sunLight = new THREE.PointLight(0xfff8e1, 2.0, 4000, 1.0);
    this._sunLight.position.set(0, 0, 200);
    this.scene.add(this._sunLight);

    this._fillLight = new THREE.DirectionalLight(0x303060, 0.3);
    this._fillLight.position.set(0, 0, 500);
    this.scene.add(this._fillLight);

    // ============================================================
    // Planet Mesh — custom procedural surface shader
    // ============================================================
    this._planetMat = new THREE.ShaderMaterial({
      vertexShader: BODY_VERTEX,
      fragmentShader: PLANET_FRAGMENT,
      uniforms: { uTime: { value: 0 } },
    });
    this._planetMesh = this._createInstancedMesh(sphereGeo.clone(), this._planetMat);

    // ============================================================
    // Star Mesh — self-luminous plasma shader
    // ============================================================
    this._starMat = new THREE.ShaderMaterial({
      vertexShader: BODY_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: { uTime: { value: 0 } },
    });
    this._starMesh = this._createInstancedMesh(sphereGeo.clone(), this._starMat);

    // ============================================================
    // Asteroid Mesh — simple rocky standard material
    // ============================================================
    this._asteroidMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      emissive: new THREE.Color(0x060606),
      emissiveIntensity: 0.3,
    });
    this._asteroidMesh = this._createInstancedMesh(sphereGeo.clone(), this._asteroidMat);

    // ============================================================
    // Black Hole Mesh — event horizon shader
    // ============================================================
    this._bhMat = new THREE.ShaderMaterial({
      vertexShader: BODY_VERTEX,
      fragmentShader: BLACKHOLE_FRAGMENT,
      uniforms: { uTime: { value: 0 } },
    });
    this._bhMesh = this._createInstancedMesh(sphereGeo.clone(), this._bhMat);

    // ============================================================
    // Corona / Glow circles (stars & black holes)
    // ============================================================
    const coronaGeo = new THREE.CircleGeometry(1, 64);
    const coronaMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._coronaMesh = this._createInstancedMesh(coronaGeo, coronaMat);

    // ============================================================
    // Planet Atmosphere Halo
    // ============================================================
    const haloGeo = new THREE.RingGeometry(0.85, 1.25, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._haloMesh = this._createInstancedMesh(haloGeo, haloMat);

    // ============================================================
    // Black Hole Accretion Ring
    // ============================================================
    const ringGeo = new THREE.RingGeometry(1.3, 2.8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7C4DFF,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._ringMesh = this._createInstancedMesh(ringGeo, ringMat);

    sphereGeo.dispose(); // Free the template; clones are used
  }

  _createInstancedMesh(geo, mat) {
    const mesh = new THREE.InstancedMesh(geo, mat, MAX_BODIES);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    this.scene.add(mesh);
    return mesh;
  }

  // ============================================================
  // Frame Update
  // ============================================================

  update(bodies, dt) {
    this._time += dt;
    this._bodyMap.clear();

    // Update time uniforms for procedural shaders
    this._planetMat.uniforms.uTime.value = this._time;
    this._starMat.uniforms.uTime.value = this._time;
    this._bhMat.uniforms.uTime.value = this._time;

    let planetIdx = 0, starIdx = 0, asteroidIdx = 0, bhIdx = 0;
    let coronaIdx = 0, haloIdx = 0, ringIdx = 0;
    let bodyCount = 0;

    // ---- Position sun light at largest star ----
    let largestStar = null, largestMass = 0;
    for (const b of bodies) {
      if (b.type === 'star' && b.mass > largestMass) {
        largestStar = b;
        largestMass = b.mass;
      }
    }
    if (largestStar) {
      this._sunLight.position.set(largestStar.x, largestStar.y, 200);
      this._sunLight.color.setHex(largestStar.colorHex);
      this._sunLight.intensity = Math.min(3.5, largestStar.mass / 2500);
    } else {
      this._sunLight.intensity = 0.5;
    }

    // ---- Render each body by type ----
    for (let i = 0; i < bodies.length && bodyCount < MAX_BODIES; i++) {
      const b = bodies[i];
      this._bodyMap.set(b.id, bodyCount);
      bodyCount++;

      switch (b.type) {
        // ========================================
        // PLANET
        // ========================================
        case 'planet':
          if (planetIdx < MAX_BODIES) {
            this._dummy.position.set(b.x, b.y, 0);
            this._dummy.scale.set(b.radius, b.radius, b.radius);
            this._dummy.rotation.set(0.3, this._time * 0.12 + i * 2.3, 0);
            this._dummy.updateMatrix();
            this._planetMesh.setMatrixAt(planetIdx, this._dummy.matrix);
            this._color.setHex(b.colorHex);
            this._planetMesh.setColorAt(planetIdx, this._color);
            planetIdx++;

            // Habitable atmosphere
            if ((b.habitability || 0) > 0.05 && haloIdx < MAX_BODIES) {
              const hab = b.habitability || 0;
              const hScale = b.radius * (1.0 + hab * 0.4);
              this._setFlat(b.x, b.y, -1, hScale);
              this._haloMesh.setMatrixAt(haloIdx, this._dummy.matrix);
              this._color.setHSL(0.45 + hab * 0.2, 0.75, 0.5);
              this._haloMesh.setColorAt(haloIdx, this._color);
              haloIdx++;
            }
          }
          break;

        // ========================================
        // STAR
        // ========================================
        case 'star':
          if (starIdx < MAX_BODIES) {
            const pulse = 1.0 + Math.sin(this._time * 1.5 + i * 4.1) * 0.02;
            const sScale = b.radius * pulse;
            this._dummy.position.set(b.x, b.y, 0);
            this._dummy.scale.set(sScale, sScale, sScale);
            this._dummy.rotation.set(0, this._time * 0.04, 0);
            this._dummy.updateMatrix();
            this._starMesh.setMatrixAt(starIdx, this._dummy.matrix);
            this._color.setHex(b.colorHex);
            this._starMesh.setColorAt(starIdx, this._color);
            starIdx++;

            // Large corona glow
            if (coronaIdx < MAX_BODIES) {
              const cScale = b.radius * (3.5 + Math.sin(this._time * 0.7 + i * 2.5) * 0.5);
              this._setFlat(b.x, b.y, -6, cScale);
              this._coronaMesh.setMatrixAt(coronaIdx, this._dummy.matrix);
              this._color.setHex(b.colorHex);
              this._coronaMesh.setColorAt(coronaIdx, this._color);
              coronaIdx++;
            }
          }
          break;

        // ========================================
        // BLACK HOLE
        // ========================================
        case 'blackhole':
          if (bhIdx < MAX_BODIES) {
            this._dummy.position.set(b.x, b.y, 0);
            this._dummy.scale.set(b.radius, b.radius, b.radius);
            this._dummy.rotation.set(0, 0, this._time * 0.25 + i);
            this._dummy.updateMatrix();
            this._bhMesh.setMatrixAt(bhIdx, this._dummy.matrix);
            this._color.setHex(b.colorHex || 0x9B59B6);
            this._bhMesh.setColorAt(bhIdx, this._color);
            bhIdx++;

            // Accretion ring
            if (ringIdx < MAX_BODIES) {
              this._setFlat(b.x, b.y, -2, b.radius, this._time * 0.4 + i);
              this._ringMesh.setMatrixAt(ringIdx, this._dummy.matrix);
              const hue = 0.73 + Math.sin(this._time * 0.9) * 0.05;
              this._color.setHSL(hue, 0.85, 0.45);
              this._ringMesh.setColorAt(ringIdx, this._color);
              ringIdx++;
            }

            // Purple glow
            if (coronaIdx < MAX_BODIES) {
              const bhGlow = b.radius * (2.5 + Math.sin(this._time * 1.1 + i) * 0.3);
              this._setFlat(b.x, b.y, -7, bhGlow);
              this._coronaMesh.setMatrixAt(coronaIdx, this._dummy.matrix);
              this._color.setHex(0x7C4DFF);
              this._coronaMesh.setColorAt(coronaIdx, this._color);
              coronaIdx++;
            }
          }
          break;

        // ========================================
        // ASTEROID (default)
        // ========================================
        default:
          if (asteroidIdx < MAX_BODIES) {
            this._dummy.position.set(b.x, b.y, 0);
            this._dummy.scale.set(b.radius, b.radius, b.radius);
            this._dummy.rotation.set(
              this._time * 0.4 + i * 3,
              this._time * 0.25 + i * 1.7,
              this._time * 0.15
            );
            this._dummy.updateMatrix();
            this._asteroidMesh.setMatrixAt(asteroidIdx, this._dummy.matrix);
            this._color.setHex(b.colorHex);
            this._asteroidMesh.setColorAt(asteroidIdx, this._color);
            asteroidIdx++;
          }
          break;
      }
    }

    // ---- Flush counts & mark buffers dirty ----
    this._flush(this._planetMesh, planetIdx);
    this._flush(this._starMesh, starIdx);
    this._flush(this._asteroidMesh, asteroidIdx);
    this._flush(this._bhMesh, bhIdx);
    this._flush(this._coronaMesh, coronaIdx);
    this._flush(this._haloMesh, haloIdx);
    this._flush(this._ringMesh, ringIdx);
  }

  _setFlat(x, y, z, scale, rotation = 0) {
    this._dummy.position.set(x, y, z);
    this._dummy.scale.set(scale, scale, 1);
    this._dummy.rotation.set(0, 0, rotation);
    this._dummy.updateMatrix();
  }

  _flush(mesh, count) {
    mesh.count = count;
    if (count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  getInstanceIndex(bodyId) {
    return this._bodyMap.get(bodyId) ?? -1;
  }

  dispose() {
    const meshes = [
      this._planetMesh, this._starMesh, this._asteroidMesh,
      this._bhMesh, this._coronaMesh, this._haloMesh, this._ringMesh,
    ];
    for (const m of meshes) {
      if (m) {
        m.geometry.dispose();
        m.material.dispose();
        this.scene.remove(m);
      }
    }
  }
}
