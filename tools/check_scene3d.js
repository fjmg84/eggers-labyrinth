// check_scene3d.js — prueba de humo headless del mundo 3D con MOVIMIENTO LIBRE.
// Verifica: construcción del mundo, caminar WASD, cambio de escena por
// proximidad, mirada libre, colisiones (el muro bloquea, la puerta pasa),
// entrar a la cabaña y caza física del ente. Uso: node tools/check_scene3d.js
'use strict';

// Three.js UMD en Node: se inyecta como window.THREE para scene3d.js
global.window = { THREE: require('../js/lib/three.min.js') };

const SCENE3D = require('../js/scene3d.js');
const NODES = require('../js/nodes.js');
require('../js/act1.js');

const ACT = NODES.ACTS[1];
let fails = 0;
const check = (name, cond, extra) => {
  console.log(`${cond ? '✓' : 'FALLO'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fails++;
};
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1);
const hasNaN = arr => arr.some(Number.isNaN);
const walk = (ticks, f, s, run) => {
  for (let i = 0; i < ticks; i++)
    SCENE3D.tick(0.016, { flick: 1, torch: 1, move: { f, s, run } });
};

// 1) el mundo se construye completo
const stats = SCENE3D.buildAct(ACT);
check('mundo construido', !!stats);
check('13 nodos con posición física', stats && stats.nodes === 13);
check('bosque plantado (pinos)', stats && stats.pines > 500, `${stats && stats.pines} pinos`);
check('árboles muertos', stats && stats.deads > 100, `${stats && stats.deads}`);
check('muralla densa', stats && stats.band > 60, `${stats && stats.band}`);
check('hitos añadidos (cabaña, pantano, monolito, hoguera, cercas, huerto, puerta…)',
  stats && stats.meshes > 15, `${stats && stats.meshes} objetos raíz`);

// eventos del jugador
let firedNodes = [], steps = 0, caught = null;
SCENE3D.bind({
  onNode: id => firedNodes.push(id),
  onFootstep: () => steps++,
  onCaught: r => { caught = r; },
});

// 2) caminar al norte por el sendero desde el umbral
SCENE3D.enterNode('entrada', true);
walk(280, 1, 0); // ~4.5 s de marcha
let d = SCENE3D.debug();
check('caminaste al norte', d.pos[2] > 14 && d.pos[2] < 24, `z=${d.pos[2].toFixed(1)}`);
check('la escena cambió por proximidad (sendero)', firedNodes.includes('sendero'), firedNodes.join(','));
check('sin NaN tras caminar', !hasNaN(d.pos));
check('pasos sonando', steps > 4, `${steps} pasos`);

// 3) mirada libre: girar al este y volver
SCENE3D.enterNode('entrada', true);
SCENE3D.addLook(-683, 0); // ~90° al este
d = SCENE3D.debug();
check('mirando al este tras girar', d.fwd.x > 0.9, `fx=${d.fwd.x.toFixed(2)}`);
SCENE3D.addLook(1366, 0); // ~180°: al oeste
d = SCENE3D.debug();
check('mirando al oeste tras el giro completo', d.fwd.x < -0.9, `fx=${d.fwd.x.toFixed(2)}`);

// 4) la cabaña: la puerta pasa, el muro bloquea
SCENE3D.enterNode('cabaña_ext', true);
firedNodes = [];
walk(230, 1, 0); // norte recto: por el hueco de la puerta y hasta la mesa
d = SCENE3D.debug();
check('entraste a la cabaña por la puerta', d.pos[2] > 54 && near(d.pos[0], 84, 1.5),
  `x=${d.pos[0].toFixed(1)} z=${d.pos[2].toFixed(1)}`);
check('la escena interior se activó', firedNodes.includes('cabaña_in'), firedNodes.join(','));

SCENE3D.enterNode('cabaña_ext', true);
walk(45, 0, -1);  // oeste ~3 m (dentro del claro, sin árboles)
d = SCENE3D.debug();
const x0 = d.pos[0];
walk(230, 1, 0);  // norte: el muro sur (sin puerta ahí) debe frenar
d = SCENE3D.debug();
check('la pared bloquea donde no hay puerta', d.pos[2] < 52, `z=${d.pos[2].toFixed(1)}`);
check('no te colaste por el muro', d.pos[2] > 45, `z=${d.pos[2].toFixed(1)}`);

// 5) correr es más rápido que caminar
SCENE3D.enterNode('sendero', true);
walk(60, 1, 0);
const zWalk = SCENE3D.debug().pos[2];
SCENE3D.enterNode('sendero', true);
walk(60, 1, 0, true);
const zRun = SCENE3D.debug().pos[2];
check('correr avanza más que caminar', zRun > zWalk + 2, `caminar ${zWalk.toFixed(1)} m vs correr ${zRun.toFixed(1)} m`);

// 6) el ente te caza físicamente en tu claro
SCENE3D.enterNode('robledal', true);
caught = null;
SCENE3D.syncEntities([{ id: 'phillip', css: 'goat', node: 'robledal', catch: 'te alcanza' }], 'robledal');
for (let i = 0; i < 90; i++) SCENE3D.tick(0.05, { flick: 1, torch: 1 }); // 4.5 s quieto
check('el ente caminó hasta ti y te cazó', caught === 'te alcanza', `${caught}`);

// 7) el grafo completo del acto sigue íntegro
const errs = NODES.validateAct(ACT);
check('grafo del acto válido', errs.length === 0, errs.join('; '));

if (fails) { console.error(`\nFALLO: ${fails} comprobaciones`); process.exit(1); }
console.log('\n✓ MUNDO 3D CON MOVIMIENTO LIBRE — construcción, cámara, colisiones, puertas y caza correctos');
