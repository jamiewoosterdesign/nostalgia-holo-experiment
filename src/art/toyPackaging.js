// A print-ready, early-1990s TNG-inspired cardback for the existing cruiser.
// This is an original packaging mock-up, not a scan of an original retail box.
// The RGB finish map foils the titles only; the space art is ordinary matte ink.
import { makeCanvas, ctxOf, rr, rng } from './canvasKit.js';

export const TOY_PRINT = { W: 1024, H: 1460, scale: 2 };
const FONT = 'Arial, Helvetica, sans-serif';
const COND = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
const C = { ink: '#090d16', navy: '#101b2c', gold: '#c6a35e', pale: '#e7ddc4', red: '#963c3c', blue: '#758fae' };

function surface() {
  const { W, H, scale } = TOY_PRINT;
  const map = makeCanvas(W * scale, H * scale);
  const mask = makeCanvas(W * scale, H * scale);
  const a = ctxOf(map), m = ctxOf(mask);
  a.scale(scale, scale); m.scale(scale, scale);
  a.fillStyle = C.ink; a.fillRect(0, 0, W, H);
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  return { map, mask, a, m };
}

function type(ctx, value, x, y, size, color = C.pale, weight = 600, align = 'left', maxWidth) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  if (maxWidth) ctx.fillText(value, x, y, maxWidth);
  else ctx.fillText(value, x, y);
}

function bar(ctx, x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color;
  if (radius) { rr(ctx, x, y, w, h, radius); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
}

function delta(ctx, x, y, scale, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.moveTo(0, -53);
  ctx.bezierCurveTo(27, -22, 42, 12, 45, 52);
  ctx.lineTo(6, 23); ctx.lineTo(-41, 52);
  ctx.bezierCurveTo(-32, 7, -18, -29, 0, -53);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(6, 3); ctx.lineTo(23, 8);
  ctx.lineTo(5, 14); ctx.lineTo(0, 35); ctx.lineTo(-5, 14); ctx.lineTo(-23, 8);
  ctx.lineTo(-6, 3); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}

function brand(ctx, y = 153, mask = null) {
  // Condensed silver title gives the live diffraction shader a bright substrate.
  ctx.save(); ctx.translate(510, y); ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.font = `900 105px ${COND}`; ctx.textAlign = 'center';
  const silver = ctx.createLinearGradient(0, -90, 0, 5);
  silver.addColorStop(0, '#f4eedb'); silver.addColorStop(0.42, '#c6d2dc');
  silver.addColorStop(0.52, '#a1aab9'); silver.addColorStop(1, '#e9e0c6');
  ctx.fillStyle = silver;
  ctx.fillText('STAR TREK', 0, 0, 792);
  ctx.restore();
  if (mask) {
    mask.save(); mask.translate(510, y); mask.transform(1, 0, -0.18, 1, 0, 0);
    mask.font = `900 105px ${COND}`; mask.textAlign = 'center';
    mask.fillStyle = 'rgb(255,0,45)'; mask.fillText('STAR TREK', 0, 0, 792);
    mask.restore();
  }
  type(ctx, 'THE NEXT GENERATION', 512, y + 49, 30, C.pale, 500, 'center');
  bar(ctx, 86, y + 72, 852, 3, C.gold);
}

function paperGrain(ctx) {
  const random = rng(1701);
  for (let i = 0; i < 4200; i++) {
    const v = random();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(random() * 1024, random() * 1460, 1, 1);
  }
}

function circuit(ctx, y) {
  bar(ctx, 54, y, 154, 16, C.gold, 8);
  bar(ctx, 216, y, 430, 16, C.gold);
  bar(ctx, 654, y, 108, 16, C.red);
  bar(ctx, 770, y, 200, 16, C.blue, 8);
}

function spaceBackdrop(ctx) {
  ctx.save(); rr(ctx, 90, 300, 844, 760, 40); ctx.clip();
  const space = ctx.createLinearGradient(90, 300, 934, 1060);
  space.addColorStop(0, '#101223'); space.addColorStop(0.5, '#101c31'); space.addColorStop(1, '#020811');
  ctx.fillStyle = space; ctx.fillRect(90, 300, 844, 760);

  // Soft printed nebula behind the toy, deliberately separate from foil masks.
  const mist = [[340, 490, 300, 'rgba(105,90,150,0.25)'], [590, 590, 350, 'rgba(55,101,142,0.24)'], [220, 780, 210, 'rgba(97,81,125,0.18)']];
  for (const [x,y,r,color] of mist) {
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(90,300,844,760);
  }
  const random = rng(2363);
  for (let i = 0; i < 220; i++) {
    const x = 107 + random()*810, y = 318 + random()*718;
    const size = 0.45 + Math.pow(random(),4)*1.8;
    ctx.fillStyle = `rgba(219,232,245,${0.25+random()*0.65})`;
    ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
    if (size > 1.8) {
      ctx.fillStyle = 'rgba(191,214,244,0.25)';
      ctx.fillRect(x-size*4,y-0.5,size*8,1); ctx.fillRect(x-0.5,y-size*4,1,size*8);
    }
  }

  // A blue planetary limb anchors the composition without obscuring the ship.
  const px = 895, py = 1106, radius = 352;
  const halo = ctx.createRadialGradient(px,py,radius-1,px,py,radius+21);
  halo.addColorStop(0,'rgba(121,180,220,0.55)'); halo.addColorStop(0.2,'rgba(101,162,205,0.4)'); halo.addColorStop(1,'rgba(58,115,183,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px,py,radius+21,0,Math.PI*2); ctx.fill();
  const planet = ctx.createRadialGradient(738,806,0,px,py,radius*1.12);
  planet.addColorStop(0,'#5a8199'); planet.addColorStop(0.25,'#2d5771'); planet.addColorStop(0.63,'#112a43'); planet.addColorStop(1,'#020b16');
  ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(px,py,radius,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(px,py,radius-2,0,Math.PI*2); ctx.clip();
  for (let i=0;i<28;i++) {
    const y = 774+i*12;
    ctx.strokeStyle = `rgba(149,177,190,${0.035+random()*0.045})`; ctx.lineWidth = 3+random()*5;
    ctx.beginPath(); ctx.moveTo(520,y);
    ctx.bezierCurveTo(670,y-38-random()*25,810,y+25,1000,y-8); ctx.stroke();
  }
  ctx.restore();

  // Fine star-chart overprint and LCARS corner details retain a period feel.
  ctx.strokeStyle = 'rgba(132,165,187,0.11)'; ctx.lineWidth = 1;
  for (let x = 90; x <= 934; x += 48) { ctx.beginPath(); ctx.moveTo(x,300); ctx.lineTo(x,1060); ctx.stroke(); }
  for (let y = 300; y <= 1060; y += 48) { ctx.beginPath(); ctx.moveTo(90,y); ctx.lineTo(934,y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(171,188,204,0.17)';
  for(const r of [140,221,302]) { ctx.beginPath(); ctx.arc(275,500,r,-1.4,1.25); ctx.stroke(); }
  ctx.setLineDash([4,8]); ctx.beginPath(); ctx.moveTo(153,838); ctx.lineTo(382,663); ctx.lineTo(650,521); ctx.lineTo(864,373); ctx.stroke(); ctx.setLineDash([]);
  [[153,838],[382,663],[650,521],[864,373]].forEach(([x,y])=>{
    ctx.strokeStyle='rgba(184,204,224,0.36)';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();
  });
  bar(ctx,116,325,97,8,C.gold,4); bar(ctx,220,325,51,8,C.red,4);
  type(ctx,'SECTOR 001',116,353,12,'#acbbc9',600);
  type(ctx,'STELLAR CARTOGRAPHY',900,353,11,'#9caec0',600,'right');
  bar(ctx,116,973,7,35,C.gold,3); bar(ctx,129,973,7,35,C.red,3); bar(ctx,142,973,7,35,C.blue,3);
  type(ctx,'THE FINAL FRONTIER',167,992,15,'#bcc9d5',600);
  ctx.restore();
}

export function toyBacker() {
  const s = surface(); const { a, m } = s;
  // Hang-tab, holographic titles, and ordinary printed secondary branding.
  type(a, 'COLLECTOR SERIES', 72, 54, 17, C.gold, 700);
  type(a, 'AGES 8+', 952, 54, 17, C.pale, 600, 'right');
  brand(a, 169, m);
  type(a, 'STARFLEET • GALAXY CLASS', 512, 284, 19, C.blue, 600, 'center');

  // This opening matches the existing PET shell exactly. Nothing printed here
  // is foiled: the visible highlights must come from the actual clear bubble.
  spaceBackdrop(a);
  a.strokeStyle = '#485166'; a.lineWidth = 1.5; rr(a, 90, 300, 844, 760, 40); a.stroke();
  type(a, 'NCC • 1701 • D', 122, 1031, 16, '#8396aa', 500);
  type(a, 'EXPLORATION / SCIENCE / DIPLOMACY', 904, 1031, 13, '#8396aa', 500, 'right');

  circuit(a, 1088);
  // Match the masthead's genuine view-dependent diffraction on the name.
  const name = 'U.S.S. ENTERPRISE';
  type(a, name, 74, 1171, 63, '#e0e2db', 800, 'left', 804);
  type(m, name, 74, 1171, 63, 'rgb(255,0,45)', 800, 'left', 804);
  type(a, 'NCC-1701-D', 77, 1216, 31, C.pale, 500);
  delta(a, 920, 1190, 0.67, C.gold);
  type(a, 'DIE-CAST STARSHIP', 76, 1276, 21, C.gold, 700);
  type(a, 'Detailed hull • display stand • collector edition', 76, 1315, 19, '#b6bfca', 400);
  bar(a, 72, 1344, 880, 1, '#394454');
  type(a, 'STARFLEET COLLECTION', 76, 1382, 17, '#b6bfca', 700);
  type(a, '01 / ENTERPRISE-D', 948, 1382, 16, C.gold, 600, 'right');
  type(a, 'A PERSONAL NOSTALGIA PACKAGING STUDY', 76, 1420, 11, '#697482', 500);
  paperGrain(a);
  return { map: s.map, mask: s.mask };
}

function technicalShip(ctx) {
  ctx.save(); ctx.translate(512, 590); ctx.strokeStyle = '#aebdc9'; ctx.lineWidth = 2.2;
  const oval = (x,y,rx,ry) => { ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.stroke(); };
  oval(0,-70,240,122); oval(0,-70,218,108); oval(0,-70,150,75); oval(0,-70,38,20);
  ctx.beginPath(); ctx.moveTo(-43,35); ctx.lineTo(-29,142); ctx.lineTo(29,142); ctx.lineTo(43,35); ctx.stroke();
  oval(0,157,48,100);
  for(const sign of [-1,1]) {
    rr(ctx,sign*160-24,82,48,223,20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sign*35,145); ctx.lineTo(sign*138,220); ctx.moveTo(sign*37,163); ctx.lineTo(sign*138,245); ctx.stroke();
  }
  ctx.setLineDash([8,8]); ctx.strokeStyle = '#4c647b';
  ctx.beginPath(); ctx.moveTo(-300,-70); ctx.lineTo(300,-70); ctx.moveTo(0,-220); ctx.lineTo(0,335); ctx.stroke();
  ctx.restore();
}

export function toyBack() {
  const s = surface(); const { a } = s;
  brand(a, 150);
  circuit(a, 250);
  type(a, 'STARSHIP PROFILE', 74, 324, 23, C.gold, 700);
  type(a, 'U.S.S. ENTERPRISE', 74, 389, 57, C.pale, 800);
  type(a, 'NCC-1701-D  /  GALAXY CLASS', 77, 432, 24, C.blue, 500);
  technicalShip(a);
  type(a, 'DORSAL VIEW', 512, 950, 17, C.blue, 600, 'center');
  circuit(a, 995);
  const lines = [
    ['COMMAND', 'Captain Jean-Luc Picard'],
    ['MISSION', 'Deep-space exploration'],
    ['FEATURES', 'Saucer / engineering hull / warp nacelles'],
  ];
  lines.forEach(([key,value],i) => {
    const y = 1060 + i * 57;
    bar(a,72,y-28,200,38,i===0?C.gold:C.blue,17);
    type(a,key,92,y,17,C.ink,800);
    type(a,value,300,y,21,C.pale,500,'left',650);
  });
  type(a, 'THE NEXT GENERATION OF EXPLORATION', 74, 1285, 24, C.gold, 700);
  type(a, 'Keep the ship on its stand when displayed outside the blister.', 74, 1328, 20, '#b6bfca', 400);
  bar(a,72,1364,880,1,'#394454');
  type(a, 'Original TNG-inspired packaging mock-up for HOLO/ARCHIVE.', 74, 1402, 15, '#8c99a8', 400);
  type(a, 'Star Trek names and insignia belong to their respective rights holders.', 74, 1430, 13, '#697482', 400);
  paperGrain(a);
  return { map: s.map, mask: s.mask };
}
