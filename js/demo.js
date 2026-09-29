// demo.js — acto placeholder del motor base (3 nodos) para probar navegación,
// transiciones y capas. Se sustituye por los actos I–V reales.
'use strict';

(function (reg) {
  reg({
    index: 0,
    title: 'PROTOTIPO',
    num: '0',
    epigraph: '«Prueba del laberinto de espejos.»',
    atmosphere: 'sepia(0.25) contrast(1.15) brightness(0.85)',
    start: 'entrada',
    goal: 'camara',
    nodes: {
      entrada: {
        scene: 'demo-entrada',
        exits: { e: 'pasillo', n: null },
        hotspots: [
          { id: 'nota', label: 'LEER LA NOTA', x: 62, y: 55, w: 12, h: 16,
            action: { type: 'msg', text: 'El laberinto respira. Adelante hay luz; detrás, solo tú.' } },
        ],
      },
      pasillo: {
        scene: 'demo-pasillo',
        exits: { w: 'entrada', e: 'camara' },
        hotspots: [],
      },
      camara: {
        scene: 'demo-camara',
        exits: { w: 'pasillo', n: null },
        hotspots: [
          { id: 'umbral', label: 'CRUZAR EL UMBRAL', x: 40, y: 30, w: 20, h: 40,
            action: { type: 'win' } },
        ],
      },
    },
  });
})(typeof window !== 'undefined' ? window.NODES.registerAct : require('./nodes').registerAct);
