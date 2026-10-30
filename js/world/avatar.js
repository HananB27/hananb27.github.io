import * as THREE from "../../vendor/three.module.min.js";
import { smoothstep, solveElbow } from "../rules.js";

/**
 * Hanan's low-poly avatar, authored entirely in code from the reference photo:
 * dark curly hair, round tortoiseshell glasses, black over-ear headphones, a
 * beige jacket with a tan corduroy collar over a cream waffle knit, jeans,
 * white sneakers — using a laptop balanced on one forearm, like you would standing up. It is a stylised
 * character, not a scan, and the photo itself is never shipped.
 */
const SKIN = 0xe0b08e;
const SKIN_SHADE = 0xcf9a78;
const HAIR = 0x3a261e;
const JACKET = 0xd8c6a0;
const JACKET_SHADE = 0xc3b088;
const KNIT = 0xf2ead9;
const DENIM = 0x2c3350;
const DENIM_SEAM = 0x4a5578;
const SNEAKER = 0xf4f0e8;
const SOLE = 0xd9d3c6;
const FRAME = 0x4a2a14;
const DARK = 0x16141c;
const UPPER_ARM = 0.5;
const FOREARM = 0.58;
const LAPTOP_Y = 1.2;
const ARM_REST = new THREE.Vector3(0, -1, 0);

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hair as a single mesh: a unit sphere pushed out over the skull into rounded
 * curls. Over the face the surface sinks below the skin, so the hairline is
 * simply where the two meet and it follows the curls without any clipping.
 */
function createHairGeometry() {
  const WIDTH = 160;
  const HEIGHT = 108;
  const SKULL = [0.45, 0.55, 0.47];
  const geometry = new THREE.SphereGeometry(1, WIDTH, HEIGHT);
  const position = geometry.attributes.position;

  const rand = mulberry32(11);
  const CURLS = 84;
  const curls = Array.from({ length: CURLS }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / CURLS;
    const ring = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + (rand() - 0.5) * 0.35;
    return { x: Math.cos(a) * ring, y, z: Math.sin(a) * ring, r: 0.27 * (0.85 + rand() * 0.3) };
  });

  // Crevices go dark and curl tops catch the light, so each curl reads even in low light.
  const colors = new Float32Array(position.count * 3);
  const crease = new THREE.Color(0x1a100c);
  const crown = new THREE.Color(0x452d22);
  const shade = new THREE.Color();

  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    const skull = 1 / Math.hypot(v.x / SKULL[0], v.y / SKULL[1], v.z / SKULL[2]);
    // Hairline: low on the forehead, around the ears, down to the nape.
    const around = Math.atan2(Math.abs(v.x), v.z);
    const hairline = 0.5 - 1.15 * smoothstep((around - 0.5) / (Math.PI - 0.5));
    // Highest dome of any curl under this point.
    let dome = 0;
    for (const c of curls) {
      const d2 = 2 * (1 - (v.x * c.x + v.y * c.y + v.z * c.z));
      const q = d2 / (c.r * c.r);
      if (q < 1) dome = Math.max(dome, Math.sqrt(1 - q));
    }
    // Curls reach past the hairline, which scallops the edge along the forehead.
    // The fade spans several mesh rows; any tighter and the edge turns stair-stepped.
    const cover = smoothstep((v.y - hairline + 0.22 * dome - 0.02) / 0.13);
    const thickness = 0.05 + 0.05 * Math.max(v.y, 0) + 0.13 * dome;
    position.setXYZ(i, ...v.clone().multiplyScalar(skull - 0.05 * (1 - cover) + cover * thickness).toArray());
    shade.lerpColors(crease, crown, dome * dome).toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // A sphere's seam and poles are split vertices; weld their normals to hide the crease.
  const normal = geometry.attributes.normal;
  for (let row = 0; row <= HEIGHT; row++) {
    const first = row * (WIDTH + 1);
    const last = first + WIDTH;
    v.fromBufferAttribute(normal, first).add(new THREE.Vector3().fromBufferAttribute(normal, last)).normalize();
    normal.setXYZ(first, v.x, v.y, v.z);
    normal.setXYZ(last, v.x, v.y, v.z);
  }
  for (let col = 0; col <= WIDTH; col++) {
    normal.setXYZ(col, 0, 1, 0);
    normal.setXYZ(HEIGHT * (WIDTH + 1) + col, 0, -1, 0);
  }
  return geometry;
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
  // Yoke across the shoulders, so the torso does not end in a flat top.
  const yoke = add(new THREE.CapsuleGeometry(0.17, 1.14, 6, 14), mat(JACKET), torso, [0, 1.73, -0.08], "avatar");
  yoke.rotation.z = Math.PI / 2;
  yoke.scale.set(1, 1, 1.9);
  const knitMat = new THREE.MeshStandardMaterial({ map: knitTexture(), roughness: 0.95 });
  add(new THREE.BoxGeometry(0.34, 0.5, 0.05), knitMat, torso, [0, 1.62, 0.335], "avatar");
  add(new THREE.BoxGeometry(0.3, 0.05, 0.05), knitMat, torso, [0, 0.86, 0.34]);
  box(0.03, 0.78, 0.035, JACKET_SHADE, torso, [0, 1.22, 0.364], "avatar");
  for (const y of [1.46, 1.24, 1.02]) cyl(0.026, 0.026, 0.02, DARK, torso, [0.0, y, 0.388], 10).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    box(0.2, 0.17, 0.035, JACKET_SHADE, torso, [s * 0.3, 1.03, 0.345], "avatar").rotation.y = s * -0.35;
    box(0.2, 0.03, 0.04, 0xa89570, torso, [s * 0.3, 1.11, 0.353]).rotation.y = s * -0.35;
    box(0.012, 0.8, 0.04, JACKET_SHADE, torso, [s * 0.525, 1.3, 0]);
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
  // One smooth head shape, tapered towards the chin. Sphere normals are kept on purpose.
  const skullGeo = new THREE.SphereGeometry(0.5, 36, 28);
  const skullPos = skullGeo.attributes.position;
  for (let i = 0; i < skullPos.count; i++) {
    const t = Math.max(0, (0.05 - skullPos.getY(i)) / 0.55);
    skullPos.setX(i, skullPos.getX(i) * (1 - 0.28 * t * t));
    skullPos.setZ(i, skullPos.getZ(i) * (1 - 0.12 * t * t));
  }
  add(skullGeo, mat(SKIN), head, [0, 0.44, 0], "avatar").scale.set(0.9, 1.1, 0.94);

  // Simple face: dot eyes, brows, a small nose and a slight smile. Clean-shaven.
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = sphere(0.045, 0x1a1412, head, [s * 0.19, 0.43, 0.44], undefined, 2);
    eye.scale.set(1, 1.25, 0.5);
    eyes.push(eye);
    const brow = box(0.17, 0.032, 0.04, HAIR, head, [s * 0.19, 0.58, 0.44], "avatar");
    brow.rotation.z = s * -0.08;
  }
  sphere(0.055, SKIN_SHADE, head, [0, 0.32, 0.485], "avatar", 2);
  // A short arc for the smile, tilted back to follow the chin.
  const SMILE_ARC = 1.3;
  const smile = add(new THREE.TorusGeometry(0.12, 0.011, 8, 24, SMILE_ARC), mat(0x7a4538), head, [0, 0.275, 0.44], "avatar");
  smile.rotation.set(0.41, 0, -Math.PI / 2 - SMILE_ARC / 2);

  // Round tortoiseshell glasses: two rims, a bridge and the temples.
  const frameMat = mat(FRAME, { roughness: 0.5 });
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(0.17, 0.024, 10, 32), frameMat, head, [s * 0.2, 0.44, 0.47]);
    const temple = add(new THREE.BoxGeometry(0.026, 0.026, 0.5), frameMat, head, [s * 0.395, 0.46, 0.22]);
    temple.rotation.y = s * -0.1;
  }
  add(new THREE.TorusGeometry(0.05, 0.016, 6, 12, Math.PI), frameMat, head, [0, 0.45, 0.47]);

  // Curly hair: one sculpted volume, so the silhouette stays clean from every angle.
  const hair = add(createHairGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }), head, [0, 0.44, 0], "avatar");
  hair.receiveShadow = true;

  // Over-ear headphones: band resting on the hair, sliders, shells, pads and a thin accent ring.
  const phoneMat = mat(0x201e26, { roughness: 0.45, metalness: 0.25 });
  const band = add(new THREE.TorusGeometry(0.62, 0.042, 10, 36, Math.PI), phoneMat, head, [0, 0.42, -0.01], "avatar");
  band.scale.set(1.06, 1.34, 1);
  const ringMat = new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.9 });
  const rings = [];
  const metal = mat(0x8d8f98, { metalness: 0.7, roughness: 0.35 });
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.045, 0.2, 0.05), metal, head, [s * 0.645, 0.6, 0]);
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
    elbow.position.set(0, -UPPER_ARM, 0);
    shoulder.add(elbow);
    sphere(0.125, JACKET_SHADE, elbow, [0, 0, 0], undefined, 1);
    capsule(0.118, 0.26, JACKET, elbow, [0, -0.22, 0], "avatar");
    cyl(0.122, 0.122, 0.09, JACKET_SHADE, elbow, [0, -0.42, 0], 14);
    add(new THREE.CylinderGeometry(0.108, 0.108, 0.07, 14), knitMat, elbow, [0, -0.48, 0]);
    const hand = new THREE.Group();
    hand.position.set(0, -FOREARM, 0);
    elbow.add(hand);
    box(0.14, 0.11, 0.07, SKIN, hand, [0, 0, 0], "avatar");
    for (let f = 0; f < 4; f++) {
      const finger = capsule(0.022, 0.07 + (f === 1 || f === 2 ? 0.015 : 0), SKIN, hand, [(f - 1.5) * 0.034, -0.1, 0.012], "avatar");
      finger.rotation.x = -0.35;
    }
    const thumb = capsule(0.024, 0.06, SKIN, hand, [0.08, -0.03, 0.03], "avatar");
    thumb.rotation.set(-0.5, 0, 0.7);
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- laptop -------------------------------------------------------------------------------------------
  const laptop = new THREE.Group();
  // Screen faces him: the keyboard is at his chest and the lid's back faces the viewer.
  laptop.position.set(0, LAPTOP_Y, 0.72);
  laptop.rotation.y = Math.PI;
  laptop.scale.setScalar(0.82);
  rig.add(laptop);
  const shell = mat(0x5a606e, { roughness: 0.4, metalness: 0.3 });
  box(1.04, 0.06, 0.72, 0x5a606e, laptop, [0, 0, 0], "laptop").material = shell;
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
  lid.rotation.x = -0.22;
  laptop.add(lid);
  box(1.04, 0.7, 0.045, 0x5a606e, lid, [0, 0.35, 0], "laptop").material = shell;
  box(1.0, 0.03, 0.05, 0x1c1e25, lid, [0, 0.0, 0.0]);
  const display = createScreen(palette);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.58), new THREE.MeshBasicMaterial({ map: display.texture, toneMapped: false }));
  screenMesh.position.set(0, 0.36, 0.026);
  screenMesh.userData.part = "laptop";
  hitMeshes.push(screenMesh);
  lid.add(screenMesh);
  // Small logo on the back of the lid, the side everyone else sees.
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 256;
  logoCanvas.height = 128;
  const lg = logoCanvas.getContext("2d");
  lg.font = "700 96px Inter, system-ui, sans-serif";
  lg.textAlign = "center";
  lg.textBaseline = "middle";
  lg.fillStyle = palette.text;
  lg.fillText("hb", 112, 68);
  lg.fillStyle = palette.accent;
  lg.fillText(".", 188, 68);
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false }));
  logo.position.set(0, 0.36, -0.024);
  logo.rotation.y = Math.PI;
  lid.add(logo);
  const screenLight = new THREE.PointLight(0xdff7ff, 0.35, 2.5, 2);
  screenLight.position.set(0, 0.55, 0.15);
  laptop.add(screenLight);

  // Puts the wrist on `target` and turns the hand: `palm` is where the palm faces,
  // `fingers` where the fingers point. Everything here is in the rig's space.
  const ik = {
    upper: new THREE.Vector3(),
    lower: new THREE.Vector3(),
    chain: new THREE.Quaternion(),
    x: new THREE.Vector3(),
    y: new THREE.Vector3(),
    z: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    hand: new THREE.Quaternion(),
  };
  function reach(arm, target, pole, palm, fingers) {
    const { elbow, wrist } = solveElbow(arm.shoulder.position, target, UPPER_ARM, FOREARM, pole);
    ik.upper.copy(elbow).sub(arm.shoulder.position).normalize();
    arm.shoulder.quaternion.setFromUnitVectors(ARM_REST, ik.upper);
    ik.lower.copy(wrist).sub(elbow).normalize().applyQuaternion(ik.chain.copy(arm.shoulder.quaternion).invert());
    arm.elbow.quaternion.setFromUnitVectors(ARM_REST, ik.lower);
    ik.z.copy(palm).normalize();
    ik.y.copy(fingers).negate().addScaledVector(ik.z, fingers.dot(ik.z)).normalize();
    ik.x.crossVectors(ik.y, ik.z);
    ik.hand.setFromRotationMatrix(ik.basis.makeBasis(ik.x, ik.y, ik.z));
    ik.chain.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion).invert();
    arm.hand.quaternion.copy(ik.chain).multiply(ik.hand);
  }
  const POSE = {
    // Left forearm cradles the laptop, palm up under the base.
    leftWrist: new THREE.Vector3(-0.28, LAPTOP_Y - 0.09, 0.7),
    leftPole: new THREE.Vector3(-1, -0.9, -0.1),
    leftPalm: new THREE.Vector3(0, 1, 0),
    leftFingers: new THREE.Vector3(0.3, 0, 1),
    // Right hand rests on the keyboard, palm down.
    rightWrist: new THREE.Vector3(0.1, LAPTOP_Y + 0.08, 0.58),
    rightPole: new THREE.Vector3(1, -0.9, -0.1),
    rightPalm: new THREE.Vector3(0, -1, 0.05),
    rightFingers: new THREE.Vector3(-0.4, -0.05, 1),
  };
  const wristTarget = new THREE.Vector3();

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
    head.rotation.x = 0.16 - state.look.y * 0.3 + beat * 0.02; // eyes on the screen
    rings.forEach((r) => (r.material.emissiveIntensity = 0.7 + Math.max(0, beat) * 0.5));

    const blinking = time > state.blinkAt;
    eyes.forEach((eye) => (eye.scale.y = blinking ? 0.12 : 1.25));
    if (blinking && time > state.blinkAt + 0.13) state.blinkAt = time + 2 + Math.random() * 3;

    const bob = reduced ? 0 : Math.sin(t * 2) * 0.01;
    laptop.position.y = LAPTOP_Y + bob;
    reach(armL, wristTarget.copy(POSE.leftWrist).setY(POSE.leftWrist.y + bob), POSE.leftPole, POSE.leftPalm, POSE.leftFingers);
    const waving = time < state.waveUntil;
    if (waving) {
      armR.shoulder.rotation.set(0, 0, 2.55);
      armR.elbow.rotation.set(0, 0, 0.4 + Math.sin(time * 14) * 0.45);
      armR.hand.rotation.set(0, 0, 0);
    } else {
      // Slow drift across the keys with a light tap, so it reads as typing.
      const tap = reduced ? 0 : Math.abs(Math.sin(t * 9)) * 0.012;
      const drift = reduced ? 0 : Math.sin(t * 1.3) * 0.05;
      wristTarget.copy(POSE.rightWrist);
      wristTarget.x += drift;
      wristTarget.y += bob + tap;
      reach(armR, wristTarget, POSE.rightPole, POSE.rightPalm, POSE.rightFingers);
    }
    laptop.rotation.z += ((waving ? -0.06 : 0) - laptop.rotation.z) * Math.min(1, dt * 8);
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
