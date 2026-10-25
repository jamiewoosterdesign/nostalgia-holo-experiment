import * as THREE from 'three';

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const ease = (t) => t * t * (3 - 2 * t);

// Base exhibit: handles idle float, hover lift, travel to the inspection
// position, drag-tilt and flip. Specific exhibits add content to `pivot`.
export class Exhibit {
  constructor(info) {
    this.info = info; // { id, no, title, finish, desc, actions: [{id,label,key}] }
    this.root = new THREE.Group();
    this.float = new THREE.Group();
    this.pivot = new THREE.Group();
    this.root.add(this.float);
    this.float.add(this.pivot);
    this.hit = [];
    this.rest = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1 };
    this.inspect = { pos: new THREE.Vector3(0, 0, 0.02), quat: new THREE.Quaternion(), scale: 2 };
    this.k = 0;          // 0 = at rest, 1 = inspected
    this.kTarget = 0;
    this.hover = 0;
    this.hoverTarget = 0;
    this.tilt = new THREE.Vector2();
    this.tiltTarget = new THREE.Vector2();
    this.flipped = false;
    this.flipAngle = 0;
    this.seed = Math.random() * 10;
    this.floatAmp = 0.008;
    this.swayAmp = 0.06;
    this.dragging = false;
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
  }

  setRest(pos, rotY = 0, scale = 1, rotX = 0) {
    this.rest.pos.copy(pos);
    this.rest.quat.setFromEuler(new THREE.Euler(rotX, rotY, 0));
    this.rest.scale = scale;
    this.root.position.copy(pos);
    this.root.quaternion.copy(this.rest.quat);
    this.root.scale.setScalar(scale);
  }

  addHit(mesh) { mesh.userData.exhibit = this; this.hit.push(mesh); }

  get isInspected() { return this.kTarget === 1; }

  select() { this.kTarget = 1; }
  deselect() {
    this.kTarget = 0;
    this.tiltTarget.set(0, 0);
    if (this.flipped) this.flip();
    this.onDeselect?.();
  }
  flip() { this.flipped = !this.flipped; }

  drag(dx, dy) {
    this.tiltTarget.x = THREE.MathUtils.clamp(this.tiltTarget.x + dy * 2.2, -1.2, 1.2);
    this.tiltTarget.y = THREE.MathUtils.clamp(this.tiltTarget.y + dx * 3.0, -1.4, 1.4);
  }

  action(id) {
    if (id === 'flip') this.flip();
  }

  update(dt, t) {
    this.k = damp(this.k, this.kTarget, 5.5, dt);
    this.hover = damp(this.hover, this.hoverTarget, 10, dt);
    const e = ease(THREE.MathUtils.clamp(this.k, 0, 1));

    // Travel
    this.root.position.lerpVectors(this.rest.pos, this.inspect.pos, e);
    // arc toward the viewer a little so it doesn't clip through neighbours
    this.root.position.z += Math.sin(e * Math.PI) * 0.12;
    this.root.quaternion.slerpQuaternions(this.rest.quat, this.inspect.quat, e);
    this.root.scale.setScalar(THREE.MathUtils.lerp(this.rest.scale, this.inspect.scale, e));

    // Idle float + sway (fades out while inspecting)
    const idle = 1 - e;
    const s = this.seed;
    this.float.position.y = (Math.sin(t * 0.9 + s) * this.floatAmp + this.hover * 0.018) * idle;
    this.float.rotation.y = Math.sin(t * 0.45 + s * 2) * this.swayAmp * idle;
    this.float.rotation.z = Math.sin(t * 0.6 + s * 3) * this.swayAmp * 0.25 * idle;

    // Drag tilt (eases back to centre when released)
    if (!this.dragging) this.tiltTarget.multiplyScalar(Math.exp(-dt * 0.8));
    this.tilt.x = damp(this.tilt.x, this.tiltTarget.x, 8, dt);
    this.tilt.y = damp(this.tilt.y, this.tiltTarget.y, 8, dt);
    this.flipAngle = damp(this.flipAngle, this.flipped ? Math.PI : 0, 6, dt);
    this.pivot.rotation.set(this.tilt.x, this.tilt.y + this.flipAngle, 0);
  }
}
