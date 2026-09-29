// engine.js — motor base 2D por capas de THE FOLKTALES OF EGGERS.
// Navegación por nodos (WASD/flechas), mirada con ratón (parallax + linterna),
// transiciones cinemáticas, HUD genérico y atmósfera CSS por acto.
// Los actos se registran en nodes.js (registerAct); audio en audio.js (SND).
'use strict';

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const ui = {
  viewport: $('viewport'), scene: $('scene-layer'), entities: $('entity-layer'),
  fog: $('fog'), light: $('light'), flash: $('flash'),
  hud: $('hud'), chapterTag: $('chapterTag'), objective: $('objective'),
  inventory: $('inventory'), prompt: $('prompt'), msg: $('msg'),
  title: $('titleScreen'), card: $('card'), death: $('deathScreen'),
  victory: $('victoryScreen'), pause: $('pauseScreen'), stats: $('stats'),
  cardNum: document.querySelector('#card .chapterNum'),
  cardName: document.querySelector('#card .chapterName'),
  cardEpi: document.querySelector('#card .epigraph'),
};
const fctx = ui.fog.getContext('2d');

// ---------- estado ----------
const game = {
  state: 'title',      // title | card | play | pause | dead | win
  actIndex: 0,
  act: null,
  node: null,
  inventory: [],
  deaths: 0, t0: 0, time: 0,
  moving: false,       // durante una transición de nodo
  look: { x: 0.5, y: 0.5 },
  lampFlick: 1,
  hotspotFocus: null,
};
const keys = {};
let msgTimer = null;
let transitionT = 0;

// partículas de niebla (una sola vez)
const motes = Array.from({ length: 42 }, () => ({
  x: Math.random(), y: Math.random(),
  vx: (Math.random() - 0.5) * 0.012, vy: (Math.random() - 0.5) * 0.008,
  r: 6 + Math.random() * 22, a: 0.02 + Math.random() * 0.05,
}));

// ---------- utilidades ----------
function showMsg(t, dur = 3.4) {
  ui.msg.textContent = t;
  ui.msg.style.opacity = 1;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { ui.msg.style.opacity = 0; }, dur * 1000);
}

function showPrompt(t) { ui.prompt.textContent = t; }

function setActAtmosphere(act) {
  ui.viewport.style.filter = act.atmosphere || 'none';
}

function renderInventory() {
  ui.inventory.textContent = game.inventory.length
    ? '◈ ' + game.inventory.join('  ◈ ')
    : '';
}

// ---------- flujo del juego ----------
function orderedActs() {
  return Object.values(NODES.ACTS).sort((a, b) => a.index - b.index);
}

function showCard(index) {
  game.state = 'card';
  game.actIndex = index;
  const act = NODES.ACTS[index];
  ui.cardNum.textContent = `ACTO ${act.num || index}`;
  ui.cardName.textContent = act.title;
  ui.cardEpi.textContent = act.epigraph;
  ui.card.classList.remove('hidden');
}

function beginAct(index) {
  const act = NODES.ACTS[index];
  game.act = act;
  game.actIndex = index;
  game.inventory = [];
  game.moving = false;
  transitionT = 0;
  setActAtmosphere(act);
  enterNode(act.start, true);
  ui.card.classList.add('hidden');
  ui.death.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.chapterTag.textContent = `ACTO ${act.num || index} · ${act.title}`;
  ui.chapterTag.style.opacity = 1;
  setTimeout(() => { ui.chapterTag.style.opacity = 0; }, 4200);
  ui.objective.textContent = act.objective || '';
  renderInventory();
  showMsg(act.intro || 'WASD para moverte. El ratón mira.', 5);
  if (!game.t0) game.t0 = performance.now();
  SND.startWorld(0);
  SND.bell(1);
  game.state = 'play';
}

function playerDeath(reason) {
  if (game.state !== 'play') return;
  game.state = 'dead';
  game.deaths++;
  SND.shriek(true);
  SND.stopWorld();
  ui.flash.style.background = '#2b0505';
  ui.flash.style.opacity = 0.55;
  setTimeout(() => {
    ui.flash.style.opacity = 0;
    ui.death.classList.remove('hidden');
    ui.hud.classList.add('hidden');
    if (reason) document.querySelector('#deathScreen .epigraph').textContent = `«${reason}»`;
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
  const acts = orderedActs();
  const next = acts[acts.findIndex(a => a.index === game.actIndex) + 1];
  setTimeout(() => {
    ui.flash.style.opacity = 0;
    if (next) showCard(next.index);
    else {
      const secs = ((performance.now() - game.t0) / 1000) | 0;
      ui.stats.textContent =
        `Caíste ${game.deaths} ${game.deaths === 1 ? 'vez' : 'veces'} · ` +
        `${(secs / 60) | 0} min ${secs % 60} s en la encrucijada`;
      ui.victory.classList.remove('hidden');
    }
  }, 1500);
}

// ---------- nodos ----------
function enterNode(id, instant) {
  const act = game.act;
  const node = act.nodes[id];
  if (!node) return;
  game.node = id;
  ui.scene.className = node.scene || '';
  renderHotspots(node);
  if (instant) {
    ui.viewport.style.transition = 'none';
    ui.viewport.classList.remove('nodemove');
    requestAnimationFrame(() => { ui.viewport.style.transition = ''; });
  }
}

function renderHotspots(node) {
  ui.entities.innerHTML = '';
  game.hotspotFocus = null;
  for (const h of node.hotspots || []) {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.style.cssText = `left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%`;
    el.dataset.label = h.label || 'INTERACTUAR';
    el.addEventListener('mouseenter', () => { game.hotspotFocus = h; showPrompt(`E · ${h.label}`); });
    el.addEventListener('mouseleave', () => { if (game.hotspotFocus === h) { game.hotspotFocus = null; showPrompt(''); } });
    el.addEventListener('click', () => useHotspot(h));
    ui.entities.appendChild(el);
  }
}

function useHotspot(h) {
  if (game.state !== 'play' || game.moving) return;
  const a = h.action || {};
  switch (a.type) {
    case 'move': tryMove(a.dir); break;
    case 'msg': showMsg(a.text, a.dur || 4.5); break;
    case 'item':
      if (!game.inventory.includes(a.item)) {
        game.inventory.push(a.item);
        renderInventory();
        showMsg(a.text || `Has tomado: ${a.item}.`, 3.5);
        SND.creak('open');
      } else showMsg('Ya lo tienes.', 1.8);
      break;
    case 'win': levelWin(); break;
    case 'death': playerDeath(a.reason); break;
    case 'fn': if (typeof a.run === 'function') a.run(game); break;
    default: showMsg(h.label || 'Nada aquí.', 2);
  }
}

const DIR_KEY = {
  KeyW: 'n', ArrowUp: 'n', KeyS: 's', ArrowDown: 's',
  KeyA: 'w', ArrowLeft: 'w', KeyD: 'e', ArrowRight: 'e',
};

function tryMove(dir) {
  if (game.state !== 'play' || game.moving) return;
  const node = game.act.nodes[game.node];
  const to = (node.exits || {})[dir];
  if (!to) {
    // pared: sacudida breve de la cámara
    ui.viewport.classList.remove('bump');
    void ui.viewport.offsetWidth;
    ui.viewport.classList.add('bump');
    showMsg('No hay paso por aquí.', 1.6);
    return;
  }
  if (!game.act.nodes[to]) return;
  game.moving = true;
  transitionT = 0.55;
  ui.viewport.classList.add('nodemove');
  SND.footstep();
  setTimeout(() => {
    enterNode(to);
    SND.footstep();
    ui.viewport.classList.remove('nodemove');
    game.moving = false;
  }, 300);
}

// ---------- entrada ----------
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (game.state === 'play') { game.state = 'pause'; ui.pause.classList.remove('hidden'); ui.hud.classList.add('hidden'); }
    else if (game.state === 'pause') { game.state = 'play'; ui.pause.classList.add('hidden'); ui.hud.classList.remove('hidden'); }
    return;
  }
  if (game.state !== 'play') return;
  if (e.code === 'KeyE' || e.code === 'Space') {
    e.preventDefault();
    if (game.hotspotFocus) useHotspot(game.hotspotFocus);
    return;
  }
  if (e.code === 'KeyM') { showMsg(SND.toggleMute() ? 'Silencio.' : 'El sonido regresa.', 1.6); return; }
  const dir = DIR_KEY[e.code];
  if (dir) { e.preventDefault(); tryMove(dir); }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

ui.pause.addEventListener('click', () => { if (game.state === 'pause') { game.state = 'play'; ui.pause.classList.add('hidden'); ui.hud.classList.remove('hidden'); } });
ui.card.addEventListener('click', () => { if (game.state === 'card') beginAct(game.actIndex); });
$('startBtn').addEventListener('click', () => {
  SND.init();
  ui.title.classList.add('hidden');
  game.t0 = 0;
  showCard(orderedActs()[0].index);
});
$('retryBtn').addEventListener('click', () => {
  SND.init();
  ui.flash.style.opacity = 0;
  beginAct(game.actIndex);
});
$('againBtn').addEventListener('click', () => {
  ui.victory.classList.add('hidden');
  ui.title.classList.remove('hidden');
  game.state = 'title';
  game.deaths = 0; game.t0 = 0;
});

// ---------- mirada: parallax + linterna ----------
window.addEventListener('mousemove', e => {
  const w = window.innerWidth, h = window.innerHeight;
  const lx = e.clientX / w, ly = e.clientY / h;
  game.look.x = lx; game.look.y = ly;
  ui.viewport.style.setProperty('--light-x', `${e.clientX}px`);
  ui.viewport.style.setProperty('--light-y', `${e.clientY}px`);
  // las capas se desplazan con pesos distintos (profundidad)
  const dx = (lx - 0.5), dy = (ly - 0.5);
  ui.viewport.style.setProperty('--look-x', `${(-dx * 26).toFixed(1)}px`);
  ui.viewport.style.setProperty('--look-y', `${(-dy * 16).toFixed(1)}px`);
  ui.viewport.style.setProperty('--look-x-fg', `${(-dx * 52).toFixed(1)}px`);
  ui.viewport.style.setProperty('--look-y-fg', `${(-dy * 32).toFixed(1)}px`);
});

// ---------- bucle: niebla, parpadeo, transiciones ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state !== 'play') return;
  game.time += dt;

  // parpadeo de la linterna
  const t = game.time;
  game.lampFlick = 0.82 + 0.18 * Math.max(0,
    Math.sin(t * 13) * Math.sin(t * 7.3 + 1.7) + Math.sin(t * 2.9) * 0.7) / 1.7;
  ui.light.style.opacity = game.lampFlick;

  if (transitionT > 0) transitionT -= dt;

  // niebla: motas a la deriva, visibles solo en el haz de la linterna
  fctx.clearRect(0, 0, 640, 384);
  const lx = game.look.x * 640, ly = game.look.y * 384;
  for (const m of motes) {
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.x < -0.05) m.x = 1.05; else if (m.x > 1.05) m.x = -0.05;
    if (m.y < -0.05) m.y = 1.05; else if (m.y > 1.05) m.y = -0.05;
    const px = m.x * 640, py = m.y * 384;
    const d = Math.hypot(px - lx, py - ly) / 210; // radio del haz
    const glow = Math.max(0, 1 - d * d);
    if (glow <= 0.01) continue;
    fctx.globalAlpha = m.a * glow;
    fctx.fillStyle = '#ffe0b0';
    fctx.beginPath();
    fctx.arc(px, py, m.r * 0.35, 0, Math.PI * 2);
    fctx.fill();
  }
  fctx.globalAlpha = 1;
}
requestAnimationFrame(loop);
