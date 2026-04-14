import { orbitalSpeed } from '../utils/math.js';
import { G } from '../physics/constants.js';

/**
 * Jupiter Sun scenario — a Jupiter-mass object replaces the Sun,
 * with several planets orbiting.
 */
export function jupiterSun() {
  const jupiterMass = 15000;
  const bodies = [];

  // "Jupiter-Sun" at center
  bodies.push({
    type: 'star',
    mass: jupiterMass,
    x: 0, y: 0,
    vx: 0, vy: 0,
    color: { hex: 0xFFA94D, css: '#FFA94D' },
  });

  // Inner rocky planets
  const orbits = [
    { dist: 100, mass: 30, color: { hex: 0xE17055, css: '#E17055' } },
    { dist: 170, mass: 50, color: { hex: 0x4ECDC4, css: '#4ECDC4' } },
    { dist: 260, mass: 80, color: { hex: 0x6C5CE7, css: '#6C5CE7' } },
    { dist: 350, mass: 40, color: { hex: 0x00B894, css: '#00B894' } },
    { dist: 450, mass: 120, color: { hex: 0x74B9FF, css: '#74B9FF' } },
  ];

  for (const o of orbits) {
    const speed = orbitalSpeed(G, jupiterMass, o.dist);
    const angle = Math.random() * Math.PI * 2;
    bodies.push({
      type: 'planet',
      mass: o.mass,
      x: Math.cos(angle) * o.dist,
      y: Math.sin(angle) * o.dist,
      vx: -Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      color: o.color,
    });
  }

  // Asteroid belt
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 190 + Math.random() * 60;
    const speed = orbitalSpeed(G, jupiterMass, dist) * (0.85 + Math.random() * 0.3);
    bodies.push({
      type: 'asteroid',
      mass: 1 + Math.random() * 5,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: -Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
    });
  }

  return bodies;
}
