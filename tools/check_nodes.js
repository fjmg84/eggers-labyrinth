#!/usr/bin/env node
// check_nodes.js — smoke test: valida el grafo de todos los actos registrados.
// Uso: node tools/check_nodes.js
'use strict';

const path = require('path');
const { ACTS, validateAct } = require(path.join(__dirname, '..', 'js', 'nodes.js'));

// registrar los actos (browser-less)
require(path.join(__dirname, '..', 'js', 'demo.js'));

const acts = Object.values(ACTS).sort((a, b) => a.index - b.index);
if (!acts.length) { console.error('FALLO: ningún acto registrado'); process.exit(1); }

let fail = 0;
for (const act of acts) {
  const errs = validateAct(act);
  if (errs.length) {
    fail = 1;
    console.error(`✗ ACTO ${act.num || act.index} ${act.title}`);
    for (const e of errs) console.error(`   - ${e}`);
  } else {
    console.log(`✓ ACTO ${act.num || act.index} ${act.title} — ${Object.keys(act.nodes).length} nodos`);
  }
}
process.exit(fail);
