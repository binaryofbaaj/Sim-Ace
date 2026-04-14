/**
 * Collision detection & response — runs inside the Web Worker.
 */

/**
 * Detect and resolve collisions in a set of bodies.
 * @param {Object} data — { count, ids, types, x, y, vx, vy, mass, radius }
 * @returns {{ updates: Object[], collisions: Object[], toRemove: Set<string>, toSpawn: Object[] }}
 */
export function resolveCollisions(data) {
  const { count, ids, types, x, y, vx, vy, mass, radius } = data;
  const collisions = [];
  const toRemove = new Set();
  const toSpawn = [];
  const updates = {};

  for (let i = 0; i < count; i++) {
    if (toRemove.has(ids[i])) continue;

    for (let j = i + 1; j < count; j++) {
      if (toRemove.has(ids[j])) continue;

      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const distSq = dx * dx + dy * dy;
      const minDist = radius[i] + radius[j];

      if (distSq < minDist * minDist) {
        // Collision detected!
        const massRatio = mass[i] > mass[j]
          ? mass[i] / mass[j]
          : mass[j] / mass[i];

        // Determine heavier / lighter
        const hi = mass[i] >= mass[j] ? i : j;
        const lo = mass[i] >= mass[j] ? j : i;

        // Random chance for explosion (10% base, higher for similar-mass hits)
        const explodeChance = massRatio < 3 ? 0.15 : 0.05;
        const roll = Math.random();

        if (roll < explodeChance && types[hi] !== 'blackhole') {
          // ---- EXPLODE ----
          const cx = (x[i] + x[j]) / 2;
          const cy = (y[i] + y[j]) / 2;
          const totalMass = mass[i] + mass[j];
          const fragCount = 3 + Math.floor(Math.random() * 6);
          const fragMass = totalMass / fragCount;

          for (let f = 0; f < fragCount; f++) {
            const angle = (Math.PI * 2 * f) / fragCount + Math.random() * 0.5;
            const speed = 40 + Math.random() * 80;
            toSpawn.push({
              type: 'asteroid',
              mass: fragMass * (0.5 + Math.random()),
              x: cx + Math.cos(angle) * (minDist * 0.5),
              y: cy + Math.sin(angle) * (minDist * 0.5),
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
            });
          }

          toRemove.add(ids[i]);
          toRemove.add(ids[j]);

          collisions.push({
            type: 'explode',
            removed: [ids[i], ids[j]],
            position: { x: cx, y: cy },
            force: totalMass,
          });
        } else {
          // ---- MERGE / ABSORB ----
          const totalMass = mass[hi] + mass[lo];
          const newVx = (mass[hi] * vx[hi] + mass[lo] * vx[lo]) / totalMass;
          const newVy = (mass[hi] * vy[hi] + mass[lo] * vy[lo]) / totalMass;
          // Weighted-average position (biased toward heavier)
          const w = mass[hi] / totalMass;
          const newX = x[hi] * w + x[lo] * (1 - w);
          const newY = y[hi] * w + y[lo] * (1 - w);
          // Radius grows with cube root of mass
          const baseR = radius[hi];
          const newRadius = baseR * Math.pow(totalMass / mass[hi], 1 / 3);

          // Update the survivor in-place
          mass[hi] = totalMass;
          vx[hi] = newVx;
          vy[hi] = newVy;
          x[hi] = newX;
          y[hi] = newY;
          radius[hi] = newRadius;

          updates[ids[hi]] = {
            id: ids[hi], mass: totalMass,
            x: newX, y: newY,
            vx: newVx, vy: newVy,
            radius: newRadius,
          };

          toRemove.add(ids[lo]);

          collisions.push({
            type: massRatio > 5 ? 'absorb' : 'merge',
            survivorId: ids[hi],
            removed: [ids[lo]],
            merged: updates[ids[hi]],
            position: { x: newX, y: newY },
            force: totalMass,
          });
        }
      }
    }
  }

  return { updates, collisions, toRemove, toSpawn };
}
