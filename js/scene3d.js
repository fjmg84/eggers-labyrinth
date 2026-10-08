// scene3d.js — mundo 3D procedural por acto para THE FOLKTALES OF EGGERS (Three.js).
// Genera un bosque continuo con pasillos tallados según el grafo del acto (los
// claros y senderos coinciden con las salidas reales), hitos por nodo (cabaña,
// pantano, monolito, hoguera, cercas, muralla, puerta) y entes como mallas 3D.
// Todo son primitivas + niebla + luz: cero modelos externos.
// Si THREE no está disponible, el motor 2D (CSS/fotos) sigue como fallback.
'use strict';

const SCENE3D = (function () {
  const S = 28;      // metros entre nodos adyacentes del grid
  const EYE = 1.7;   // altura de los ojos

  let THREE = (typeof window !== 'undefined' && window.THREE) || null;
  const use3 = () => THREE || (THREE = (typeof window !== 'undefined' && window.THREE) || null);

  let renderer = null, scene = null, camera = null, actRoot = null;
  let act = null, tClk = 0;
  const nodesPos = new Map();

  // vista: yaw base + offsets de mirada del ratón; la cámara "aterriza" mirando
  // hacia el centro del nodo al llegar (los hitos quedan siempre de frente).
  const view = { yaw: Math.PI, yawOff: 0, pitchOff: 0 };
  const glide = { t: 1, dur: 0.62, from: null, to: null, toId: null, yawFrom: 0, yawTo: 0 };

  // luces vivas del acto
  let torch = null, fire = null, fireCone = null, candle = null, portalLight = null;
  const ents = new Map(); // id → {grp, mats, fade, target, pos}

  const rnd = (a, b) => a + Math.random() * (b - a);
  const yawOf = d => Math.atan2(-d.x, -d.z);   // d=Vector3 horizontal → yaw YXZ
  function lerpAngle(a, b, k) {
    let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * k;
  }

  function worldPos(id) {
    const p = act.nodes[id].pos || act.nodes[id].map;
    return new THREE.Vector3(p[0] * S, EYE, p[1] * S);
  }

  // ---------- utilidades de construcción ----------
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
      // cerca: pasillo lineal propio
      if (distSeg(x, z, -3.5, 46, -3.5, 66) < 2) return false;
      // corredor muralla→puerta para la banda densa
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
        v.set(x, 2.6 * s + 3.8 * s, z);        // copa sobre el tronco
        m.compose(v, q, sc); pines.setMatrixAt(np, m);
        col.setHSL(0.29 + rnd(-0.03, 0.03), 0.32, rnd(0.05, 0.11)); pines.setColorAt(np, col);
        v.set(x, 1.3 * s, z); m.compose(v, q, sc); trunks.setMatrixAt(np, m);
        np++;
      } else if (nd < MAXD) {
        const s = rnd(0.6, 1.2);
        q.setFromEuler(new THREE.Euler(rnd(-0.07, 0.07), rnd(0, 6.28), rnd(-0.07, 0.07)));
        sc.set(s, s, s);
        v.set(x, 2.5 * s, z);
        m.compose(v, q, sc); deads.setMatrixAt(nd, m);
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
    box(3.4, 3.2, 0.3, -2.3, 1.6, -3.5);              // sur: segmento con ventana
    box(3.4, 3.2, 0.3, 2.3, 1.6, -3.5);               // sur: segmento de la puerta
    box(1.2, 0.8, 0.3, 0.0, 2.8, -3.5);               // dintel del hueco
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
  }

  function buildFence() {
    const c = nodesPos.get('cercas');
    const postGeo = new THREE.BoxGeometry(0.16, 1.05, 0.16);
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(postGeo, lam(0x2e2416));
      p.position.set(c.x - 3.5, 0.52, 46.5 + i * 1.8);
      p.rotation.z = rnd(-0.04, 0.04);
      actRoot.add(p);
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
      v.set(c.x - 6.4 + col * 3.2 + rnd(-0.4, 0.4), h / 2, c.z - 6.4 + r * 3.2 + rnd(-0.4, 0.4));
      m.compose(v, q, sc); orch.setMatrixAt(n++, m);
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
    return { grp, mats, fade: 0, target: 0 };
  }

  function syncEntities(list, curNode) {
    if (!actRoot) return;
    for (const e of list) {
      let rec = ents.get(e.id);
      if (!rec) { rec = makeEnt(e.css || 'goat'); ents.set(e.id, rec); }
      rec.target = e.node === curNode ? 1 : 0;
      if (rec.target) {
        const c = nodesPos.get(e.node);
        if (!rec.placedFor || rec.placedFor !== e.node) {  // aparece en un punto del claro
          const a = (e.id.charCodeAt(0) * 2.4) % Math.PI * 2;
          rec.grp.position.set(c.x + Math.cos(a) * 8, 0, c.z + Math.sin(a) * 8);
          rec.placedFor = e.node;
        }
      }
    }
  }

  // ---------- cámara / navegación ----------
  function snapTo(id) {
    camera.position.copy(nodesPos.get(id));
    view.yaw = Math.PI; // al despertar, miras al norte
    glide.t = 1;
  }

  function enterNode(id, instant) {
    if (instant) snapTo(id);
    else if (glide.toId !== id) snapTo(id); // movimiento externo al flujo normal
  }

  function glideTo(id, fromId) {
    if (!THREE || !camera || !nodesPos.has(id)) return;
    const to = nodesPos.get(id);
    const from = camera.position.clone();
    const d = new THREE.Vector3().subVectors(to, from); d.y = 0;
    if (d.length() < 0.3) return;
    const dir = d.clone().normalize();
    const pull = act.nodes[id].pos ? 0 : 5;   // nodos con pos propia ya están bien situados
    const end = to.clone();
    if (pull && d.length() > 9) end.addScaledVector(dir, -pull);
    glide.from = from; glide.to = end; glide.toId = id;
    glide.t = 0; glide.dur = 0.62;
    glide.yawFrom = view.yaw;
    glide.yawTo = yawOf(new THREE.Vector3().subVectors(to, end).setY(0).normalize());
  }

  function lookTo(nx, ny) {
    view.yawOff = (nx - 0.5) * 1.05;
    view.pitchOff = (ny - 0.5) * 0.55;
  }

  function tick(dt, st) {
    if (!actRoot || !camera) return;
    tClk += dt;
    // deslizamiento entre nodos: posición suavizada + yaw hacia el centro del nodo
    if (glide.t < 1) {
      glide.t = Math.min(1, glide.t + dt / glide.dur);
      const k = glide.t * glide.t * (3 - 2 * glide.t);
      camera.position.lerpVectors(glide.from, glide.to, k);
      camera.position.y = EYE + Math.sin(glide.t * Math.PI * 3) * 0.06;  // paso
      view.yaw = lerpAngle(glide.yawFrom, glide.yawTo, k);
    } else {
      camera.position.y = EYE + Math.sin(tClk * 1.4) * 0.02;             // respiración
    }
    camera.rotation.set(view.pitchOff, view.yaw + view.yawOff, 0);
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
    // entes: fundido y siempre de cara al jugador
    for (const [, rec] of ents) {
      rec.fade += (rec.target - rec.fade) * Math.min(1, dt * 2.2);
      const on = rec.fade > 0.02;
      rec.grp.visible = on;
      if (on) {
        rec.grp.lookAt(camera.position.x, 0, camera.position.z);
        for (const m of rec.mats) m.opacity = rec.fade;
      }
    }
    if (renderer) renderer.render(scene, camera);
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

  function buildAct(a) {
    if (!use3()) return null;
    act = a;
    if (!scene) scene = new THREE.Scene();
    if (!camera) camera = new THREE.PerspectiveCamera(55, 5 / 3, 0.1, 500);
    if (actRoot) { scene.remove(actRoot); disposeDeep(actRoot); }
    actRoot = new THREE.Group(); scene.add(actRoot);
    nodesPos.clear();
    ents.clear();
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
    const fwd = { x: -Math.sin(view.yaw + view.yawOff), z: -Math.cos(view.yaw + view.yawOff) };
    return {
      pos: camera.position.toArray(), yaw: view.yaw, fwd,
      gliding: glide.t < 1, ents: ents.size,
    };
  }

  return { init, buildAct, enterNode, glideTo, lookTo, tick, syncEntities, debug,
           available: () => !!use3() };
})();

if (typeof window !== 'undefined') window.SCENE3D = SCENE3D;
if (typeof module !== 'undefined') module.exports = SCENE3D;
