/**
 * 2D Vector math utilities.
 * All vectors are plain { x, y } objects for easy Worker serialization.
 */

export const vec = {
  add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
  sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
  scale(v, s) { return { x: v.x * s, y: v.y * s }; },
  mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y); },
  magSq(v) { return v.x * v.x + v.y * v.y; },
  normalize(v) {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  dist(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  distSq(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    return dx * dx + dy * dy;
  },
  lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  },
  dot(a, b) { return a.x * b.x + a.y * b.y; },
  rotate(v, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  },
  perpCW(v) { return { x: v.y, y: -v.x }; },
  perpCCW(v) { return { x: -v.y, y: v.x }; },
};

// ---- Scalar utilities ----

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, v) {
  return a === b ? 0 : (v - a) / (b - a);
}

export function remap(inMin, inMax, outMin, outMax, v) {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, v));
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Orbital velocity for a circular orbit: v = sqrt(G * M / r)
 */
export function orbitalSpeed(G, centralMass, radius) {
  return Math.sqrt(G * centralMass / radius);
}

// ---- ID generator ----
let _id = 0;
export function uid() {
  return `b${++_id}`;
}
