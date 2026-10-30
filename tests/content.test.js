import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { projects, skills } from "../data.js";
test("all four original project repositories remain reachable from HTML and 3D stations", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(projects.length, 4);
  for (const p of projects) {
    assert.ok(html.includes(p.url));
    assert.ok(p.description.length > 30);
    assert.ok(Math.hypot(p.x, p.z) < 6.35);
  }
  assert.equal(new Set(skills).size, 5);
});
test("static entrypoint references local runtime and retained resume", () => {
  for (const path of [
    "index.html",
    "app.js",
    "style.css",
    "world.js",
    "data.js",
    "vendor/three.module.js",
    "vendor/THREE-LICENSE.txt",
    "Resume.pdf",
  ])
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), path);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes('href="#projects"'));
  assert.ok(html.includes('aria-labelledby="dialog-title"'));
});
