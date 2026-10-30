import * as THREE from "../../vendor/three.module.min.js";

function gridTexture(palette) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = palette["bg-2"];
  g.fillRect(0, 0, size, size);
  g.strokeStyle = palette.steel;
  g.globalAlpha = 0.3;
  g.lineWidth = 2;
  const step = size / 16;
  for (let i = 0; i <= size; i += step) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, size);
    g.moveTo(0, i);
    g.lineTo(size, i);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A restrained floating platform: graphite slab, fine grid, one accent rim. */
export function createIsland(palette, { lowPower }) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette.accent);
  const rock = new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.9, flatShading: true });
  const rock2 = new THREE.MeshStandardMaterial({ color: 0x12161e, roughness: 0.95, flatShading: true });
  const side = new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 0.8 });

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.85, 0.5, 72), [
    side,
    new THREE.MeshStandardMaterial({ map: gridTexture(palette), roughness: 0.7 }),
    side,
  ]);
  deck.position.y = -0.25;
  deck.receiveShadow = true;
  group.add(deck);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(6.98, 0.035, 6, 120),
    new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.01;
  group.add(rim);

  const under1 = new THREE.Mesh(new THREE.CylinderGeometry(6.85, 4.4, 1.3, 9), rock);
  under1.position.y = -1.15;
  const under2 = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 2.0, 1.9, 7), rock2);
  under2.position.y = -2.75;
  const under3 = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.0, 6), rock);
  under3.position.y = -4.7;
  under3.rotation.x = Math.PI;
  group.add(under1, under2, under3);

  // Quiet hub: one fine ring marks the plaza in front of the avatar.
  const hub = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.012, 6, 80),
    new THREE.MeshBasicMaterial({ color: palette.steel, transparent: true, opacity: 0.55, toneMapped: false }),
  );
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 0.012;
  group.add(hub);

  // A few dark low-poly pines frame the edge; no colour, just silhouette.
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x232b38, roughness: 0.8, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x151a22 });
  const trees = [];
  for (const [x, z, s] of [[-6.0, -1.2, 1.1], [6.1, -1.0, 1.0], [-5.4, 3.6, 0.85], [5.4, 3.8, 0.9], [-2.6, 5.7, 0.75], [2.8, 5.8, 0.8]]) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), trunkMat);
    trunk.position.y = 0.25;
    t.add(trunk);
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6 - k * 0.15, 0.85, 7), pineMat);
      cone.position.y = 0.9 + k * 0.5;
      cone.castShadow = !lowPower;
      t.add(cone);
    }
    group.add(t);
    trees.push(t);
  }

  // Sparse stars: just enough to read as night.
  const starCount = lowPower ? 120 : 220;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 32 + Math.random() * 40;
    const a = Math.random() * Math.PI * 2;
    starPos[i * 3] = Math.cos(a) * r;
    starPos[i * 3 + 1] = (Math.random() - 0.3) * 38;
    starPos[i * 3 + 2] = -Math.abs(Math.sin(a)) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  group.add(
    new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8e6, size: 0.18, transparent: true, opacity: 0.6, fog: false })),
  );

  return {
    group,
    update(time, reduced) {
      if (reduced) return;
      trees.forEach((t, i) => (t.rotation.y = Math.sin(time * 0.5 + i) * 0.03));
    },
  };
}
