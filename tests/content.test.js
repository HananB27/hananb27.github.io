import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { projects, skills, BUGS_TO_SHIP } from "../js/data.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("index.html");
const tokens = read("css/tokens.css");

test("all four project repositories are linked in the page and have content", () => {
  assert.equal(projects.length, 4);
  for (const p of projects) {
    assert.ok(html.includes(p.url), p.url);
    assert.ok(p.description.length > 30);
    assert.ok(p.tags.length >= 3);
  }
  assert.equal(new Set(projects.map((p) => p.color)).size, 4);
  assert.equal(new Set(skills.map((s) => s.name)).size, 5);
  assert.equal(BUGS_TO_SHIP, 5);
});

test("every palette colour referenced by data exists in the CSS tokens", () => {
  for (const key of [...projects, ...skills].map((x) => x.color)) assert.match(tokens, new RegExp(`--${key}:\\s*#`));
});

test("entry point, modules, assets and résumé exist", () => {
  const files = [
    "css/tokens.css", "css/style.css", "js/main.js", "js/ui.js", "js/data.js", "js/rules.js",
    "js/world/index.js", "js/world/avatar.js", "js/world/island.js", "js/world/props.js",
    "js/world/particles.js", "js/world/frames.js", "js/world/palette.js", "js/world/sfx.js",
    "vendor/three.module.min.js", "vendor/THREE-LICENSE.txt", "Resume.pdf",
    ...skills.map((s) => s.icon),
  ];
  for (const f of files) assert.ok(existsSync(new URL("../" + f, import.meta.url)), f);
});

test("page has landmarks, five scroll scenes and accessible dialogs", () => {
  assert.equal((html.match(/data-scene/g) || []).length, 5);
  for (const needle of ['<main id="main">', 'class="skip"', 'aria-labelledby="dialog-title"', 'lang="en"'])
    assert.ok(html.includes(needle), needle);
});

test("the personal reference photo is never shipped", () => {
  assert.ok(!existsSync(new URL("../main.jpg", import.meta.url)));
  assert.ok(!existsSync(new URL("../slika.jpg", import.meta.url)));
  assert.ok(!/\.(heic|jpe?g)/i.test(html));
});
