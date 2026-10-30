import * as THREE from "../../vendor/three.module.min.js";
import { projects, skills, kiosks } from "../data.js";
import {
  WALK_SPEED,
  DASH_SPEED,
  JUMP_VELOCITY,
  clamp,
  movePlayer,
  moveToward,
  nearestWithin,
  stepJump,
  collectSkills,
  sectionProgress,
  nearestTurn,
} from "../rules.js";
import { readPalette } from "./palette.js";
import { createAvatar } from "./avatar.js";
import { createIsland } from "./island.js";
import { createStation, createCrystal } from "./props.js";
import { Particles } from "./particles.js";
import { FRAMES, mixFrames } from "./frames.js";

const TURN = Math.PI * 2;
const CABINET_RADIUS = 4.9;
const CABINET_ANGLES = [-0.95, -0.32, 0.32, 0.95];
const CRYSTAL_SPOTS = [
  [-3.2, 0.2],
  [3.2, -0.1],
  [-1.9, -2.4],
  [1.9, -2.5],
  [-2.5, 3.1],
];
const KIOSK_SPOTS = { about: [-5.3, 1.2], contact: [5.3, 1.2] };
const TRAVEL_STOPS = { work: [0, -2.4], skills: [0, 1.2], about: [-3.6, 1.2], contact: [3.6, 1.2] };

/**
 * Builds the whole 3D experience inside `container`.
 *
 * One scene, two modes:
 *  - "play":   the desktop experience. The page *is* the game: third-person
 *              WASD / jump / dash, walk up to a cabinet or kiosk and press E.
 *  - "scroll": phones, tablets and the desktop “classic view”. Camera and the
 *              island's spin follow page scroll; everything is tappable.
 */
export function createWorld({ container, sections, hooks, mode: initialMode = "scroll" }) {
  const palette = readPalette();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compactMQ = matchMedia("(max-width: 899px), (pointer: coarse)");
  const lowPower = compactMQ.matches;

  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(palette.bg, 30, 85);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  // ---- lights: neutral key and fill, one cool rim ----------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xc9d6ea, 0x161a22, 1.1));
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.0);
  sun.position.set(-6, 12, 9);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffe6d0, 1.0);
  fill.position.set(2.5, 3, 10);
  scene.add(fill);
  // Soft light from behind: in the game the camera usually follows the avatar's back.
  const back = new THREE.DirectionalLight(0xdfe6f2, 1.5);
  back.position.set(-2, 5, -10);
  scene.add(back);
  const rim = new THREE.PointLight(palette.accent, 35, 0, 2);
  rim.position.set(-8, 4, -6);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);
  const island = createIsland(palette, { lowPower });
  root.add(island.group);
  const particles = new Particles(root, 120);

  const avatar = createAvatar(palette);
  avatar.group.scale.setScalar(1.05);
  root.add(avatar.group);
  const avatarState = { y: 0, vy: 0, facing: 0 };

  // ---- stations: four project cabinets plus About / Contact kiosks ------------------------------------------
  const stations = [];
  projects.forEach((project, i) => {
    const a = CABINET_ANGLES[i];
    const station = createStation({ id: project.id, title: project.name, subtitle: project.kind, label: project.name.toUpperCase() }, palette);
    station.group.position.set(Math.sin(a) * CABINET_RADIUS, 0, -Math.cos(a) * CABINET_RADIUS);
    station.group.rotation.y = -a;
    Object.assign(station, { kind: "project", index: i, angle: a, position: station.group.position });
    stations.push(station);
  });
  kiosks.forEach((kiosk, i) => {
    const [x, z] = KIOSK_SPOTS[kiosk.id];
    const station = createStation(
      { id: kiosk.icon, title: kiosk.label, subtitle: kiosk.id === "about" ? "Who I am" : "Say hello", label: kiosk.label },
      palette,
    );
    station.group.position.set(x, 0, z);
    station.group.rotation.y = Math.atan2(-x, -z);
    Object.assign(station, { kind: kiosk.id, index: i, position: station.group.position });
    stations.push(station);
  });
  stations.forEach((s) => {
    s.hits.forEach((m) => (m.userData.station = stations.indexOf(s)));
    root.add(s.group);
  });
  // Fine spokes from the hub to each cabinet.
  const spokeMat = new THREE.MeshBasicMaterial({ color: palette.steel, transparent: true, opacity: 0.35, toneMapped: false });
  CABINET_ANGLES.forEach((a) => {
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.05, CABINET_RADIUS - 2.4), spokeMat);
    spoke.rotation.x = -Math.PI / 2;
    spoke.rotation.z = a;
    const mid = (CABINET_RADIUS + 1.7) / 2;
    spoke.position.set(Math.sin(a) * mid, 0.015, -Math.cos(a) * mid);
    root.add(spoke);
  });

  // ---- skill crystals ---------------------------------------------------------------------------------------------
  const crystals = skills.map((skill, i) => {
    const crystal = createCrystal(skill, palette);
    const [x, z] = CRYSTAL_SPOTS[i];
    crystal.group.position.set(x, 0.95, z);
    crystal.body.userData.index = i;
    Object.assign(crystal, { position: crystal.group.position, collected: false, pulse: 0, index: i });
    root.add(crystal.group);
    return crystal;
  });

  // ---- game state ---------------------------------------------------------------------------------------------------
  const game = { skills: skills.map(() => false), complete: false };
  const snapshot = () => ({
    skills: [...game.skills],
    skillCount: game.skills.filter(Boolean).length,
    skillTotal: skills.length,
    complete: game.complete,
  });
  const emitState = () => hooks.onState?.(snapshot());

  function applyCrystalLook(c) {
    c.body.material.emissiveIntensity = c.collected ? 0.1 : 0.55;
    c.tag.material.opacity = c.collected ? 0.5 : 1;
    c.ring.material.opacity = c.collected ? 0.2 : 0.7;
  }
  function collectCrystal(c, { silent = false } = {}) {
    if (game.skills[c.index]) return;
    c.collected = true;
    c.pulse = 1;
    game.skills[c.index] = true;
    applyCrystalLook(c);
    particles.emit(c.position, [palette.accent, palette.text], 16, { speed: 2.4, up: 2.8, life: 0.9, size: 0.8 });
    const count = game.skills.filter(Boolean).length;
    if (!silent) hooks.onToast?.(`${skills[c.index].name} unlocked · ${count} of ${skills.length}`);
    if (count === skills.length && !game.complete) {
      game.complete = true;
      avatar.runBuild(time);
      avatar.wave(time, 3);
      hooks.onComplete?.();
    }
    emitState();
  }

  // ---- camera, scroll and mode state ---------------------------------------------------------------------------------
  let mode = initialMode;
  let time = 0;
  let width = 1;
  let height = 1;
  let tops = [];
  let focusStation = -1;
  let spin = 0;
  let scrollSection = 0;
  let initialised = false;
  const smooth = {
    pos: new THREE.Vector3(0, 3, 9),
    look: new THREE.Vector3(0, 1.4, 0),
    shiftX: 0,
    shiftY: 0,
    rot: 0,
  };
  const play = {
    yaw: 0,
    pitch: 0.44,
    dist: 10,
    keys: new Set(),
    dashUntil: 0,
    dashReadyAt: 0,
    lastInput: { x: 0, z: -1 },
    travel: null,
    moved: false,
  };
  const pointer = { x: 0, y: 0, has: false };
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  if (mode === "play") avatar.group.position.set(0, 0, 1.4);

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
    return { frame: mixFrames(set[i], set[i + 1], progress - i), progress };
  }
  function cameraTarget(frame) {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(frame.fitW / (2 * Math.tan(hfov / 2)), frame.fitH / (2 * Math.tan(vfov / 2)));
    const dir = tmpV.set(Math.sin(frame.az) * Math.cos(frame.el), Math.sin(frame.el), Math.cos(frame.az) * Math.cos(frame.el));
    return { look: new THREE.Vector3(...frame.look), pos: new THREE.Vector3(...frame.look).addScaledVector(dir, dist) };
  }

  // ---- interaction ----------------------------------------------------------------------------------------------------
  function pickables() {
    const list = [...avatar.hitMeshes];
    stations.forEach((s) => list.push(...s.hits));
    crystals.forEach((c) => list.push(c.body));
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
    const s = stations[i];
    hooks.onOpen?.({ kind: s.kind, index: s.kind === "project" ? s.index : undefined });
  }
  function activate(object) {
    const part = object.userData.part;
    if (part === "station") return openStation(object.userData.station);
    if (part === "crystal") {
      const c = crystals[object.userData.index];
      if (c.collected) {
        c.pulse = 1;
        hooks.onToast?.(`${skills[c.index].name} is already in the toolkit ✓`);
      } else collectCrystal(c);
      return;
    }
    if (part === "laptop") {
      avatar.runBuild(time);
      particles.emit(tmpV.set(0, 2.2, 0.8).clone().add(avatar.group.position), [palette.accent, palette.text], 14, { speed: 1.8, up: 2.4, life: 0.8, size: 0.7 });
      return hooks.onToast?.("npm run build → compiled successfully ✓");
    }
    if (part === "avatar") {
      avatar.wave(time);
      hooks.onToast?.("Hi, I’m Hanan. Have a look around.");
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
    if (e.type === "pointercancel" || !wasTap) return;
    const hit = pick(e.clientX, e.clientY);
    if (hit) activate(hit);
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let hoverStation = -1;
  let cardStation = -1;
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.has = true;
    if (e.pointerType === "touch" || e.target !== canvas) {
      if (canvas.style.cursor) canvas.style.cursor = "";
      hoverStation = -1;
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? "pointer" : mode === "play" ? "grab" : "";
    hoverStation = hit?.userData.part === "station" ? hit.userData.station : -1;
  });
  canvas.addEventListener("pointerleave", () => (hoverStation = -1));

  // ---- keyboard ----------------------------------------------------------------------------------------------------------
  const GAME_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "e"]);
  window.addEventListener("keydown", (e) => {
    if (mode !== "play" || hooks.isModalOpen?.() || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (!GAME_KEYS.has(k)) return;
    const target = e.target;
    if ((k === " " || k === "e") && target?.closest?.("button, a, input, textarea, select, [role=button]")) return;
    e.preventDefault();
    play.keys.add(k);
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) play.travel = null;
    if (e.repeat) return;
    if (!play.moved) {
      play.moved = true;
      hooks.onFirstMove?.();
    }
    if (k === " " && avatarState.y === 0) {
      avatarState.vy = JUMP_VELOCITY;
      avatarState.y = 0.001;
    }
    if (k === "shift" && time > play.dashReadyAt) {
      play.dashUntil = time + 0.22;
      play.dashReadyAt = time + 0.9;
    }
    if (k === "e") {
      const near = nearestStation();
      if (near >= 0) {
        play.keys.clear();
        openStation(near);
      } else hooks.onToast?.("Walk up to a cabinet or kiosk, then press E.");
    }
  });
  window.addEventListener("keyup", (e) => play.keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => play.keys.clear());

  const nearestStation = () => nearestWithin(avatar.group.position, stations.map((s) => s.position), 2.2);

  compactMQ.addEventListener("change", () => {
    resize();
    hooks.onBreakpoint?.(compactMQ.matches);
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    hooks.onContextLost?.();
  });

  // ---- main loop ------------------------------------------------------------------------------------------------------------
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

    if (mode === "play") {
      updatePlay(dt);
      const p = avatar.group.position;
      const cosP = Math.cos(play.pitch);
      desiredLook = new THREE.Vector3(p.x, 1.35 + avatarState.y * 0.4, p.z);
      desiredPos = new THREE.Vector3(
        p.x + Math.sin(play.yaw) * cosP * play.dist,
        1.35 + Math.sin(play.pitch) * play.dist,
        p.z + Math.cos(play.yaw) * cosP * play.dist,
      );
      desiredShiftX = desiredShiftY = 0;
      desiredRot = 0;
    } else {
      const c = cameraTarget(target);
      desiredPos = c.pos;
      desiredLook = c.look;
      const near = Math.round(scroll.progress);
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
      Object.assign(smooth, { shiftX: desiredShiftX, shiftY: desiredShiftY, rot: desiredRot });
      initialised = true;
    }
    const kc = mode === "play" ? (still ? 1 : 1 - Math.exp(-dt * 6)) : k;
    smooth.pos.lerp(desiredPos, kc);
    smooth.look.lerp(desiredLook, kc);
    smooth.shiftX += (desiredShiftX - smooth.shiftX) * k;
    smooth.shiftY += (desiredShiftY - smooth.shiftY) * k;
    smooth.rot += (desiredRot - smooth.rot) * (still ? 1 : 1 - Math.exp(-dt * 4));

    root.rotation.y = smooth.rot;
    camera.position.copy(smooth.pos);
    camera.lookAt(smooth.look);
    if (Math.abs(smooth.shiftX) + Math.abs(smooth.shiftY) > 0.0005) {
      camera.setViewOffset(width, height, -smooth.shiftX * width, smooth.shiftY * height, width, height);
    } else camera.clearViewOffset();

    updateScene(dt, still);
    renderer.render(scene, camera);
  }

  function updatePlay(dt) {
    const keys = play.keys;
    const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const dz = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    if (dx || dz) play.lastInput = { x: dx, z: dz };
    const dashing = time < play.dashUntil;
    const input = dashing && !(dx || dz) ? play.lastInput : { x: dx, z: dz };
    const pos = avatar.group.position;
    if (play.travel && !(dx || dz)) {
      const step = moveToward(pos, play.travel, DASH_SPEED * 0.8, dt);
      if (step.arrived) play.travel = null;
      else avatarState.facing = step.facing;
    } else {
      const facing = movePlayer(pos, input.x, input.z, play.yaw, dt, dashing ? DASH_SPEED : WALK_SPEED);
      if (facing !== null) avatarState.facing = facing;
    }
    const jump = stepJump(avatarState.y, avatarState.vy, dt);
    avatarState.y = jump.y;
    avatarState.vy = jump.vy;
    collectSkills(pos, crystals).forEach((c) => {
      c.collected = false; // collectSkills flags it; collectCrystal owns the state change
      collectCrystal(c);
    });
  }

  function updateScene(dt, still) {
    const moving = mode === "play" && (play.keys.size > 0 || time < play.dashUntil || Boolean(play.travel));
    const p = avatar.group.position;
    if (mode === "play") {
      p.y = avatarState.y;
      const diff = Math.atan2(Math.sin(avatarState.facing - avatar.group.rotation.y), Math.cos(avatarState.facing - avatar.group.rotation.y));
      avatar.group.rotation.y += diff * Math.min(1, dt * 14);
    } else {
      p.x += (0 - p.x) * Math.min(1, dt * 5);
      p.z += (0 - p.z) * Math.min(1, dt * 5);
      p.y = 0;
      avatarState.y = avatarState.vy = 0;
      avatar.group.rotation.y += (0 - avatar.group.rotation.y) * Math.min(1, dt * 6);
    }

    let look = { x: 0, y: 0 };
    if (pointer.has && mode === "scroll" && !still) {
      const head = avatar.head.getWorldPosition(tmpV).project(camera);
      look = {
        x: clamp((pointer.x / width) * 2 - 1 - head.x, -1, 1),
        y: clamp(-(pointer.y / height) * 2 + 1 - head.y, -1, 1),
      };
    }
    avatar.update({ dt, time, moving, airborne: avatarState.y > 0.02, dashing: time < play.dashUntil, look, reduced: still });
    island.update(time, still);
    particles.update(dt);

    crystals.forEach((c, i) => {
      c.group.position.y = 0.95 + (still ? 0 : Math.sin(time * 1.6 + i * 1.3) * 0.1);
      c.body.rotation.y = still ? i : time * 0.9 + i;
      c.pulse = Math.max(0, c.pulse - dt * 2.5);
      c.group.scale.setScalar((c.collected ? 0.75 : 1) + c.pulse * 0.4);
      // Names appear only when relevant: near the avatar, or while reading the Skills section.
      const close = Math.hypot(c.position.x - p.x, c.position.z - p.z) < 2.6;
      c.tag.visible = mode === "play" ? close : scrollSection === 2 || c.pulse > 0;
    });

    const near = mode === "play" ? nearestStation() : -1;
    stations.forEach((s, i) => {
      const projectFocus = s.kind === "project" && s.index === focusStation;
      const wanted = i === near || i === hoverStation || i === cardStation || projectFocus ? 1 : 0;
      s.setHighlight(s.highlight + (wanted - s.highlight) * Math.min(1, dt * 8));
      s.prompt.visible = i === near || i === hoverStation;
      s.prompt.position.y = 3.15 + (still ? 0 : Math.sin(time * 3.5) * 0.05);
    });
  }

  // ---- public api ----------------------------------------------------------------------------------------------------------------
  const api = {
    get mode() {
      return mode;
    },
    get state() {
      return snapshot();
    },
    setMode(next) {
      if (next === mode) return;
      mode = next;
      play.keys.clear();
      play.travel = null;
      if (next === "play") {
        smooth.rot = nearestTurn(smooth.rot, 0);
        play.yaw = 0;
        avatar.group.position.set(0, 0, 1.4);
        avatarState.facing = 0;
      } else smooth.rot = nearestTurn(smooth.rot, frameForScroll().frame.rot);
    },
    travel(name) {
      const stop = TRAVEL_STOPS[name];
      if (!stop || mode !== "play") return;
      play.keys.clear();
      play.travel = { x: stop[0], z: stop[1] };
      if (!play.moved) {
        play.moved = true;
        hooks.onFirstMove?.();
      }
    },
    wave() {
      avatar.wave(time);
    },
    collectSkill(i) {
      const c = crystals[i];
      if (!c) return;
      if (c.collected) c.pulse = 1;
      else collectCrystal(c, { silent: true });
    },
    highlightProject(i) {
      cardStation = i;
    },
    focusStation(i) {
      focusStation = i;
    },
    measure,
    /** Read-only internals for QA: open the site with ?debug and use window.__world.debug. */
    debug: { camera, smooth, avatar, root, game, crystals, stations, play, avatarState },
  };

  requestAnimationFrame(frame);
  emitState();
  return api;
}
