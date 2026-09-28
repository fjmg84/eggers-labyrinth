// map.js — laberintos procedurales de la abadía (lógica pura, sin DOM)
'use strict';

const FLOOR = 0, WALL = 1, GLOW = 2;

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHAPTERS = [
  { num: 'I',    name: 'EL CLAVSTRO',    epigraph: '«Media vita in morte sumus.»',          size: 15, revs: 1, revSpeed: 1.15, fog: 7.5, doors: 3, seed: 1153 },
  { num: 'II',   name: 'LA CRIPTA',      epigraph: '«De profundis clamavi ad te, Domine.»', size: 19, revs: 2, revSpeed: 1.30, fog: 6.4, doors: 4, seed: 1179 },
  { num: 'III',  name: 'LAS CATACVMBAS', epigraph: '«Timor mortis conturbat me.»',          size: 25, revs: 2, revSpeed: 1.55, fog: 5.4, doors: 5, seed: 1204 },
  { num: 'IIII', name: 'EL OSARIO',      epigraph: '«Requiem aeternam dona eis, Domine.»',  size: 31, revs: 3, revSpeed: 1.80, fog: 4.5, doors: 6, seed: 1217 },
  { num: 'V',    name: 'DE PROFVNDIS',   epigraph: '«Libera eas de ore leonis.»',           size: 39, revs: 4, revSpeed: 2.05, fog: 3.7, doors: 8, seed: 1244 },
];

// BFS sobre celdas transitables (suelo y puertas; el resplandor bloquea).
// Devuelve {dist, parent} en Int32Array, -1 = no alcanzable.
function bfs(grid, W, H, sx, sy) {
  const dist = new Int32Array(W * H).fill(-1);
  const parent = new Int32Array(W * H).fill(-1);
  const q = [sy * W + sx];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % W, cy = (c / W) | 0, d = dist[c];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (grid[ny * W + nx] !== FLOOR) continue;
      const n = ny * W + nx;
      if (dist[n] !== -1) continue;
      dist[n] = d + 1;
      parent[n] = c;
      q.push(n);
    }
  }
  return { dist, parent };
}

// Trayectoria en línea recta libre de muros entre dos puntos (DDA de rejilla).
function lineOfSight(grid, W, H, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy) * 3);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = (x0 + dx * t) | 0, y = (y0 + dy * t) | 0;
    if (grid[y * W + x] !== FLOOR) return false;
  }
  return true;
}

// ¿Es (x,y) una celda de pasillo con muros a dos lados opuestos? (para puertas)
function isCorridor(grid, W, H, x, y) {
  const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H ? WALL : grid[yy * W + xx]);
  const NS = g(x - 1, y) >= WALL && g(x + 1, y) >= WALL && g(x, y - 1) === FLOOR && g(x, y + 1) === FLOOR;
  const EW = g(x, y - 1) >= WALL && g(x, y + 1) >= WALL && g(x - 1, y) === FLOOR && g(x + 1, y) === FLOOR;
  return NS ? 'ns' : EW ? 'ew' : null;
}

function genMaze(cfg, seedOverride) {
  const S = cfg.size, W = S, H = S;
  const rnd = mulberry32(seedOverride != null ? seedOverride : cfg.seed);
  const grid = new Uint8Array(W * H).fill(WALL);

  // backtracker recursivo: celdas en coordenadas impares
  const stack = [[1, 1]];
  grid[1 * W + 1] = FLOOR;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && grid[ny * W + nx] === WALL;
    });
    if (!dirs.length) { stack.pop(); continue; }
    const [dx, dy] = dirs[(rnd() * dirs.length) | 0];
    const nx = cx + dx, ny = cy + dy;
    grid[ny * W + nx] = FLOOR;
    grid[(cy + dy / 2) * W + (cx + dx / 2)] = FLOOR;
    stack.push([nx, ny]);
  }

  // trenzado: abre algunos callejones sin salida para crear bucles (escape posible)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (grid[y * W + x] !== FLOOR) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const open = nb.filter(([dx, dy]) => grid[(y + dy) * W + (x + dx)] === FLOOR);
    if (open.length === 1 && rnd() < 0.18) {
      const walls = nb.filter(([dx, dy]) => {
        const w = grid[(y + dy) * W + (x + dx)], o = grid[(y + dy * 2) * W + (x + dx * 2)];
        return w === WALL && o === FLOOR && x + dx * 2 > 0 && y + dy * 2 > 0 && x + dx * 2 < W - 1 && y + dy * 2 < H - 1;
      });
      if (walls.length) {
        const [dx, dy] = walls[(rnd() * walls.length) | 0];
        grid[(y + dy) * W + (x + dx)] = FLOOR;
      }
    }
  }

  // salida: el callejón sin salida más lejano desde el inicio
  const { dist, parent } = bfs(grid, W, H, 1, 1);
  let best = -1, bestD = -1;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = y * W + x;
    if (grid[c] !== FLOOR || dist[c] < 0) continue;
    const deg = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => grid[(y + dy) * W + (x + dx)] === FLOOR).length;
    if (deg === 1 && dist[c] > bestD) { bestD = dist[c]; best = c; }
  }
  if (best < 0) { for (let c = 0; c < W * H; c++) if (dist[c] > bestD) { bestD = dist[c]; best = c; } }
  const ex = best % W, ey = (best / W) | 0;
  const px = parent[best] % W, py = (parent[best] / W) | 0;
  // el muro tras la celda de salida se convierte en resplandor (la luz de afuera)
  const gx = ex + (ex - px), gy = ey + (ey - py);
  grid[gy * W + gx] = GLOW;

  // puertas en el camino inicio→salida, en celdas de pasillo, sin adyacencias
  const doors = [{ x: ex, y: ey, exit: true, axis: isCorridor(grid, W, H, ex, ey) || 'ns' }];
  const path = [];
  for (let c = best; c !== -1; c = parent[c]) path.push(c);
  path.reverse(); // inicio → salida
  const claimed = new Set([best, path[path.length - 2]]);
  let lastIdx = -99;
  for (let i = 3; i < path.length - 3 && doors.length < cfg.doors + 1; i++) {
    const c = path[i], x = c % W, y = (c / W) | 0;
    if (i - lastIdx < 3) continue;
    const axis = isCorridor(grid, W, H, x, y);
    if (!axis) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => claimed.has((y + dy) * W + (x + dx)));
    if (near) continue;
    claimed.add(c);
    lastIdx = i;
    doors.push({ x, y, exit: false, axis });
  }

  // spawns de revenants: lejos del jugador, repartidos
  const spawns = [];
  const maxD = bestD;
  const candidates = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = y * W + x;
    if (grid[c] === FLOOR && dist[c] > maxD * 0.45 && dist[c] < maxD * 0.95 &&
        Math.abs(x - ex) + Math.abs(y - ey) > 4 && !doors.some(d => d.x === x && d.y === y)) {
      candidates.push({ x, y, d: dist[c] });
    }
  }
  for (let i = 0; i < cfg.revs; i++) {
    let pick = null;
    for (let tries = 0; tries < 60 && !pick; tries++) {
      const cand = candidates[(rnd() * candidates.length) | 0];
      if (!cand) break;
      if (spawns.every(s => Math.hypot(s.x - cand.x, s.y - cand.y) > S / 3)) pick = cand;
    }
    if (pick) spawns.push({ x: pick.x, y: pick.y });
  }

  return {
    W, H, grid, start: { x: 1.5, y: 1.5 },
    doors, spawns, maxDist: maxD,
  };
}

// exportación (navegador por globals, node para el smoke test)
if (typeof window !== 'undefined') window.MAP = { genMaze, CHAPTERS, bfs, lineOfSight, isCorridor, FLOOR, WALL, GLOW };
if (typeof module !== 'undefined') module.exports = { genMaze, CHAPTERS, bfs, lineOfSight, isCorridor, FLOOR, WALL, GLOW };
