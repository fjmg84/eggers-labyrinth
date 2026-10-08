// scene3d.js — mundo 3D procedural con MOVIMIENTO LIBRE en primera persona.
// Bosque continuo con senderos tallados según el grafo del acto, hitos por nodo
// y entes que acechan por el grafo y cazan físicamente en tu claro.
// Todo son primitivas + niebla + luz: cero modelos externos.
// El jugador camina/corre con colisiones (rejilla de sólidos); la mirada es
// pointer-lock (addLook) o parallax de ratón (lookTo) si no hay captura.
// El sistema de nodos sigue debajo: define objetivos, zonas oscuras y a dónde
// van los entes. Si THREE no carga, el motor 2D (CSS/fotos) es el fallback.
'use strict';

const SCENE3D = (function () {
  const S = 28;            // metros entre nodos adyacentes del grid
  const EYE = 1.7;         // altura de los ojos
  const SPEED = 4.3;       // m/s caminando
  const RUN = 6.6;         // m/s corriendo (MAYÚS)
  const P_RAD = 0.42;      // radio de colisión del jugador
  const CELL = 2;          // celda de la rejilla de colisión
  const CATCH_DIST = 1.7;  // distancia a la que un ente te alcanza
  const BOUND = [-92, 204];// límites del mundo caminable

  let THREE = (typeof window !== 'undefined' && window.THREE) || null;
  const use3 = () => THREE || (THREE = (typeof window !== 'undefined' && window.THREE) || null);

  let renderer = null, scene = null, camera = null, actRoot = null;
  let act = null, tClk = 0;
  const nodesPos = new Map();

  // jugador (movimiento libre)
  const player = { pos: null, yaw: Math.PI, pitch: 0, bob: 0, stride: 0, moving: false };
  const look = { yawOff: 0, pitchOff: 0 };   // parallax de ratón sin captura
  let nearest = null;                        // nodo actual = el más cercano

  // eventos que expone el motor (beginAct los re-engancha cada acto)
  let ev = { onNode: null, onFootstep: null, onCaught: null };

  // rejilla de colisión: "cx,cz" → [{x, z, r}]
  const solids = new Map();

  // luces vivas del acto
  let torch = null, fire = null, fireCone = null, candle = null, portalLight = null;
  const ents = new Map(); // id → {grp, mats, fade, target, speed, catch, placedFor}

  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- colisiones ----------
  function addSolid(x, z, r) {
    const key = `${Math.floor((x + 200) / CELL)},${Math.floor((z + 200) / CELL)}`;
    if (!solids.has(key)) solids.set(key, []);
    solids.get(key).push({ x, z, r });
  }
  // empuja al jugador fuera de cada sólido cercano (2 pasadas para esquinas)
  function collide(p) {
    for (let it = 0; it < 2; it++) {
      const cx = Math.floor((p.x + 200) / CELL), cz = Math.floor((p.z + 200) / CELL);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const list = solids.get(`${cx + i},${cz + j}`);
        if (!list) continue;
        for (const s of list) {
          const dx = p.x - s.x, dz = p.z - s.z;
          const d2 = dx * dx + dz * dz, min = s.r + P_RAD;
          if (d2 < min * min) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2), push = (min - d) / d;
              p.x += dx * push; p.z += dz * push;
            } else p.x += min; // justo encima: empujón lateral
          }
        }
      }
    }
  }
  // muro como hilera de sólidos (deja pasar la puerta si el segmento la respeta)
  function solidWall(x1, z1, x2, z2, r) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.6));
    for (let i = 0; i <= n; i++)
      addSolid(x1 + (x2 - x1) * i / n, z1 + (z2 - z1) * i / n, r);
  }

  // ---------- construcción del mundo ----------
  function worldPos(id) {
    const p = act.nodes[id].pos || act.nodes[id].map;
    return new THREE.Vector3(p[0] * S, EYE, p[1] * S);
  }
  function lam(color, opt) {
    return new THREE.MeshLambertMaterial(Object.assign({ color }, opt || {}));
  }
  function disposeDeep(root) {
    root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }
  function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1;
    let t = ((px - ax) * dx + (pz - az) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  // ---------- bosque con pasillos ----------
  // Se rechaza todo árbol cerca de nodos (claros) o de aristas (senderos):
  // el grafo del acto queda tallado en el bosque y ves hacia dónde puedes ir.
  function plantForest(edges) {
    const clearance = [];
    for (const [id] of Object.entries(act.nodes)) {
      const p = nodesPos.get(id);
      clearance.push([p.x, p.z, 4.5]);
    }
    const keepOut = [ // hitos: nada de árboles encima
      [84, 56, 7.5],   // cabaña
      [56, 84, 4],     // monolito
      [84, 28, 5],     // hoguera
      [0, 112, 4.5],   // puerta
      [56, 56, 12],    // huerto
      [28, 84, 10],    // pantano (agua)
    ];
    const ok = (x, z) => {
      for (const [cx, cz, r] of clearance) if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
      for (const [a, b] of edges) if (distSeg(x, z, a.x, a.z, b.x, b.z) < 3.4) return false;
      for (const [cx, cz, r] of keepOut) if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
      if (distSeg(x, z, -3.5, 46, -3.5, 66) < 2) return false; // pasillo de la cerca
      return true;
    };

    const MAXP = 2300, MAXD = 480;
    const pineGeo = new THREE.ConeGeometry(2.3, 7.6, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 2.6, 5);
    const deadGeo = new THREE.CylinderGeometry(0.16, 0.5, 5, 5);
    const pineMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunkMat = lam(0x1c150d);
    const deadMat = lam(0x181109);
    const pines = new THREE.InstancedMesh(pineGeo, pineMat, MAXP);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, MAXP);
    const deads = new THREE.InstancedMesh(deadGeo, deadMat, MAXD);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const col = new THREE.Color();
    let np = 0, nd = 0;
    for (let i = 0; i < 14000 && (np < MAXP || nd < MAXD); i++) {
      const x = rnd(-90, 202), z = rnd(-90, 202);
      if (!ok(x, z)) continue;
      if (Math.random() < 0.82 && np < MAXP) {
        const s = rnd(0.75, 1.5);
        q.setFromEuler(new THREE.Euler(0, rnd(0, 6.28), 0));
        sc.set(s, s, s);
        v.set(x, 2.6 * s + 3.8 * s, z);
        m.compose(v, q, sc); pines.setMatrixAt(np, m);
        col.setHSL(0.29 + rnd(-0.03, 0.03), 0.32, rnd(0.05, 0.11)); pines.setColorAt(np, col);
        v.set(x, 1.3 * s, z); m.compose(v, q, sc); trunks.setMatrixAt(np, m);
        addSolid(x, z, 0.5 * s);
        np++;
      } else if (nd < MAXD) {
        const s = rnd(0.6, 1.2);
        q.setFromEuler(new THREE.Euler(rnd(-0.07, 0.07), rnd(0, 6.28), rnd(-0.07, 0.07)));
        sc.set(s, s, s);
        v.set(x, 2.5 * s, z);
        m.compose(v, q, sc); deads.setMatrixAt(nd, m);
        addSolid(x, z, 0.38 * s);
        nd++;
      }
    }
    pines.count = np; trunks.count = np; deads.count = nd;
    pines.instanceMatrix.needsUpdate = true; trunks.instanceMatrix.needsUpdate = true;
    if (pines.instanceColor) pines.instanceColor.needsUpdate = true;
    actRoot.add(pines, trunks, deads);

    // banda densa: la muralla al norte de su nodo, con hueco del corredor a la puerta
    const bandN = 130;
    const band = new THREE.InstancedMesh(pineGeo, pineMat, bandN);
    let nb = 0;
    for (let i = 0; i < 2000 && nb < bandN; i++) {
      const x = rnd(-16, 16), z = rnd(88, 94);
      if (distSeg(x, z, 0, 84, 0, 112) < 3.6) continue;
      const s = rnd(1.1, 1.6);
      q.setFromEuler(new THREE.Euler(0, rnd(0, 6.28), 0));
      sc.set(s, s, s);
      v.set(x, 2.6 * s + 3.8 * s, z);
      m.compose(v, q, sc); band.setMatrixAt(nb, m);
      col.setHSL(0.3, 0.3, rnd(0.04, 0.09)); band.setColorAt(nb, col);
      addSolid(x, z, 0.5 * s);
      nb++;
    }
    band.count = nb;
    actRoot.add(band);
    return { pines: np, deads: nd, band: nb };
  }

  // ---------- hitos ----------
  function buildCabin() {
    const c = nodesPos.get('cabaña_in');
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); actRoot.add(g);
    const wood = lam(0x2b2115), woodD = lam(0x1c150d);
    const box = (w, h, d, x, y, z, mat) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wood);
      b.position.set(x, y, z); g.add(b); return b;
    };
    box(8, 3.2, 0.3, 0, 1.6, 3.5);                    // pared norte
    box(0.3, 3.2, 7, 4, 1.6, 0);                      // este
    box(0.3, 3.2, 7, -4, 1.6, 0);                     // oeste
    box(2.8, 3.2, 0.3, -2.6, 1.6, -3.5);              // sur: segmento con ventana
    box(2.8, 3.2, 0.3, 2.6, 1.6, -3.5);               // sur: segmento de la puerta
    box(2.4, 0.8, 0.3, 0, 2.8, -3.5);                 // dintel sobre el hueco (±1.2 m)
    box(8, 0.2, 7, 0, 0.1, 0, woodD);                // suelo interior
    // techo a dos aguas (cumbrera a lo largo del eje X)
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.25, 4.4), woodD);
    roofL.position.set(0, 3.9, -1.85); roofL.rotation.x = 0.55; g.add(roofL);
    const roofR = roofL.clone(); roofR.position.z = 1.85; roofR.rotation.x = -0.55; g.add(roofR);
    // ventana cálida en la pared sur (la ve el jugador desde fuera)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }));
    win.position.set(-2.9, 1.8, -3.68); win.rotation.y = Math.PI; g.add(win);
    const wLight = new THREE.PointLight(0xffc477, 0.55, 9, 2);
    wLight.position.set(-2.9, 1.9, -4.6); g.add(wLight);
    // interior: mesa con vela encendida
    box(2.2, 0.12, 1.1, 0, 0.95, 2.3, wood);
    const candleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
    candleBody.position.set(0.3, 1.2, 2.2); g.add(candleBody);
    candle = new THREE.PointLight(0xffd9a0, 0.6, 7, 2);
    candle.position.set(0.3, 1.55, 2.2); g.add(candle);

    // colisiones: paredes con hueco de puerta al centro sur, y la mesa
    solidWall(c.x - 4, c.z + 3.5, c.x + 4, c.z + 3.5, 0.35);
    solidWall(c.x + 4, c.z - 3.5, c.x + 4, c.z + 3.5, 0.35);
    solidWall(c.x - 4, c.z - 3.5, c.x - 4, c.z + 3.5, 0.35);
    solidWall(c.x - 4, c.z - 3.5, c.x - 1.2, c.z - 3.5, 0.35);
    solidWall(c.x + 1.2, c.z - 3.5, c.x + 4, c.z - 3.5, 0.35);
    addSolid(c.x, c.z + 2.3, 1.15);
  }

  function buildSwamp() {
    const c = nodesPos.get('pantano');
    const water = new THREE.Mesh(new THREE.PlaneGeometry(36, 28),
      new THREE.MeshStandardMaterial({ color: 0x06090a, metalness: 0.55, roughness: 0.22 }));
    water.rotation.x = -Math.PI / 2; water.position.set(c.x, 0.06, c.z); actRoot.add(water);
    const snagGeo = new THREE.CylinderGeometry(0.14, 0.4, 1, 5);
    for (let i = 0; i < 12; i++) {                     // troncos muertos asomando al agua
      const a = rnd(0, 6.28), r = rnd(7, 13);
      const h = rnd(3, 5);
      const snag = new THREE.Mesh(snagGeo, lam(0x141009));
      snag.scale.set(1, h, 1);
      snag.position.set(c.x + Math.cos(a) * r, h / 2, c.z + Math.sin(a) * r);
      snag.rotation.set(rnd(-0.1, 0.1), rnd(0, 6.28), rnd(-0.1, 0.1));
      actRoot.add(snag);
      addSolid(snag.position.x, snag.position.z, 0.4);
    }
  }

  function buildMonolith() {
    const c = nodesPos.get('roca');
    const mono = new THREE.Mesh(new THREE.BoxGeometry(2, 5.3, 1.15), lam(0x20262a));
    mono.position.set(c.x, 2.5, c.z); mono.rotation.set(0, 0.5, 0.05);
    actRoot.add(mono);
    const stone = new THREE.IcosahedronGeometry(0.35, 0);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(stone, lam(0x181c1e));
      s.position.set(c.x + rnd(-1.8, 1.8), 0.2, c.z + rnd(-1.6, 1.6));
      actRoot.add(s);
    }
    addSolid(c.x, c.z, 1.5);
  }

  function buildCampfire() {
    const c = nodesPos.get('claro');
    const stone = new THREE.IcosahedronGeometry(0.3, 0);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const s = new THREE.Mesh(stone, lam(0x1a1512));
      s.position.set(c.x + Math.cos(a) * 1.1, 0.15, c.z + Math.sin(a) * 1.1);
      actRoot.add(s);
    }
    fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 7),
      new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.92 }));
    fireCone.position.set(c.x, 0.85, c.z); actRoot.add(fireCone);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd45e }));
    inner.position.set(c.x, 0.55, c.z); actRoot.add(inner);
    fire = new THREE.PointLight(0xff8a3a, 1.25, 26, 2);
    fire.position.set(c.x, 2.2, c.z); actRoot.add(fire);
    addSolid(c.x, c.z, 1.2);
  }

  function buildFence() {
    const c = nodesPos.get('cercas');
    const postGeo = new THREE.BoxGeometry(0.16, 1.05, 0.16);
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(postGeo, lam(0x2e2416));
      p.position.set(c.x - 3.5, 0.52, 46.5 + i * 1.8);
      p.rotation.z = rnd(-0.04, 0.04);
      actRoot.add(p);
      addSolid(p.position.x, p.position.z, 0.3);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 21.6), lam(0x241b10));
    rail.position.set(c.x - 3.5, 0.85, 56.4); actRoot.add(rail);
  }

  function buildOrchard() {
    const c = nodesPos.get('huerto');
    const deadGeo = new THREE.CylinderGeometry(0.14, 0.3, 1, 5);
    const orch = new THREE.InstancedMesh(deadGeo, lam(0x1a120b), 25);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let n = 0;
    for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) {
      const h = rnd(1.5, 2.3);
      q.setFromEuler(new THREE.Euler(rnd(-0.05, 0.05), rnd(0, 6.28), rnd(-0.05, 0.05)));
      sc.set(1, h, 1);
      const x = c.x - 6.4 + col * 3.2 + rnd(-0.4, 0.4);
      const z = c.z - 6.4 + r * 3.2 + rnd(-0.4, 0.4);
      v.set(x, h / 2, z);
      m.compose(v, q, sc); orch.setMatrixAt(n++, m);
      addSolid(x, z, 0.3);
    }
    actRoot.add(orch);
  }

  function buildDoor() {
    const c = nodesPos.get('puerta');
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); actRoot.add(g);
    const wood = lam(0x241a0e);
    const box = (w, h, d, x, y, z) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
      b.position.set(x, y, z); g.add(b);
    };
    box(0.45, 3.1, 0.45, -1.25, 1.55, 0);
    box(0.45, 3.1, 0.45, 1.25, 1.55, 0);
    box(3.2, 0.45, 0.5, 0, 3.2, 0);
    // umbral de luz: el portal de salida
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.9),
      new THREE.MeshBasicMaterial({ color: 0xf5e6b8, transparent: true, opacity: 0.82, fog: false }));
    portal.position.set(0, 1.45, 0); portal.rotation.y = Math.PI; g.add(portal);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.2),
      new THREE.MeshBasicMaterial({ color: 0x6a5a30, transparent: true, opacity: 0.32, fog: false }));
    halo.position.set(0, 2.4, 0.05); halo.rotation.y = Math.PI; g.add(halo);
    portalLight = new THREE.PointLight(0xffe6b0, 0.9, 20, 2);
    portalLight.position.set(0, 2, -0.8); g.add(portalLight);
    addSolid(c.x - 1.25, c.z, 0.55);
    addSolid(c.x + 1.25, c.z, 0.55);
  }

  // ---------- entes (mallas 3D; ojos que atraviesan la niebla) ----------
  function makeEnt(kind) {
    const grp = new THREE.Group();
    const mats = [];
    const mat = (c) => { const m = new THREE.MeshLambertMaterial({ color: c, transparent: true }); mats.push(m); return m; };
    const glow = (c) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, fog: false }); mats.push(m); return m; };
    const add = (geo, m, x, y, z) => {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); grp.add(o); return o;
    };
    if (kind === 'witch') {
      add(new THREE.ConeGeometry(0.55, 3.2, 7), mat(0x040404), 0, 1.6, 0);
      add(new THREE.SphereGeometry(0.3, 8, 8), mat(0x040404), 0, 3.35, 0);
      add(new THREE.SphereGeometry(0.06, 6, 6), glow(0xff3c28), -0.1, 3.4, 0.26);
      add(new THREE.SphereGeometry(0.06, 6, 6), glow(0xff3c28), 0.1, 3.4, 0.26);
    } else { // goat (Black Phillip)
      const body = add(new THREE.SphereGeometry(1, 9, 8), mat(0x050505), 0, 1.05, 0);
      body.scale.set(0.9, 0.85, 1.6);
      add(new THREE.BoxGeometry(0.42, 0.5, 0.55), mat(0x050505), 0, 1.55, 1.15);
      const hl = add(new THREE.BoxGeometry(0.07, 0.55, 0.07), mat(0x050505), -0.16, 1.95, 1.05);
      hl.rotation.z = 0.45;
      const hr = add(new THREE.BoxGeometry(0.07, 0.55, 0.07), mat(0x050505), 0.16, 1.95, 1.05);
      hr.rotation.z = -0.45;
      for (const [lx, lz] of [[-0.45, 0.55], [0.45, 0.55], [-0.45, -0.6], [0.45, -0.6]])
        add(new THREE.BoxGeometry(0.14, 1.0, 0.14), mat(0x050505), lx, 0.5, lz);
      add(new THREE.SphereGeometry(0.075, 6, 6), glow(0xffd25e), -0.13, 1.62, 1.45);
      add(new THREE.SphereGeometry(0.075, 6, 6), glow(0xffd25e), 0.13, 1.62, 1.45);
    }
    grp.visible = false;
    actRoot.add(grp);
    return { grp, mats, fade: 0, target: 0, speed: 0, catch: null, placedFor: null };
  }

  function syncEntities(list, curNode) {
    if (!actRoot) return;
    for (const e of list) {
      let rec = ents.get(e.id);
      if (!rec) { rec = makeEnt(e.css || 'goat'); ents.set(e.id, rec); }
      rec.speed = e.css === 'witch' ? 2.75 : 2.95;
      rec.catch = e.catch;
      rec.target = e.node === curNode ? 1 : 0;
      if (rec.target && rec.placedFor !== e.node) {   // aparece en un punto del claro
        const c = nodesPos.get(e.node);
        const a = (e.id.charCodeAt(0) * 2.4) % (Math.PI * 2);
        rec.grp.position.set(c.x + Math.cos(a) * 8, 0, c.z + Math.sin(a) * 8);
        rec.placedFor = e.node;
      }
    }
  }

  // ---------- jugador: posición, cámara, mirada ----------
  function snapTo(id) {
    const p = nodesPos.get(id);
    player.pos = new THREE.Vector3(p.x, 0, p.z);
    player.yaw = Math.PI;                            // al despertar, miras al norte
    player.pitch = 0; player.bob = 0; player.stride = 0;
    look.yawOff = 0; look.pitchOff = 0;
    nearest = id;                                    // silencioso: sin evento
  }

  function enterNode(id, instant) {
    if (instant) snapTo(id);                          // el jugador ya está ahí
  }

  // mirada libre (pointer lock): gira yaw/pitch; anula el parallax
  function addLook(dx, dy) {
    look.yawOff = 0; look.pitchOff = 0;
    player.yaw -= dx * 0.0023;
    player.pitch = Math.max(-1.15, Math.min(1.15, player.pitch - dy * 0.0021));
  }
  // parallax de ratón sin captura (respaldo)
  function lookTo(nx, ny) {
    look.yawOff = (nx - 0.5) * 1.05;
    look.pitchOff = (ny - 0.5) * 0.55;
  }

  function tick(dt, st) {
    if (!actRoot || !camera || !player.pos) return;
    tClk += dt;

    // movimiento libre: WASD relativo a la mirada, con colisiones y atajos
    const mv = st.move || {};
    const f = mv.f || 0, s = mv.s || 0;
    player.moving = !!(f || s);
    if (player.moving) {
      const sp = (mv.run ? RUN : SPEED) * dt;
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      const rx = -fz, rz = fx;
      player.pos.x += (fx * f + rx * s) * sp;
      player.pos.z += (fz * f + rz * s) * sp;
      player.pos.x = Math.max(BOUND[0], Math.min(BOUND[1], player.pos.x));
      player.pos.z = Math.max(BOUND[0], Math.min(BOUND[1], player.pos.z));
      collide(player.pos);
      player.bob += (mv.run ? 13 : 9) * dt;
      player.stride += sp;
      const STRIDE = mv.run ? 3.0 : 2.2;             // un pie tras otro
      if (player.stride >= STRIDE) {
        player.stride = 0;
        if (ev.onFootstep) ev.onFootstep();
      }
    }

    // nodo actual = el más cercano (con histéresis de 3 m contra el parpadeo)
    let best = null, bd = Infinity;
    for (const [id, p] of nodesPos) {
      const d = (p.x - player.pos.x) ** 2 + (p.z - player.pos.z) ** 2;
      if (d < bd) { bd = d; best = id; }
    }
    if (best !== nearest) {
      const cur = nodesPos.get(nearest);
      const dCur = Math.hypot(cur.x - player.pos.x, cur.z - player.pos.z);
      if (Math.sqrt(bd) < dCur - 3) {
        nearest = best;
        if (ev.onNode) ev.onNode(best);
      }
    }

    // cámara del jugador
    const yawT = player.yaw + look.yawOff, pitchT = player.pitch + look.pitchOff;
    camera.position.set(player.pos.x,
      EYE + (player.moving ? Math.sin(player.bob) * 0.05 : Math.sin(tClk * 1.4) * 0.02),
      player.pos.z);
    camera.rotation.set(pitchT, yawT, 0);

    // entes: fundido y, en tu nodo, acoso físico hasta alcanzarte
    for (const [, rec] of ents) {
      rec.fade += (rec.target - rec.fade) * Math.min(1, dt * 2.2);
      const on = rec.fade > 0.02;
      rec.grp.visible = on;
      if (!on) continue;
      if (rec.target && rec.speed) {
        const px = player.pos.x - rec.grp.position.x;
        const pz = player.pos.z - rec.grp.position.z;
        const d = Math.hypot(px, pz);
        if (d > 1.65) {
          rec.grp.position.x += px / d * rec.speed * dt;
          rec.grp.position.z += pz / d * rec.speed * dt;
        }
        if (d <= CATCH_DIST && ev.onCaught) {
          const fire = ev.onCaught; ev.onCaught = null; // una sola vez por acto
          fire(rec.catch);
        }
      }
      rec.grp.lookAt(player.pos.x, 0, player.pos.z);
      for (const m of rec.mats) m.opacity = rec.fade;
    }

    // luces vivas
    if (torch) {
      torch.position.copy(camera.position);
      torch.intensity = (0.5 + 0.62 * (st.flick || 1)) * (0.3 + 0.7 * (st.torch ?? 1));
    }
    if (fire) {
      fire.intensity = 1.05 + 0.35 * Math.sin(tClk * 9.7) * Math.sin(tClk * 3.3 + 1.2);
      if (fireCone) fireCone.scale.set(1, 1 + 0.12 * Math.sin(tClk * 8.3), 1);
    }
    if (candle) candle.intensity = 0.5 + 0.14 * Math.sin(tClk * 11.3) * Math.sin(tClk * 5.1);
    if (portalLight) portalLight.intensity = 0.85 + 0.15 * Math.sin(tClk * 1.9);

    if (renderer) renderer.render(scene, camera);
  }

  // proyecta un punto del mundo a coordenadas de pantalla (%); null si queda detrás
  function project(p) {
    if (!camera) return null;
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100 };
  }
  function playerPos() {
    return player.pos ? { x: player.pos.x, z: player.pos.z } : null;
  }

  // ---------- API pública ----------
  function init() {
    if (renderer || !use3()) return;
    const cv = document.getElementById('view3d');
    const vp = document.getElementById('viewport');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const size = () => {
      renderer.setSize(vp.clientWidth, vp.clientHeight);
      camera.aspect = vp.clientWidth / vp.clientHeight;
      camera.updateProjectionMatrix();
    };
    size();
    window.addEventListener('resize', size);
  }

  function bind(events) { ev = events; }

  function buildAct(a) {
    if (!use3()) return null;
    act = a;
    if (!scene) scene = new THREE.Scene();
    if (!camera) {
      camera = new THREE.PerspectiveCamera(55, 5 / 3, 0.1, 500);
      camera.rotation.order = 'YXZ';
    }
    if (actRoot) { scene.remove(actRoot); disposeDeep(actRoot); }
    actRoot = new THREE.Group(); scene.add(actRoot);
    nodesPos.clear();
    ents.clear();
    solids.clear();
    torch = fire = fireCone = candle = portalLight = null;
    for (const id of Object.keys(act.nodes)) nodesPos.set(id, worldPos(id));

    // atmósfera del bosque colonial
    scene.fog = new THREE.FogExp2(0x090d0a, 0.032);
    scene.background = new THREE.Color(0x070907);
    actRoot.add(new THREE.HemisphereLight(0x27323d, 0x0b0e0a, 0.55));
    const moonL = new THREE.DirectionalLight(0x93a7bd, 0.28);
    moonL.position.set(-60, 90, -40); actRoot.add(moonL);
    // luna en el cielo (su material ignora la niebla)
    const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 24),
      new THREE.MeshBasicMaterial({ color: 0xd9e2ea, fog: false }));
    moon.position.set(-140, 150, -90); moon.lookAt(56, 0, 56); actRoot.add(moon);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(15, 24),
      new THREE.MeshBasicMaterial({ color: 0x27313a, transparent: true, opacity: 0.5, fog: false }));
    halo.position.set(-141, 151, -91); halo.lookAt(56, 0, 56); actRoot.add(halo);
    // suelo
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), lam(0x131811));
    ground.rotation.x = -Math.PI / 2; ground.position.set(56, 0, 56); actRoot.add(ground);

    // aristas del grafo → senderos tallados en el bosque
    const edges = [];
    for (const [id, n] of Object.entries(act.nodes))
      for (const to of Object.values(n.exits || {}))
        if (to && act.nodes[to] && id < to) edges.push([nodesPos.get(id), nodesPos.get(to)]);

    const forest = plantForest(edges);
    buildCabin(); buildSwamp(); buildMonolith(); buildCampfire(); buildFence(); buildOrchard(); buildDoor();
    torch = new THREE.PointLight(0xffb066, 1.15, 22, 2); actRoot.add(torch);

    snapTo(act.start);
    return { nodes: nodesPos.size, meshes: actRoot.children.length, ...forest };
  }

  function debug() {
    if (!camera) return null;
    const yawT = player.yaw + look.yawOff;
    return {
      pos: camera.position.toArray(),
      yaw: yawT,
      fwd: { x: -Math.sin(yawT), z: -Math.cos(yawT) },
      nearest, moving: player.moving, ents: ents.size,
    };
  }

  return { init, buildAct, bind, enterNode, addLook, lookTo, tick, syncEntities,
           project, playerPos, debug, available: () => !!use3() };
})();

if (typeof window !== 'undefined') window.SCENE3D = SCENE3D;
if (typeof module !== 'undefined') module.exports = SCENE3D;
