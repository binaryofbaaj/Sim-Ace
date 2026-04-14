import { orbitalSpeed } from '../utils/math.js';
import { G } from '../physics/constants.js';

/**
 * Two Moons scenario — Earth at center with two moons in different orbits.
 * Demonstrates orbital resonance / potential instability.
 */
export function twoMoons() {
  const earthMass = 3000;
  const bodies = [];

  // Earth
  bodies.push({
    type: 'planet',
    mass: earthMass,
    x: 0, y: 0,
    vx: 0, vy: 0,
    color: { hex: 0x3498DB, css: '#3498DB' },
  });

  // Moon 1 — inner orbit
  const r1 = 120;
  const v1 = orbitalSpeed(G, earthMass, r1);
  bodies.push({
    type: 'asteroid',
    mass: 10,
    x: r1, y: 0,
    vx: 0, vy: v1,
    color: { hex: 0xB2BEC3, css: '#B2BEC3' },
  });

  // Moon 2 — outer orbit (slightly eccentric)
  const r2 = 220;
  const v2 = orbitalSpeed(G, earthMass, r2) * 1.05; // slight eccentricity
  const angle2 = Math.PI * 0.7;
  bodies.push({
    type: 'asteroid',
    mass: 15,
    x: Math.cos(angle2) * r2,
    y: Math.sin(angle2) * r2,
    vx: -Math.sin(angle2) * v2,
    vy: Math.cos(angle2) * v2,
    color: { hex: 0x95A5A6, css: '#95A5A6' },
  });

  // A few small rocks
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 200;
    const speed = orbitalSpeed(G, earthMass, dist) * (0.9 + Math.random() * 0.2);
    bodies.push({
      type: 'asteroid',
      mass: 1 + Math.random() * 3,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: -Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
    });
  }

  return bodies;
}
