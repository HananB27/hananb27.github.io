import * as THREE from "../../vendor/three.module.min.js";

/**
 * Hanan's low-poly avatar, authored entirely in code from the reference photo:
 * dark curly hair, round tortoiseshell glasses, black over-ear headphones, a
 * beige jacket with a tan corduroy collar over a cream waffle knit, jeans,
 * white sneakers — and a laptop held up to show its screen. It is a stylised
 * character, not a scan, and the photo itself is never shipped.
 */
const SKIN = 0xe0b08e;
const SKIN_SHADE = 0xcf9a78;
const HAIR = 0x2b1c18;
const HAIR_LIGHT = 0x3f2a21;
const JACKET = 0xd8c6a0;
const JACKET_SHADE = 0xc3b088;
const KNIT = 0xf2ead9;
const DENIM = 0x2c3350;
const DENIM_SEAM = 0x4a5578;
const SNEAKER = 0xf4f0e8;
const SOLE = 0xd9d3c6;
const FRAME = 0x4a2a14;
const FRAME_LIGHT = 0x8a5a2c;
const DARK = 0x16141c;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function knitTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#f2ead9";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "rgba(150,130,100,.5)";
  g.lineWidth = 3;
  for (let i = 0; i <= 64; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 64);
    g.moveTo(0, i);
    g.lineTo(64, i);
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,.55)";
  for (let x = 8; x < 64; x += 16) for (let y = 8; y < 64; y += 16) g.fillRect(x - 2, y - 2, 4, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function corduroyTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#c29a63";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(90,60,25,.45)";
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Scrolling fake code on the laptop display, drawn mostly in neutrals. */
function createScreen(palette) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const tokens = [palette.accent, palette.steel, palette.text, palette.warm, palette.muted];
  const weights = [0.28, 0.3, 0.2, 0.08, 0.14];
  const rand = mulberry32(7);
  const pick = () => {
    let r = rand();
    for (let i = 0; i < tokens.length; i++) if ((r -= weights[i]) < 0) return tokens[i];
    return tokens[1];
  };
  const lines = Array.from({ length: 40 }, () => ({
    indent: Math.floor(rand() * 4),
    words: Array.from({ length: 2 + Math.floor(rand() * 4) }, () => ({ color: pick(), width: 28 + Math.floor(rand() * 70) })),
  }));
  let flashUntil = 0;
  let lastDraw = -1;
  function draw(time) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = palette["bg-3"];
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = palette.muted;
    for (const x of [20, 40, 60]) {
      ctx.beginPath();
      ctx.arc(x, 17, 5, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = palette.text;
    ctx.font = "600 15px ui-monospace, Menlo, monospace";
    ctx.fillText("portfolio.tsx", 86, 22);
    const offset = (time * 24) % (lines.length * 22);
    for (let i = 0; i < lines.length * 2; i++) {
      const line = lines[i % lines.length];
      const y = 56 + i * 22 - offset;
      if (y < 40 || y > 316) continue;
      let x = 18 + line.indent * 22;
      for (const w of line.words) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y - 9, w.width, 9);
        ctx.globalAlpha = 1;
        x += w.width + 10;
      }
    }
    if (time < flashUntil) {
      ctx.fillStyle = "rgba(10,12,16,.86)";
      ctx.fillRect(0, 34, 512, 286);
      ctx.fillStyle = palette.accent;
      ctx.font = "700 40px ui-monospace, Menlo, monospace";
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
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }));
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
  const box = (w, h, d, color, parent, pos, part) => add(new THREE.BoxGeometry(w, h, d), mat(color), parent, pos, part);
  const capsule = (r, len, color, parent, pos, part) =>
    add(new THREE.CapsuleGeometry(r, len, 5, 12), mat(color), parent, pos, part);
  const cyl = (rt, rb, h, color, parent, pos, seg = 12, part) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color), parent, pos, part);

  // ---- legs: jeans with seams and cuffs, sneakers with laces -------------------------------------
  function makeLeg(x) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.88, 0);
    rig.add(leg);
    capsule(0.155, 0.5, DENIM, leg, [0, -0.42, 0], "avatar");
    box(0.012, 0.6, 0.012, DENIM_SEAM, leg, [x < 0 ? 0.155 : -0.155, -0.4, 0.0]);
    box(0.012, 0.5, 0.012, DENIM_SEAM, leg, [x < 0 ? -0.155 : 0.155, -0.4, 0.0]);
    cyl(0.165, 0.17, 0.07, 0x3a4468, leg, [0, -0.75, 0], 14);
    const foot = new THREE.Group();
    foot.position.set(0, -0.82, 0.07);
    leg.add(foot);
    box(0.3, 0.14, 0.5, SNEAKER, foot, [0, 0.02, 0.02], "avatar");
    const toe = add(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(SNEAKER), foot, [0, 0.0, 0.2]);
    toe.scale.set(1, 0.9, 1.15);
    box(0.32, 0.06, 0.54, SOLE, foot, [0, -0.07, 0.02]);
    box(0.2, 0.025, 0.14, 0xe8e2d6, foot, [0, 0.1, 0.05]);
    for (const z of [0.0, 0.07, 0.14]) box(0.19, 0.012, 0.012, 0xb9b3a7, foot, [0, 0.105, z]);
    box(0.3, 0.06, 0.04, 0x1e2230, foot, [0, 0.0, -0.24]);
    return leg;
  }
  const legL = makeLeg(-0.2);
  const legR = makeLeg(0.2);
  box(0.62, 0.06, 0.36, DENIM, rig, [0, 0.93, 0]);
  box(0.6, 0.035, 0.37, 0x1e2233, rig, [0, 1.0, 0]);

  // ---- torso: jacket over knit -----------------------------------------------------------------------
  const torso = new THREE.Group();
  rig.add(torso);
  const jacket = add(new THREE.CylinderGeometry(0.53, 0.5, 0.98, 18), mat(JACKET), torso, [0, 1.34, 0], "avatar");
  jacket.scale.z = 0.7;
  const hem = add(new THREE.CylinderGeometry(0.505, 0.505, 0.07, 18), mat(JACKET_SHADE), torso, [0, 0.88, 0], "avatar");
  hem.scale.z = 0.7;
  const knitMat = new THREE.MeshStandardMaterial({ map: knitTexture(), roughness: 0.95 });
  add(new THREE.BoxGeometry(0.34, 0.5, 0.05), knitMat, torso, [0, 1.62, 0.335], "avatar");
  add(new THREE.BoxGeometry(0.3, 0.05, 0.05), knitMat, torso, [0, 0.86, 0.34]);
  box(0.03, 0.78, 0.035, JACKET_SHADE, torso, [0, 1.22, 0.364], "avatar");
  for (const y of [1.46, 1.24, 1.02]) cyl(0.026, 0.026, 0.02, DARK, torso, [0.0, y, 0.388], 10).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    box(0.2, 0.17, 0.035, JACKET_SHADE, torso, [s * 0.3, 1.03, 0.345], "avatar").rotation.y = s * -0.35;
    box(0.2, 0.03, 0.04, 0xa89570, torso, [s * 0.3, 1.11, 0.353]).rotation.y = s * -0.35;
    box(0.012, 0.8, 0.5, JACKET_SHADE, torso, [s * 0.52, 1.3, 0]);
  }
  const collarMat = new THREE.MeshStandardMaterial({ map: corduroyTexture(), roughness: 1 });
  const collar = add(new THREE.TorusGeometry(0.27, 0.08, 10, 24), collarMat, torso, [0, 1.84, 0.02], "avatar");
  collar.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const flap = add(new THREE.BoxGeometry(0.3, 0.09, 0.22), collarMat, torso, [s * 0.17, 1.8, 0.23], "avatar");
    flap.rotation.set(-0.38, s * -0.42, s * 0.25);
  }
  cyl(0.14, 0.16, 0.2, SKIN, torso, [0, 1.92, 0], 12, "avatar");

  // ---- head ---------------------------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 1.98, 0);
  rig.add(head);
  const skull = sphere(0.5, SKIN, head, [0, 0.44, 0], "avatar", 3);
  skull.scale.set(0.9, 1.08, 0.94);
  const jaw = sphere(0.36, SKIN, head, [0, 0.2, 0.06], "avatar", 3);
  jaw.scale.set(1, 0.9, 0.9);
  for (const s of [-1, 1]) sphere(0.075, SKIN_SHADE, head, [s * 0.44, 0.38, 0.0], "avatar", 1).scale.set(0.55, 1, 0.8);

  // Face: sclera, iris, pupil, lids, brows, cheeks, nose, lips. Clean-shaven.
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.18, 0.44, 0.425);
    head.add(eye);
    sphere(0.062, 0xf7f3ee, eye, [0, 0, 0], undefined, 2).scale.set(1.1, 0.95, 0.5);
    sphere(0.04, 0x4a3022, eye, [s * 0.004, 0, 0.022], undefined, 2).scale.set(1, 1, 0.4);
    sphere(0.02, 0x0c0a0a, eye, [s * 0.004, 0, 0.034], undefined, 1).scale.set(1, 1, 0.4);
    sphere(0.009, 0xffffff, eye, [s * 0.016, 0.012, 0.04], undefined, 0);
    const lid = sphere(0.066, SKIN, eye, [0, 0.075, 0.006], undefined, 1);
    lid.scale.set(1.12, 0.22, 0.55);
    eyes.push({ eye, lid, baseX: s * 0.18 });
    const brow = box(0.2, 0.04, 0.05, 0x2a1b15, head, [s * 0.185, 0.575, 0.435], "avatar");
    brow.rotation.z = s * -0.12;
    sphere(0.045, SKIN_SHADE, head, [s * 0.27, 0.3, 0.37], undefined, 1).scale.set(1.2, 0.8, 0.5);
  }
  box(0.04, 0.17, 0.06, SKIN_SHADE, head, [0, 0.4, 0.46], "avatar");
  sphere(0.062, 0xd29c79, head, [0, 0.31, 0.5], "avatar", 2).scale.set(1.05, 0.85, 1);
  for (const s of [-1, 1]) sphere(0.022, 0x8a5a45, head, [s * 0.035, 0.28, 0.5], undefined, 1);
  sphere(0.07, 0xb8705e, head, [0, 0.17, 0.435], "avatar", 2).scale.set(1.3, 0.3, 0.5);
  sphere(0.07, 0xc47c6a, head, [0, 0.135, 0.435], "avatar", 2).scale.set(1.15, 0.32, 0.5);
  box(0.16, 0.012, 0.03, 0x7a4538, head, [0, 0.153, 0.45]);

  // Round tortoiseshell glasses with nose pads and temples.
  const frameMat = mat(FRAME, { roughness: 0.5 });
  const frameLight = mat(FRAME_LIGHT, { roughness: 0.5 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.06, roughness: 0.05, depthWrite: false });
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(0.17, 0.026, 10, 28), frameMat, head, [s * 0.2, 0.44, 0.47]);
    const accent = add(new THREE.TorusGeometry(0.17, 0.014, 6, 14, Math.PI * 0.8), frameLight, head, [s * 0.2, 0.44, 0.482]);
    accent.rotation.z = s > 0 ? 0.9 : 2.2;
    add(new THREE.CircleGeometry(0.165, 24), lensMat, head, [s * 0.2, 0.44, 0.471]);
    const temple = add(new THREE.BoxGeometry(0.026, 0.026, 0.5), frameMat, head, [s * 0.395, 0.46, 0.22]);
    temple.rotation.y = s * -0.1;
    add(new THREE.SphereGeometry(0.014, 6, 6), mat(0xd8d2c8), head, [s * 0.1, 0.38, 0.47]);
  }
  add(new THREE.TorusGeometry(0.05, 0.016, 6, 12, Math.PI), frameMat, head, [0, 0.45, 0.47]);

  // Curly hair: a cap, sideburns and instanced curls in two tones and three sizes.
  const hairMat = mat(HAIR, { roughness: 0.95 });
  const cap = add(new THREE.SphereGeometry(0.535, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat, head, [0, 0.46, -0.02], "avatar");
  cap.scale.set(0.95, 1.1, 1.0);
  cap.rotation.x = -0.42;
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.2, 0.06), hairMat, head, [s * 0.4, 0.5, 0.32]);
  const rand = mulberry32(42);
  const curls = [];
  while (curls.length < 120) {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.1) continue;
    v.normalize();
    const inFace = v.z > 0.3 && v.y < 0.7;
    if (v.y < -0.2 || inFace || (v.y < 0.1 && v.z > 0)) continue;
    const tier = rand();
    const r = tier < 0.5 ? 0.085 : tier < 0.85 ? 0.115 : 0.145;
    const reach = 0.52 + rand() * 0.05;
    curls.push([v.x * reach * 0.95, 0.46 + v.y * reach * 1.1, v.z * reach, r, rand() < 0.3]);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 1.7;
    curls.push([Math.sin(a) * 0.4, 0.79 - Math.abs(a) * 0.13, 0.33 + Math.cos(a) * 0.08, 0.075 + rand() * 0.03, i % 2 === 0]);
  }
  const curlMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), curls.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  curls.forEach(([x, y, z, r, light], i) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(r, r * 0.9, r);
    dummy.rotation.set(rand() * 3, rand() * 3, 0);
    dummy.updateMatrix();
    curlMesh.setMatrixAt(i, dummy.matrix);
    curlMesh.setColorAt(i, tint.setHex(light ? HAIR_LIGHT : HAIR));
  });
  curlMesh.castShadow = true;
  curlMesh.userData.part = "avatar";
  hitMeshes.push(curlMesh);
  head.add(curlMesh);

  // Over-ear headphones: padded band, sliders, shells, pads and a thin accent ring.
  const phoneMat = mat(0x201e26, { roughness: 0.45, metalness: 0.25 });
  const band = add(new THREE.TorusGeometry(0.62, 0.042, 10, 36, Math.PI), phoneMat, head, [0, 0.42, -0.01], "avatar");
  band.scale.set(0.98, 1.0, 1);
  add(new THREE.TorusGeometry(0.595, 0.03, 8, 24, Math.PI * 0.55), mat(0x3a352f, { roughness: 1 }), head, [0, 0.42, -0.01]).rotation.z = Math.PI * 0.225;
  const ringMat = new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.9 });
  const rings = [];
  const metal = mat(0x8d8f98, { metalness: 0.7, roughness: 0.35 });
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.045, 0.2, 0.05), metal, head, [s * 0.6, 0.62, 0]);
    add(new THREE.CylinderGeometry(0.215, 0.215, 0.16, 28), phoneMat, head, [s * 0.585, 0.4, 0], "avatar").rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 28), mat(0x2d2a34, { metalness: 0.35, roughness: 0.4 }), head, [s * 0.675, 0.4, 0]).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 28), mat(0x3a2f2c, { roughness: 1 }), head, [s * 0.5, 0.4, 0]).rotation.z = Math.PI / 2;
    const ring = add(new THREE.TorusGeometry(0.135, 0.014, 6, 28), ringMat, head, [s * 0.695, 0.4, 0]);
    ring.rotation.y = Math.PI / 2;
    rings.push(ring);
  }

  // ---- arms: shoulder → elbow → hand with fingers, holding the laptop ---------------------------------
  function makeArm(s) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.6, 1.7, 0);
    rig.add(shoulder);
    sphere(0.17, JACKET, shoulder, [0, 0, 0], "avatar", 2);
    capsule(0.137, 0.3, JACKET, shoulder, [0, -0.25, 0], "avatar");
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.5, 0);
    shoulder.add(elbow);
    sphere(0.125, JACKET_SHADE, elbow, [0, 0, 0], undefined, 1);
    capsule(0.118, 0.26, JACKET, elbow, [0, -0.22, 0], "avatar");
    cyl(0.122, 0.122, 0.09, JACKET_SHADE, elbow, [0, -0.42, 0], 14);
    add(new THREE.CylinderGeometry(0.108, 0.108, 0.07, 14), knitMat, elbow, [0, -0.48, 0]);
    const hand = new THREE.Group();
    hand.position.set(0, -0.58, 0.02);
    elbow.add(hand);
    box(0.14, 0.11, 0.07, SKIN, hand, [0, 0, 0], "avatar");
    for (let f = 0; f < 4; f++) {
      const finger = capsule(0.022, 0.07 + (f === 1 || f === 2 ? 0.015 : 0), SKIN, hand, [(f - 1.5) * 0.034, -0.1, 0.012], "avatar");
      finger.rotation.x = -0.35;
    }
    const thumb = capsule(0.024, 0.06, SKIN, hand, [-s * 0.08, -0.03, 0.03], "avatar");
    thumb.rotation.set(-0.5, 0, s * 0.7);
    return { shoulder, elbow };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- laptop -------------------------------------------------------------------------------------------
  const laptop = new THREE.Group();
  laptop.position.set(0, 1.12, 0.78);
  rig.add(laptop);
  const shell = mat(0x2b2d36, { roughness: 0.35, metalness: 0.6 });
  box(1.04, 0.06, 0.72, 0x2b2d36, laptop, [0, 0, 0], "laptop").material = shell;
  const keys = document.createElement("canvas");
  keys.width = 256;
  keys.height = 176;
  const kg = keys.getContext("2d");
  kg.fillStyle = "#14161c";
  kg.fillRect(0, 0, 256, 176);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 13; c++) {
      kg.fillStyle = r === 4 && c > 2 && c < 9 ? "#3a4050" : (r + c) % 9 === 0 ? palette.steel : "#2b303d";
      kg.fillRect(8 + c * 18.5, 10 + r * 24, 15, 19);
    }
  kg.fillStyle = "#222732";
  kg.fillRect(88, 134, 80, 36);
  const keyTex = new THREE.CanvasTexture(keys);
  keyTex.colorSpace = THREE.SRGBColorSpace;
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.62), new THREE.MeshBasicMaterial({ map: keyTex, toneMapped: false }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.032, 0);
  laptop.add(deck);
  const lid = new THREE.Group();
  lid.position.set(0, 0.03, -0.34);
  lid.rotation.x = -0.12;
  laptop.add(lid);
  box(1.04, 0.7, 0.045, 0x2b2d36, lid, [0, 0.35, 0], "laptop").material = shell;
  box(1.0, 0.03, 0.05, 0x1c1e25, lid, [0, 0.0, 0.0]);
  const display = createScreen(palette);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.58), new THREE.MeshBasicMaterial({ map: display.texture, toneMapped: false }));
  screenMesh.position.set(0, 0.36, 0.026);
  screenMesh.userData.part = "laptop";
  hitMeshes.push(screenMesh);
  lid.add(screenMesh);
  const screenLight = new THREE.PointLight(0xdff7ff, 0.9, 3, 2);
  screenLight.position.set(0, 0.5, 0.7);
  laptop.add(screenLight);

  // ---- animation ------------------------------------------------------------------------------------------
  const state = { waveUntil: 0, blinkAt: 2.5, look: new THREE.Vector2(), stride: 0, walk: 0 };

  function update({ dt, time, moving, airborne, dashing, look, reduced }) {
    const t = reduced ? 0 : time;
    state.walk += ((moving && !airborne ? 1 : 0) - state.walk) * Math.min(1, dt * 10);
    if (moving && !airborne) state.stride += dt * (dashing ? 16 : 11);
    const swing = Math.sin(state.stride) * 0.55 * state.walk;
    const tuck = airborne ? 0.5 : 0;
    legL.rotation.x = swing - tuck;
    legR.rotation.x = -swing - tuck * 0.4;

    const beat = reduced ? 0 : Math.sin(t * 13.2);
    rig.position.y = Math.abs(Math.sin(state.stride)) * 0.07 * state.walk + (reduced ? 0 : Math.sin(t * 2) * 0.012);
    torso.scale.set(1, 1 + (reduced ? 0 : Math.sin(t * 2) * 0.008), 1);
    rig.rotation.x = 0.06 * state.walk;

    state.look.x += ((look?.x ?? 0) - state.look.x) * Math.min(1, dt * 6);
    state.look.y += ((look?.y ?? 0) - state.look.y) * Math.min(1, dt * 6);
    head.rotation.y = state.look.x * 0.55;
    head.rotation.x = -state.look.y * 0.3 + beat * 0.02;
    rings.forEach((r) => (r.material.emissiveIntensity = 0.7 + Math.max(0, beat) * 0.5));

    const blinking = time > state.blinkAt;
    eyes.forEach(({ eye, lid }) => {
      lid.position.y = blinking ? 0.0 : 0.075;
      lid.scale.y = blinking ? 0.95 : 0.22;
      eye.rotation.y = state.look.x * 0.25;
    });
    if (blinking && time > state.blinkAt + 0.13) state.blinkAt = time + 2 + Math.random() * 3;

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
