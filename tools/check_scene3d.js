// check_scene3d.js — prueba de humo headless del mundo 3D del Acto I.
// Verifica: construcción del mundo (13 nodos, bosque con pasillos), navegación
// por deslizamiento, orientación de cámara (el hito queda de frente) y posiciones
// físicas de la cabaña. Uso: node tools/check_scene3d.js
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
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 0.6);
const hasNaN = arr => arr.some(Number.isNaN);

// 1) el mundo se construye completo
const stats = SCENE3D.buildAct(ACT);
check('mundo construido', !!stats);
check('13 nodos con posición física', stats && stats.nodes === 13);
check('bosque plantado (pinos)', stats && stats.pines > 500, `${stats && stats.pines} pinos`);
check('árboles muertos', stats && stats.deads > 100, `${stats && stats.deads}`);
check('muralla densa', stats && stats.band > 60, `${stats && stats.band}`);
check('hitos añadidos (cabaña, pantano, monolito, hoguera, cercas, huerto, puerta…)',
  stats && stats.meshes > 15, `${stats && stats.meshes} objetos raíz`);

// 2) posiciones físicas: la cabaña interior está DENTRO de la exterior (84, 56), no en su celda del grid
SCENE3D.enterNode('cabaña_ext', true);
let d = SCENE3D.debug();
check('cabaña_ext a 8.4 m del frente sur', near(d.pos[0], 84) && near(d.pos[2], 47.6, 1), `x=${d.pos[0]} z=${d.pos[2]}`);
SCENE3D.glideTo('cabaña_in', 'cabaña_ext');
for (let i = 0; i < 40; i++) SCENE3D.tick(0.03, { flick: 1, torch: 1 });
d = SCENE3D.debug();
check('entrar a la cabaña termina dentro (x=84, z=56)', near(d.pos[0], 84, 0.5) && near(d.pos[2], 56, 0.5),
  `x=${d.pos[0].toFixed(1)} z=${d.pos[2].toFixed(1)}`);
check('sin NaN al entrar', !hasNaN(d.pos));

// 3) deslizamiento norte con retroceso: llegas a 5 m del centro mirándolo de frente
SCENE3D.enterNode('entrada', true);
d = SCENE3D.debug();
check('inicio en el umbral (28, 0)', near(d.pos[0], 28, 0.5) && near(d.pos[2], 0, 0.5));
SCENE3D.glideTo('sendero', 'entrada');
for (let i = 0; i < 30; i++) SCENE3D.tick(0.03, { flick: 1, torch: 1 });
d = SCENE3D.debug();
check('sendero: te detienes 5 m antes del centro', near(d.pos[2], 23, 1), `z=${d.pos[2].toFixed(1)}`);
check('mirando al norte (al claro)', d.fwd.z > 0.9, `fz=${d.fwd.z.toFixed(2)}`);

// 4) rumbo este con monolito de frente (llegando desde el pantano)
SCENE3D.enterNode('pantano', true);
SCENE3D.glideTo('roca', 'pantano');
for (let i = 0; i < 40; i++) SCENE3D.tick(0.03, { flick: 1, torch: 1 });
d = SCENE3D.debug();
check('roca: parado al oeste del monolito', near(d.pos[0], 51, 1), `x=${d.pos[0].toFixed(1)}`);
check('mirando al este (al monolito)', d.fwd.x > 0.9, `fx=${d.fwd.x.toFixed(2)}`);

// 5) ente: aparece en tu nodo y funde su visibilidad
SCENE3D.enterNode('robledal', true);
SCENE3D.syncEntities([{ id: 'phillip', css: 'goat', node: 'robledal' }], 'robledal');
for (let i = 0; i < 20; i++) SCENE3D.tick(0.05, { flick: 1, torch: 1 });
check('ente materializado en el nodo', SCENE3D.debug().ents === 1);

// 6) el grafo completo del acto sigue íntegro
const errs = NODES.validateAct(ACT);
check('grafo del acto válido', errs.length === 0, errs.join('; '));

if (fails) { console.error(`\nFALLO: ${fails} comprobaciones`); process.exit(1); }
console.log('\n✓ MUNDO 3D DEL ACTO I — construcción, cámara, deslizamiento y entes correctos');
