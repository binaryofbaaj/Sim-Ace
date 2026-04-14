import { uid } from '../utils/math.js';
import { randomColorForType } from '../utils/colors.js';
import { BODY_DEFAULTS, radiusFromMass } from '../physics/constants.js';

/**
 * CelestialBody — factory for creating body data objects.
 * Bodies are plain objects (no class instances) for easy serialization.
 */

/**
 * Create a new celestial body.
 * @param {Object} opts
 * @param {'star'|'planet'|'asteroid'|'blackhole'} opts.type
 * @param {number} [opts.mass]
 * @param {number} opts.x
 * @param {number} opts.y
 * @param {number} [opts.vx]
 * @param {number} [opts.vy]
 * @param {number} [opts.radius]
 * @param {string} [opts.id]
 * @param {{ hex: number, css: string }} [opts.color]
 * @returns {Object}
 */
export function createBody(opts) {
  const type = opts.type || 'planet';
  const defaults = BODY_DEFAULTS[type] || BODY_DEFAULTS.planet;
  const mass = opts.mass ?? defaults.mass;
  const color = opts.color || randomColorForType(type);
  const radius = opts.radius ?? radiusFromMass(type, mass);

  return {
    id: opts.id || uid(),
    type,
    mass,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    radius,
    colorHex: color.hex,
    colorCSS: color.css,
    // Trail positions stored on main thread (rendering only)
    trail: [],
  };
}

/**
 * Quick presets
 */
export function createStar(x, y, mass, vx = 0, vy = 0) {
  return createBody({ type: 'star', x, y, mass, vx, vy });
}

export function createPlanet(x, y, mass, vx = 0, vy = 0) {
  return createBody({ type: 'planet', x, y, mass, vx, vy });
}

export function createAsteroid(x, y, mass, vx = 0, vy = 0) {
  return createBody({ type: 'asteroid', x, y, mass, vx, vy });
}

export function createBlackHole(x, y, mass, vx = 0, vy = 0) {
  return createBody({ type: 'blackhole', x, y, mass, vx, vy });
}
