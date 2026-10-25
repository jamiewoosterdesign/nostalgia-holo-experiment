// DOM overlay: loader, tracking pill, calibration panel, exhibit label.
const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  parallax: 1.15, screenCm: 19.5, camFov: 62, smoothing: 1,
  reflect: true, bloom: true, dof: true, preview: false,
};
const STORE = 'holo-archive-settings-v3';

export class UI {
  constructor() {
    this.onToggleTracking = () => {};
    this.onSettings = () => {};
    this.previewCanvas = $('cam-preview');
    this.previewOn = false;

    $('btn-track').addEventListener('click', () => this.onToggleTracking());
    $('btn-settings').addEventListener('click', () => $('settings').classList.toggle('hidden'));

    let saved = {};
    try {
      const current = localStorage.getItem(STORE);
      saved = current ? JSON.parse(current) : { ...JSON.parse(localStorage.getItem('holo-archive-settings-v2') || localStorage.getItem('holo-archive-settings-v1') || '{}'), bloom: true };
    } catch {}
    this.settings = { ...DEFAULTS, ...saved };
    const ranges = ['parallax', 'screenCm', 'camFov', 'smoothing'];
    const checks = { reflect: 'q-reflect', bloom: 'q-bloom', dof: 'q-dof', preview: 'q-preview' };
    for (const id of ranges) {
      const el = $(id);
      el.value = this.settings[id];
      const out = document.querySelector(`output[data-for="${id}"]`);
      const sync = () => {
        this.settings[id] = parseFloat(el.value);
        out.textContent = el.value;
        this._emit();
      };
      el.addEventListener('input', sync);
      out.textContent = el.value;
    }
    for (const [k, id] of Object.entries(checks)) {
      const el = $(id);
      el.checked = !!this.settings[k];
      el.addEventListener('change', () => { this.settings[k] = el.checked; this._emit(); });
    }
    queueMicrotask(() => this._emit());
  }

  _emit() {
    try { localStorage.setItem(STORE, JSON.stringify(this.settings)); } catch {}
    this.onSettings({ ...this.settings });
  }

  progress(p, msg) {
    document.querySelector('.loader-bar span').style.width = `${Math.round(p * 100)}%`;
    if (msg) document.querySelector('.loader-msg').textContent = msg;
  }

  ready() { $('loader').classList.add('done'); }

  trackingStatus(state, label) {
    const b = $('btn-track');
    b.classList.remove('on', 'wait', 'lost');
    if (state) b.classList.add(state);
    b.querySelector('.pill-label').textContent = label;
  }

  showPreview(on) {
    this.previewOn = on;
    this.previewCanvas.classList.toggle('hidden', !on);
  }

  dimHint(dim) { $('hint').classList.toggle('dim', dim); }

  _fill(ex) {
    $('label-no').textContent = ex.info.no;
    $('label-title').textContent = ex.info.title;
    $('label-finish').textContent = ex.info.finish;
    $('label-desc').textContent = ex.info.desc;
  }

  peekLabel(ex) {
    this._fill(ex);
    $('label-actions').innerHTML = '';
    $('label-desc').style.display = 'none';
    $('label').classList.remove('hidden');
  }

  showLabel(ex, onAction) {
    this._fill(ex);
    $('label-desc').style.display = '';
    const box = $('label-actions');
    box.innerHTML = '';
    const actions = [...ex.info.actions, { id: 'back', label: 'Return', key: 'Esc' }];
    for (const a of actions) {
      const b = document.createElement('button');
      b.setAttribute('aria-label', a.label);
      if (a.primary) b.className = 'primary';
      const keyLabel = { ArrowLeft: '←', ArrowRight: '→' }[a.key] || a.key;
      b.innerHTML = `${a.label}${a.key ? ` <kbd>${keyLabel}</kbd>` : ''}`;
      b.addEventListener('click', () => onAction(a.id));
      box.appendChild(b);
    }
    const tip = document.createElement('p');
    tip.className = 'label-tip';
    tip.textContent = 'Drag to tilt · double-click to flip · the light follows your cursor';
    box.appendChild(tip);
    $('label').classList.remove('hidden');
  }

  hideLabel() { $('label').classList.add('hidden'); }
}
