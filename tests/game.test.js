import { test } from "node:test";
import assert from "node:assert/strict";
import { movePlayer, collectSkills } from "../game.js";
const simulate = (hz, x, z) => {
  const p = { x: 0, z: 0 };
  for (let i = 0; i < hz; i++) movePlayer(p, x, z, 0, 1 / hz);
  return Math.hypot(p.x, p.z);
};
test("diagonal speed and movement at 30/60/120Hz stay consistent", () => {
  for (const hz of [30, 60, 120])
    for (const input of [
      [1, 0],
      [1, 1],
      [0, -1],
    ])
      assert.ok(Math.abs(simulate(hz, ...input) - 3.4) < 1e-8);
});
test("island boundary holds at arbitrary directions and long frame delays", () => {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.13) {
    const p = { x: 6.34 * Math.cos(angle), z: 6.34 * Math.sin(angle) };
    for (let i = 0; i < 100; i++) movePlayer(p, 1, 1, angle, 5);
    assert.ok(Math.hypot(p.x, p.z) <= 6.3500001);
  }
});
test("five discoveries complete route exactly once, and reset makes them collectable", () => {
  const crystals = Array.from({ length: 5 }, (_, i) => ({
    collected: false,
    group: { visible: true, position: { x: i * 2, z: 0 } },
  }));
  assert.equal(collectSkills({ x: 100, z: 100 }, crystals).length, 0);
  let total = 0;
  for (let i = 0; i < 5; i++) {
    total += collectSkills({ x: i * 2, z: 0 }, crystals).length;
    assert.equal(collectSkills({ x: i * 2, z: 0 }, crystals).length, 0);
  }
  assert.equal(total, 5);
  assert.ok(crystals.every((c) => !c.group.visible));
  crystals.forEach((c) => {
    c.collected = false;
    c.group.visible = true;
  });
  assert.equal(collectSkills({ x: 0, z: 0 }, crystals).length, 1);
});
