import { test } from "node:test";
import assert from "node:assert/strict";
import {
  movePlayer, stepJump, collectSkills, moveToward, nearestWithin, solveElbow, sectionProgress, nearestTurn,
  ISLAND_RADIUS, WALK_SPEED, JUMP_VELOCITY,
} from "../js/rules.js";

const simulate = (hz, x, z) => {
  const p = { x: 0, z: 0 };
  for (let i = 0; i < hz; i++) movePlayer(p, x, z, 0, 1 / hz);
  return Math.hypot(p.x, p.z);
};

test("walk speed is identical at 30/60/120Hz and on diagonals", () => {
  for (const hz of [30, 60, 120])
    for (const input of [[1, 0], [1, 1], [0, -1]])
      assert.ok(Math.abs(simulate(hz, ...input) - WALK_SPEED) < 1e-8);
});

test("island boundary holds for any heading and huge frame delays", () => {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.13) {
    const p = { x: (ISLAND_RADIUS - 0.01) * Math.cos(angle), z: (ISLAND_RADIUS - 0.01) * Math.sin(angle) };
    for (let i = 0; i < 100; i++) movePlayer(p, 1, 1, angle, 5);
    assert.ok(Math.hypot(p.x, p.z) <= ISLAND_RADIUS + 1e-7);
  }
});

test("jump rises, lands exactly on the ground and never sinks", () => {
  let s = { y: 0.001, vy: JUMP_VELOCITY };
  let peak = 0;
  for (let i = 0; i < 400; i++) {
    s = stepJump(s.y, s.vy, 1 / 60);
    peak = Math.max(peak, s.y);
    assert.ok(s.y >= 0);
  }
  assert.ok(peak > 0.8 && peak < 2);
  assert.deepEqual(s, { y: 0, vy: 0 });
});

test("each crystal scores once, only when close enough", () => {
  const crystals = Array.from({ length: 5 }, (_, i) => ({ collected: false, position: { x: i * 2, z: 0 } }));
  assert.equal(collectSkills({ x: 100, z: 100 }, crystals).length, 0);
  let total = 0;
  for (let i = 0; i < 5; i++) {
    total += collectSkills({ x: i * 2, z: 0 }, crystals).length;
    assert.equal(collectSkills({ x: i * 2, z: 0 }, crystals).length, 0);
  }
  assert.equal(total, 5);
});

test("autopilot reaches its target without overshooting and reports heading", () => {
  const p = { x: 0, z: 0 };
  let result;
  for (let i = 0; i < 1000; i++) {
    result = moveToward(p, { x: 3, z: -4 }, 8, 1 / 60);
    if (result.arrived) break;
  }
  assert.ok(result.arrived);
  assert.ok(Math.hypot(p.x - 3, p.z + 4) <= 0.25 + 1e-9);
  assert.ok(Math.abs(moveToward({ x: 0, z: 0 }, { x: 5, z: 0 }, 8, 0.016).facing - Math.PI / 2) < 1e-9);
});

test("nearestWithin picks the closest point inside reach, otherwise -1", () => {
  const pts = [{ x: 3, z: 0 }, { x: 1, z: 0 }, { x: -1.5, z: 0 }];
  assert.equal(nearestWithin({ x: 0, z: 0 }, pts, 2), 1);
  assert.equal(nearestWithin({ x: 0, z: 9 }, pts, 2), -1);
});

test("arm IK keeps bone lengths, reaches the target and bends toward the pole", () => {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const shoulder = { x: 0.6, y: 1.7, z: 0 };
  const target = { x: 0.1, y: 1.27, z: 0.6 };
  const { elbow, wrist } = solveElbow(shoulder, target, 0.5, 0.58, { x: 1, y: -1, z: 0 });
  assert.ok(dist(shoulder, elbow) - 0.5 < 1e-9 && dist(shoulder, elbow) - 0.5 > -1e-9);
  assert.ok(Math.abs(dist(elbow, wrist) - 0.58) < 1e-9);
  assert.ok(dist(wrist, target) < 1e-9);
  assert.ok(elbow.x > (shoulder.x + target.x) / 2);
  const far = solveElbow(shoulder, { x: 9, y: 9, z: 9 }, 0.5, 0.58, { x: 0, y: -1, z: 0 });
  assert.ok(Math.abs(dist(shoulder, far.wrist) - 1.08) < 1e-3);
});

test("scroll progress holds on sections and is monotonic", () => {
  const tops = [0, 900, 2400, 3300, 4200];
  const vh = 800;
  assert.equal(sectionProgress(tops, 0, vh), 0);
  assert.ok(Math.abs(sectionProgress(tops, 10000, vh) - 4) < 1e-9);
  let prev = -1;
  for (let y = 0; y <= 4400; y += 25) {
    const p = sectionProgress(tops, y, vh);
    assert.ok(p >= prev - 1e-12 && p >= 0 && p <= 4 + 1e-9);
    prev = p;
  }
});

test("nearestTurn removes whole spins without changing the angle", () => {
  const t = Math.PI * 2;
  assert.ok(Math.abs(nearestTurn(3 * t + 0.4, 0) - 0.4) < 1e-9);
  assert.ok(Math.abs(nearestTurn(-2 * t - 0.2, 0) + 0.2) < 1e-9);
});
