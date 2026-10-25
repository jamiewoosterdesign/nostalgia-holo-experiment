// Webcam head tracking with MediaPipe Face Landmarker.
// Produces the viewer's eye midpoint in centimetres relative to the webcam:
//   x: + to the viewer's right, y: + up, z: distance from the camera plane.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const IPD_CM = 6.3; // average adult inter-pupillary distance
const L_IRIS = 468;
const R_IRIS = 473;

export class HeadTracker {
  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.landmarker = null;
    this.running = false;
    this.hfovDeg = 62;
    this.lastVideoTime = -1;
    this.faces = [];          // all detected faces this frame (cm)
    this.locked = null;       // currently locked face (cm) or null
    this.lockedRaw = null;    // landmarks of locked face (for preview)
    this.lastSeen = 0;
    this.onStatus = () => {};
  }

  async start() {
    this.onStatus('wait', 'Starting camera…');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();

    this.onStatus('wait', 'Loading face model…');
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numFaces: 3,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    try {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, opts('GPU'));
    } catch (e) {
      console.warn('GPU delegate failed, falling back to CPU', e);
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, opts('CPU'));
    }
    this.running = true;
    this.onStatus('lost', 'Looking for you…');
  }

  stop() {
    this.running = false;
    const s = this.video.srcObject;
    if (s) s.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    this.locked = null;
  }

  // Convert one face's landmarks into a head position in cm.
  _toCm(lm) {
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const a = lm[L_IRIS] ?? lm[33];
    const b = lm[R_IRIS] ?? lm[263];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const ipdPx = Math.hypot((a.x - b.x) * vw, (a.y - b.y) * vh);
    const tanH = Math.tan((this.hfovDeg * Math.PI) / 360);
    const tanV = tanH * (vh / vw);
    const ipdFrac = ipdPx / vw;
    const z = IPD_CM / (2 * tanH * Math.max(ipdFrac, 1e-4));
    // Image x grows to the viewer's left (camera is not mirrored), so flip.
    const x = -(mx - 0.5) * 2 * z * tanH;
    const y = -(my - 0.5) * 2 * z * tanV;
    return { x, y, z, size: ipdFrac };
  }

  update(nowMs) {
    if (!this.running || !this.landmarker) return;
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    let res;
    try {
      res = this.landmarker.detectForVideo(v, nowMs);
    } catch (e) {
      return;
    }
    const lms = res.faceLandmarks || [];
    this.faces = lms.map((lm) => ({ ...this._toCm(lm), lm }));

    if (!this.faces.length) {
      if (this.locked && nowMs - this.lastSeen > 700) {
        this.locked = null;
        this.lockedRaw = null;
        this.onStatus('lost', 'No viewer — mouse mode');
      }
      return;
    }

    // Keep following the same person: nearest face to the previous lock.
    let pick;
    if (this.locked) {
      pick = this.faces.reduce((best, f) => {
        const d = Math.hypot(f.x - this.locked.x, f.y - this.locked.y, (f.z - this.locked.z) * 0.5);
        return !best || d < best.d ? { f, d } : best;
      }, null);
      // If the nearest is implausibly far (lock jumped), fall back to the largest face.
      if (pick.d > 25) pick = null;
    }
    const chosen = pick ? pick.f : this.faces.reduce((a, b) => (b.size > a.size ? b : a));
    const wasLocked = !!this.locked;
    this.locked = chosen;
    this.lockedRaw = chosen.lm;
    this.lastSeen = nowMs;
    if (!wasLocked) {
      this.onStatus('on', this.faces.length > 1 ? `Tracking (${this.faces.length} faces, locked to one)` : 'Head tracking on');
    }
  }

  drawPreview(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    if (this.video.readyState >= 2) ctx.drawImage(this.video, 0, 0, w, h);
    for (const f of this.faces) {
      const isLock = f.lm === this.lockedRaw;
      ctx.fillStyle = isLock ? '#18c7a0' : '#ff6a2b';
      for (const i of [L_IRIS, R_IRIS, 1, 152, 10]) {
        const p = f.lm[i];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, isLock ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
