/**
 * PhysicsWorker — runs N-body gravity simulation off the main thread.
 * Enhanced with Collision Modes and Instability Engine.
 */

let G = 800;
let SOFTENING = 10;
let MAX_FORCE_DISTANCE = 5000;

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === 'init') {
    if (msg.params) {
      G = msg.params.G ?? G;
      SOFTENING = msg.params.SOFTENING ?? SOFTENING;
      MAX_FORCE_DISTANCE = msg.params.MAX_FORCE_DISTANCE ?? MAX_FORCE_DISTANCE;
    }
    return;
  }

  if (msg.type === 'step') {
    const { bodies, dt, params } = msg;
    const result = simulate(bodies, dt, params);
    self.postMessage(result);
  }
};

function simulate(data, dt, params) {
  const { count, ids, types, mass, radius } = data;
  const x = new Float64Array(data.x);
  const y = new Float64Array(data.y);
  const vx = new Float64Array(data.vx);
  const vy = new Float64Array(data.vy);

  const gravMult = (params?.gravityMultiplier ?? 1.0);
  const chaosLevel = (params?.chaosLevel ?? 0) / 100;
  const collisionMode = params?.collisionMode ?? 'mixed';
  
  const effectiveG = G * gravMult * (1 + chaosLevel * 2);

  const ax = new Float64Array(count);
  const ay = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);

      if (dist > MAX_FORCE_DISTANCE) continue;

      const forceMag = effectiveG / distSq;
      const forceX = forceMag * dx / dist;
      const forceY = forceMag * dy / dist;

      ax[i] += forceX * mass[j];
      ay[i] += forceY * mass[j];
      ax[j] -= forceX * mass[i];
      ay[j] -= forceY * mass[i];
    }

    // Instability Engine: random perturbation force
    if (chaosLevel > 0) {
      // Perturbations scale with chaos and mass
      const perturbation = chaosLevel * 50 * (1 + Math.random());
      ax[i] += (Math.random() - 0.5) * perturbation;
      ay[i] += (Math.random() - 0.5) * perturbation;
    }
  }

  for (let i = 0; i < count; i++) {
    vx[i] += ax[i] * dt;
    vy[i] += ay[i] * dt;
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }

  const collisions = [];
  const toRemove = new Set();
  const toSpawn = [];

  for (let i = 0; i < count; i++) {
    if (toRemove.has(ids[i])) continue;
    for (let j = i + 1; j < count; j++) {
      if (toRemove.has(ids[j])) continue;

      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const distSq2 = dx * dx + dy * dy;
      const minDist = radius[i] + radius[j];

      if (distSq2 < minDist * minDist) {
        const hi = mass[i] >= mass[j] ? i : j;
        const lo = mass[i] >= mass[j] ? j : i;
        const massRatio = mass[hi] / mass[lo];

        // Determine collision outcome based on mode
        let explode = false;
        if (collisionMode === 'explode') {
           explode = true;
        } else if (collisionMode === 'merge') {
           explode = false;
        } else {
           // Mixed mode logic
           const explodeChance = massRatio < 3 ? 0.2 : 0.05;
           explode = Math.random() < (explodeChance + chaosLevel * 0.3);
        }

        // Black holes never explode internally, they just absorb
        if (types[hi] === 'blackhole') explode = false;

        if (explode) {
          const cx = (x[i] + x[j]) / 2;
          const cy = (y[i] + y[j]) / 2;
          const totalMass = mass[i] + mass[j];
          const fragCount = 4 + Math.floor(Math.random() * 8 * (1 + chaosLevel));

          for (let f = 0; f < fragCount; f++) {
            const angle = (Math.PI * 2 * f) / fragCount + Math.random() * 0.5;
            const speed = 60 + Math.random() * 120 * (1 + chaosLevel);
            toSpawn.push({
              type: 'asteroid',
              mass: (totalMass / fragCount) * (0.4 + Math.random() * 0.8),
              x: cx + Math.cos(angle) * minDist * 0.4,
              y: cy + Math.sin(angle) * minDist * 0.4,
              vx: vx[hi] + Math.cos(angle) * speed,
              vy: vy[hi] + Math.sin(angle) * speed,
            });
          }

          toRemove.add(ids[i]);
          toRemove.add(ids[j]);
          collisions.push({
            type: 'explode',
            removed: [ids[i], ids[j]],
            position: { x: cx, y: cy },
            force: totalMass * (1 + chaosLevel),
          });
        } else {
          const totalMass = mass[hi] + mass[lo];
          const newVx = (mass[hi] * vx[hi] + mass[lo] * vx[lo]) / totalMass;
          const newVy = (mass[hi] * vy[hi] + mass[lo] * vy[lo]) / totalMass;
          const w = mass[hi] / totalMass;
          const newX = x[hi] * w + x[lo] * (1 - w);
          const newY = y[hi] * w + y[lo] * (1 - w);
          const newRadius = radius[hi] * Math.pow(totalMass / mass[hi], 1 / 3);

          mass[hi] = totalMass;
          vx[hi] = newVx;
          vy[hi] = newVy;
          x[hi] = newX;
          y[hi] = newY;
          radius[hi] = newRadius;

          toRemove.add(ids[lo]);
          collisions.push({
            type: massRatio > 5 || types[hi] === 'blackhole' ? 'absorb' : 'merge',
            survivorId: ids[hi],
            removed: [ids[lo]],
            merged: {
              id: ids[hi], mass: totalMass,
              x: newX, y: newY,
              vx: newVx, vy: newVy,
              radius: newRadius,
            },
            position: { x: newX, y: newY },
            force: totalMass,
          });
        }
      }
    }
  }

  const updates = [];
  for (let i = 0; i < count; i++) {
    if (toRemove.has(ids[i])) continue;
    updates.push({
      id: ids[i],
      x: x[i], y: y[i],
      vx: vx[i], vy: vy[i],
      mass: mass[i],
      radius: radius[i],
    });
  }

  return {
    type: 'update',
    bodies: updates,
    collisions,
    removed: Array.from(toRemove),
    spawned: toSpawn,
  };
}
