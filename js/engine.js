// engine.js — motor base 2D por capas de THE FOLKTALES OF EGGERS.
// Navegación por nodos (WASD/flechas), mirada con ratón (parallax + linterna),
// transiciones cinemáticas, HUD genérico y atmósfera CSS por acto.
// Los actos se registran en nodes.js (registerAct); audio en audio.js (SND).
'use strict';

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const ui = {
  viewport: $('viewport'), scene: $('scene-layer'), entities: $('entity-layer'),
  passers: $('passers'), exits: $('exits'),
  fog: $('fog'), light: $('light'), flash: $('flash'),
  hud: $('hud'), chapterTag: $('chapterTag'), objective: $('objective'),
  inventory: $('inventory'), prompt: $('prompt'), msg: $('msg'),
  compass: $('compass'), minimap: $('minimap'), nodeTag: $('nodeTag'),
  meter: $('meter'), meterFill: document.querySelector('#meter i'),
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
  stepCd: 0,            // cooldown entre pasos (mantener tecla contra pared)
  meter: null,         // medidor genérico (antorcha, aceite…): {v, max, drain, label, emptyMsg}
  entities: [],        // entes sobre el grafo: {id, css, node, from, cadence, grace, catch}
  threat: null,        // {e, t} — un ente en tu nodo, grace para escapar
  darknessT: 0,        // acumulado en zonas oscuras (hook del acto)
  visited: new Set(),  // nodos pisados en el acto (para el minimapa)
};
const keys = {};
let msgTimer = null;
// motor 3D si Three.js cargó (mundo procedural); si no, escenas CSS/foto 2D
const use3d = !!(window.THREE && window.SCENE3D);

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
game.showMsg = showMsg; // los actos (onTick/onEnterNode) hablan por aquí

function showPrompt(t) { ui.prompt.textContent = t; }

function setActAtmosphere(act) {
  ui.viewport.style.filter = act.atmosphere || 'none';
}

function renderInventory() {
  ui.inventory.textContent = game.inventory.length
    ? '◈ ' + game.inventory.join('  ◈ ')
    : '';
  renderMinimap(); // el rombo del mapa desaparece al recoger el ítem
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
  game.darknessT = 0;
  game.threat = null;
  game.stepCd = 0;
  game.meter = act.meter ? { ...act.meter, v: act.meter.max } : null;
  game.entities = (act.entities || []).map(e => ({ ...e, node: e.from, fade: 0 }));
  game.visited = new Set();
  game.hintShown = false;
  ui.minimap.classList.toggle('hidden', !Object.values(act.nodes).some(n => n.map));
  if (use3d) {
    SCENE3D.bind({
      onNode: id => { if (game.state === 'play') enterNode(id); },
      onFootstep: () => SND.footstep(),
      onCaught: reason => playerDeath(reason),
    });
    SCENE3D.init();
    SCENE3D.buildAct(act);
    ui.viewport.classList.add('mode-3d');
  } else {
    ui.viewport.classList.remove('mode-3d');
  }
  setActAtmosphere(act);
  ui.meter.classList.toggle('hidden', !game.meter);
  document.querySelector('#meter .meterLabel').textContent = act.meter ? act.meter.label : '';
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
  showMsg(act.intro || 'WASD caminas libremente · CLIC captura la mirada · E interactúa.', 5);
  if (!game.t0) game.t0 = performance.now();
  SND.startWorld(game.entities.length);
  SND.bell(1);
  game.state = 'play';
}

function playerDeath(reason) {
  if (game.state !== 'play') return;
  game.state = 'dead';
  game.deaths++;
  if (document.pointerLockElement) document.exitPointerLock(); // el cursor elige
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
  game.visited.add(id);
  if (use3d) {
    SCENE3D.enterNode(id, instant);
  } else {
    // foto HD del nodo si existe; si no, el escenario CSS de siempre (fallback)
    ui.scene.className = node.image ? 'scene-photo' : (node.scene || '');
    ui.scene.style.backgroundImage = node.image ? `url(assets/img/${node.image})` : '';
  }
  renderHotspots(node);
  renderExits(node);
  updateCompass(node);
  renderMinimap();
  showNodeName(node);
  // pista única de interacción, la primera vez que hay algo tocable en pantalla
  if (!game.hintShown && (node.hotspots || []).length) {
    game.hintShown = true;
    setTimeout(() => showMsg('Los destellos marcan lo interactivo: acércales el ratón y pulsa E (o haz clic).', 6.5), 6000);
  }
  if (instant) {
    ui.viewport.style.transition = 'none';
    requestAnimationFrame(() => { ui.viewport.style.transition = ''; });
  }
  if (act.onEnterNode) act.onEnterNode(game, node);
}

// Senderos de luz hacia cada salida disponible: el jugador ve hacia dónde ir.
function renderExits(node) {
  ui.exits.innerHTML = '';
  const D = { n: 'NORTE', s: 'SUR', e: 'ESTE', w: 'OESTE' };
  for (const [dir, to] of Object.entries(node.exits || {})) {
    if (!to) continue;
    const el = document.createElement('div');
    el.className = `exit exit-${dir}`;
    el.title = D[dir] || dir;
    ui.exits.appendChild(el);
  }
}

// Brújula: direcciones con salida iluminadas; clic = moverse.
function updateCompass(node) {
  for (const el of ui.compass.children) {
    el.classList.toggle('open', !!((node.exits || {})[el.dataset.dir]));
  }
}

// Minimapa: nodos visitados + aristas entre ellos. SIEMPRE visibles los
// objetivos: rombo rojo = nodo con ítem pendiente, anillo dorado = la meta.
function renderMinimap() {
  if (ui.minimap.classList.contains('hidden')) return;
  const nodes = game.act.nodes;
  const pos = id => {
    const [x, y] = nodes[id].map;
    return [x * 20 + 10, (4 - y) * 20 + 10];
  };
  const pendingItem = id => (nodes[id].hotspots || []).some(h =>
    h.action && h.action.type === 'item' && !game.inventory.includes(h.action.item));
  let s = '';
  const drawn = new Set();
  for (const id of game.visited) {
    if (!nodes[id].map) continue;
    for (const to of Object.values(nodes[id].exits || {})) {
      if (!to || !game.visited.has(to) || !nodes[to].map) continue;
      const key = [id, to].sort().join('|');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const [x1, y1] = pos(id), [x2, y2] = pos(to);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
  }
  for (const id of Object.keys(nodes)) {
    if (!nodes[id].map) continue;
    const visited = game.visited.has(id);
    const isGoal = id === game.act.goal;
    if (!visited && !isGoal && !pendingItem(id)) continue;
    const [x, y] = pos(id);
    if (isGoal) s += `<circle cx="${x}" cy="${y}" r="6.5" class="obj-goal"/>`;
    if (pendingItem(id)) s += `<path class="obj-item" d="M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z"/>`;
    if (visited && !(use3d && id === game.node)) {
      s += `<circle cx="${x}" cy="${y}" r="2.6" class="${isGoal ? 'goal' : ''}"/>`;
    }
  }
  if (use3d && SCENE3D.playerPos()) {
    const pp = SCENE3D.playerPos();
    s += `<circle id="mm-me" class="me" cx="${(pp.x / 28 * 20 + 10).toFixed(1)}" cy="${((4 - pp.z / 28) * 20 + 10).toFixed(1)}" r="3.2"/>`;
  }
  ui.minimap.innerHTML = s;
}

// Cartel con el nombre de la escena al llegar (se desvanece solo).
let nodeTagTimer = null;
function showNodeName(node) {
  if (!node.name) return;
  ui.nodeTag.textContent = node.name;
  ui.nodeTag.style.opacity = 1;
  clearTimeout(nodeTagTimer);
  nodeTagTimer = setTimeout(() => { ui.nodeTag.style.opacity = 0; }, 2600);
}

function renderHotspots(node) {
  ui.entities.innerHTML = '';
  game.hotspotFocus = null;
  game.hotspotList = [];
  for (const h of node.hotspots || []) {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.style.cssText = `left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%`;
    el.dataset.label = h.label || 'INTERACTUAR';
    el.addEventListener('mouseenter', () => { game.hotspotFocus = h; showPrompt(`E · ${h.label}`); });
    el.addEventListener('mouseleave', () => { if (game.hotspotFocus === h) { game.hotspotFocus = null; showPrompt(''); } });
    el.addEventListener('click', () => useHotspot(h));
    ui.entities.appendChild(el);
    game.hotspotList.push({ h, el });
  }
}

// HUD 3D por frame: destellos proyectados sobre su objeto real (solo de cerca,
// el más próximo se anuncia para la tecla E) y tu punto en el minimapa.
function updateHud3d() {
  if (!game.hotspotList) return;
  const pp = SCENE3D.playerPos();
  let best = null, bd = 6.5;
  for (const { h, el } of game.hotspotList) {
    const at = h.at;
    let show = false;
    if (at) {
      const d = Math.hypot(at[0] - pp.x, at[2] - pp.z);
      if (d < bd) { bd = d; best = h; }
      if (d < 6.5) {
        const p = SCENE3D.project(at);
        if (p) {
          show = true;
          el.style.left = `${(p.x - h.w / 2).toFixed(1)}%`;
          el.style.top = `${(p.y - h.h / 2).toFixed(1)}%`;
        }
      }
    }
    el.style.display = show ? '' : 'none';
  }
  game.nearHs = best;
  const label = best ? `E · ${best.label}` : '';
  if (label !== ui.prompt.textContent) showPrompt(label);
  const me = document.getElementById('mm-me');
  if (me) {
    me.setAttribute('cx', (pp.x / 28 * 20 + 10).toFixed(1));
    me.setAttribute('cy', ((4 - pp.z / 28) * 20 + 10).toFixed(1));
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
    case 'refuel':
      if (game.meter) {
        game.meter.v = Math.min(game.meter.max, game.meter.v + (a.amount || 30));
        showMsg(a.text || `Recargas el combustible.`, 2.4);
        SND.creak('close');
      }
      break;
    case 'win':
      if (a.requires && a.requires.some(r => !game.inventory.includes(r))) {
        const missing = a.requires.filter(r => !game.inventory.includes(r));
        showMsg(a.lockedMsg || `Te falta: ${missing.join(', ')}.`, 3.2);
        return;
      }
      levelWin();
      break;
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
  if (use3d) { showMsg('Caminas con libertad: WASD para moverte, MAYÚS para correr.', 2.2); return; }
  if (game.state !== 'play' || game.moving || game.stepCd > 0) return;
  const node = game.act.nodes[game.node];
  const to = (node.exits || {})[dir];
  if (!to) {
    // pared: sacudida breve de la cámara (con cooldown si la tecla se mantiene)
    ui.viewport.classList.remove('bump');
    void ui.viewport.offsetWidth;
    ui.viewport.classList.add('bump');
    setTimeout(() => ui.viewport.classList.remove('bump'), 300);
    showMsg('No hay paso por aquí.', 1.6);
    game.stepCd = 0.5;
    return;
  }
  if (!game.act.nodes[to]) return;
  game.moving = true;
  ui.viewport.classList.add(`move-${dir}`);
  spawnPassers(dir);
  SND.footstep();
  setTimeout(() => {
    enterNode(to);
    SND.footstep();
  }, 300);
  setTimeout(() => {
    ui.viewport.classList.remove(`move-${dir}`);
    game.moving = false;
    game.stepCd = 0.12;
  }, 620);
}

// Siluetas transitorias que barren la pantalla durante el paso:
// es lo que hace visible que "la pantalla se está moviendo".
function spawnPassers(dir) {
  const n = 4 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = `passer dir-${dir}`;
    const w = 3 + Math.random() * 9;           // % de ancho: troncos/rocas
    const h = 35 + Math.random() * 55;         // % de alto
    const x = Math.random() * 100;
    el.style.cssText =
      `left:${x.toFixed(1)}%;top:${(70 - h + Math.random() * 30).toFixed(1)}%;` +
      `width:${w.toFixed(1)}%;height:${h.toFixed(1)}%;` +
      `filter:blur(${(1 + Math.random() * 3).toFixed(1)}px);` +
      `animation-delay:${(Math.random() * 0.18).toFixed(2)}s;`;
    el.addEventListener('animationend', () => el.remove());
    ui.passers.appendChild(el);
  }
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
    if (use3d) { if (game.nearHs) useHotspot(game.nearHs); return; } // el más próximo
    if (game.hotspotFocus) useHotspot(game.hotspotFocus);
    return;
  }
  if (e.code === 'KeyM') { showMsg(SND.toggleMute() ? 'Silencio.' : 'El sonido regresa.', 1.6); return; }
  const dir = DIR_KEY[e.code];
  if (dir) { e.preventDefault(); if (!use3d) tryMove(dir); } // en 3D, WASD es continuo
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

ui.pause.addEventListener('click', () => { if (game.state === 'pause') { game.state = 'play'; ui.pause.classList.add('hidden'); ui.hud.classList.remove('hidden'); grabMouse(); } });
ui.compass.addEventListener('click', e => {
  if (e.target.dataset.dir) tryMove(e.target.dataset.dir);
});
ui.card.addEventListener('click', () => { if (game.state === 'card') { beginAct(game.actIndex); grabMouse(); } });
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
  grabMouse();
});
$('againBtn').addEventListener('click', () => {
  ui.victory.classList.add('hidden');
  ui.title.classList.remove('hidden');
  game.state = 'title';
  game.deaths = 0; game.t0 = 0;
});

// ---------- mirada: pointer lock (clic) o parallax de ratón ----------
// captura el ratón para girar con libertad; si el navegador está en cooldown
// (acabas de soltar con ESC), el próximo clic reintenta.
function grabMouse() {
  if (!use3d || !ui.viewport.requestPointerLock) return;
  try {
    const p = ui.viewport.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (err) { /* reintenta con el próximo clic */ }
}
ui.viewport.addEventListener('click', grabMouse);

window.addEventListener('mousemove', e => {
  if (document.pointerLockElement) {
    // mirada libre capturada: gira la cámara; el halo de la linterna queda al centro
    const dx = Math.max(-200, Math.min(200, e.movementX));
    const dy = Math.max(-200, Math.min(200, e.movementY));
    if (use3d) SCENE3D.addLook(dx, dy);
    ui.viewport.style.setProperty('--light-x', '50%');
    ui.viewport.style.setProperty('--light-y', '50%');
    return;
  }
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
  if (use3d) SCENE3D.lookTo(lx, ly);
});

// ---------- entes sobre el grafo ----------
// IA mínima: cada `cadence` s el ente da un paso hacia tu nodo (BFS).
// Al entrar en tu nodo empieza el `grace`; si expira, te atrapa.
function updateEntities(dt) {
  if (!game.entities.length) return;
  let minHops = 99;
  for (let i = 0; i < game.entities.length; i++) {
    const e = game.entities[i];
    e.t = (e.t || 0) + dt;
    const hops = e.node === game.node ? 0 : NODES.bfsDist(game.act, e.node).get(game.node) ?? 99;
    minHops = Math.min(minHops, hops || 99);
    // susurro: más alto cuanto más cerca (canal = índice del ente)
    SND.setWhisper(i, Math.max(0, 1 - hops / 4), 0, hops > 2, dt);
    if (e.t >= (e.cadence || 4) && e.node !== game.node && !game.moving) {
      e.t = 0;
      const next = NODES.stepToward(game.act, e.node, game.node);
      if (next) e.node = next;
    }
    renderEntity(e, dt);
  }
  // corazón acelerado cuando algo está a 1-2 saltos
  SND.updateHeart(minHops <= 2 ? 1.2 * minHops : 99, game.time);
  // entes 3D: visibles solo cuando están en tu nodo (fundido en tick)
  if (use3d) SCENE3D.syncEntities(game.entities, game.node);

  // amenaza en tu nodo (2D: temporizador de gracia; 3D: el ente te caza físicamente)
  const here = game.entities.find(e => e.node === game.node);
  if (here) {
    if (!game.threat || game.threat.e !== here) {
      game.threat = { e: here, t: here.grace || 1.6 };
      showMsg(`${here.spot || 'Algo ha entrado contigo.'}`, 2.4);
    } else if (!use3d) {
      game.threat.t -= dt;
      if (game.threat.t <= 0) {
        game.threat = null;
        playerDeath(here.catch);
        return;
      }
    }
  } else game.threat = null;
  ui.viewport.classList.toggle('threat', !!game.threat);
}

function renderEntity(e, dt) {
  const visible = e.node === game.node;
  let el = document.getElementById(`ent-${e.id}`);
  if (!el && visible) {
    el = document.createElement('div');
    el.id = `ent-${e.id}`;
    el.className = `creature ${e.css || ''}`;
    ui.entities.appendChild(el);
  }
  if (!el) return;
  e.fade = Math.max(0, Math.min(1, (e.fade || 0) + (visible ? dt * 1.4 : -dt * 2.5)));
  el.style.opacity = e.fade;
  el.style.display = e.fade <= 0.01 ? 'none' : '';
}

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
  if (use3d) {
    SCENE3D.tick(dt, {
      flick: game.lampFlick,
      torch: game.meter ? game.meter.v / game.meter.max : 1,
      move: {
        f: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
        s: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
        run: !!(keys.ShiftLeft || keys.ShiftRight),
      },
    });
    updateHud3d();
  }

  // tecla mantenida = caminar (solo modo 2D: salto entre nodos)
  if (!use3d) {
    if (game.stepCd > 0) game.stepCd -= dt;
    if (!game.moving && game.stepCd <= 0) {
      for (const code in DIR_KEY) {
        if (keys[code]) { tryMove(DIR_KEY[code]); break; }
      }
    }
  }

  // medidor de antorcha/aceite: se consume, y en 0 la oscuridad te toma
  if (game.meter) {
    game.meter.v = Math.max(0, game.meter.v - (game.meter.drain || 1) * dt);
    ui.meterFill.style.width = `${(game.meter.v / game.meter.max) * 100}%`;
    ui.meter.classList.toggle('empty', game.meter.v <= game.meter.max * 0.15);
    if (game.meter.v <= 0) { playerDeath(game.meter.emptyMsg || 'La luz se apaga para siempre.'); return; }
  }

  // hooks del acto (timer de zonas oscuras, reglas propias…)
  const node = game.act.nodes[game.node];
  if (node.dark) game.darknessT += dt;
  else game.darknessT = Math.max(0, game.darknessT - dt * 2);
  if (game.act.onTick) game.act.onTick(game, dt);

  updateEntities(dt);
  if (game.state !== 'play') return;

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
