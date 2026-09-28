// engine.js — DE PROFUNDIS: raycaster primera persona, revenants, puertas, flujo del juego
// FLOOR/WALL/GLOW/CHAPTERS/genMaze/bfs/lineOfSight llegan como globals desde map.js
'use strict';

// ---------- DOM ----------
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'), chapterTag: $('chapterTag'), prompt: $('prompt'), msg: $('msg'),
  title: $('titleScreen'), card: $('card'), death: $('deathScreen'),
  victory: $('victoryScreen'), pause: $('pauseScreen'), flash: $('flash'), stats: $('stats'),
  cardNum: document.querySelector('#card .chapterNum'), cardName: document.querySelector('#card .chapterName'),
  cardEpi: document.querySelector('#card .epigraph'),
};

// ---------- texturas procedurales ----------
function tex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex32(c) {
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height);
  return { w: c.width, h: c.height, px: new Uint32Array(d.data.buffer) };
}
function darken(c, amt) {
  const d = tex(c.width, c.height), g = d.getContext('2d');
  g.drawImage(c, 0, 0);
  g.fillStyle = `rgba(0,0,0,${amt})`;
  g.fillRect(0, 0, c.width, c.height);
  return d;
}
const R = n => Math.random() * n;

function makeStone(base, mortar, wear) {
  const c = tex(128, 128), g = c.getContext('2d');
  g.fillStyle = mortar; g.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 4; r++) {
    const off = (r % 2) * 26 - 13;
    for (let x = off; x < 128; x += 52 + (R(12) | 0)) {
      const w = 40 + (R(16) | 0);
      const v = base + (R(wear) | 0);
      g.fillStyle = `rgb(${v},${v - 5},${v - 11})`;
      g.fillRect(x + 1, r * 32 + 1, w, 30);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, r * 32 + 25, w, 6);
      g.fillStyle = 'rgba(255,246,220,0.07)'; g.fillRect(x + 1, r * 32 + 1, w, 3);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = `rgba(0,0,0,${0.06 + R(0.12)})`;
        g.fillRect(x + 1 + (R(Math.max(1, w - 6)) | 0), r * 32 + 4 + (R(20) | 0), 3 + (R(6) | 0), 2 + (R(4) | 0));
      }
    }
  }
  const damp = g.createLinearGradient(0, 84, 0, 128);
  damp.addColorStop(0, 'rgba(10,8,6,0)'); damp.addColorStop(1, 'rgba(10,8,6,0.5)');
  g.fillStyle = damp; g.fillRect(0, 84, 128, 44);
  for (let i = 0; i < 90; i++) { // musgo en las juntas
    g.fillStyle = `rgba(62,66,44,${0.2 + R(0.3)})`;
    g.fillRect(R(128) | 0, (R(4) | 0) * 32 + (Math.random() < 0.5 ? 0 : 29), 2, 2);
  }
  for (let i = 0; i < 2600; i++) {
    const v = R(0.16);
    g.fillStyle = Math.random() < 0.55 ? `rgba(0,0,0,${v})` : `rgba(216,205,184,${v * 0.45})`;
    g.fillRect(R(128) | 0, R(128) | 0, 1, 1);
  }
  g.strokeStyle = 'rgba(6,5,4,0.55)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    let x = R(128), y = 0;
    g.moveTo(x, y);
    while (y < 128) { x += (Math.random() - 0.5) * 14; y += 6 + R(10); g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

function makeFloor() {
  const c = tex(128, 128), g = c.getContext('2d');
  g.fillStyle = '#221d17'; g.fillRect(0, 0, 128, 128);
  for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
    const v = 56 + (R(16) | 0);
    g.fillStyle = `rgb(${v},${v - 6},${v - 13})`;
    g.fillRect(sx * 64 + 3, sy * 64 + 3, 58, 58);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(sx * 64 + 3, sy * 64 + 55, 58, 6);
    g.fillStyle = 'rgba(255,246,220,0.05)'; g.fillRect(sx * 64 + 3, sy * 64 + 3, 58, 2);
    for (let k = 0; k < 5; k++) {
      g.fillStyle = `rgba(0,0,0,${0.05 + R(0.1)})`;
      g.fillRect(sx * 64 + 4 + (R(48) | 0), sy * 64 + 5 + (R(46) | 0), 3 + (R(8) | 0), 2 + (R(3) | 0));
    }
  }
  for (let i = 0; i < 2200; i++) {
    const v = R(0.14);
    g.fillStyle = Math.random() < 0.55 ? `rgba(0,0,0,${v})` : `rgba(216,205,184,${v * 0.4})`;
    g.fillRect(R(128) | 0, R(128) | 0, 1, 1);
  }
  g.strokeStyle = 'rgba(6,5,4,0.45)'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    let x = R(128), y = 0;
    g.moveTo(x, y);
    while (y < 128) { x += (Math.random() - 0.5) * 16; y += 8 + R(12); g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

function makeCeil() {
  const c = tex(128, 128), g = c.getContext('2d');
  g.fillStyle = '#191512'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3000; i++) {
    const v = R(0.18);
    g.fillStyle = Math.random() < 0.7 ? `rgba(0,0,0,${v})` : `rgba(120,104,80,${v * 0.35})`;
    g.fillRect(R(128) | 0, R(128) | 0, 1 + (R(2) | 0), 1);
  }
  for (let i = 0; i < 5; i++) { // sombras profundas de la bóveda
    const x0 = R(128), y0 = R(128);
    const gr = g.createRadialGradient(x0, y0, 2, x0, y0, 20 + R(26));
    gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  g.strokeStyle = 'rgba(4,3,3,0.5)'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    let x = R(128), y = 0;
    g.moveTo(x, y);
    while (y < 128) { x += (Math.random() - 0.5) * 12; y += 7 + R(11); g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

function makeDoor(isExit) {
  const c = tex(128, 128), g = c.getContext('2d');
  const pw = Math.round(128 / 6) + 1;
  for (let i = 0; i < 6; i++) { // tablones de roble con vetas onduladas
    const x = Math.round(i * 128 / 6), v = 52 + (R(12) | 0);
    g.fillStyle = `rgb(${v},${(v * 0.68) | 0},${(v * 0.4) | 0})`;
    g.fillRect(x, 0, pw, 128);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + pw - 2, 0, 2, 128);
    g.strokeStyle = `rgba(20,12,6,${0.15 + R(0.15)})`; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const vx = x + 3 + R(pw - 8);
      g.beginPath();
      g.moveTo(vx, 0);
      g.quadraticCurveTo(vx + (Math.random() - 0.5) * 10, 64, vx + (Math.random() - 0.5) * 8, 128);
      g.stroke();
    }
  }
  g.fillStyle = '#1c1916'; // herrajes
  g.fillRect(0, 12, 128, 9); g.fillRect(0, 107, 128, 9);
  for (let x = 8; x < 128; x += 22) {
    g.fillStyle = '#2c2620';
    g.fillRect(x, 11, 4, 11); g.fillRect(x, 106, 4, 11);
    g.fillStyle = 'rgba(216,205,184,0.18)';
    g.fillRect(x + 1, 12, 1, 2); g.fillRect(x + 1, 107, 1, 2);
  }
  g.strokeStyle = '#0e0c0a'; g.lineWidth = 6; // anilla
  g.beginPath(); g.arc(64, 66, 13, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(216,205,184,0.15)'; g.lineWidth = 2;
  g.beginPath(); g.arc(64, 66, 16, 0, Math.PI * 2); g.stroke();
  const dk = g.createLinearGradient(0, 0, 0, 128);
  dk.addColorStop(0, 'rgba(0,0,0,0.35)'); dk.addColorStop(0.25, 'rgba(0,0,0,0)');
  dk.addColorStop(0.8, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,0.4)');
  g.fillStyle = dk; g.fillRect(0, 0, 128, 128);
  if (isExit) { // la luz de afuera se filtra por la juntura central
    const lg = g.createLinearGradient(0, 0, 0, 128);
    lg.addColorStop(0, 'rgba(255,240,200,0.06)');
    lg.addColorStop(0.5, 'rgba(255,244,214,0.5)');
    lg.addColorStop(1, 'rgba(255,240,200,0.06)');
    g.fillStyle = lg; g.fillRect(62, 0, 4, 128);
    g.fillStyle = 'rgba(255,250,230,0.1)'; g.fillRect(59, 0, 10, 128);
    g.strokeStyle = 'rgba(255,240,200,0.95)'; g.lineWidth = 3; g.strokeRect(3, 3, 122, 122);
    g.strokeStyle = 'rgba(255,250,225,0.4)'; g.lineWidth = 1; g.strokeRect(8, 8, 112, 112);
  }
  return c;
}

function makeGlow() {
  const c = tex(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 92);
  gr.addColorStop(0, '#fff9e4'); gr.addColorStop(0.45, '#ffe8ae'); gr.addColorStop(1, '#a87f42');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}

function makeRevenant() {
  const c = tex(96, 144), g = c.getContext('2d');
  // sudario con el borde inferior desgarrado
  const gr = g.createLinearGradient(0, 0, 0, 144);
  gr.addColorStop(0, '#5c5443'); gr.addColorStop(0.5, '#4a4234');
  gr.addColorStop(0.85, '#3a3428'); gr.addColorStop(1, 'rgba(26,23,18,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(20, 120);
  for (let x = 26; x <= 74; x += 8) {
    g.lineTo(x, 108 + (R(26) | 0));
    g.lineTo(x + 4, 100 + (R(34) | 0));
  }
  g.lineTo(76, 118);
  g.quadraticCurveTo(82, 70, 74, 34);
  g.quadraticCurveTo(48, 8, 22, 34);
  g.quadraticCurveTo(14, 72, 20, 120);
  g.closePath(); g.fill();
  // pliegues
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x0 = 26 + i * 7;
    g.beginPath(); g.moveTo(x0, 44);
    g.quadraticCurveTo(x0 - 2 + R(6), 90, x0 + (R(8) - 4), 120);
    g.stroke();
  }
  // rostro cárdeno
  g.fillStyle = '#9aa08a';
  g.beginPath(); g.ellipse(48, 40, 13, 16, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(60,64,50,0.55)';
  g.beginPath(); g.ellipse(48, 48, 11, 9, 0, 0, Math.PI); g.fill();
  // sombra de la capucha sobre la frente
  const hood = g.createRadialGradient(48, 34, 4, 48, 34, 22);
  hood.addColorStop(0, 'rgba(10,8,6,0.85)'); hood.addColorStop(0.55, 'rgba(10,8,6,0.25)');
  hood.addColorStop(1, 'rgba(10,8,6,0)');
  g.fillStyle = hood; g.beginPath(); g.ellipse(48, 32, 16, 12, 0, 0, Math.PI * 2); g.fill();
  // ojos huecos y boca caída
  g.fillStyle = '#030303';
  g.beginPath(); g.ellipse(41.5, 40, 4, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(54.5, 40, 4, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(48, 52, 4.5, 7, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,30,24,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(41, 46); g.lineTo(40, 54); g.moveTo(55, 46); g.lineTo(56, 54); g.stroke();
  // brazos colgantes con dedos largos
  g.strokeStyle = '#8a9080'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(28, 66); g.quadraticCurveTo(20, 84, 24, 104); g.stroke();
  g.beginPath(); g.moveTo(68, 66); g.quadraticCurveTo(76, 84, 72, 104); g.stroke();
  g.lineWidth = 1.5;
  for (const [hx, hy] of [[24, 104], [72, 104]]) {
    for (let f = -1; f <= 1; f++) {
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + f * 3, hy + 10 + R(5)); g.stroke();
    }
  }
  // ruido solo sobre la silueta
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${R(0.14)})`;
    g.fillRect(R(96) | 0, R(144) | 0, 1, 1);
  }
  // disolución del sudario hacia abajo (flota)
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, 90, 0, 144);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade; g.fillRect(0, 90, 96, 54);
  g.globalCompositeOperation = 'source-over';
  return c;
}

const T = {
  stone: [makeStone(66, '#37332c', 24), makeStone(66, '#37332c', 24), makeStone(66, '#37332c', 24)],
  crypt: [makeStone(50, '#262019', 16), makeStone(50, '#262019', 16), makeStone(50, '#262019', 16)],
  door: makeDoor(false), exitDoor: makeDoor(true),
  glow: makeGlow(), rev: makeRevenant(),
};
T.stoneD = T.stone.map(c => darken(c, 0.3));
T.cryptD = T.crypt.map(c => darken(c, 0.32));
T.doorD = darken(T.door, 0.3);
T.exitD = darken(T.exitDoor, 0.28);
T.floor = tex32(makeFloor());
T.ceil = tex32(darken(makeCeil(), 0.4));

// ---------- estado ----------
const game = {
  state: 'title',
  chapter: 0, deaths: 0, t0: 0,
  L: null, doorMap: null, revs: [],
  player: { x: 1.5, y: 1.5, dir: 0, pitch: 0, bob: 0, bobPh: 0 },
  zbuf: new Float64Array(W),
  bfs: null, bfsTimer: 0, exitT: 0,
  lastStinger: 0, time: 0,
  fog: 7.5, lampFlick: 1,
  mapOn: true, seen: null,
};
const keys = {};
let msgTimer = null;
let doorHint = false;

// ---------- utilidades ----------
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }

function cell(x, y) {
  const L = game.L;
  if (x < 0 || y < 0 || x >= L.W || y >= L.H) return WALL;
  return L.grid[y * L.W + x];
}

function doorKey(x, y) { return x + ',' + y; }

function solidForPlayer(x, y) {
  const c = cell(x, y);
  if (c === WALL || c === GLOW) return true;
  const d = game.doorMap.get(doorKey(x, y));
  return d ? d.slide < 0.8 : false;
}

function canStand(x, y) {
  const R = 0.22;
  for (let cy = Math.floor(y - R); cy <= Math.floor(y + R); cy++)
    for (let cx = Math.floor(x - R); cx <= Math.floor(x + R); cx++)
      if (solidForPlayer(cx, cy)) return false;
  return true;
}

function showMsg(t, dur = 3.4) {
  ui.msg.textContent = t;
  ui.msg.style.opacity = 1;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { ui.msg.style.opacity = 0; }, dur * 1000);
}

function toggleMap() {
  game.mapOn = !game.mapOn;
  minimap.style.display = game.mapOn ? 'block' : 'none';
  showMsg(game.mapOn ? 'Plano desplegado.' : 'Plano guardado.', 1.4);
}

function fogAt(d) { return Math.max(0.02, Math.min(1, 1 - d / game.fog)); }

// ---------- flujo del juego ----------
function showCard(i) {
  game.state = 'card';
  game.chapter = i;
  const ch = CHAPTERS[i];
  ui.cardNum.textContent = `CAPITVLVM ${ch.num} · ANNO DOMINI MCLIII`;
  ui.cardName.textContent = ch.name;
  ui.cardEpi.textContent = ch.epigraph;
  ui.card.classList.remove('hidden');
}

function beginLevel(i) {
  const ch = CHAPTERS[i];
  game.chapter = i;
  game.L = genMaze(ch);
  game.fog = ch.fog;
  game.doorMap = new Map();
  for (const d of game.L.doors) game.doorMap.set(doorKey(d.x, d.y), { ...d, slide: 0, target: 0 });
  const exit0 = game.L.doors[0];
  game.exitDoor = game.doorMap.get(doorKey(exit0.x, exit0.y));
  const p = game.player;
  p.x = game.L.start.x; p.y = game.L.start.y;
  p.dir = cell(2, 1) === FLOOR ? 0 : Math.PI / 2;
  p.pitch = 0; p.bob = 0; p.bobPh = 0;
  game.revs = game.L.spawns.map(s => ({
    x: s.x + 0.5, y: s.y + 0.5, alpha: 0.62, state: 'hunt',
    mode: 'wander', modeT: 11 + Math.random() * 8, wbfs: null,
    stareT: 0, lurkT: 0, phase: Math.random() * 7,
  }));
  game.bfs = null; game.bfsTimer = 0; game.exitT = 0;
  game.seen = new Uint8Array(game.L.W * game.L.H);
  ui.card.classList.add('hidden');
  ui.death.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.chapterTag.textContent = `CAPITVLVM ${ch.num} · ${ch.name}`;
  ui.chapterTag.style.opacity = 1;
  setTimeout(() => { ui.chapterTag.style.opacity = 0; }, 4200);
  minimap.style.display = game.mapOn ? 'block' : 'none';
  showMsg('El oro que late en el plano es la última ianva. Ante una puerta: E o clic (TAB guarda el plano).', 5.5);
  if (!game.t0) game.t0 = performance.now();
  SND.startWorld(game.revs.length);
  SND.bell(1);
  game.state = 'play';
}

function playerDeath() {
  if (game.state !== 'play') return;
  game.state = 'dead';
  game.deaths++;
  SND.shriek(true);
  SND.stopWorld();
  canvas.classList.add('dying');
  ui.flash.style.background = '#2b0505';
  ui.flash.style.opacity = 0.55;
  setTimeout(() => {
    canvas.classList.remove('dying');
    ui.flash.style.opacity = 0;
    ui.death.classList.remove('hidden');
    ui.hud.classList.add('hidden');
  }, 1300);
}

function levelWin() {
  if (game.state !== 'play') return;
  game.state = 'win';
  SND.stopWorld();
  SND.bell(2);
  ui.flash.style.background = '#fff8e8';
  ui.flash.style.opacity = 1;
  ui.hud.classList.add('hidden');
  const next = game.chapter + 1;
  setTimeout(() => {
    if (next < CHAPTERS.length) {
      showCard(next);
      setTimeout(() => { ui.flash.style.opacity = 0; }, 700);
    } else {
      const secs = ((performance.now() - game.t0) / 1000) | 0;
      ui.stats.textContent =
        `Caíste ${game.deaths} ${game.deaths === 1 ? 'vez' : 'veces'} en la oscuridad · ` +
        `${(secs / 60) | 0} min ${secs % 60} s bajo tierra`;
      ui.victory.classList.remove('hidden');
      ui.flash.style.opacity = 0;
    }
  }, 1500);
}

// ---------- entrada ----------
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (game.state === 'play') pauseGame();
    else if (game.state === 'pause') resumeGame();
    return;
  }
  if (e.code === 'Tab') {
    e.preventDefault();
    if (game.state === 'play') toggleMap();
    return;
  }
  if (game.state !== 'play') return;
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); interact(); }
  if (e.code === 'KeyM') showMsg(SND.toggleMute() ? 'Silencio.' : 'El sonido regresa.', 1.6);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pauseGame() {
  game.state = 'pause';
  ui.pause.classList.remove('hidden');
  ui.hud.classList.add('hidden');
}
function resumeGame() {
  ui.pause.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  game.state = 'play';
}

ui.pause.addEventListener('click', () => { if (game.state === 'pause') resumeGame(); });
canvas.addEventListener('click', () => { if (game.state === 'play') interact(); });
ui.card.addEventListener('click', () => { if (game.state === 'card') beginLevel(game.chapter); });
$('startBtn').addEventListener('click', () => {
  SND.init();
  ui.title.classList.add('hidden');
  game.t0 = 0;
  showCard(0);
});
$('retryBtn').addEventListener('click', () => {
  SND.init();
  beginLevel(game.chapter);
});
$('againBtn').addEventListener('click', () => {
  ui.victory.classList.add('hidden');
  ui.title.classList.remove('hidden');
  game.state = 'title';
  game.chapter = 0; game.deaths = 0; game.t0 = 0;
});

// ---------- puertas ----------
function nearestDoor() {
  const p = game.player;
  let best = null, bd = 1.35;
  for (const [k, d] of game.doorMap) {
    const dd = dist2(p.x, p.y, d.x + 0.5, d.y + 0.5);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

function interact() {
  const d = nearestDoor();
  if (!d) return;
  if (d.exit) { // la ianva de salida se abre sola y jamás se cierra
    if (d.slide < 0.9 && d.target !== 1) { d.target = 1; SND.creak('open'); }
    showMsg('La última ianva se abre ante ti. Ve hacia la luz.', 3);
    return;
  }
  if (d.slide !== d.target) return; // en movimiento: una pulsación, se atropella
  const p = game.player;
  if (d.target === 1 && (p.x | 0) === d.x && (p.y | 0) === d.y) {
    showMsg('No puedes cerrar la ianva contigo en el umbral.', 2.4);
    return;
  }
  d.target = d.target === 1 ? 0 : 1;
  SND.creak(d.target === 0 ? 'close' : 'open');
  if (d.target === 1) showMsg('La ianva cede con un lamento.', 2.4);
  else showMsg('Cierras la ianva. Que no pase.', 2.4);
}

function updateDoors(dt) {
  for (const [, d] of game.doorMap) {
    const goal = d.target;
    if (d.slide !== goal) {
      d.slide += Math.sign(goal - d.slide) * dt / 0.85;
      d.slide = Math.max(0, Math.min(1, d.slide));
    }
  }
  // victoria: LLEGAR a la última ianva — se abre sola y el nivel termina
  const ex = game.exitDoor;
  const dExit = dist2(game.player.x, game.player.y, ex.x + 0.5, ex.y + 0.5);
  if (dExit < 1.0 && game.exitT === 0) {
    ex.target = 1;
    game.exitT = 0.55; // latido cinematográfico: la luz se derrama antes del destello
    showMsg('La última ianva cede ante ti.', 2.2);
  }
  if (game.exitT > 0) {
    game.exitT -= dt;
    if (game.exitT <= 0) { game.exitT = 0; levelWin(); }
  }
}

// ---------- revenants ----------
function revBFS() {
  const p = game.player;
  game.bfs = bfs(game.L.grid, game.L.W, game.L.H, p.x | 0, p.y | 0);
}

function relocate(rev) {
  const L = game.L, dist = game.bfs.dist;
  for (let tries = 0; tries < 80; tries++) {
    const c = (Math.random() * L.W * L.H) | 0;
    const x = c % L.W, y = (c / L.W) | 0;
    if (L.grid[c] !== FLOOR || dist[c] < 0) continue;
    if (dist[c] < L.maxDist * 0.55 || dist[c] > L.maxDist * 0.92) continue;
    if (Math.abs(x - game.exitDoor.x) + Math.abs(y - game.exitDoor.y) < 5) continue;
    if (lineOfSight(L.grid, L.W, L.H, x + 0.5, y + 0.5, game.player.x, game.player.y)) continue;
    rev.x = x + 0.5; rev.y = y + 0.5;
    return;
  }
  // red de seguridad: si el muestreo falla, la celda de suelo más lejana al
  // jugador — jamás se re-materializa encima de nadie (ponytail: escaneo O(n))
  let best = -1, bestD = -1;
  for (let c = 0; c < dist.length; c++) {
    if (L.grid[c] !== FLOOR || dist[c] <= bestD) continue;
    if (Math.abs((c % L.W) - game.exitDoor.x) + Math.abs(((c / L.W) | 0) - game.exitDoor.y) < 3) continue;
    bestD = dist[c]; best = c;
  }
  if (best >= 0) { rev.x = (best % L.W) + 0.5; rev.y = ((best / L.W) | 0) + 0.5; }
}

// destino de retirada: lejos del jugador, nunca acampado junto a la salida
function pickWander(r) {
  const L = game.L, dist = game.bfs.dist;
  for (let t = 0; t < 40; t++) {
    const c = (Math.random() * L.W * L.H) | 0;
    if (L.grid[c] !== FLOOR || dist[c] < L.maxDist * 0.3) continue;
    if (Math.abs((c % L.W) - game.exitDoor.x) + Math.abs(((c / L.W) | 0) - game.exitDoor.y) < 5) continue;
    r.wbfs = bfs(L.grid, L.W, L.H, c % L.W, (c / L.W) | 0);
    return;
  }
}

function projectRev(r) {
  const p = game.player;
  const dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  const FOVK = 0.72;
  const plX = -dirY * FOVK, plY = dirX * FOVK;
  const sx = r.x - p.x, sy = r.y - p.y;
  const invDet = 1 / (plX * dirY - dirX * plY);
  const tX = invDet * (dirY * sx - dirX * sy);
  const tY = invDet * (-plY * sx + plX * sy);
  if (tY <= 0.12) return null;
  return { tY, screenX: (W / 2) * (1 + tX / tY) };
}

function updateRevs(dt) {
  const L = game.L, p = game.player;
  const ch = CHAPTERS[game.chapter];
  const exD = game.exitDoor;
  game.bfsTimer -= dt;
  if (game.bfsTimer <= 0) { revBFS(); game.bfsTimer = 0.5; }

  let minDist = 99;
  game.revs.forEach((r, i) => {
    const d = dist2(r.x, r.y, p.x, p.y);
    const los = lineOfSight(L.grid, L.W, L.H, r.x, r.y, p.x, p.y);
    minDist = Math.min(minDist, d);

    if (r.state === 'dissolve') {
      r.alpha -= dt / 0.7;
      if (r.alpha <= 0) { r.alpha = 0; relocate(r); r.state = 'materialize'; r.stareT = 0; }
    } else if (r.state === 'materialize') {
      r.alpha += dt / 1.2;
      if (r.alpha >= 0.62) { r.alpha = 0.62; r.state = 'hunt'; }
    } else {
      // olas de terror: cacería ↔ retirada — ya no vive permanentemente encima de ti
      r.modeT -= dt;
      if (r.mode === 'hunt') {
        if (r.modeT <= 0) { r.mode = 'wander'; r.modeT = 9 + Math.random() * 8; pickWander(r); }
      } else {
        if (!r.wbfs) pickWander(r);
        if (r.modeT <= 0 || (d < 6 && los)) { r.mode = 'hunt'; r.modeT = 13 + Math.random() * 9; }
      }

      if (r.state === 'lurk') {
        r.lurkT -= dt;
        r.phase += dt * 0.7;
        if (r.lurkT <= 0) r.state = 'hunt';
      } else {
        // movimiento según el modo
        let tx = r.x, ty = r.y, speed = 0;
        const c = (r.y | 0) * L.W + (r.x | 0);
        if (r.mode === 'wander' && r.wbfs) {
          const td = r.wbfs.dist[c];
          if (td > 0) {
            const par = r.wbfs.parent[c];
            tx = (par % L.W) + 0.5; ty = ((par / L.W) | 0) + 0.5;
            speed = ch.revSpeed * 0.55;
          }
        } else {
          const tdist = game.bfs.dist[c];
          if (tdist >= 0 && d > 0.3) {
            if (tdist <= 1) { tx = p.x; ty = p.y; }
            else {
              const par = game.bfs.parent[c];
              tx = (par % L.W) + 0.5; ty = ((par / L.W) | 0) + 0.5;
            }
            speed = ch.revSpeed;
          }
        }
        // la luz de la última ianva repele a los muertos: no pisan el sagrario
        if (Math.abs((tx | 0) - exD.x) + Math.abs((ty | 0) - exD.y) <= 2) speed = 0;
        if (speed > 0) {
          const door = game.doorMap.get(doorKey(r.x | 0, r.y | 0));
          if (door && door.slide < 0.8) speed *= 0.15;
          const dd = dist2(r.x, r.y, tx, ty) || 1;
          r.x += (tx - r.x) / dd * speed * dt;
          r.y += (ty - r.y) / dd * speed * dt;
          r.phase += dt * (r.mode === 'wander' ? 1 : 1.8);
        } else r.phase += dt * 0.7; // al raso de la luz, se mece en el umbral
        // acecho: se detiene a contemplarte (solo cazando)
        if (r.mode === 'hunt' && d > 3.2 && d < 8 && Math.random() < dt * 0.25 && los) {
          r.state = 'lurk'; r.lurkT = 0.9 + Math.random() * 1.4;
        }
      }

      // mirada fija: se desvanece (cace o deambule)
      const proj = projectRev(r);
      if (proj && d < 9 && r.alpha > 0.3) {
        const col = Math.round(proj.screenX);
        if (Math.abs(proj.screenX - W / 2) < W * 0.12 && col >= 0 && col < W && proj.tY < game.zbuf[col]) {
          r.stareT += dt;
          if (r.stareT > 1.55) {
            r.state = 'dissolve';
            SND.whoosh();
            showMsg('Se desvanece bajo tu mirada… pero escucha: sigue ahí.', 3.2);
          }
        } else r.stareT = Math.max(0, r.stareT - dt * 1.5);
      } else r.stareT = Math.max(0, r.stareT - dt * 1.5);
    }

    // susurro: volumen ∝ cercanía, máximos cuando está encima
    const level = Math.pow(Math.max(0, 1 - d / 9), 1.5) * (r.alpha / 0.62);
    const pdir = Math.atan2(r.y - p.y, r.x - p.x) - p.dir;
    SND.setWhisper(i, level, Math.sin(pdir), !los, dt);

    // captura (ni mientras se forma de nuevo, ni durante el latido de la salida)
    if (d < 0.55 && r.alpha > 0.3 && r.state !== 'materialize' &&
        game.state === 'play' && game.exitT <= 0) playerDeath();
  });

  SND.updateHeart(minDist, game.time);
  // estinger de amenaza: cerca pero invisible
  const nearest = game.revs.find(r => dist2(r.x, r.y, p.x, p.y) === minDist);
  if (nearest && minDist < 2.7 && game.time - game.lastStinger > 14 &&
      !lineOfSight(L.grid, L.W, L.H, nearest.x, nearest.y, p.x, p.y)) {
    game.lastStinger = game.time;
    SND.shriek(false);
    showMsg('Algo respira al otro lado del muro.', 2.6);
  }
}

// ---------- jugador ----------
function updatePlayer(dt) {
  const p = game.player;
  // mirar con flechas (antes ratón): ← → giran, ↑ ↓ inclinan la cabeza
  const TURN = 2.7, PITCHS = 130;
  if (keys.ArrowLeft) p.dir -= TURN * dt;
  if (keys.ArrowRight) p.dir += TURN * dt;
  if (keys.ArrowUp) p.pitch = Math.min(64, p.pitch + PITCHS * dt);
  if (keys.ArrowDown) p.pitch = Math.max(-64, p.pitch - PITCHS * dt);

  const dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  let mx = 0, my = 0;
  if (keys.KeyW) { mx += dirX; my += dirY; }
  if (keys.KeyS) { mx -= dirX; my -= dirY; }
  if (keys.KeyA) { mx += dirY; my -= dirX; }
  if (keys.KeyD) { mx -= dirY; my += dirX; }
  const len = Math.hypot(mx, my);
  const SPEED = 2.15;
  if (len > 0) {
    mx = mx / len * SPEED * dt; my = my / len * SPEED * dt;
    const ox = p.x, oy = p.y;
    if (canStand(p.x + mx, p.y)) p.x += mx;
    if (canStand(p.x, p.y + my)) p.y += my;
    if (canStand(p.x, p.y) && (p.x !== ox || p.y !== oy)) {
      p.bobPh += dt * 7.2;
      p.bob = Math.sin(p.bobPh) * 3.2;
      if (Math.sin(p.bobPh) < 0 && Math.sin(p.bobPh - dt * 7.2) >= 0) SND.footstep();
    }
  } else p.bob *= Math.max(0, 1 - dt * 6);

  // el plano se traza con lo recorrido (niebla de guerra)
  const L = game.L, sx = p.x | 0, sy = p.y | 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = sx + dx, y = sy + dy;
    if (x < 0 || y < 0 || x >= L.W || y >= L.H || Math.hypot(dx, dy) > 2.6) continue;
    const c = y * L.W + x;
    if (L.grid[c] === FLOOR && !game.seen[c]) {
      game.seen[c] = 1;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const wx = x + ox, wy = y + oy;
        if (wx >= 0 && wy >= 0 && wx < L.W && wy < L.H) game.seen[wy * L.W + wx] = 1;
      }
    }
  }

  // prompt de puerta
  const d = nearestDoor();
  if (d) {
    ui.prompt.textContent = d.exit ? 'LA ÚLTIMA IANVA · VE HACIA LA LVZ'
      : d.slide !== d.target ? ''
      : d.target === 1 ? 'E · CERRAR LA IANVA' : 'E · ABRIR LA IANVA';
    if (!d.exit && !doorHint) { doorHint = true; showMsg('Ante una ianva: pulsa E o haz clic, una sola vez.', 3.2); }
  } else ui.prompt.textContent = '';
}

// ---------- render ----------
// ponytail: resolución 800×480; baja a 640×384 si el equipo va justo.
let floorImg = null, floorBuf = null;

function render() {
  const p = game.player;
  const horizon = (H / 2 + p.pitch + p.bob) | 0;
  const dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  const FOVK = 0.72;
  const plX = -dirY * FOVK, plY = dirX * FOVK;
  const flick = game.lampFlick;

  // suelo y bóveda: proyección por filas en perspectiva real
  if (!floorImg) { floorImg = ctx.createImageData(W, H); floorBuf = new Uint32Array(floorImg.data.buffer); }
  floorBuf.fill(0xff030405);
  const posZ = 0.5 * H;
  const rdx0 = dirX - plX, rdy0 = dirY - plY;
  const rdx1 = dirX + plX, rdy1 = dirY + plY;
  const F = T.floor.px, C = T.ceil.px;
  for (let y = 0; y < H; y++) {
    if (y === horizon) continue;
    const isFloor = y > horizon;
    const pd = isFloor ? y - horizon : horizon - y;
    const rowDist = posZ / pd;
    if (rowDist > game.fog * 1.02) continue; // se pierde en la niebla
    const stepX = rowDist * (rdx1 - rdx0) / W;
    const stepY = rowDist * (rdy1 - rdy0) / W;
    let fx = p.x + rowDist * rdx0;
    let fy = p.y + rowDist * rdy0;
    const src = isFloor ? F : C;
    const o = y * W;
    for (let x = 0; x < W; x++) {
      floorBuf[o + x] = src[((((fy * 128) | 0) & 127) << 7) | (((fx * 128) | 0) & 127)];
      fx += stepX; fy += stepY;
    }
  }
  ctx.putImageData(floorImg, 0, 0);
  // niebla por fila (la distancia es constante en cada fila)
  for (let y = 0; y < H; y++) {
    if (y === horizon) continue;
    const rowDist = posZ / Math.abs(y - horizon);
    const bright = fogAt(rowDist) * flick * (y < horizon ? 0.72 : 1);
    const dark = Math.min(0.97, 1 - bright);
    if (dark < 0.04) continue;
    ctx.fillStyle = `rgba(8,6,4,${dark.toFixed(3)})`;
    ctx.fillRect(0, y, W, 1);
  }

  // paredes por columna (DDA con puertas a mitad de celda)
  const base = game.chapter < 2 ? T.stone : T.crypt;
  const baseD = game.chapter < 2 ? T.stoneD : T.cryptD;
  for (let x = 0; x < W; x++) {
    const camX = 2 * x / W - 1;
    const rdX = dirX + plX * camX, rdY = dirY + plY * camX;
    const pxi = game.player.x, pyi = game.player.y;
    let mapX = pxi | 0, mapY = pyi | 0;
    const dX = Math.abs(1 / rdX), dY = Math.abs(1 / rdY);
    const sX = rdX < 0 ? -1 : 1, sY = rdY < 0 ? -1 : 1;
    let sdX = (rdX < 0 ? pxi - mapX : mapX + 1 - pxi) * dX;
    let sdY = (rdY < 0 ? pyi - mapY : mapY + 1 - pyi) * dY;

    let perp = 0, texX = 0, tex = null, side = 0, glowing = false, exitHit = false;
    for (let i = 0; i < 160; i++) {
      if (sdX < sdY) { sdX += dX; mapX += sX; side = 0; }
      else { sdY += dY; mapY += sY; side = 1; }
      const c = cell(mapX, mapY);
      if (c === WALL) {
        perp = side === 0 ? sdX - dX : sdY - dY;
        let wallX = side === 0 ? pyi + perp * rdY : pxi + perp * rdX;
        wallX -= Math.floor(wallX);
        texX = wallX;
        const v = (mapX * 13 + mapY * 7) % 3;
        tex = side === 0 ? base[v] : baseD[v];
        break;
      }
      if (c === GLOW) {
        perp = side === 0 ? sdX - dX : sdY - dY;
        let wallX = side === 0 ? pyi + perp * rdY : pxi + perp * rdX;
        wallX -= Math.floor(wallX);
        texX = wallX; tex = T.glow; glowing = true;
        break;
      }
      const door = game.doorMap.get(doorKey(mapX, mapY));
      if (door) {
        const half = side === 0 ? dX / 2 : dY / 2;
        const distMid = (side === 0 ? sdX : sdY) - half;
        const other = side === 0 ? pyi + rdY * distMid : pxi + rdX * distMid;
        if (Math.floor(other) === (side === 0 ? mapY : mapX)) {
          const u = other - Math.floor(other);
          if (u >= door.slide) {
            perp = distMid;
            texX = u - door.slide;
            tex = door.exit ? (side === 0 ? T.exitDoor : T.exitD)
              : (side === 0 ? T.door : T.doorD);
            exitHit = door.exit;
            break;
          }
        }
      }
    }

    if (!tex) { game.zbuf[x] = 1e9; continue; }
    game.zbuf[x] = perp;
    const lineH = Math.abs(H / perp);
    const top = horizon - lineH / 2;
    const tx = Math.max(0, Math.min(tex.width - 1, (texX * tex.width) | 0));
    ctx.drawImage(tex, tx, 0, 1, tex.height, x, top, 1, lineH);

    if (glowing) {
      ctx.fillStyle = `rgba(255,238,196,${(0.08 + 0.04 * Math.sin(game.time * 2.2)).toFixed(3)})`;
      ctx.fillRect(x, top, 1, lineH);
    } else if (exitHit) {
      // la última ianva es emisiva: la niebla apenas la atenúa — se ve desde lejos
      const dark = Math.min(0.45, (1 - fogAt(perp) * flick) * 0.5);
      if (dark > 0.02) {
        ctx.fillStyle = `rgba(8,6,4,${dark.toFixed(3)})`;
        ctx.fillRect(x, top, 1, lineH);
      }
      ctx.fillStyle = `rgba(255,214,150,${(0.09 + 0.05 * Math.sin(game.time * 2.2)).toFixed(3)})`;
      ctx.fillRect(x, top, 1, lineH);
    } else {
      const fog = fogAt(perp) * flick;
      const dark = Math.min(0.97, 1 - fog);
      if (dark > 0.02) {
        ctx.fillStyle = `rgba(8,6,4,${dark.toFixed(3)})`;
        ctx.fillRect(x, top, 1, lineH);
      }
    }
  }

  // revenants (sprites, lejos → cerca)
  const revs = [];
  for (const r of game.revs) {
    const pr = projectRev(r);
    if (pr && r.alpha > 0.02) revs.push({ r, ...pr });
  }
  revs.sort((a, b) => b.tY - a.tY);
  for (const { r, tY, screenX } of revs) {
    const h = (H / tY) * 1.12;
    const w = h * (96 / 144);
    const bobY = Math.sin(game.time * 1.3 + r.phase) * h * 0.03;
    const top = horizon - h * 0.52 + bobY;
    const left = screenX - w / 2;
    const a = r.alpha * (0.78 + 0.22 * Math.sin(game.time * 2.6 + r.phase)) * Math.pow(fogAt(tY), 0.8);
    ctx.globalAlpha = Math.min(1, a);
    const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W, Math.ceil(left + w));
    for (let x = x0; x < x1; x++) {
      if (tY >= game.zbuf[x]) continue;
      const tx = Math.max(0, Math.min(95, (((x - left) / w) * 96) | 0));
      ctx.drawImage(T.rev, tx, 0, 1, 144, x, top, 1, h);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- plano de la abadía ----------
function drawMinimap() {
  const L = game.L, S = 160, cs = S / L.W;
  mctx.clearRect(0, 0, S, S);
  mctx.fillStyle = 'rgba(38,32,24,0.92)';
  mctx.fillRect(0, 0, S, S);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const c = y * L.W + x;
    if (!game.seen[c]) continue;
    const v = L.grid[c];
    if (v === WALL) mctx.fillStyle = '#16120d';
    else if (v === GLOW) mctx.fillStyle = '#e8c47a';
    else {
      const d = game.doorMap.get(doorKey(x, y));
      mctx.fillStyle = d ? (d.exit ? '#ffd88a' : '#8a7350') : '#4f4634';
    }
    mctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5);
  }
  // la última ianva: faro dorado siempre visible, latiendo
  const ex = game.exitDoor;
  const pulse = 0.55 + 0.45 * Math.sin(game.time * 2.4);
  mctx.fillStyle = `rgba(255,216,138,${pulse.toFixed(2)})`;
  mctx.fillRect(ex.x * cs, ex.y * cs, cs + 0.5, cs + 0.5);
  // el peregrino y su rumbo
  const p = game.player;
  mctx.fillStyle = '#d8cdb8';
  mctx.beginPath();
  mctx.arc(p.x * cs, p.y * cs, Math.max(1.6, cs * 0.34), 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = '#d8cdb8'; mctx.lineWidth = 1;
  mctx.beginPath();
  mctx.moveTo(p.x * cs, p.y * cs);
  mctx.lineTo(p.x * cs + Math.cos(p.dir) * cs * 1.6, p.y * cs + Math.sin(p.dir) * cs * 1.6);
  mctx.stroke();
}

// ---------- bucle ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'play') {
    game.time += dt;
    // parpadeo de la lámpara
    const t = game.time;
    game.lampFlick = 0.82 + 0.18 * Math.max(0,
      Math.sin(t * 13) * Math.sin(t * 7.3 + 1.7) + Math.sin(t * 2.9) * 0.7) / 1.7;
    updateDoors(dt);
    updatePlayer(dt);
    updateRevs(dt);
    render();
    if (game.mapOn) drawMinimap();
  }
}
requestAnimationFrame(loop);
