import * as THREE from "../../vendor/three.module.min.js";
import { projects, skills, BUGS_TO_SHIP } from "../data.js";
import {
  ISLAND_RADIUS,
  WALK_SPEED,
  DASH_SPEED,
  JUMP_VELOCITY,
  clamp,
  movePlayer,
  stepJump,
  collectSkills,
  updateBug,
  resolveBugs,
  sectionProgress,
  nearestTurn,
} from "../rules.js";
import { readPalette } from "./palette.js";
import { createAvatar } from "./avatar.js";
import { createIsland } from "./island.js";
import { createCabinet, createCrystal, createBug, glowSprite } from "./props.js";
import { Particles } from "./particles.js";
import { FRAMES, ACCENTS, mixFrames } from "./frames.js";
import { sfx } from "./sfx.js";

const TURN = Math.PI * 2;
const CABINET_RADIUS = 4.9;
const CABINET_ANGLES = [-0.95, -0.32, 0.32, 0.95];
const CRYSTAL_SPOTS = [
  [-3.4, 0.6],
  [3.4, 0.3],
  [-2.0, -2.5],
  [2.1, -2.6],
  [-1.6, 3.2],
];
const MAX_BUGS = 3;

/**
 * Builds the whole 3D experience inside `container`.
 *
 * Two modes share one scene:
 *  - "scroll": the camera and island spin follow page scroll (phones, tablets
 *    and desktop browsing); everything is clickable / tappable.
 *  - "play":   desktop-only third-person game with WASD, jump and dash.
 */
export function createWorld({ container, sections, hooks }) {
  const palette = readPalette();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compactMQ = matchMedia("(max-width: 899px), (pointer: coarse)");
  const lowPower = compactMQ.matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !lowPower,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(palette.bg, 34, 90);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  // ---- lights ----------------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xb8a8ff, 0x1a1442, 1.0));
  const sun = new THREE.DirectionalLight(0xfff4e8, 1.9);
  sun.position.set(-6, 12, 9);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  // Warm fill from the camera side keeps the avatar's face friendly under the neon lights.
  const fill = new THREE.DirectionalLight(0xffdcc0, 1.3);
  fill.position.set(2.5, 3, 10);
  scene.add(fill);
  const cyanLight = new THREE.PointLight(palette.cyan, 60, 0, 2);
  cyanLight.position.set(-8, 4, -5);
  const magentaLight = new THREE.PointLight(palette.magenta, 38, 0, 2);
  magentaLight.position.set(8, 3, 6);
  const accentLight = new THREE.PointLight(palette.violet, 7, 0, 2);
  accentLight.position.set(0, 3.2, 1);
  scene.add(cyanLight, magentaLight, accentLight);

  const root = new THREE.Group();
  scene.add(root);
  const island = createIsland(palette, { lowPower });
  root.add(island.group);
  const particles = new Particles(root);

  // ---- avatar --------------------------------------------------------------------------------
  const avatar = createAvatar(palette);
  avatar.group.scale.setScalar(1.05);
  root.add(avatar.group);
  const avatarState = { y: 0, vy: 0, facing: 0 };

  // ---- cabinets -----------------------------------------------------------------------------------
  const cabinets = projects.map((project, i) => {
    const cabinet = createCabinet(project, palette[project.color], palette);
    const a = CABINET_ANGLES[i];
    cabinet.group.position.set(Math.sin(a) * CABINET_RADIUS, 0, -Math.cos(a) * CABINET_RADIUS);
    cabinet.group.rotation.y = -a;
    cabinet.hits.forEach((m) => (m.userData.index = i));
    cabinet.angle = a;
    cabinet.position = cabinet.group.position;
    root.add(cabinet.group);
    // Neon spoke from the hub to each cabinet.
    const spoke = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, CABINET_RADIUS - 2.6),
      new THREE.MeshBasicMaterial({ color: palette[project.color], transparent: true, opacity: 0.7, toneMapped: false }),
    );
    spoke.rotation.x = -Math.PI / 2;
    spoke.rotation.z = a;
    const mid = (CABINET_RADIUS + 2.6) / 2;
    spoke.position.set(Math.sin(a) * mid, 0.015, -Math.cos(a) * mid);
    root.add(spoke);
    return cabinet;
  });

  // ---- crystals --------------------------------------------------------------------------------------
  const crystals = skills.map((skill, i) => {
    const crystal = createCrystal(skill, palette[skill.color], palette);
    const [x, z] = CRYSTAL_SPOTS[i];
    crystal.group.position.set(x, 0.95, z);
    crystal.body.userData.index = i;
    crystal.position = crystal.group.position;
    crystal.collected = false;
    crystal.pulse = 0;
    crystal.index = i;
    root.add(crystal.group);
    return crystal;
  });

  // ---- bugs --------------------------------------------------------------------------------------------
  const bugs = Array.from({ length: MAX_BUGS }, (_, i) => {
    const model = createBug(palette);
    model.body.userData.bug = i;
    root.add(model.group);
    const bug = {
      model,
      position: model.group.position,
      heading: 0,
      speed: 0.9,
      alive: false,
      seed: i + 1,
      respawnAt: 1 + i * 1.4,
      squashT: -1,
    };
    model.group.visible = false;
    return bug;
  });
  function spawnBug(bug) {
    const a = Math.random() * TURN;
    const r = 2.8 + Math.random() * 2.8;
    let x = Math.sin(a) * r;
    let z = Math.cos(a) * r;
    if (z < -3) z = Math.abs(z) * 0.6;
    bug.position.set(x, 0, z);
    bug.heading = Math.random() * TURN;
    bug.alive = true;
    bug.squashT = -1;
    bug.model.group.visible = true;
    bug.model.group.scale.set(1, 1, 1);
    particles.emit(bug.position.clone().setY(0.4), [palette.lime, palette.coral], 8, { speed: 1.4, life: 0.6, size: 0.7 });
  }

  // ---- game state ------------------------------------------------------------------------------------------
  const game = {
    skills: skills.map(() => false),
    bugs: 0,
    won: false,
    startedAt: 0,
  };
  function snapshot() {
    return {
      skills: [...game.skills],
      skillCount: game.skills.filter(Boolean).length,
      skillTotal: skills.length,
      bugs: game.bugs,
      bugsTotal: BUGS_TO_SHIP,
      won: game.won,
    };
  }
  const emitState = () => hooks.onState?.(snapshot());

  function applyCrystalLook(crystal) {
    const done = crystal.collected;
    crystal.body.material.emissiveIntensity = done ? 0.12 : 0.9;
    crystal.halo.material.opacity = done ? 0.1 : 0.75;
    crystal.tag.material.opacity = done ? 0.55 : 1;
    crystal.ring.material.opacity = 1;
    crystal.ring.material.transparent = true;
    crystal.ring.material.opacity = done ? 0.25 : 1;
  }

  function collectCrystal(crystal, { silent = false } = {}) {
    if (game.skills[crystal.index]) return;
    crystal.collected = true;
    crystal.pulse = 1;
    game.skills[crystal.index] = true;
    applyCrystalLook(crystal);
    particles.emit(crystal.position, [crystal.color, palette.text, palette.amber], 26, { speed: 3.2, up: 3.5, life: 1.1 });
    sfx.collect();
    const count = game.skills.filter(Boolean).length;
    if (!silent) hooks.onToast?.(`${skills[crystal.index].name} unlocked · ${count} of ${skills.length}`);
    emitState();
    checkWin();
  }

  function squashBug(bug) {
    if (!bug.alive && bug.squashT >= 0) return;
    bug.alive = false;
    bug.squashT = 0;
    bug.respawnAt = time + 2.8;
    game.bugs++;
    particles.emit(bug.position.clone().setY(0.3), [palette.coral, palette.lime, palette.amber], 18, { speed: 2.6, up: 3, life: 0.9 });
    sfx.squash();
    hooks.onToast?.(
      game.bugs >= BUGS_TO_SHIP ? "Bug squashed. That’s all of them!" : `Bug squashed · ${game.bugs} of ${BUGS_TO_SHIP}`,
    );
    emitState();
    checkWin();
  }

  function checkWin() {
    if (game.won) return;
    if (game.skills.every(Boolean) && game.bugs >= BUGS_TO_SHIP) {
      game.won = true;
      avatar.wave(time, 4);
      avatar.runBuild(time);
      const burst = avatar.group.position.clone().setY(2.6);
      [0, 1, 2].forEach((n) =>
        setTimeout(
          () =>
            particles.emit(burst, [palette.violet, palette.magenta, palette.cyan, palette.lime, palette.amber, palette.coral], 60, {
              speed: 5.5,
              up: 6,
              life: 2,
              gravity: 6,
              size: 1.2,
            }),
          n * 280,
        ),
      );
      sfx.win();
      emitState();
      hooks.onWin?.(snapshot());
    }
  }

  function restart() {
    game.skills.fill(false);
    game.bugs = 0;
    game.won = false;
    game.startedAt = time;
    crystals.forEach((c) => {
      c.collected = false;
      applyCrystalLook(c);
    });
    bugs.forEach((b, i) => {
      b.alive = false;
      b.model.group.visible = false;
      b.respawnAt = time + 0.8 + i * 1.2;
    });
    avatar.group.position.set(0, 0, 0);
    avatarState.y = avatarState.vy = 0;
    emitState();
  }

  // ---- camera, scroll and mode state -----------------------------------------------------------------------------
  let mode = "scroll";
  let time = 0;
  let width = 1;
  let height = 1;
  let tops = [];
  let focusStation = -1;
  let spin = 0; // user drag spin, springs back to zero
  const smooth = {
    pos: new THREE.Vector3(0, 3, 9),
    look: new THREE.Vector3(0, 1.4, 0),
    shiftX: 0,
    shiftY: 0,
    rot: 0,
    accent: new THREE.Color(palette.violet),
  };
  let initialised = false;
  const play = { yaw: 0, pitch: 0.5, dist: 9, keys: new Set(), dashUntil: 0, dashReadyAt: 0, lastInput: { x: 0, z: -1 }, bumpAt: 0 };
  const pointer = { x: 0, y: 0, ndc: new THREE.Vector2(), has: false };
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const accentColors = ACCENTS.map((k) => new THREE.Color(palette[k]));

  function measure() {
    tops = sections.map((el) => el.getBoundingClientRect().top + scrollY);
  }
  function resize() {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    measure();
  }
  new ResizeObserver(resize).observe(container);
  new ResizeObserver(measure).observe(document.body);
  resize();

  function frameForScroll() {
    const set = compactMQ.matches ? FRAMES.compact : FRAMES.wide;
    const progress = tops.length ? sectionProgress(tops, scrollY, innerHeight) : 0;
    const i = Math.min(Math.floor(progress), set.length - 2);
    const t = progress - i;
    return { frame: mixFrames(set[i], set[i + 1], t), progress };
  }

  function cameraTarget(frame) {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(frame.fitW / (2 * Math.tan(hfov / 2)), frame.fitH / (2 * Math.tan(vfov / 2)));
    const dir = tmpV.set(
      Math.sin(frame.az) * Math.cos(frame.el),
      Math.sin(frame.el),
      Math.cos(frame.az) * Math.cos(frame.el),
    );
    return {
      look: new THREE.Vector3(...frame.look),
      pos: new THREE.Vector3(...frame.look).addScaledVector(dir, dist),
    };
  }

  // ---- interaction ---------------------------------------------------------------------------------------------
  function pickables() {
    const list = [...avatar.hitMeshes];
    cabinets.forEach((c) => list.push(...c.hits));
    crystals.forEach((c) => list.push(c.body));
    bugs.forEach((b) => b.alive && list.push(b.model.body));
    return list;
  }
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, (-(clientY - r.top) / r.height) * 2 + 1),
      camera,
    );
    return raycaster.intersectObjects(pickables(), false)[0]?.object ?? null;
  }

  function openStation(i) {
    sfx.open();
    hooks.onProject?.(i);
  }

  function activate(object) {
    const part = object.userData.part;
    if (part === "cabinet") return openStation(object.userData.index);
    if (part === "crystal") {
      const crystal = crystals[object.userData.index];
      if (crystal.collected) {
        crystal.pulse = 1;
        particles.emit(crystal.position, [crystal.color], 10, { speed: 2, life: 0.7 });
        hooks.onToast?.(`${skills[crystal.index].name}: already in my toolkit ✓`);
      } else collectCrystal(crystal);
      return;
    }
    if (part === "bug") return squashBug(bugs[object.userData.bug]);
    if (part === "laptop") {
      avatar.runBuild(time);
      particles.emit(avatar.group.position.clone().set(0, 2.2, 0.8), [palette.lime, palette.cyan, palette.violet], 22, { speed: 2.6, up: 3, life: 1 });
      sfx.collect();
      return hooks.onToast?.("npm run build → compiled successfully ✓");
    }
    if (part === "avatar") {
      avatar.wave(time);
      return hooks.onToast?.("Hey! Hanan here. Poke the laptop, grab a crystal, squash a bug.");
    }
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, last: e.clientX, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.last;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    drag.last = e.clientX;
    if (mode === "play") play.yaw -= dx * 0.008;
    else spin += dx * 0.012;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasTap = drag.moved < 8;
    drag = null;
    if (e.type === "pointercancel" || !wasTap || mode === "play") return;
    const hit = pick(e.clientX, e.clientY);
    if (hit) activate(hit);
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let hoverCabinet = -1; // pointer over a cabinet in the canvas
  let cardCabinet = -1; // project card hovered in the page
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.has = true;
    if (e.pointerType === "touch" || mode === "play" || e.target !== canvas) {
      if (canvas.style.cursor) canvas.style.cursor = "";
      hoverCabinet = -1;
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? "pointer" : "";
    hoverCabinet = hit?.userData.part === "cabinet" ? hit.userData.index : -1;
  });
  canvas.addEventListener("pointerleave", () => {
    hoverCabinet = -1;
  });

  // ---- game input --------------------------------------------------------------------------------------------------
  const GAME_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "e", "escape"]);
  window.addEventListener("keydown", (e) => {
    if (mode !== "play" || hooks.isModalOpen?.()) return;
    const k = e.key.toLowerCase();
    if (!GAME_KEYS.has(k)) return;
    e.preventDefault();
    play.keys.add(k);
    if (e.repeat) return;
    if (k === "escape") hooks.onExit?.();
    if (k === " " && avatarState.y === 0) {
      avatarState.vy = JUMP_VELOCITY;
      avatarState.y = 0.001;
      sfx.jump();
    }
    if (k === "shift" && time > play.dashReadyAt) {
      play.dashUntil = time + 0.22;
      play.dashReadyAt = time + 0.9;
      sfx.dash();
    }
    if (k === "e") {
      const near = nearestCabinet();
      if (near >= 0) {
        play.keys.clear();
        openStation(near);
      } else hooks.onToast?.("Walk up to an arcade cabinet, then press E.");
    }
  });
  window.addEventListener("keyup", (e) => play.keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => play.keys.clear());

  function nearestCabinet() {
    let best = -1;
    let bestD = 2.1;
    cabinets.forEach((c, i) => {
      const d = Math.hypot(c.position.x - avatar.group.position.x, c.position.z - avatar.group.position.z);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  compactMQ.addEventListener("change", () => {
    if (mode === "play" && compactMQ.matches) hooks.onExit?.();
    resize();
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    hooks.onContextLost?.();
  });

  // ---- main loop -----------------------------------------------------------------------------------------------------------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) {
      last = 0;
      return;
    }
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    time += dt;
    const still = reduced.matches;

    const scroll = frameForScroll();
    const target = scroll.frame;
    const k = still ? 1 : 1 - Math.exp(-dt * 5);

    let desiredPos;
    let desiredLook;
    let desiredShiftX = target.shiftX;
    let desiredShiftY = target.shiftY;
    let desiredRot = target.rot;
    let accentTarget;

    if (mode === "play") {
      updatePlay(dt);
      const p = avatar.group.position;
      const cosP = Math.cos(play.pitch);
      desiredLook = tmpV.set(p.x, 1.3 + avatarState.y * 0.4, p.z).clone();
      desiredPos = new THREE.Vector3(
        p.x + Math.sin(play.yaw) * cosP * play.dist,
        1.3 + Math.sin(play.pitch) * play.dist,
        p.z + Math.cos(play.yaw) * cosP * play.dist,
      );
      desiredShiftX = desiredShiftY = 0;
      desiredRot = 0;
      accentTarget = accentColors[0];
    } else {
      const c = cameraTarget(target);
      desiredPos = c.pos;
      desiredLook = c.look;
      const near = Math.round(scroll.progress);
      accentTarget = tmpColor.copy(accentColors[Math.floor(scroll.progress)]).lerp(
        accentColors[Math.min(Math.ceil(scroll.progress), accentColors.length - 1)],
        scroll.progress - Math.floor(scroll.progress),
      );
      // In the work section the island turns to face the cabinet being read.
      const workWeight = clamp(1 - Math.abs(scroll.progress - 1), 0, 1);
      if (focusStation >= 0) desiredRot += CABINET_ANGLES[focusStation] * workWeight * (compactMQ.matches ? 1 : 0.55);
      if (still) desiredRot = 0;
      spin += (0 - spin) * Math.min(1, dt * 1.2);
      desiredRot += spin;
      if (near !== scrollSection) {
        scrollSection = near;
        hooks.onSection?.(near);
        if (near === 4 && !still) avatar.wave(time, 2.6);
      }
    }

    if (!initialised) {
      smooth.pos.copy(desiredPos);
      smooth.look.copy(desiredLook);
      smooth.shiftX = desiredShiftX;
      smooth.shiftY = desiredShiftY;
      smooth.rot = desiredRot;
      smooth.accent.copy(accentTarget);
      initialised = true;
    }
    const kc = mode === "play" ? (still ? 1 : 1 - Math.exp(-dt * 7)) : k;
    smooth.pos.lerp(desiredPos, kc);
    smooth.look.lerp(desiredLook, kc);
    smooth.shiftX += (desiredShiftX - smooth.shiftX) * k;
    smooth.shiftY += (desiredShiftY - smooth.shiftY) * k;
    smooth.rot += (desiredRot - smooth.rot) * (still ? 1 : 1 - Math.exp(-dt * 4));
    smooth.accent.lerp(accentTarget, still ? 1 : 1 - Math.exp(-dt * 4));

    root.rotation.y = smooth.rot;
    camera.position.copy(smooth.pos);
    camera.lookAt(smooth.look);
    if (Math.abs(smooth.shiftX) + Math.abs(smooth.shiftY) > 0.0005) {
      camera.setViewOffset(width, height, -smooth.shiftX * width, smooth.shiftY * height, width, height);
    } else camera.clearViewOffset();

    island.setAccent(smooth.accent);
    accentLight.color.copy(smooth.accent);
    const hex = `#${smooth.accent.getHexString()}`;
    if (hex !== lastAccent) {
      lastAccent = hex;
      hooks.onAccent?.(hex);
    }

    updateScene(dt, still);
    renderer.render(scene, camera);
  }
  let scrollSection = 0;
  let lastAccent = "";

  function updatePlay(dt) {
    const keys = play.keys;
    const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const dz = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    if (dx || dz) play.lastInput = { x: dx, z: dz };
    const dashing = time < play.dashUntil;
    const input = dashing && !(dx || dz) ? play.lastInput : { x: dx, z: dz };
    const facing = movePlayer(avatar.group.position, input.x, input.z, play.yaw, dt, dashing ? DASH_SPEED : WALK_SPEED);
    if (facing !== null) avatarState.facing = facing;
    if (dashing)
      particles.emit(avatar.group.position.clone().setY(0.2), [palette.cyan, palette.violet], 2, { speed: 0.6, up: 0.4, life: 0.5, gravity: 0, size: 0.8 });
    const jump = stepJump(avatarState.y, avatarState.vy, dt);
    avatarState.y = jump.y;
    avatarState.vy = jump.vy;

    collectSkills(avatar.group.position, crystals).forEach((c) => collectCrystal(c));

    const { stomped, bumped } = resolveBugs(
      { x: avatar.group.position.x, z: avatar.group.position.z, y: avatarState.y, vy: avatarState.vy },
      bugs,
    );
    stomped.forEach((b) => {
      squashBug(b);
      avatarState.vy = JUMP_VELOCITY * 0.7;
      avatarState.y = 0.02;
    });
    if (bumped.length && time - play.bumpAt > 1.2) {
      play.bumpAt = time;
      const b = bumped[0];
      const away = new THREE.Vector3(avatar.group.position.x - b.position.x, 0, avatar.group.position.z - b.position.z).normalize();
      avatar.group.position.addScaledVector(away, 0.8);
      avatarState.vy = 3;
      avatarState.y = 0.02;
      sfx.bump();
      hooks.onToast?.("Ouch! Jump on bugs, don’t walk into them.");
    }
  }

  function updateScene(dt, still) {
    const moving = mode === "play" && (play.keys.size > 0 || time < play.dashUntil);
    if (mode === "play") {
      avatar.group.position.y = avatarState.y;
      avatar.group.rotation.y += Math.atan2(Math.sin(avatarState.facing - avatar.group.rotation.y), Math.cos(avatarState.facing - avatar.group.rotation.y)) * Math.min(1, dt * 14);
    } else {
      // Walk back to the centre of the island and face the camera.
      const p = avatar.group.position;
      p.x += (0 - p.x) * Math.min(1, dt * 5);
      p.z += (0 - p.z) * Math.min(1, dt * 5);
      p.y = 0;
      avatarState.y = avatarState.vy = 0;
      avatar.group.rotation.y += (0 - avatar.group.rotation.y) * Math.min(1, dt * 6);
    }

    // The head follows the pointer, relative to where the avatar is on screen.
    let look = { x: 0, y: 0 };
    if (pointer.has && mode === "scroll" && !still) {
      const head = avatar.head.getWorldPosition(tmpV).project(camera);
      look = {
        x: clamp(((pointer.x / width) * 2 - 1) - head.x, -1, 1),
        y: clamp((-(pointer.y / height) * 2 + 1) - head.y, -1, 1),
      };
    }
    avatar.update({
      dt,
      time,
      moving,
      airborne: avatarState.y > 0.02,
      dashing: time < play.dashUntil,
      look,
      reduced: still,
    });

    island.update(time, still);
    particles.update(dt);

    crystals.forEach((c, i) => {
      c.group.position.y = 0.95 + (still ? 0 : Math.sin(time * 2 + i * 1.3) * 0.12);
      c.body.rotation.y = still ? i : time * 1.2 + i;
      c.pulse = Math.max(0, c.pulse - dt * 2.5);
      c.group.scale.setScalar((c.collected ? 0.7 : 1) + c.pulse * 0.45);
    });

    const near = mode === "play" ? nearestCabinet() : -1;
    cabinets.forEach((c, i) => {
      const wanted = i === near || i === hoverCabinet || i === cardCabinet || i === focusStation ? 1 : 0;
      c.setHighlight(c.highlight + (wanted - c.highlight) * Math.min(1, dt * 8));
      c.prompt.visible = i === near || i === hoverCabinet;
      c.prompt.position.y = 3.25 + (still ? 0 : Math.sin(time * 4) * 0.06);
    });

    // Bugs wander, wobble and respawn.
    bugs.forEach((b) => {
      const g = b.model.group;
      if (b.alive) {
        updateBug(b, dt, time);
        g.rotation.y = b.heading;
        b.model.body.position.y = 0.25 + Math.abs(Math.sin(time * 9 + b.seed)) * 0.05;
      } else if (b.squashT >= 0) {
        b.squashT += dt;
        g.scale.set(1.3, Math.max(0.05, 1 - b.squashT * 8), 1.3);
        if (b.squashT > 0.25) {
          g.visible = false;
          b.squashT = -1;
        }
      } else if (time > b.respawnAt && !g.visible) spawnBug(b);
    });

    // Headphone sparkles.
    if (!still && time - noteAt > 0.55) {
      noteAt = time;
      const world = avatar.head.getWorldPosition(new THREE.Vector3());
      root.worldToLocal(world);
      world.y += 0.9;
      world.x += (Math.random() - 0.5) * 1.2;
      particles.emit(world, [palette.magenta, palette.cyan, palette.lime, palette.amber], 1, { speed: 0.3, up: 1.1, gravity: -0.3, life: 1.6, size: 0.9 });
    }
  }
  let noteAt = 0;

  // ---- public api ---------------------------------------------------------------------------------------------------------------
  const api = {
    get mode() {
      return mode;
    },
    get state() {
      return snapshot();
    },
    get canPlay() {
      return !compactMQ.matches;
    },
    start() {
      if (compactMQ.matches) return false;
      mode = "play";
      root.rotation.y = smooth.rot = nearestTurn(smooth.rot, 0);
      play.yaw = 0;
      play.keys.clear();
      sfx.setEnabled(true);
      avatar.group.position.set(0, 0, 0.6);
      hooks.onToast?.("WASD to move · Space to jump · Shift to dash · E at a cabinet");
      return true;
    },
    exit() {
      mode = "scroll";
      play.keys.clear();
      sfx.setEnabled(false);
      smooth.rot = nearestTurn(smooth.rot, frameForScroll().frame.rot);
    },
    restart,
    wave() {
      avatar.wave(time);
      hooks.onToast?.("Hey! Hanan here. Welcome to my little world.");
    },
    collectSkill(i) {
      const crystal = crystals[i];
      if (!crystal) return;
      if (crystal.collected) {
        crystal.pulse = 1;
        particles.emit(crystal.position, [crystal.color], 10, { speed: 2, life: 0.7 });
      } else collectCrystal(crystal, { silent: true });
    },
    highlightStation(i) {
      cardCabinet = i;
    },
    focusStation(i) {
      focusStation = i;
    },
    setMuted(value) {
      sfx.setMuted(value);
    },
    get muted() {
      return sfx.muted;
    },
    measure,
    /** Read-only internals for QA: open the site with ?debug and use window.__world.debug. */
    debug: { camera, smooth, avatar, root, game, crystals, bugs, play, cabinets },
  };

  requestAnimationFrame(frame);
  emitState();
  return api;
}
