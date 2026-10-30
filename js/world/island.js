import * as THREE from "../../vendor/three.module.min.js";
import { glowSprite } from "./props.js";

function gridTexture(palette) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size / 2);
  grad.addColorStop(0, palette["bg-3"]);
  grad.addColorStop(1, palette["bg-2"]);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = palette.violet;
  g.globalAlpha = 0.5;
  g.lineWidth = 3;
  const step = size / 18;
  for (let i = 0; i <= size; i += step) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, size);
    g.moveTo(0, i);
    g.lineTo(size, i);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = palette.cyan;
  for (let x = step; x < size; x += step * 3)
    for (let y = step; y < size; y += step * 3) {
      g.beginPath();
      g.arc(x, y, 3, 0, 7);
      g.fill();
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** The floating neon island, sky decor and ambient motion. */
export function createIsland(palette, { lowPower }) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette.violet);

  const rock = new THREE.MeshStandardMaterial({ color: 0x251d57, roughness: 0.9, flatShading: true });
  const rock2 = new THREE.MeshStandardMaterial({ color: 0x1a1442, roughness: 0.95, flatShading: true });

  // Top deck with a glowing grid.
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 6.8, 0.5, 64),
    [
      new THREE.MeshStandardMaterial({ color: 0x1a1442, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: gridTexture(palette), roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1442, roughness: 0.8 }),
    ],
  );
  deck.position.y = -0.25;
  deck.receiveShadow = true;
  group.add(deck);

  // Rim glow follows the accent of the section in view.
  const rimMat = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.95, 0.07, 8, 96), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.02;
  group.add(rim);
  const rimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(6.95, 0.28, 8, 96),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  rimGlow.rotation.x = Math.PI / 2;
  rimGlow.position.y = -0.02;
  group.add(rimGlow);

  // Rocky underside.
  const under1 = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 4.6, 1.3, 9, 1), rock);
  under1.position.y = -1.15;
  const under2 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 2.2, 1.9, 7, 1), rock2);
  under2.position.y = -2.75;
  const under3 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 6), rock);
  under3.position.y = -4.8;
  under3.rotation.x = Math.PI;
  group.add(under1, under2, under3);
  for (const [x, z, y, r] of [[-3, 1, -4.5, 0.55], [2.5, -1.4, -5.5, 0.4], [0.5, 2.6, -6.2, 0.3]]) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(r), rock2);
    shard.position.set(x, y, z);
    group.add(shard);
  }

  // Neon paths: a ring around the avatar and spokes to each cabinet.
  const pathMat = (color) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false });
  const hub = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.025, 6, 64), pathMat(palette.cyan));
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 0.012;
  group.add(hub);
  const hub2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.015, 6, 64), pathMat(palette.violet));
  hub2.rotation.x = Math.PI / 2;
  hub2.position.y = 0.012;
  group.add(hub2);

  // Trees: stacked glowing cones, a nod to synthwave pines.
  const treeColors = [palette.magenta, palette.violet, palette.cyan, palette.lime, palette.amber];
  const trees = [];
  const treeSpots = [
    [-5.6, 0.8, 1.15], [-4.9, 3.2, 0.9], [5.5, 1.2, 1.1], [4.7, 3.6, 0.85],
    [-3.2, 5.2, 0.75], [2.4, 5.4, 0.95], [-6.0, -1.4, 0.8], [6.0, -1.6, 0.9],
  ];
  treeSpots.forEach(([x, z, s], i) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    const color = new THREE.Color(treeColors[i % treeColors.length]);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2a5c }),
    );
    trunk.position.y = 0.3;
    t.add(trunk);
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.62 - k * 0.15, 0.85, 7),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.35,
          roughness: 0.5,
          flatShading: true,
        }),
      );
      cone.position.y = 0.95 + k * 0.5;
      cone.castShadow = !lowPower;
      t.add(cone);
    }
    group.add(t);
    trees.push(t);
  });

  // Lamp posts with soft halos.
  const lamps = [[-2.4, 3.3], [2.4, 3.3], [-3.6, -0.6], [3.6, -0.6]];
  lamps.forEach(([x, z], i) => {
    const color = [palette.cyan, palette.magenta][i % 2];
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2a5c }),
    );
    post.position.set(x, 0.6, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    );
    bulb.position.set(x, 1.28, z);
    const halo = glowSprite(color, 1.6, 0.6);
    halo.position.copy(bulb.position);
    group.add(post, bulb, halo);
  });

  // Scattered pebbles near the edge (one InstancedMesh).
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rock, 24);
  const pebbleDummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const a = i * 2.399;
    const r = 6.05 + (i % 3) * 0.25;
    pebbleDummy.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    pebbleDummy.scale.set(0.16 + (i % 4) * 0.05, 0.1, 0.16 + (i % 3) * 0.05);
    pebbleDummy.updateMatrix();
    pebbles.setMatrixAt(i, pebbleDummy.matrix);
  }
  group.add(pebbles);

  // Sky: stars and slowly tumbling wireframe shapes.
  const starCount = lowPower ? 220 : 480;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 30 + Math.random() * 40;
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.35) * 40;
    starPos[i * 3] = Math.cos(a) * r;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.85, sizeAttenuation: true }),
  );
  group.add(stars);

  const floaters = [];
  const shapes = [
    new THREE.IcosahedronGeometry(0.7, 0),
    new THREE.TorusGeometry(0.55, 0.14, 8, 20),
    new THREE.OctahedronGeometry(0.65),
    new THREE.TetrahedronGeometry(0.7),
    new THREE.TorusKnotGeometry(0.4, 0.12, 40, 6),
  ];
  const floaterColors = [palette.cyan, palette.magenta, palette.lime, palette.amber, palette.violet];
  for (let i = 0; i < (lowPower ? 9 : 14); i++) {
    const angle = (i / 14) * Math.PI * 2 + 0.3;
    const radius = 11 + (i % 4) * 2.2;
    const m = new THREE.Mesh(
      shapes[i % shapes.length],
      new THREE.MeshStandardMaterial({
        color: floaterColors[i % 5],
        emissive: floaterColors[i % 5],
        emissiveIntensity: 0.45,
        roughness: 0.4,
        flatShading: true,
        wireframe: i % 3 === 0,
      }),
    );
    // Keep decor beside and behind the island so it never drifts in front of the camera.
    m.position.set(Math.cos(angle) * radius, -2 + ((i * 1.7) % 9), -Math.abs(Math.sin(angle)) * radius - 1);
    m.userData = { baseY: m.position.y, speed: 0.4 + (i % 5) * 0.12, phase: i };
    group.add(m);
    floaters.push(m);
  }

  const tmp = new THREE.Color();
  return {
    group,
    setAccent(color) {
      accent.copy(color);
      rimMat.color.copy(color);
      rimGlow.material.color.copy(color);
      hub.material.color.copy(tmp.copy(color).lerp(new THREE.Color(palette.cyan), 0.5));
    },
    update(time, reduced) {
      if (reduced) return;
      floaters.forEach((m) => {
        const d = m.userData;
        m.rotation.x = time * d.speed;
        m.rotation.y = time * d.speed * 0.8;
        m.position.y = d.baseY + Math.sin(time * d.speed + d.phase) * 0.6;
      });
      stars.rotation.y = time * 0.006;
      trees.forEach((t, i) => (t.rotation.y = Math.sin(time * 0.6 + i) * 0.04));
    },
  };
}
