import * as THREE from "../../vendor/three.module.min.js";

const MONO = "ui-monospace, Menlo, Consolas, monospace";

let glowTex;
/** Soft radial gradient used for additive neon halos. */
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function glowSprite(color, size, opacity = 0.9) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  sprite.scale.setScalar(size);
  sprite.raycast = () => {};
  return sprite;
}

/** Rounded pill label rendered to a sprite. */
export function labelSprite(text, color, palette, { width = 256, scale = 1.5 } = {}) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = 72;
  const g = c.getContext("2d");
  g.fillStyle = palette.bg;
  g.globalAlpha = 0.88;
  g.beginPath();
  g.roundRect(4, 4, width - 8, 64, 32);
  g.fill();
  g.globalAlpha = 1;
  g.lineWidth = 4;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = palette.text;
  g.font = `700 32px ${MONO}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, width / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(scale, scale * (72 / width), 1);
  sprite.raycast = () => {};
  return sprite;
}

// ---- skill crystals -------------------------------------------------------------
export function createCrystal(skill, colorHex, palette) {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.3,
      flatShading: true,
    }),
  );
  body.scale.y = 1.35;
  body.userData.part = "crystal";
  group.add(body);
  const halo = glowSprite(colorHex, 1.7, 0.75);
  group.add(halo);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.02, 6, 36),
    new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.62;
  group.add(ring);
  const tag = labelSprite(skill.name, colorHex, palette, { width: 256, scale: 0.95 });
  tag.position.y = 0.95;
  group.add(tag);
  return { group, body, halo, ring, tag, color };
}

// ---- bug critters ----------------------------------------------------------------
export function createBug(palette) {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: palette.coral,
    emissive: palette.coral,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1925, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), shell);
  body.scale.set(1, 0.7, 1.2);
  body.position.y = 0.25;
  body.castShadow = true;
  body.userData.part = "bug";
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), dark);
  head.position.set(0, 0.24, 0.34);
  group.add(head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: palette.lime, toneMapped: false }),
    );
    eye.position.set(s * 0.09, 0.3, 0.48);
    group.add(eye);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), dark);
    antenna.position.set(s * 0.1, 0.45, 0.42);
    antenna.rotation.set(0.5, 0, s * -0.3);
    group.add(antenna);
    for (const z of [-0.12, 0.05, 0.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), dark);
      leg.position.set(s * 0.28, 0.1, z);
      leg.rotation.z = s * 0.9;
      group.add(leg);
    }
  }
  for (const [x, z] of [[0.12, -0.05], [-0.14, 0.1], [0.05, 0.25]]) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), dark);
    spot.position.set(x, 0.48, z);
    spot.scale.y = 0.4;
    group.add(spot);
  }
  return { group, body };
}

// ---- arcade cabinets -------------------------------------------------------------
function drawIcon(g, id, color, cx, cy, s) {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = s * 0.12;
  g.lineCap = "round";
  g.lineJoin = "round";
  if (id === "search") {
    g.beginPath();
    g.arc(-s * 0.1, -s * 0.1, s * 0.34, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.15, s * 0.15);
    g.lineTo(s * 0.42, s * 0.42);
    g.stroke();
  } else if (id === "auction") {
    g.rotate(-0.6);
    g.fillRect(-s * 0.32, -s * 0.34, s * 0.64, s * 0.26);
    g.fillRect(-s * 0.05, -s * 0.1, s * 0.1, s * 0.62);
    g.rotate(0.6);
    g.fillRect(-s * 0.42, s * 0.34, s * 0.84, s * 0.12);
  } else if (id === "wiki") {
    g.font = `700 ${s * 1.15}px Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("W", 0, s * 0.05);
  } else {
    g.strokeRect(-s * 0.42, -s * 0.28, s * 0.84, s * 0.56);
    g.beginPath();
    g.moveTo(-s * 0.42, -s * 0.28);
    g.lineTo(0, s * 0.08);
    g.lineTo(s * 0.42, -s * 0.28);
    g.stroke();
  }
  g.restore();
}

function screenTexture(project, colorHex, palette) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 400;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 400);
  bg.addColorStop(0, palette["bg-3"]);
  bg.addColorStop(1, palette.bg);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 400);
  g.strokeStyle = colorHex;
  g.globalAlpha = 0.18;
  g.lineWidth = 2;
  for (let i = 0; i < 520; i += 40) {
    g.beginPath();
    g.moveTo(i, 400);
    g.lineTo(256 + (i - 256) * 0.2, 170);
    g.stroke();
  }
  for (let y = 170; y < 400; y += 30) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.globalAlpha = 1;
  drawIcon(g, project.id, colorHex, 256, 118, 150);
  g.fillStyle = palette.text;
  g.font = `700 44px ${MONO}`;
  g.textAlign = "center";
  g.fillText(project.name.toUpperCase(), 256, 262);
  g.fillStyle = colorHex;
  g.font = `700 26px ${MONO}`;
  g.fillText(project.kind, 256, 306);
  g.fillStyle = palette.muted;
  g.font = `400 22px ${MONO}`;
  g.fillText("▶ INSERT COIN", 256, 360);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCabinet(project, colorHex, palette) {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c1740, roughness: 0.55, metalness: 0.25 });
  const trim = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
  const hits = [];
  function add(geo, material, pos, rot) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.userData.part = "cabinet";
    hits.push(m);
    group.add(m);
    return m;
  }

  const pad = add(new THREE.CylinderGeometry(1.15, 1.2, 0.08, 40), bodyMat, [0, 0.04, 0.2]);
  pad.castShadow = false;
  const padRing = add(new THREE.TorusGeometry(1.12, 0.025, 6, 48), trim, [0, 0.09, 0.2], [Math.PI / 2, 0, 0]);
  padRing.castShadow = false;
  add(new THREE.BoxGeometry(1.3, 0.95, 0.95), bodyMat, [0, 0.55, 0]);
  add(new THREE.BoxGeometry(1.36, 0.08, 1.0), trim, [0, 1.05, 0]);
  add(new THREE.BoxGeometry(1.3, 0.1, 0.5), bodyMat, [0, 1.12, 0.3], [-0.25, 0, 0]); // control deck
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), bodyMat, [-0.3, 1.25, 0.34]);
  add(new THREE.SphereGeometry(0.07, 10, 8), trim, [-0.3, 1.38, 0.34]);
  for (const x of [0.12, 0.34])
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14), trim, [x, 1.19, 0.34], [-0.25, 0, 0]);
  const hood = add(new THREE.BoxGeometry(1.3, 1.25, 0.7), bodyMat, [0, 1.72, -0.12]);
  hood.scale.x = 1;
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTexture(project, colorHex, palette),
    toneMapped: false,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.86), screenMat);
  screen.position.set(0, 1.72, 0.245);
  screen.userData.part = "cabinet";
  hits.push(screen);
  group.add(screen);
  for (const x of [-0.66, 0.66]) add(new THREE.BoxGeometry(0.05, 2.1, 1.0), trim, [x, 1.1, 0]);
  add(new THREE.BoxGeometry(1.4, 0.34, 0.8), bodyMat, [0, 2.5, -0.08]);
  const marquee = labelSprite(project.name.toUpperCase(), colorHex, palette, { width: 320, scale: 1.45 });
  marquee.position.set(0, 2.5, 0.36);
  group.add(marquee);

  const halo = glowSprite(colorHex, 4.2, 0.35);
  halo.position.set(0, 1.4, 0.6);
  group.add(halo);
  const prompt = labelSprite("OPEN ↗", colorHex, palette, { width: 200, scale: 1.05 });
  prompt.position.set(0, 3.25, 0.2);
  prompt.visible = false;
  group.add(prompt);

  let highlight = 0;
  return {
    group,
    hits,
    prompt,
    setHighlight(v) {
      highlight = v;
      trim.emissiveIntensity = 0.8 + v * 1.8;
      halo.material.opacity = 0.35 + v * 0.45;
      group.scale.setScalar(1 + v * 0.05);
    },
    get highlight() {
      return highlight;
    },
  };
}
