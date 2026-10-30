import * as THREE from "./vendor/three.module.js";
import { projects, skills } from "./data.js";
import { movePlayer, collectSkills } from "./game.js";

// All geometry is authored in code. Avatar is a stylized photo reference,
// not a photogrammetry scan: curls, glasses, headphones and a light jacket.
export function createWorld({ openProject, toast }) {
  const container = document.querySelector("#world");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x82719f, 2.5));
  const sun = new THREE.DirectionalLight(0xfff1db, 4);
  sun.position.set(-7, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const root = new THREE.Group();
  scene.add(root);
  const materials = new Map();
  function material(color) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.75 }),
      );
    return materials.get(color);
  }
  function mesh(geometry, color, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, c, p, x, y, z) =>
    mesh(new THREE.BoxGeometry(w, h, d), c, p, x, y, z);
  const ball = (r, c, p, x, y, z, detail = 1) =>
    mesh(new THREE.IcosahedronGeometry(r, detail), c, p, x, y, z);
  const cyl = (r1, r2, h, c, p, x, y, z, n = 48) =>
    mesh(new THREE.CylinderGeometry(r1, r2, h, n), c, p, x, y, z);
  const island = new THREE.Group();
  root.add(island);
  cyl(7.1, 6.8, 0.55, 0x9de0c6, island, 0, -0.26, 0, 64);
  cyl(6.8, 5.6, 1, 0x716091, island, 0, -1.02, 0, 12);
  cyl(5.6, 2.9, 1.6, 0x574875, island, 0, -2.3, 0, 9);
  // Intersecting pastel footpaths link each project station.
  const path1 = box(11, 0.035, 1.05, 0xd9ecce, island, 0, 0.04, 0);
  path1.rotation.y = 0.58;
  const path2 = box(11, 0.04, 1, 0xd9ecce, island, 0, 0.045, 0);
  path2.rotation.y = -0.69;
  cyl(1.9, 1.9, 0.07, 0xd9ecce, island, 0, 0.05, 0);
  for (let i = 0; i < 20; i++) {
    const a = i * 2.399;
    const r = 5.8 + (i % 3) * 0.1;
    const rock = ball(
      0.22 + (i % 3) * 0.08,
      0x87c6b2,
      island,
      Math.cos(a) * r,
      0.12,
      Math.sin(a) * r,
      0,
    );
    rock.scale.y = 0.6;
  }
  function tree(x, z, size, color) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(size);
    island.add(t);
    cyl(0.1, 0.16, 1.25, 0x7a5260, t, 0, 0.65, 0, 6);
    ball(0.67, color, t, 0, 1.65, 0, 1);
    ball(0.48, color, t, 0.35, 1.4, 0.08, 1);
    ball(0.4, color, t, -0.32, 1.4, 0.1, 1);
  }
  tree(-5.3, -0.8, 1.05, 0xffaf9c);
  tree(1, -5.2, 1.2, 0xb1a1e2);
  tree(5.3, 0.0, 0.9, 0xffcc73);
  tree(-1, 5.4, 0.75, 0xffaf9c);
  tree(-1.8, -4.6, 0.65, 0x5aaa91);
  // Tiny landscape objects keep the island readable without imported assets.
  for (const [x, z] of [
    [-2, 2.5],
    [2, 3.7],
    [-3, -4.2],
    [4, -1.1],
  ]) {
    cyl(0.12, 0.12, 0.5, 0x69876d, island, x, 0.2, z, 6);
    ball(0.3, 0xffe992, island, x, 0.55, z, 0);
  }
  const stationMeshes = [];
  function label(text, parent, x, y, z) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2c253a";
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = "#fff9ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 53px Arial";
    ctx.fillText(text, 256, 82);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, 0.58),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  projects.forEach((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    island.add(g);
    cyl(1.05, 1.15, 0.18, p.color, g, 0, 0.12, 0, 32);
    box(0.95, 0.82, 0.65, p.color, g, 0, 0.63, 0);
    box(1.35, 0.95, 0.18, 0x302a46, g, 0, 1.43, 0.1);
    box(1.13, 0.73, 0.04, p.color, g, 0, 1.43, 0.21);
    label(p.label, g, 0, 2.35, 0);
    box(0.08, 0.5, 0.08, 0x554260, g, 0, 1.95, 0);
    const symbol = label(["↗", "+", "W", "@"][i], g, 0, 1.44, 0.24);
    symbol.scale.set(0.38, 0.9, 1);
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.project = i;
        stationMeshes.push(o);
      }
    });
  });
  const avatar = new THREE.Group();
  avatar.position.set(0, 0.12, 1.1);
  island.add(avatar);
  const jacket = 0xe8dbb8,
    skin = 0xd7a27d,
    hair = 0x3b2927,
    ink = 0x292738;
  const leftLeg = box(0.28, 0.65, 0.35, 0x4e506b, avatar, -0.22, 0.4, 0),
    rightLeg = box(0.28, 0.65, 0.35, 0x4e506b, avatar, 0.22, 0.4, 0);
  box(0.34, 0.17, 0.55, 0xf3e9e5, avatar, -0.22, 0.12, 0.12);
  box(0.34, 0.17, 0.55, 0xf3e9e5, avatar, 0.22, 0.12, 0.12);
  const torso = box(0.9, 0.92, 0.48, jacket, avatar, 0, 1.16, 0);
  box(0.25, 0.76, 0.015, 0xf9eee1, avatar, 0, 1.17, 0.25);
  cyl(0.18, 0.18, 0.23, skin, avatar, 0, 1.72, 0, 10);
  const head = ball(0.51, skin, avatar, 0, 2.12, 0, 3);
  head.scale.set(0.88, 1.08, 0.86);
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399;
    const r = 0.25 + 0.14 * Math.sin(i * 1.7);
    ball(
      0.14 + (i % 3) * 0.025,
      hair,
      avatar,
      Math.cos(a) * r,
      2.46 + Math.sin(i * 2.1) * 0.12,
      Math.sin(a) * r,
      1,
    );
  }
  // Glasses face +Z, matching all the facial features and laptop.
  for (const x of [-0.22, 0.22]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.025, 6, 20),
      material(ink),
    );
    rim.position.set(x, 2.16, 0.4);
    avatar.add(rim);
    ball(0.035, ink, avatar, x, 2.16, 0.405, 1);
  }
  box(0.1, 0.035, 0.035, ink, avatar, 0, 2.18, 0.43);
  const mouth = box(0.15, 0.025, 0.02, 0x815340, avatar, 0, 1.94, 0.42);
  box(0.05, 0.08, 0.1, skin, avatar, 0, 2.04, 0.44);
  for (const x of [-0.48, 0.48]) {
    const ear = ball(0.21, ink, avatar, x, 2.16, 0, 2);
    ear.scale.set(0.45, 1, 1);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.53, 0.045, 6, 28, Math.PI),
    material(ink),
  );
  band.position.y = 2.17;
  avatar.add(band);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.56, 1.48, 0);
  avatar.add(leftArm);
  box(0.27, 0.65, 0.3, jacket, leftArm, 0, -0.24, 0.1);
  ball(0.15, skin, leftArm, 0, -0.48, 0.22, 2);
  const rightArm = box(0.27, 0.68, 0.3, jacket, avatar, 0.55, 1.21, 0.09);
  rightArm.rotation.x = -0.45;
  ball(0.15, skin, avatar, 0.53, 0.95, 0.3, 2);
  const laptop = new THREE.Group();
  laptop.position.set(0, 1, 0.65);
  avatar.add(laptop);
  box(1.12, 0.07, 0.7, 0x55506e, laptop, 0, 0, 0);
  const screen = box(1.1, 0.68, 0.055, 0x51436e, laptop, 0, 0.33, 0.28);
  screen.rotation.x = -0.18;
  const sticker = ball(0.09, 0x9de0c6, laptop, 0, 0.37, 0.32, 1);
  sticker.scale.z = 0.1;
  label("HELLO, WORLD", island, 0, 0.25, 3.6).rotation.x = -Math.PI / 2;
  // Five crystals form a discoverable route across the island.
  const locations = [
    [-2.3, 0],
    [0.3, -2.3],
    [2.5, -0.2],
    [2, 2.5],
    [-2, 3.7],
  ];
  const crystals = locations.map(([x, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0.7, z);
    island.add(g);
    mesh(
      new THREE.OctahedronGeometry(0.28),
      [0xffde75, 0xffa897, 0x9a83dc, 0x68b9db, 0xe89fc3][i],
      g,
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 5, 32),
      material(0xfff0bb),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.38;
    g.add(ring);
    return { group: g, collected: false, baseY: 0.7, skill: skills[i] };
  });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    root.add(g);
    const a = (i / 7) * Math.PI * 2;
    g.position.set(Math.cos(a) * 10, -1.2 + (i % 3) * 1.5, Math.sin(a) * 8);
    for (let j = 0; j < 3; j++) {
      const c = ball(0.65 + j * 0.13, 0xeee5fc, g, j * 0.75, 0, 0, 2);
      c.scale.y = 0.55;
    }
    clouds.push(g);
  }
  let playing = false,
    angle = 0.15,
    dragging = false,
    startX = 0,
    lastX = 0,
    dragDistance = 0,
    waveUntil = 0,
    jump = 0,
    velocity = 0,
    score = 0,
    lastTime = 0,
    elapsed = 0,
    visible = true;
  const keys = new Set();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reduce = matchMedia("(prefers-reduced-motion:reduce)");
  const compact = matchMedia("(max-width:900px), (pointer:coarse)");
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  function wave() {
    waveUntil = elapsed + 2;
    toast("Hey! Hanan here. Welcome to my little world.");
  }
  function setHud() {
    document.querySelector("#score").textContent =
      `Skills discovered: ${score} / 5`;
    document.querySelector("#quest").textContent =
      score === 5
        ? "All skills found! Adventure complete. Explore the project stations or exit to say hello."
        : "Collect 5 glowing crystals. Find what makes me tick.";
  }
  function restart() {
    score = 0;
    avatar.position.set(0, 0.12, 1.1);
    avatar.rotation.y = 0;
    crystals.forEach((c) => {
      c.collected = false;
      c.group.visible = true;
    });
    jump = velocity = 0;
    keys.clear();
    setHud();
  }
  function setPortfolioInert(value) {
    document
      .querySelectorAll(
        "header, .skip, .intro, .hero-bottom, .ticker, .work-section, .about, .contact, footer",
      )
      .forEach((element) => (element.inert = value));
  }
  function start() {
    if (compact.matches) return;
    playing = true;
    setPortfolioInert(true);
    document.body.classList.add("playing");
    document.querySelector(".game-hud").hidden = false;
    document.querySelector(".game-help").hidden = false;
    angle = 0.15;
    restart();
    resize();
    document.querySelector("#exit").focus();
    toast(
      "Move with WASD or arrows. Collect crystals. E opens a nearby project.",
    );
  }
  function exit() {
    playing = false;
    setPortfolioInert(false);
    keys.clear();
    document.body.classList.remove("playing");
    document.querySelector(".game-hud").hidden = true;
    document.querySelector(".game-help").hidden = true;
    avatar.position.set(0, 0.12, 1.1);
    avatar.rotation.y = 0;
    resize();
    document.querySelector("#play").focus();
  }
  function nearest() {
    let nearest = -1,
      distance = 1.9;
    projects.forEach((p, i) => {
      const d = Math.hypot(p.x - avatar.position.x, p.z - avatar.position.z);
      if (d < distance) {
        nearest = i;
        distance = d;
      }
    });
    return nearest;
  }
  window.addEventListener("keydown", (e) => {
    if (!playing || document.querySelector("dialog").open) return;
    const k = e.key.toLowerCase();
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
        "w",
        "a",
        "s",
        "d",
        "e",
        "escape",
      ].includes(k)
    )
      e.preventDefault();
    keys.add(k);
    if (k === "escape") exit();
    if (k === "e" && !e.repeat) {
      const i = nearest();
      if (i >= 0) {
        keys.clear();
        openProject(i);
      } else toast("Move closer to a project station, then press E.");
    }
    if (k === " " && jump === 0) velocity = 5;
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  document
    .querySelector("dialog")
    .addEventListener("close", () => keys.clear());
  compact.addEventListener("change", () => {
    if (playing && compact.matches) exit();
  });
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => {
    if (playing) return;
    dragging = true;
    startX = lastX = e.clientX;
    dragDistance = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || playing) return;
    dragDistance = Math.max(dragDistance, Math.abs(e.clientX - startX));
    angle += (e.clientX - lastX) * 0.008;
    lastX = e.clientX;
  });
  canvas.addEventListener("pointercancel", () => (dragging = false));
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    if (dragDistance > 7) return;
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(stationMeshes, false)[0];
    if (hit) openProject(hit.object.userData.project);
  });
  container.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (playing) exit();
    toast("3D rendering paused. Your portfolio is still available below.");
  });
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
    rootMargin: "100px",
  }).observe(container);
  document.addEventListener("visibilitychange", () => {
    lastTime = 0;
    keys.clear();
  });
  function animate(now) {
    requestAnimationFrame(animate);
    if (document.hidden || (!visible && !playing)) return;
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.04);
    lastTime = now;
    elapsed += dt;
    if (playing) {
      let dx =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      let dz =
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      const facing = movePlayer(
        avatar.position,
        dx,
        dz,
        Math.atan2(camera.position.x, camera.position.z),
        dt,
      );
      if (facing !== null) {
        avatar.rotation.y = facing;
        leftLeg.rotation.x = Math.sin(elapsed * 12) * 0.35;
        rightLeg.rotation.x = -leftLeg.rotation.x;
      } else {
        leftLeg.rotation.x = rightLeg.rotation.x = 0;
      }
      if (velocity || jump) {
        velocity -= 12 * dt;
        jump = Math.max(0, jump + velocity * dt);
        if (jump === 0) velocity = 0;
      }
      avatar.position.y = 0.12 + jump;
      collectSkills(avatar.position, crystals).forEach((c) => {
        score++;
        setHud();
        toast(
          score === 5
            ? "All five found! You’ve met my toolkit. Explore my projects next."
            : `${c.skill} discovered · ${score} of 5`,
        );
      });
      root.rotation.y = 0;
    } else {
      root.rotation.y =
        angle +
        (compact.matches && !reduce.matches
          ? Math.min(scrollY / innerHeight, 2) * 0.9
          : 0);
      avatar.rotation.y = reduce.matches ? 0 : Math.sin(elapsed * 0.25) * 0.25;
    }
    const moving = !reduce.matches;
    crystals.forEach((c, i) => {
      c.group.rotation.y = moving ? elapsed + i : i;
      c.group.position.y =
        c.baseY + (moving ? Math.sin(elapsed * 2 + i) * 0.1 : 0);
    });
    leftArm.rotation.z =
      elapsed < waveUntil ? -0.8 + Math.sin(elapsed * 14) * 0.4 : 0;
    if (moving)
      clouds.forEach(
        (c, i) =>
          (c.position.y =
            -1.2 + (i % 3) * 1.5 + Math.sin(elapsed * 0.5 + i) * 0.15),
      );
    const width = container.clientWidth;
    const distance = playing ? 23 : width < 500 ? 25 : 23;
    camera.position.set(playing ? 8 : 9, playing ? 15 : 13, distance);
    camera.lookAt(0, playing ? 0.1 : 0.3, 0);
    renderer.render(scene, camera);
  }
  animate(0);
  return { start, exit, restart, wave };
}
