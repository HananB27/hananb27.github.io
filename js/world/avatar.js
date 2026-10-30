import * as THREE from "../../vendor/three.module.min.js";

/**
 * Hanan's low-poly avatar, authored entirely in code from the reference photo:
 * dark curly hair, round tortoiseshell glasses, black over-ear headphones,
 * light stubble, a beige jacket with a tan corduroy collar over a cream waffle
 * knit — and a laptop held up like a trophy. It is a stylised character, not a
 * scan, and the photo itself is never shipped.
 */
const SKIN = 0xe2b08c;
const HAIR = 0x2b1c18;
const JACKET = 0xd9c7a2;
const COLLAR = 0xc79f66;
const KNIT = 0xf4ecdc;
const PANTS = 0x2f3358;
const SNEAKER = 0xf3eee6;
const FRAME = 0x4a2a14;
const DARK = 0x1b1925;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function waffleTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#f4ecdc";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "rgba(160,140,110,.55)";
  g.lineWidth = 3;
  for (let i = 0; i <= 64; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 64);
    g.moveTo(0, i);
    g.lineTo(64, i);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Scrolling fake code on the laptop display. */
function createScreen(palette) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const tokens = [
    palette.violet,
    palette.cyan,
    palette.lime,
    palette.amber,
    palette.magenta,
    palette.muted,
  ];
  const rand = mulberry32(7);
  const lines = Array.from({ length: 40 }, () => ({
    indent: Math.floor(rand() * 4),
    words: Array.from({ length: 2 + Math.floor(rand() * 4) }, () => ({
      color: tokens[Math.floor(rand() * tokens.length)],
      width: 28 + Math.floor(rand() * 70),
    })),
  }));
  let flashUntil = 0;
  let lastDraw = -1;
  function draw(time) {
    ctx.fillStyle = palette["bg"];
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = palette["bg-3"];
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = palette.coral;
    ctx.beginPath();
    ctx.arc(20, 17, 6, 0, 7);
    ctx.fill();
    ctx.fillStyle = palette.amber;
    ctx.beginPath();
    ctx.arc(40, 17, 6, 0, 7);
    ctx.fill();
    ctx.fillStyle = palette.lime;
    ctx.beginPath();
    ctx.arc(60, 17, 6, 0, 7);
    ctx.fill();
    ctx.fillStyle = palette.muted;
    ctx.font = "700 15px ui-monospace, Menlo, monospace";
    ctx.fillText("hanan.tsx", 86, 22);
    const offset = (time * 24) % (lines.length * 22);
    for (let i = 0; i < lines.length * 2; i++) {
      const line = lines[i % lines.length];
      const y = 56 + i * 22 - offset;
      if (y < 40 || y > 316) continue;
      let x = 18 + line.indent * 22;
      for (const w of line.words) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y - 9, w.width, 10);
        ctx.globalAlpha = 1;
        x += w.width + 10;
      }
    }
    if (time < flashUntil) {
      ctx.fillStyle = "rgba(13,10,36,.82)";
      ctx.fillRect(0, 34, 512, 286);
      ctx.fillStyle = palette.lime;
      ctx.font = "700 46px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText("BUILD OK ✓", 256, 190);
      ctx.textAlign = "left";
    }
    texture.needsUpdate = true;
  }
  return {
    texture,
    flash(time, seconds = 1.6) {
      flashUntil = time + seconds;
      lastDraw = -1;
    },
    update(time) {
      if (time - lastDraw < 0.1) return;
      lastDraw = time;
      draw(time);
    },
  };
}

export function createAvatar(palette) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  const materials = new Map();
  const mat = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra }),
      );
    return materials.get(key);
  };
  const hitMeshes = [];
  function add(geometry, material, parent, [x, y, z] = [0, 0, 0], part) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.part = part;
    if (part) hitMeshes.push(mesh);
    parent.add(mesh);
    return mesh;
  }
  const sphere = (r, color, parent, pos, part, detail = 2) =>
    add(new THREE.IcosahedronGeometry(r, detail), mat(color), parent, pos, part);
  const box = (w, h, d, color, parent, pos, part) =>
    add(new THREE.BoxGeometry(w, h, d), mat(color), parent, pos, part);
  const capsule = (r, len, color, parent, pos, part) =>
    add(new THREE.CapsuleGeometry(r, len, 4, 10), mat(color), parent, pos, part);

  // ---- legs -------------------------------------------------------------
  function makeLeg(x) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.86, 0);
    rig.add(leg);
    capsule(0.15, 0.5, PANTS, leg, [0, -0.43, 0], "avatar");
    const shoe = box(0.3, 0.16, 0.5, SNEAKER, leg, [0, -0.82, 0.08], "avatar");
    shoe.geometry.translate(0, 0, 0);
    box(0.31, 0.05, 0.51, palette.lime, leg, [0, -0.9, 0.08], "avatar");
    return leg;
  }
  const legL = makeLeg(-0.2);
  const legR = makeLeg(0.2);

  // ---- torso ------------------------------------------------------------
  const torso = new THREE.Group();
  rig.add(torso);
  const jacket = add(
    new THREE.CylinderGeometry(0.52, 0.5, 0.98, 14),
    mat(JACKET),
    torso,
    [0, 1.32, 0],
    "avatar",
  );
  jacket.scale.z = 0.7;
  const knit = box(0.36, 0.5, 0.05, KNIT, torso, [0, 1.62, 0.34], "avatar");
  knit.material = new THREE.MeshStandardMaterial({
    map: waffleTexture(),
    roughness: 0.9,
  });
  box(0.025, 0.78, 0.03, 0xb9a57f, torso, [0, 1.2, 0.365], "avatar");
  for (const y of [1.45, 1.2, 0.95])
    sphere(0.028, DARK, torso, [0.045, y, 0.385], "avatar", 1);
  box(0.26, 0.26, 0.04, 0xcdb98f, torso, [-0.3, 1.0, 0.355], "avatar"); // pocket
  const collar = add(
    new THREE.TorusGeometry(0.27, 0.075, 8, 20),
    mat(COLLAR),
    torso,
    [0, 1.84, 0.02],
    "avatar",
  );
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1.0, 0.9, 1.0);
  for (const s of [-1, 1]) {
    const flap = box(0.3, 0.1, 0.2, COLLAR, torso, [s * 0.17, 1.8, 0.24], "avatar");
    flap.rotation.set(-0.35, s * -0.4, s * 0.25);
  }
  add(
    new THREE.CylinderGeometry(0.15, 0.17, 0.22, 10),
    mat(SKIN),
    torso,
    [0, 1.9, 0],
    "avatar",
  );

  // ---- head -------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 1.98, 0);
  rig.add(head);
  const skull = sphere(0.5, SKIN, head, [0, 0.44, 0], "avatar", 3);
  skull.scale.set(0.9, 1.08, 0.94);

  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = sphere(0.05, 0x1a1414, head, [s * 0.18, 0.43, 0.43], "avatar", 1);
    eye.scale.set(1, 1.25, 0.6);
    eyes.push(eye);
    const brow = box(0.21, 0.045, 0.05, 0x2e2019, head, [s * 0.19, 0.57, 0.44], "avatar");
    brow.rotation.z = s * -0.1;
  }
  const nose = sphere(0.065, 0xd49f7b, head, [0, 0.33, 0.48], "avatar", 1);
  nose.scale.set(1, 1.2, 1);
  const mouth = box(0.15, 0.028, 0.03, 0x8a5443, head, [0, 0.15, 0.43], "avatar");
  const stubble = add(
    new THREE.SphereGeometry(0.19, 16, 10),
    new THREE.MeshStandardMaterial({
      color: 0x4a3228,
      roughness: 1,
      transparent: true,
      opacity: 0.3,
    }),
    head,
    [0, 0.08, 0.34],
    "avatar",
  );
  stubble.scale.set(1.05, 0.8, 0.55);
  const jaw = add(
    new THREE.SphereGeometry(0.46, 18, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x6b4a3a,
      roughness: 1,
      transparent: true,
      opacity: 0.12,
    }),
    head,
    [0, 0.44, 0],
    "avatar",
  );
  jaw.scale.set(0.91, 1.07, 0.95);

  // Round tortoiseshell glasses with faint cyan lenses.
  const frameMat = mat(FRAME, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(0.17, 0.026, 8, 24), frameMat, head, [s * 0.2, 0.43, 0.475]);
    add(
      new THREE.CircleGeometry(0.165, 20),
      new THREE.MeshStandardMaterial({
        color: palette.cyan,
        transparent: true,
        opacity: 0.07,
        roughness: 0.1,
        emissive: palette.cyan,
        emissiveIntensity: 0.1,
        depthWrite: false,
      }),
      head,
      [s * 0.2, 0.43, 0.476],
    );
    const arm = add(new THREE.BoxGeometry(0.03, 0.03, 0.5), frameMat, head, [s * 0.4, 0.45, 0.22]);
    arm.rotation.y = s * -0.12;
  }
  add(new THREE.BoxGeometry(0.1, 0.03, 0.03), frameMat, head, [0, 0.46, 0.48]);

  // Curly hair: a cap plus a cloud of seeded curls, leaving the face open.
  const hairMat = mat(HAIR, { roughness: 0.95 });
  const cap = add(
    new THREE.SphereGeometry(0.535, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
    head,
    [0, 0.46, -0.02],
    "avatar",
  );
  cap.scale.set(0.95, 1.1, 1.0);
  cap.rotation.x = -0.42;
  // All curls share one InstancedMesh: ~100 curls for a single draw call.
  const curlTransforms = [];
  const rand = mulberry32(42);
  while (curlTransforms.length < 96) {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.1) continue;
    v.normalize();
    const inFace = v.z > 0.3 && v.y < 0.7;
    if (v.y < -0.15 || inFace || (v.y < 0.1 && v.z > 0)) continue;
    curlTransforms.push([v.x * 0.54 * 0.95, 0.46 + v.y * 0.54 * 1.1, v.z * 0.54, 0.1 + rand() * 0.06]);
  }
  // Forehead fringe curls.
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.5;
    curlTransforms.push([Math.sin(a) * 0.4, 0.78 - Math.abs(a) * 0.12, 0.34 + Math.cos(a) * 0.07, 0.1 + rand() * 0.03]);
  }
  const curlMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), hairMat, curlTransforms.length);
  const curlDummy = new THREE.Object3D();
  curlTransforms.forEach(([x, y, z, r], i) => {
    curlDummy.position.set(x, y, z);
    curlDummy.scale.setScalar(r);
    curlDummy.updateMatrix();
    curlMesh.setMatrixAt(i, curlDummy.matrix);
  });
  curlMesh.castShadow = true;
  curlMesh.userData.part = "avatar";
  hitMeshes.push(curlMesh);
  head.add(curlMesh);

  // Over-ear headphones with a magenta glow ring.
  const phoneMat = mat(0x201e2c, { roughness: 0.45, metalness: 0.2 });
  const band = add(new THREE.TorusGeometry(0.62, 0.045, 8, 32, Math.PI), phoneMat, head, [0, 0.42, -0.01], "avatar");
  band.scale.set(0.98, 1.0, 1);
  const glow = new THREE.MeshStandardMaterial({
    color: palette.magenta,
    emissive: palette.magenta,
    emissiveIntensity: 1.4,
  });
  const glowRings = [];
  for (const s of [-1, 1]) {
    const cup = add(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 20), phoneMat, head, [s * 0.58, 0.4, 0], "avatar");
    cup.rotation.z = Math.PI / 2;
    const pad = add(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), mat(0x3a2f2c, { roughness: 1 }), head, [s * 0.5, 0.4, 0]);
    pad.rotation.z = Math.PI / 2;
    const ring = add(new THREE.TorusGeometry(0.15, 0.02, 6, 24), glow, head, [s * 0.67, 0.4, 0]);
    ring.rotation.y = Math.PI / 2;
    glowRings.push(ring);
  }

  // ---- arms (shoulder → elbow chains holding the laptop) -------------------
  function makeArm(s) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.6, 1.7, 0);
    rig.add(shoulder);
    sphere(0.17, JACKET, shoulder, [0, 0, 0], "avatar", 1);
    capsule(0.135, 0.3, JACKET, shoulder, [0, -0.25, 0], "avatar");
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.5, 0);
    shoulder.add(elbow);
    capsule(0.118, 0.28, JACKET, elbow, [0, -0.22, 0], "avatar");
    add(new THREE.CylinderGeometry(0.125, 0.125, 0.07, 12), mat(KNIT), elbow, [0, -0.43, 0]);
    sphere(0.115, SKIN, elbow, [0, -0.53, 0.02], "avatar", 2);
    return { shoulder, elbow };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- laptop ----------------------------------------------------------------
  const laptop = new THREE.Group();
  laptop.position.set(0, 1.12, 0.78);
  rig.add(laptop);
  const shell = mat(0x2a2745, { roughness: 0.4, metalness: 0.5 });
  box(1.04, 0.06, 0.72, 0x2a2745, laptop, [0, 0, 0], "laptop").material = shell;
  const keys = document.createElement("canvas");
  keys.width = 256;
  keys.height = 176;
  const kg = keys.getContext("2d");
  kg.fillStyle = "#15122e";
  kg.fillRect(0, 0, 256, 176);
  const keyColors = [palette.violet, palette.cyan, palette.magenta, palette.amber, palette.lime];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 13; c++) {
      kg.fillStyle = (r + c) % 7 === 0 ? keyColors[(r * 3 + c) % keyColors.length] : "#3b3566";
      kg.fillRect(8 + c * 18.5, 10 + r * 24, 15, 19);
    }
  const keyTex = new THREE.CanvasTexture(keys);
  keyTex.colorSpace = THREE.SRGBColorSpace;
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(0.94, 0.62),
    new THREE.MeshBasicMaterial({ map: keyTex, toneMapped: false }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.032, 0);
  laptop.add(deck);
  const lid = new THREE.Group();
  lid.position.set(0, 0.03, -0.34);
  lid.rotation.x = -0.12;
  laptop.add(lid);
  box(1.04, 0.7, 0.045, 0x2a2745, lid, [0, 0.35, 0], "laptop").material = shell;
  const display = createScreen(palette);
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.94, 0.58),
    new THREE.MeshBasicMaterial({ map: display.texture, toneMapped: false }),
  );
  screenMesh.position.set(0, 0.36, 0.026);
  screenMesh.userData.part = "laptop";
  hitMeshes.push(screenMesh);
  lid.add(screenMesh);
  const screenLight = new THREE.PointLight(palette.cyan, 1.2, 3, 2);
  screenLight.position.set(0, 0.5, 0.7);
  laptop.add(screenLight);

  // ---- animation state ----------------------------------------------------------------
  const state = {
    waveUntil: 0,
    blinkAt: 2.5,
    look: new THREE.Vector2(),
    stride: 0,
  };
  const pose = { walk: 0 };

  function update({ dt, time, moving, airborne, dashing, look, reduced }) {
    const t = reduced ? 0 : time;
    const speed = dashing ? 16 : 11;
    pose.walk += ((moving && !airborne ? 1 : 0) - pose.walk) * Math.min(1, dt * 10);
    if (moving && !airborne) state.stride += dt * speed;
    const swing = Math.sin(state.stride) * 0.55 * pose.walk;
    const tuck = airborne ? 0.5 : 0;
    legL.rotation.x = swing - tuck;
    legR.rotation.x = -swing - tuck * 0.4;

    // Nod to the beat (126 bpm) and breathe.
    const beat = Math.sin(t * 13.2);
    rig.position.y = Math.abs(Math.sin(state.stride)) * 0.07 * pose.walk + (reduced ? 0 : Math.sin(t * 2) * 0.012);
    torso.scale.set(1, 1 + (reduced ? 0 : Math.sin(t * 2) * 0.008), 1);
    rig.rotation.x = 0.06 * pose.walk;

    // Head follows the pointer, blinks, nods.
    state.look.x += ((look?.x ?? 0) - state.look.x) * Math.min(1, dt * 6);
    state.look.y += ((look?.y ?? 0) - state.look.y) * Math.min(1, dt * 6);
    head.rotation.y = state.look.x * 0.55;
    head.rotation.x = -state.look.y * 0.3 + beat * 0.025;
    glowRings.forEach((r) => (r.material.emissiveIntensity = 1.2 + Math.max(0, beat) * 1.2));
    if (time > state.blinkAt) {
      eyes.forEach((e) => (e.scale.y = 0.15));
      if (time > state.blinkAt + 0.13) {
        eyes.forEach((e) => (e.scale.y = 1.25));
        state.blinkAt = time + 2 + Math.random() * 3;
      }
    }

    // Arms hold the laptop; the right one lifts off to wave.
    const waving = time < state.waveUntil;
    const typing = reduced ? 0 : Math.sin(t * 17) * 0.03;
    armL.shoulder.rotation.set(-0.42, 0, -0.12 + typing);
    armL.elbow.rotation.set(-1.05 + typing, 0, 0);
    if (waving) {
      armR.shoulder.rotation.set(0, 0, 2.55);
      armR.elbow.rotation.set(0, 0, 0.4 + Math.sin(time * 14) * 0.45);
      laptop.rotation.z += (-0.1 - laptop.rotation.z) * Math.min(1, dt * 8);
    } else {
      armR.shoulder.rotation.set(-0.42, 0, 0.12 - typing);
      armR.elbow.rotation.set(-1.05 - typing, 0, 0);
      laptop.rotation.z += (0 - laptop.rotation.z) * Math.min(1, dt * 8);
    }
    laptop.position.y = 1.12 + (reduced ? 0 : Math.sin(t * 2) * 0.01);
    display.update(time);
  }

  return {
    group,
    hitMeshes,
    update,
    laptop,
    head,
    wave(time, seconds = 2.2) {
      state.waveUntil = time + seconds;
    },
    runBuild(time) {
      display.flash(time);
    },
  };
}
