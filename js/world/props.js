import * as THREE from "../../vendor/three.module.min.js";

const MONO = "ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace";

/** Pill label rendered to a sprite. */
export function labelSprite(text, palette, { width = 256, scale = 1.5, accent = false } = {}) {
  const c = document.createElement("canvas");
  c.width = width * 2;
  c.height = 144;
  const g = c.getContext("2d");
  g.scale(2, 2);
  g.fillStyle = palette.bg;
  g.globalAlpha = 0.92;
  g.beginPath();
  g.roundRect(2, 2, width - 4, 68, 10);
  g.fill();
  g.globalAlpha = 1;
  g.lineWidth = 2;
  g.strokeStyle = accent ? palette.accent : palette.steel;
  g.stroke();
  g.fillStyle = palette.text;
  g.font = `600 30px ${MONO}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, width / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(scale, scale * (72 / width), 1);
  sprite.raycast = () => {};
  return sprite;
}

// ---- skill crystals: clean glass octahedra with a thin ring --------------------------------------
export function createCrystal(skill, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette.accent);
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.25,
      flatShading: true,
    }),
  );
  body.scale.y = 1.35;
  body.userData.part = "crystal";
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.015, 6, 40),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.7, toneMapped: false }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.62;
  group.add(ring);
  const tag = labelSprite(skill.name, palette, { width: 220, scale: 1.05 });
  tag.position.y = 0.95;
  group.add(tag);
  return { group, body, ring, tag };
}

// ---- arcade cabinets -----------------------------------------------------------------------------------
function drawIcon(g, id, color, cx, cy, s) {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = s * 0.09;
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
    g.fillRect(-s * 0.42, s * 0.34, s * 0.84, s * 0.1);
  } else if (id === "wiki") {
    g.font = `700 ${s * 1.05}px Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("W", 0, s * 0.05);
  } else if (id === "mail") {
    g.strokeRect(-s * 0.42, -s * 0.28, s * 0.84, s * 0.56);
    g.beginPath();
    g.moveTo(-s * 0.42, -s * 0.28);
    g.lineTo(0, s * 0.08);
    g.lineTo(s * 0.42, -s * 0.28);
    g.stroke();
  } else if (id === "person") {
    g.beginPath();
    g.arc(0, -s * 0.2, s * 0.2, 0, 7);
    g.stroke();
    g.beginPath();
    g.arc(0, s * 0.5, s * 0.38, Math.PI, 0);
    g.stroke();
  }
  g.restore();
}

function screenTexture({ id, title, subtitle }, palette) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 500;
  const g = c.getContext("2d");
  g.fillStyle = palette.bg;
  g.fillRect(0, 0, 640, 500);
  g.strokeStyle = palette.steel;
  g.globalAlpha = 0.14;
  g.lineWidth = 2;
  for (let y = 40; y < 500; y += 40) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(640, y);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.strokeStyle = palette.accent;
  g.lineWidth = 3;
  g.strokeRect(16, 16, 608, 468);
  drawIcon(g, id, palette.accent, 320, 150, 170);
  g.fillStyle = palette.text;
  g.font = `700 48px ${MONO}`;
  g.textAlign = "center";
  g.fillText(title.toUpperCase(), 320, 330);
  g.fillStyle = palette.muted;
  g.font = `400 26px ${MONO}`;
  g.fillText(subtitle, 320, 378);
  g.fillStyle = palette.accent;
  g.font = `600 22px ${MONO}`;
  g.fillText("E · OPEN", 320, 446);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Shared by project cabinets and the About / Contact kiosks. */
export function createStation({ id, title, subtitle, label }, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette.accent);
  const body = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.55, metalness: 0.25 });
  const trim = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.45, roughness: 0.4 });
  const hits = [];
  function add(geo, material, pos, rot) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.userData.part = "station";
    hits.push(m);
    group.add(m);
    return m;
  }
  add(new THREE.CylinderGeometry(1.1, 1.15, 0.06, 48), body, [0, 0.03, 0.2]).castShadow = false;
  add(new THREE.TorusGeometry(1.08, 0.016, 6, 64), trim, [0, 0.07, 0.2], [Math.PI / 2, 0, 0]).castShadow = false;
  add(new THREE.BoxGeometry(1.3, 0.95, 0.95), body, [0, 0.55, 0]);
  add(new THREE.BoxGeometry(1.34, 0.04, 0.98), trim, [0, 1.04, 0]);
  add(new THREE.BoxGeometry(1.3, 0.1, 0.5), body, [0, 1.12, 0.3], [-0.25, 0, 0]);
  add(new THREE.BoxGeometry(1.3, 1.25, 0.7), body, [0, 1.72, -0.12]);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.86),
    new THREE.MeshBasicMaterial({ map: screenTexture({ id, title, subtitle }, palette), toneMapped: false }),
  );
  screen.position.set(0, 1.72, 0.245);
  screen.userData.part = "station";
  hits.push(screen);
  group.add(screen);
  for (const x of [-0.66, 0.66]) add(new THREE.BoxGeometry(0.03, 2.1, 0.03), trim, [x, 1.1, 0.47]);
  add(new THREE.BoxGeometry(1.4, 0.3, 0.8), body, [0, 2.5, -0.08]);
  const marquee = labelSprite(label, palette, { width: 300, scale: 1.3, accent: true });
  marquee.position.set(0, 2.5, 0.36);
  group.add(marquee);

  const prompt = labelSprite("E · OPEN", palette, { width: 200, scale: 0.95, accent: true });
  prompt.position.set(0, 3.15, 0.2);
  prompt.visible = false;
  group.add(prompt);

  let highlight = 0;
  return {
    group,
    hits,
    prompt,
    setHighlight(v) {
      highlight = v;
      trim.emissiveIntensity = 0.45 + v * 1.4;
      group.scale.setScalar(1 + v * 0.03);
    },
    get highlight() {
      return highlight;
    },
  };
}
