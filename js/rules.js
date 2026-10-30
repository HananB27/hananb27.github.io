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

/** Lazy wandering for bug critters; they turn back when near the island edge. */
export function updateBug(bug, delta, time, radius = ISLAND_RADIUS - 0.7) {
  if (!bug.alive) return;
  const dt = clamp(delta, 0, 0.05);
  bug.heading += Math.sin(time * 1.3 + bug.seed * 7) * dt * 2.2;
  const r = Math.hypot(bug.position.x, bug.position.z);
  if (r > radius) {
    const inward = Math.atan2(-bug.position.x, -bug.position.z);
    let diff = inward - bug.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    bug.heading += diff * Math.min(1, dt * 4);
  }
  bug.position.x += Math.sin(bug.heading) * bug.speed * dt;
  bug.position.z += Math.cos(bug.heading) * bug.speed * dt;
}

/**
 * Splits bug contacts into stomps (landing on top while falling) and bumps
 * (touching from the side). Stomped bugs are marked dead here.
 */
export function resolveBugs(player, bugs) {
  const stomped = [];
  const bumped = [];
  for (const bug of bugs) {
    if (!bug.alive) continue;
    const d = Math.hypot(bug.position.x - player.x, bug.position.z - player.z);
    if (d < 0.8 && player.y > 0.2 && player.vy <= 0) {
      bug.alive = false;
      stomped.push(bug);
    } else if (d < 0.55 && player.y <= 0.2) {
      bumped.push(bug);
    }
  }
  return { stomped, bumped };
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
