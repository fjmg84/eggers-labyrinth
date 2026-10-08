# Plan de Desarrollo — *The Folktales of Eggers*

Motor 2D primera persona por capas (estilo P.T. / Layers of Fear), escenarios modelados en CSS3 hasta que lleguen las fotos.
Flujo: una rama por fase → tú commiteas, pusheas y mergeas a `main` → siguiente rama.

## Fase 0 — Limpieza y renombrado (rama `juego-2d`)

- [x] Renombrar rama `threejs-engine` → `juego-2d`
- [x] Restaurar `index.html`, `js/engine.js`, `style.css` a HEAD (borrar cambios 3D)
- [x] Eliminar `js/scene.js`, `js/assets.gen.js`, `tools/embed_textures.py`, `docs/guion_juego_nosferatu.md`
- [x] Conservar docs nuevos (`guion_completo_del_juego.md`, cambios en `documento_de_dise_o_y_desarrollo.md`)
- [x] Crear `docs/arquitectura_visual_2d.md` con la especificación técnica 2D (layering, efectos, estética por acto)
- [x] Commit solo de docs

## Fase 1 — Motor base 2D (rama `juego-2d`, checkpoint 1 → merge a main)

- [x] `index.html`: viewport por capas (fondo, parallax/depth, luz/niebla con `--light-x/y`, entes, UI/lente)
- [x] `js/nodes.js`: grafo de nodos por acto `{id, capas CSS, salidas WASD, hotspots, spawns}` + BFS de alcanzabilidad
- [x] `js/engine.js`: flujo de pantallas (título → cartela → juego → muerte → victoria) reutilizando el DOM actual
- [x] Movimiento WASD/flechas entre nodos con transición cinemática
- [x] Movimiento continuo: mantener la tecla camina (ritmo ~0.6 s por paso)
- [x] Transición direccional: dolly (W/S) y paneo con parallax (A/D)
- [x] Capa `#passers`: siluetas que barren la pantalla en cada paso
- [x] Parallax de mirada con ratón + linterna siguiendo el cursor
- [x] Interacción `E`/clic en hotspots
- [x] HUD de objetivo/inventario genérico
- [x] `setActAtmosphere()`: filtros CSS por acto (adaptado del GDD)
- [x] Partículas de niebla en canvas
- [x] Eliminar `js/map.js` (laberinto procedural ya no aplica)
- [x] Escena placeholder de 2-3 nodos para probar (`js/demo.js`)
- [x] `tools/check_nodes.js`: valida grafos (salidas existen, objetivo alcanzable)
- [ ] **CHECKPOINT: tú pruebas, comiteas y mergeas a `main`**

## Fase 2 — Acto I: *La Bruja* (rama `acto-i` desde main)

- [x] ~12-14 nodos CSS: bosque claustrofóbico, claros, cabaña puritana (13 nodos, `js/act1.js`)
- [x] Objetivo: 3 Páginas de la Sangre → Puerta del Bosque
- [x] Mecánica: antorcha que se consume (medidor)
- [x] Ente: Black Phillip (acecha desde la penumbra)
- [x] Ente: La Bruja (aparece si te demoras en zonas oscuras)
- [x] Lore del guion: texto inicial, manuscrito puritano, línea de Black Phillip
- [x] Estética: frío/desaturado, grano 35mm, niebla reactiva a la linterna, partículas en el haz
- [x] Validar con `tools/check_nodes.js`
- [x] Escenarios legibles: siluetas negras sobre niebla clara, luna y encuadre por nodo
- [x] Capa `#exits`: senderos de luz pulsantes hacia cada salida disponible
- [x] Destello siempre visible en hotspots (`::after`) para identificar lo interactivo
- [x] Luminosidad global: atmósfera `brightness(0.9)` + viñeta suavizada
- [x] Fotos HD reales por nodo (Wikimedia Commons; créditos en `assets/img/CREDITS.md`), brújula N/S/E/O clicable, minimapa de nodos visitados y nombre de escena al llegar
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 2b — Motor 3D del mundo (rama `motor-3d`)

- [x] Three.js r128 vendido localmente (`js/lib/three.min.js`, MIT) — sin CDN ni build step
- [x] Mundo 3D continuo por acto (`js/scene3d.js`): bosque instanciado (pinos/muertos) con senderos tallados según el grafo, luna, niebla y luz volumétrica
- [x] Hitos por nodo: cabaña (exterior/interior), pantano, monolito, hoguera, cercas, huerto, muralla y puerta de salida
- [x] Entes 3D (Black Phillip, La Bruja) con ojos que atraviesan la niebla; fundido al entrar en tu nodo
- [x] Navegación por nodos intacta: la cámara desliza por los senderos y aterriza mirando el hito; antorcha alimenta la luz 3D
- [x] Fallback 2D (escenas CSS/fotos) conservado si WebGL no está disponible
- [x] `tools/check_scene3d.js`: prueba de humo headless (mundo, cámara, deslizamiento, entes)
- [ ] **CHECKPOINT: tú mergeas a `main`**

## Fase 2c — Movimiento libre en primera persona (rama `main`)

- [x] WASD continuo + correr (MAYÚS) con colisiones por rejilla de sólidos (árboles, muros, monolito, mesa, cercas)
- [x] Mirada libre con pointer lock (clic); parallax de ratón como respaldo sin captura
- [x] Hotspots anclados al mundo 3D (`at`): el destello se proyecta sobre su objeto real y solo responde de cerca (E usa el más próximo)
- [x] Entes: acechan por el grafo y cazan físicamente dentro de tu claro (adiós al temporizador de gracia; escape real corriendo)
- [x] Minimapa continuo: tu punto se mueve en tiempo real; rombos de objetivos y anillo de meta intactos
- [x] Sistema de nodos debajo de todo: define escenas, zonas oscuras, objetivos y a dónde van los entes
- [x] `tools/check_scene3d.js` ampliado: caminar, girar, colisiones (muro sí, puerta no), caza del ente
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
