import * as THREE from 'three';

// A camera whose image plane is the physical screen: a fixed window at z = 0,
// `height` tall and `height * aspect` wide. Moving the eye skews the frustum
// (asymmetric / off-axis projection) instead of rotating the camera, which is
// what makes the screen read as a window rather than a turntable.
export class OffAxisCamera extends THREE.PerspectiveCamera {
  constructor() {
    super(45, 1, 0.02, 30);
    this.screenHeight = 1;
    this.eye = new THREE.Vector3(0, 0, 2.8);
  }

  setEye(x, y, z) {
    this.eye.set(x, y, z);
    this.position.copy(this.eye);
    this.quaternion.identity();
    this.updateMatrixWorld(true);
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix() {
    if (!this.eye) { super.updateProjectionMatrix(); return; }
    const H = this.screenHeight;
    const W = H * this.aspect;
    const e = this.eye;
    const n = this.near;
    const s = n / e.z;
    const left = (-W / 2 - e.x) * s;
    const right = (W / 2 - e.x) * s;
    const top = (H / 2 - e.y) * s;
    const bottom = (-H / 2 - e.y) * s;
    this.projectionMatrix.makePerspective(left, right, top, bottom, n, this.far);
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
    // Keep fov roughly meaningful for helpers that read it.
    this.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / e.z));
  }
}
