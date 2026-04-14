/**
 * Physics constants — tuned for visual simulation.
 */

/** Gravitational constant */
export const G = 800;

/** Softening factor — prevents singularities at close range */
export const SOFTENING = 10;

/** Skip force calc for pairs farther than this */
export const MAX_FORCE_DISTANCE = 5000;

/** Fixed physics timestep (seconds) */
export const PHYSICS_DT = 1 / 60;

/** Max sub-steps per frame */
export const MAX_SUBSTEPS = 4;

/** Per-type defaults */
export const BODY_DEFAULTS = {
  star: {
    mass: 5000,
    radius: 18,
    minMass: 1000,
    maxMass: 50000,
  },
  planet: {
    mass: 100,
    radius: 8,
    minMass: 20,
    maxMass: 2000,
  },
  asteroid: {
    mass: 5,
    radius: 3,
    minMass: 1,
    maxMass: 50,
  },
  blackhole: {
    mass: 20000,
    radius: 14,
    minMass: 5000,
    maxMass: 200000,
    absorptionMultiplier: 2.5,
  },
};

/** Calculate visual radius from mass (cube-root scaling) */
export function radiusFromMass(type, mass) {
  const d = BODY_DEFAULTS[type];
  if (!d) return 5;
  return d.radius * Math.pow(mass / d.mass, 1 / 3);
}
