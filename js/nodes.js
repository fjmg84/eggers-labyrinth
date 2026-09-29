// nodes.js — grafo de nodos por acto + alcanzabilidad (lógica pura, sin DOM).
// Un acto = { index, title, epigraph, atmosphere, start, goal, nodes: {id → Node} }.
// Node = { scene, exits: {n|s|e|w → id}, hotspots?, spawns? }.
// WASD/flechas: W=norte, S=sur, A=oeste, D=este (según salidas declaradas).
'use strict';

const ACTS = {};

function registerAct(act) { ACTS[act.index] = act; }

function neighbors(node) {
  return Object.values(node.exits || {}).filter(Boolean);
}

// BFS desde start; devuelve Set de ids alcanzables.
function reachable(act) {
  const seen = new Set([act.start]);
  const q = [act.start];
  while (q.length) {
    const n = act.nodes[q.shift()];
    if (!n) continue;
    for (const id of neighbors(n)) {
      if (!seen.has(id) && act.nodes[id]) { seen.add(id); q.push(id); }
    }
  }
  return seen;
}

// Errores de estructura: [] = válido.
function validateAct(act) {
  const errs = [];
  if (!act.nodes || !Object.keys(act.nodes).length) return [`${act.title || act.index}: sin nodos`];
  if (!act.nodes[act.start]) errs.push(`inicio '${act.start}' no existe`);
  if (!act.nodes[act.goal]) errs.push(`meta '${act.goal}' no existe`);
  for (const [id, n] of Object.entries(act.nodes)) {
    for (const [dir, to] of Object.entries(n.exits || {})) {
      if (to && !act.nodes[to]) errs.push(`nodo '${id}' salida ${dir} → '${to}' inexistente`);
    }
  }
  const seen = reachable(act);
  for (const id of Object.keys(act.nodes)) {
    if (!seen.has(id)) errs.push(`nodo '${id}' inalcanzable desde '${act.start}'`);
  }
  if (act.nodes[act.goal] && !seen.has(act.goal)) errs.push(`meta '${act.goal}' inalcanzable`);
  return errs;
}

// exportación: navegador por globals, node para tools/check_nodes.js
const NODES_API = { ACTS, registerAct, reachable, validateAct };
if (typeof window !== 'undefined') window.NODES = NODES_API;
if (typeof module !== 'undefined') module.exports = NODES_API;
