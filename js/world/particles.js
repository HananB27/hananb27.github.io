import * as THREE from "../../vendor/three.module.min.js";

/** Pooled confetti / sparkle emitter drawn as one InstancedMesh. */
export class Particles {
  constructor(parent, max = 260) {
    this.max = max;
    this.cursor = 0;
    const geometry = new THREE.TetrahedronGeometry(0.1);
    const material = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geometry, material, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(max * 3),
      3,
    );
    this.pool = Array.from({ length: max }, () => ({
      life: 0,
      maxLife: 1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      gravity: 0,
      size: 1,
    }));
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    parent.add(this.mesh);
  }

  /** Emit `count` particles from `origin`; `colors` are hex numbers or CSS colours. */
  emit(origin, colors, count = 20, opts = {}) {
    const {
      speed = 3,
      gravity = 7,
      life = 1,
      size = 1,
      up = 2,
      spread = 1,
    } = opts;
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      const slot = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      p.life = p.maxLife = life * (0.6 + Math.random() * 0.6);
      p.pos.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65) * spread;
      p.vel.set(Math.cos(a) * s, up * (0.4 + Math.random()), Math.sin(a) * s);
      p.spin.set(Math.random() * 9, Math.random() * 9, Math.random() * 9);
      p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.gravity = gravity;
      p.size = size * (0.6 + Math.random() * 0.9);
      this.color.set(colors[i % colors.length]);
      this.mesh.setColorAt(slot, this.color);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    let active = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (p.life <= 0) continue;
      active = true;
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot.addScaledVector(p.spin, dt);
      const fade = Math.max(0, Math.min(1, p.life / p.maxLife));
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      this.dummy.scale.setScalar(p.size * (p.life > 0 ? Math.sqrt(fade) : 0));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (active) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
