import { test } from "node:test";
import assert from "node:assert/strict";
import {
  movePlayer, stepJump, collectSkills, updateBug, resolveBugs, sectionProgress, nearestTurn,
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

test("bugs wander but stay on the island", () => {
  const bug = { alive: true, heading: 0.3, speed: 0.9, seed: 3, position: { x: 5.7, z: 0 } };
  for (let i = 0; i < 6000; i++) updateBug(bug, 1 / 60, i / 60);
  assert.ok(Math.hypot(bug.position.x, bug.position.z) <= ISLAND_RADIUS);
  const dead = { ...bug, alive: false, position: { x: 1, z: 1 } };
  updateBug(dead, 1, 1);
  assert.deepEqual(dead.position, { x: 1, z: 1 });
});

test("landing on a bug stomps it; walking into one only bumps", () => {
  const mk = () => [{ alive: true, position: { x: 0, z: 0 } }];
  let r = resolveBugs({ x: 0.2, z: 0, y: 0.6, vy: -3 }, mk());
  assert.equal(r.stomped.length, 1);
  assert.equal(r.bumped.length, 0);
  r = resolveBugs({ x: 0.2, z: 0, y: 0, vy: 0 }, mk());
  assert.equal(r.stomped.length, 0);
  assert.equal(r.bumped.length, 1);
  r = resolveBugs({ x: 0.2, z: 0, y: 0.6, vy: 3 }, mk());
  assert.equal(r.stomped.length + r.bumped.length, 0);
  r = resolveBugs({ x: 4, z: 4, y: 0, vy: 0 }, mk());
  assert.equal(r.stomped.length + r.bumped.length, 0);
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
