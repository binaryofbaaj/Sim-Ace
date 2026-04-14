import { orbitalSpeed } from '../utils/math.js';
import { G } from '../physics/constants.js';

/**
 * Black Hole Earth scenario — Earth-Moon system with a black hole approaching.
 */
export function blackHoleEarth() {
  const earthMass = 2000;
  const bodies = [];

  // Earth
  bodies.push({
    type: 'planet',
    mass: earthMass,
    x: 0, y: 0,
    vx: 0, vy: 0,
    color: { hex: 0x3498DB, css: '#3498DB' },
  });

  // Moon in orbit
  const moonDist = 100;
  const moonSpeed = orbitalSpeed(G, earthMass, moonDist);
  bodies.push({
    type: 'asteroid',
    mass: 10,
    x: moonDist, y: 0,
    vx: 0, vy: moonSpeed,
    color: { hex: 0xB2BEC3, css: '#B2BEC3' },
  });

  // Black hole approaching from the side
  bodies.push({
    type: 'blackhole',
    mass: 30000,
    x: 500, y: 300,
    vx: -15, vy: -8,
    color: { hex: 0x9B59B6, css: '#9B59B6' },
  });

  // Some space debris
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 250;
    const speed = orbitalSpeed(G, earthMass, dist) * (0.7 + Math.random() * 0.6);
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
