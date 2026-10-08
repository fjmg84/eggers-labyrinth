// act1.js — ACTO I: LA BRUJA (Nueva Inglaterra, 1630)
// Objetivo: 3 Páginas de la Sangre → Puerta del Bosque.
// Mecánica: antorcha que se consume. Entes: Black Phillip (cae sobre ti)
// y La Bruja (si te demoras en zonas oscuras, te sigue al olor).
'use strict';

(function (reg) {
  reg({
    index: 1,
    num: 'I',
    title: 'LA BRUJA',
    epigraph: '«¿Vivirías deliciosamente?»',
    atmosphere: 'sepia(0.2) contrast(1.15) hue-rotate(180deg) brightness(0.9)',
    intro: '¿Vivirías deliciosamente? Para cruzar el umbral, primero debes entregar tu fe a la penumbra.',
    objective: 'Busca las 3 Páginas de la Sangre y abre la Puerta del Bosque.',
    start: 'entrada',
    goal: 'puerta',
    meter: {
      label: 'ANTORCHA',
      max: 100,
      drain: 2.4,
      emptyMsg: 'La antorcha se consume en tu mano. La oscuridad te toma.',
    },
    entities: [{
      id: 'phillip', css: 'goat', from: 'robledal',
      cadence: 4.5, grace: 1.7,
      spot: 'Unos cuernos negros se apartan entre las ramas.',
      catch: 'Quítate las vestiduras... firma tu nombre en mi libro y camina libremente en la oscuridad.',
    }],
    // la bruja aparece si acumulas ~30 s en zonas oscuras; caza despacio
    onTick(g, dt) {
      if (g.darknessT > 30 && !g.entities.some(e => e.id === 'witch')) {
        const nb = Object.values(g.act.nodes[g.node].exits || {}).filter(Boolean);
        g.entities.push({
          id: 'witch', css: 'witch', node: nb[0] || g.node, fade: 0,
          cadence: 4.2, grace: 2.4,
          spot: 'El aire se enfría. Algo ha olido tu sangre.',
          catch: 'La Bruja del Bosque te arrastra entre la maleza sin un grito.',
        });
        g.darknessT = 0;
        g.showMsg('La maleza cruja a tu espalda. No te quedes quieto en la oscuridad.', 4);
      }
    },
    nodes: {
      entrada: {
        name: 'El Umbral del Bosque', map: [1, 0], image: 'act1/entrada.jpg',
        scene: 'a1-entrada',
        exits: { n: 'sendero' },
        hotspots: [],
      },
      sendero: {
        name: 'El Sendero de las Huellas', map: [1, 1], image: 'act1/sendero.jpg',
        scene: 'a1-sendero',
        exits: { s: 'entrada', n: 'cruce', e: 'robledal' },
        hotspots: [{
          id: 'huellas', label: 'OBSERVAR LAS HUELLAS', x: 40, y: 70, w: 22, h: 22, at: [28, 0.1, 30.5],
          action: { type: 'msg', text: 'Pezuñas de cabrío... y huellas humanas descalzas que se adentran en el bosque. Algunas van de regreso. Otras no.' },
        }],
      },
      cruce: {
        name: 'El Cruce de las Tres Sendas', map: [1, 2], image: 'act1/cruce.jpg',
        scene: 'a1-cruce',
        exits: { s: 'sendero', n: 'pantano', e: 'claro', w: 'cercas' },
        hotspots: [],
      },
      pantano: {
        name: 'El Pantano Negro', map: [1, 3], image: 'act1/pantano.jpg',
        scene: 'a1-pantano',
        dark: true,
        exits: { s: 'cruce', e: 'roca' },
        hotspots: [{
          id: 'pag3', label: 'ARRANCAR LA PÁGINA DEL CIENAGA', x: 52, y: 58, w: 16, h: 20, at: [29.5, 0.15, 86],
          action: { type: 'item', item: 'Página de la Sangre III',
            text: 'La página está pegada al barro con sangre seca. La letra aún gotea.' },
        }, {
          id: 'sangre', label: 'MIRAR EL AGUA', x: 12, y: 60, w: 30, h: 30, at: [27, 0.1, 82],
          action: { type: 'msg', text: 'Bajo la superficie, algo devuelve tu mirada con ojos de cabra. No respires.' },
        }],
      },
      roca: {
        name: 'La Roca del Altar', map: [2, 3], image: 'act1/roca.jpg',
        scene: 'a1-roca',
        dark: true,
        exits: { w: 'pantano', s: 'huerto' },
        hotspots: [{
          id: 'pag2', label: 'TOMAR LA PÁGINA DEL ALTAR', x: 42, y: 48, w: 18, h: 22, at: [56, 2, 84],
          action: { type: 'item', item: 'Página de la Sangre II',
            text: 'La página está clavada bajo una piedra con runas. Un cabello de mujer queda entre tus dedos.' },
        }, {
          id: 'altar', label: 'LEER LA PIEDRA', x: 24, y: 66, w: 55, h: 26, at: [56.9, 0.6, 84.9],
          action: { type: 'msg', text: '«No en nombre del Padre, sino en el cuerno...» La inscripción continúa bajo tierra.' },
        }],
      },
      robledal: {
        name: 'El Robledal Espeso', map: [2, 1], image: 'act1/robledal.jpg',
        scene: 'a1-robledal',
        exits: { w: 'sendero', n: 'huerto' },
        hotspots: [{
          id: 'ovejas', label: 'REVISAR EL REBAÑO', x: 55, y: 55, w: 30, h: 30, at: [57.5, 0.2, 30],
          action: { type: 'msg', text: 'Velas de sebo vacías entre los troncos. Aquí celebraban algo que no era un culto de ingleses.' },
        }],
      },
      huerto: {
        name: 'El Huerto Muerto', map: [2, 2], image: 'act1/huerto.jpg',
        scene: 'a1-huerto',
        exits: { s: 'robledal', n: 'roca', e: 'cabaña_ext' },
        hotspots: [],
      },
      claro: {
        name: 'El Claro de la Hoguera', map: [3, 1], image: 'act1/claro.jpg',
        scene: 'a1-claro',
        exits: { w: 'cruce', n: 'cabaña_ext' },
        hotspots: [{
          id: 'hoguera', label: 'AVIVAR LA HOGUERA', x: 38, y: 60, w: 24, h: 28, at: [84, 0.9, 28.5],
          action: { type: 'refuel', amount: 45, text: 'El fuego crepite y devuelves fuerza a tu antorcha.' },
        }],
      },
      cabaña_ext: {
        name: 'Ante la Cabaña', map: [3, 2], pos: [3, 1.7], image: 'act1/cabana-ext.jpg',
        scene: 'a1-cabana-ext',
        exits: { s: 'claro', w: 'huerto', e: 'cabaña_in' },
        hotspots: [{
          id: 'ventana', label: 'ESPIAR POR LA VENTANA', x: 18, y: 34, w: 18, h: 22, at: [81.1, 1.8, 52.4],
          action: { type: 'msg', text: 'Una vela de sebo ilumina una mesa. Sobre ella, un velo de novia y una página suelta.' },
        }],
      },
      cabaña_in: {
        name: 'El Interior de la Cabaña', map: [4, 2], pos: [3, 2], image: 'act1/cabana-in.jpg',
        scene: 'a1-cabana-in',
        exits: { w: 'cabaña_ext' },
        hotspots: [{
          id: 'pag1', label: 'TOMAR LA PÁGINA DE LA MESA', x: 40, y: 52, w: 20, h: 20, at: [84, 1.05, 58.2],
          action: { type: 'item', item: 'Página de la Sangre I',
            text: 'La primera página yace sobre el velo. Tu nombre ya está escrito al pie, en tinta que no escribiste.' },
        }, {
          id: 'manuscrito', label: 'LEER EL MANUSCRITO', x: 64, y: 56, w: 16, h: 18, at: [84.8, 1, 58],
          action: { type: 'msg', dur: 7, text: '«Algo habita en la maleza. No es un lobo, ni un hombre. Mi hija cayó en trance y el cabrío negro me habló al oído con la voz de mi difunto hermano. Dios nos ha abandonado a este bosque.»' },
        }],
      },
      cercas: {
        name: 'Las Cercas del Buen Dios', map: [0, 2], image: 'act1/cercas.jpg',
        scene: 'a1-cercas',
        exits: { e: 'cruce', n: 'muralla' },
        hotspots: [{
          id: 'cerca', label: 'TOCAR LA CERCA', x: 20, y: 50, w: 30, h: 30, at: [-3.5, 0.55, 56.4],
          action: { type: 'msg', text: 'Estacas de madera desgastadas. Del otro lado, el bosque se detiene como si algo lo contuviera.' },
        }],
      },
      muralla: {
        name: 'La Muralla del Bosque', map: [0, 3], image: 'act1/muralla.jpg',
        scene: 'a1-muralla',
        exits: { s: 'cercas', n: 'puerta' },
        hotspots: [],
      },
      puerta: {
        name: 'La Puerta del Bosque', map: [0, 4], image: 'act1/puerta.jpg',
        scene: 'a1-puerta',
        exits: { s: 'muralla' },
        hotspots: [{
          id: 'umbral', label: 'CRUZAR LA PUERTA DEL BOSQUE', x: 36, y: 26, w: 28, h: 48, at: [0, 1.5, 111.8],
          action: {
            type: 'win',
            requires: ['Página de la Sangre I', 'Página de la Sangre II', 'Página de la Sangre III'],
            lockedMsg: 'La puerta no cede. Las tres Páginas de la Sangre han de sellarla primero.',
          },
        }],
      },
    },
  });
})(typeof window !== 'undefined' ? window.NODES.registerAct : require('./nodes').registerAct);
