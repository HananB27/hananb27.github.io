/**
 * Pure game and scroll rules. No DOM, no WebGL: everything here is unit-tested.
 */
export const ISLAND_RADIUS = 6.5;
export const WALK_SPEED = 3.6;
export const DASH_SPEED = 8.5;
export const GRAVITY = 16;
export const JUMP_VELOCITY = 6.4;

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const lerp = (a, b, t) => a + (b - a) * t;

/** Camera-relative movement, normalised so diagonals cannot run faster. */
export function movePlayer(
  position,
  horizontal,
  vertical,
  viewAngle,
  delta,
  speed = WALK_SPEED,
  radius = ISLAND_RADIUS,
) {
  const magnitude = Math.hypot(horizontal, vertical);
  if (!magnitude) return null;
  const x = horizontal / magnitude;
  const z = vertical / magnitude;
  const worldX = x * Math.cos(viewAngle) + z * Math.sin(viewAngle);
  const worldZ = -x * Math.sin(viewAngle) + z * Math.cos(viewAngle);
  const dt = clamp(delta, 0, 0.04);
  position.x += worldX * speed * dt;
  position.z += worldZ * speed * dt;
  const r = Math.hypot(position.x, position.z);
  if (r > radius) {
    position.x *= radius / r;
    position.z *= radius / r;
  }
  return Math.atan2(worldX, worldZ);
}

/** Vertical jump physics. Returns the new {y, vy}; y never goes below 0. */
export function stepJump(y, vy, delta) {
  const dt = clamp(delta, 0, 0.04);
  if (y === 0 && vy === 0) return { y, vy };
  const nextVy = vy - GRAVITY * dt;
  const nextY = Math.max(0, y + nextVy * dt);
  return nextY === 0 ? { y: 0, vy: 0 } : { y: nextY, vy: nextVy };
}

/** Returns only new discoveries; a collected crystal can never score twice. */
export function collectSkills(position, crystals, reach = 0.85) {
  return crystals.filter((crystal) => {
    if (crystal.collected) return false;
    const d = Math.hypot(
      crystal.position.x - position.x,
      crystal.position.z - position.z,
    );
    if (d >= reach) return false;
    crystal.collected = true;
    return true;
  });
}

/**
 * Autopilot for “fast travel”: steps `position` toward `target` and reports the
 * heading. `arrived` flips once within `stopAt`.
 */
export function moveToward(position, target, speed, delta, stopAt = 0.25) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= stopAt) return { arrived: true, facing: null };
  const step = Math.min(speed * clamp(delta, 0, 0.05), distance);
  position.x += (dx / distance) * step;
  position.z += (dz / distance) * step;
  return { arrived: false, facing: Math.atan2(dx, dz) };
}

/** Nearest point of interest within `reach`, or -1. `points` need x and z. */
export function nearestWithin(position, points, reach) {
  let best = -1;
  let bestDistance = reach;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - position.x, p.z - position.z);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/**
 * Two-bone IK for an arm: where the elbow goes so the wrist reaches `target`,
 * bending toward `pole`. Points are {x, y, z}; a target out of reach is clamped.
 */
export function solveElbow(shoulder, target, upper, lower, pole) {
  const add = (a, b, k) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const to = add(target, shoulder, -1);
  const length = Math.sqrt(dot(to, to)) || 1;
  const dir = add({ x: 0, y: 0, z: 0 }, to, 1 / length);
  const distance = clamp(length, Math.abs(upper - lower) + 1e-4, upper + lower - 1e-4);
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const side = add(pole, dir, -dot(pole, dir));
  const sideLength = Math.sqrt(dot(side, side)) || 1;
  return {
    elbow: add(add(shoulder, dir, along), side, height / sideLength),
    wrist: add(shoulder, dir, distance),
  };
}

/**
 * Scroll progress through a list of sections, as a float in [0, n-1].
 * Each boundary eases over a window centred a little above the next section's
 * top, so the camera holds on a section while you read it and swings between
 * sections as you scroll.
 */
export function sectionProgress(tops, scrollY, viewport) {
  const anchor = scrollY + viewport * 0.5;
  const half = viewport * 0.45;
  let progress = 0;
  for (let i = 1; i < tops.length; i++)
    progress += smoothstep((anchor - (tops[i] - half)) / (2 * half));
  return progress;
}

/** Shifts `current` by whole turns so it lies within half a turn of `target`. */
export function nearestTurn(current, target) {
  const turn = Math.PI * 2;
  return current - turn * Math.round((current - target) / turn);
}
