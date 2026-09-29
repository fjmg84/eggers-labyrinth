# Plan de Desarrollo — *The Folktales of Eggers*

Motor 2D primera persona por capas (estilo P.T. / Layers of Fear), escenarios modelados en CSS3 hasta que lleguen las fotos.
Flujo: una rama por fase → tú commiteas, pusheas y mergeas a `main` → siguiente rama.

## Fase 0 — Limpieza y renombrado (rama `juego-2d`)

- [ ] Renombrar rama `threejs-engine` → `juego-2d`
- [ ] Restaurar `index.html`, `js/engine.js`, `style.css` a HEAD (borrar cambios 3D)
- [ ] Eliminar `js/scene.js`, `js/assets.gen.js`, `tools/embed_textures.py`, `docs/guion_juego_nosferatu.md`
- [ ] Conservar docs nuevos (`guion_completo_del_juego.md`, cambios en `documento_de_dise_o_y_desarrollo.md`)
- [ ] Crear `docs/arquitectura_visual_2d.md` con la especificación técnica 2D (layering, efectos, estética por acto)
- [ ] Commit solo de docs

## Fase 1 — Motor base 2D (rama `juego-2d`, checkpoint 1 → merge a main)

- [ ] `index.html`: viewport por capas (fondo, parallax/depth, luz/niebla con `--light-x/y`, entes, UI/lente)
- [ ] `js/nodes.js`: grafo de nodos por acto `{id, capas CSS, salidas WASD, hotspots, spawns}` + BFS de alcanzabilidad
- [ ] `js/engine.js`: flujo de pantallas (título → cartela → juego → muerte → victoria) reutilizando el DOM actual
- [ ] Movimiento WASD/flechas entre nodos con transición cinemática
- [ ] Parallax de mirada con ratón + linterna siguiendo el cursor
- [ ] Interacción `E`/clic en hotspots
- [ ] HUD de objetivo/inventario genérico
- [ ] `setActAtmosphere()`: filtros CSS por acto (adaptado del GDD)
- [ ] Partículas de niebla en canvas
- [ ] Eliminar `js/map.js` (laberinto procedural ya no aplica)
- [ ] Escena placeholder de 2-3 nodos para probar
- [ ] `tools/check_nodes.js`: valida grafos (salidas existen, objetivo alcanzable)
- [ ] **CHECKPOINT: tú pruebas, comiteas y mergeas a `main`**

## Fase 2 — Acto I: *La Bruja* (rama `acto-i` desde main)

- [ ] ~12-14 nodos CSS: bosque claustrofóbico, claros, cabaña puritana
- [ ] Objetivo: 3 Páginas de la Sangre → Puerta del Bosque
- [ ] Mecánica: antorcha que se consume (medidor)
- [ ] Ente: Black Phillip (acecha desde la penumbra)
- [ ] Ente: La Bruja (aparece si te demoras en zonas oscuras)
- [ ] Lore del guion: texto inicial, manuscrito puritano, línea de Black Phillip
- [ ] Estética: frío/desaturado, grano 35mm, niebla reactiva a la linterna, partículas en el haz
- [ ] Validar con `tools/check_nodes.js`
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 3 — Acto II: *El Faro* (rama `acto-ii` desde main)

- [ ] ~12-14 nodos: isla rocosa, cimientos, pasillos de piedra, sala inundada
- [ ] Objetivo: 2 Llaves de Bronce → drenar la sala
- [ ] Mecánica: cordura vs sirena (alucinaciones)
- [ ] Entes: gaviotas furiosas / sirena
- [ ] Lore: texto inicial, diario del farero, voces de la sirena
- [ ] Estética: B/N alto contraste 1:1, destellos lens-flare, gotas de lluvia/sal en el lente
- [ ] Validar con `tools/check_nodes.js`
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 4 — Acto III: *El Hombre del Norte* (rama `acto-iii` desde main)

- [ ] ~12-14 nodos: túmulo vikingo, cuevas volcánicas, altares, pedestales
- [ ] Objetivo: espada *Draugr* → romper la runa de contención
- [ ] Mecánica: antorchas de pared encendibles para frenar sombras
- [ ] Entes: Draugr (persecución, rompe puertas), Valkirias espectrales (alertan)
- [ ] Lore: texto inicial, inscripción rúnica, grito del Draugr
- [ ] Estética: ámbar profundo/carbón, resplandor de brasas (bloom), heat haze
- [ ] Validar con `tools/check_nodes.js`
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 5 — Acto IV: *Nosferatu* (rama `acto-iv` desde main)

- [ ] ~12-14 nodos: catacumbas, criptas, alcantarillado de Wisborg
- [ ] Objetivo: romper 3 Sigilos de Cera con el farol → compuerta del puerto
- [ ] Mecánica: farol de aceite con medidor de combustible
- [ ] Entes: Conde Orlok (oscuridad total, mirarle a los ojos = cordura), Devoradores de la Plaga (reaccionan a ruido)
- [ ] Lore: texto inicial, nota de la Dra. Clara Reinhardt, susurro de Orlok
- [ ] Estética: sepia claroscuro, sombras largas dinámicas en esquinas
- [ ] Validar con `tools/check_nodes.js`
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 6 — Acto V: *Werwulf* (rama `acto-v` desde main)

- [ ] ~12-14 nodos: campiña medieval, ruinas de la abadía, torre de la campana
- [ ] Objetivo: Cera Bendita → reparar mecanismo → sonar la campana
- [ ] Mecánica: sigilo extremo (agacharse, sombras, coberturas; detección por olor/ruido)
- [ ] Ente: el Werwulf (persecución a alta velocidad si detecta)
- [ ] Lore: texto inicial, sermón del fraile, monólogo de la bestia
- [ ] Estética: luna azul plomiza, niebla rasante, motion blur, pupilas reflectantes, bokeh
- [ ] Epílogo: final de victoria (5 actos) y final de derrota del guion
- [ ] Validar con `tools/check_nodes.js`
- [ ] **CHECKPOINT: tú mergeas a `main`**

---

### Notas

- Los escenarios se modelan con CSS3 hasta que lleguen las fotos; luego se sustituyen las capas por imágenes HD.
- `docs/arquitectura_visual_2d.md` es la referencia de estética/efectos para todos los actos.
- Sonidos: ver `docs/sonidos.md`.
