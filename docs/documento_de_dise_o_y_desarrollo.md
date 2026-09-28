# Documento de Diseño de Juego (GDD) & Guion Técnico: Ecos de la Peste

## 1. Ficha Técnica y Concepto

* **Título sugerido:** *Ecos de la Peste: La Travesía de Wisborg*

* **Género:** Horror de supervivencia / Laberinto 3D en HTML5, CSS3 y JavaScript (Three.js).

* **Inspiración:** Estética gótica, expresionismo alemán y la atmósfera opresiva del *Nosferatu* de Robert Eggers.

* **Año de ambientación:** 1838 (Finales del siglo XIX).

## 2. Ambientación y Tono Visual/Sonoro

* **Estética Visual:** Tonos góticos sepia, monocromáticos y claroscuros violentos. Texturas de piedra húmeda, madera podrida, hierro forjado y niebla espesa.

* **Efectos de Pantalla (Post-procesado):** Grano de película de época, viñeteado dinámico según la cordura y desenfoque por pánico.

* **Atmósfera Sonora:** Sonido ambiental 3D (Web Audio API) con crujidos de madera, agua estancada, ratas y susurros de los entes.

## 3. Personajes y Reparto

### Protagonista

* **Elias Vane (El Amanuense):** Joven pasante de contabilidad atrapado en Wisborg. No es un guerrero; depende del uso eficiente de su linterna de aceite y del sigilo para escapar.

### Entes Diabólicos (Enemigos)

* **El Conde Pestilente (La Sombra Ancestral):** Figura desnutrida e imponente con uñas de hierro. Se mueve a través de las sombras y reduce drásticamente la cordura si se le mira fijamente.

* **Los Lurkers de la Plaga:** Antiguos habitantes mutados por la peste. Ciegos pero con un oído agudo; reaccionan a los pasos rápidos del jugador.

* **La Dama del Velo Gris:** Espectro aristócrata del Asilo. Genera duplicados e ilusiones en el mapa (pasillos falsos) visibles solo mediante reflejos.

### Personajes de Apoyo / Lore

* **Dra. Clara Reinhardt:** Deja notas con pistas de navegación y frascos de alcohol medicinal (combustible/cordura).

* **Padre Thomas:** Sacerdote recluido en las celdas que entrega pistas para resolver los acertijos a cambio de no ser liberado.

## 4. Guion Narrativo en 5 Actos

### Introducción

> *"Wisborg sucumbe. El barco sin tripulación trajo consigo más que ratas; trajo la sombra de la Muerte Antigua. Atrapado bajo la ciudad contaminada, debes subir a la superficie antes de que la niebla consuma tu mente. Pero en este laberinto, la luz no te protege... solo revela dónde estás."*

### Acto I: El Despertar en La Fosa

* **Ubicación:** Catacumbas inferiores y depósitos de cadáveres.

* **Objetivo:** Encontrar la **Llave del Pasadizo Inferior**.

* **Amenaza:** Introducción de los *Lurkers de la Plaga*.

### Acto II: Las Galerías de la Peste

* **Ubicación:** Alcantarillado subterráneo y tuberías de drenaje.

* **Objetivo:** Recolectar 3 **Sigilos de Cera** para abrir la Puerta Arqueada.

* **Amenaza:** Aparición inicial de la *Sombra Acechante*.

### Acto III: El Asilo Olvidado

* **Ubicación:** Cimientos del manicomio y celdas de contención.

* **Objetivo:** Activar el **Mecanismo de Engranajes** para elevar la reja.

* **Amenaza:** *Padre Thomas* (NPC) y trampas de cordura.

### Acto IV: La Galería de los Espejos y Estatuas

* **Ubicación:** Criptas nobiliarias bajo la catedral.

* **Objetivo:** Encontrar el **Cáliz de Plata** para deshabilitar las trampas.

* **Amenaza:** *La Dama del Velo Gris* e ilusiones visuales de caminos sin salida.

### Acto V: El Umbral del Puerto (Clímax)

* **Ubicación:** Túneles de salida bajo los muelles de carga.

* **Objetivo:** Encender la campana del faro subterráneo para disipar la niebla y atravesar la verja final.

* **Amenaza:** Persecución activa de *El Conde Pestilente* y todos los entes.

## 5. Implementación Técnica (HTML5 / CSS3 / JavaScript)

### A. Renderizado del Laberinto 3D (Three.js)

```javascript
// Matriz de construcción: 1 = Pared, 0 = Pasillo
const mapGrid = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1]
];

const tileSize = 4;

function buildLabyrinth(scene, wallTexture, floorTexture) {
  const wallGeometry = new THREE.BoxGeometry(tileSize, 5, tileSize);
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.8 });

  const floorGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.6 });

  mapGrid.forEach((row, z) => {
    row.forEach((cell, x) => {
      // Suelo
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(x * tileSize, 0, z * tileSize);
      scene.add(floor);

      // Paredes
      if (cell === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x * tileSize, 2.5, z * tileSize);
        scene.add(wall);
      }
    });
  });
}
```

### B. Iluminación y Efectos Atmosféricos

```javascript
// Niebla densa para limitar el rango de visión
scene.fog = new THREE.FogExp2(0x1a1816, 0.08); 
scene.background = new THREE.Color(0x0a0908);

// Luz del farol vinculada a la cámara del jugador
const lanternLight = new THREE.PointLight(0xffaa55, 1.5, 12);
camera.add(lanternLight);

// Simulación de parpadeo del farol
function updateLantern(time) {
  lanternLight.intensity = 1.3 + Math.sin(time * 0.005) * 0.2 + (Math.random() - 0.5) * 0.1;
}
```

### C. Estilos y Filtro de Película (CSS3)

```css
/* Estilo de imagen de época sobre el canvas 3D */
#game-canvas {
  filter: sepia(0.4) contrast(1.3) brightness(0.8) grayscale(0.3);
}

/* Capa de viñeta para la cordura */
.vignette-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.85) 100%);
  transition: opacity 0.3s ease;
}

/* Animación cuando baja la cordura o un ente se acerca */
.panic-active {
  animation: pulse-panic 0.8s infinite alternate;
}

@keyframes pulse-panic {
  0% { transform: scale(1); filter: blur(0px); }
  100% { transform: scale(1.02); filter: blur(1.5px); }
}
```

### D. Sonido Posicional 3D (Web Audio API)

```javascript
const listener = new THREE.AudioListener();
camera.add(listener);

const monsterSound = new THREE.PositionalAudio(listener);
const audioLoader = new THREE.AudioLoader();

audioLoader.load('assets/audio/monster_breathing.mp3', (buffer) => {
  monsterSound.setBuffer(buffer);
  monsterSound.setRefDistance(2);
  monsterSound.setMaxDistance(15);
  monsterSound.setLoop(true);
  monsterSound.play();
});

// Asignar el sonido al modelo 3D del enemigo
enemyMesh.add(monsterSound);
```

## 6. Repositorios y Fuentes de Recursos Recomendados

### A. Motores, Librerías y Física (JavaScript)
* **Three.js:** Biblioteca principal para el motor 3D en WebGL (`three.js`).
* **Cannon-es:** Motor de físicas liviano compatible con Three.js para detección de colisiones en el laberinto.
* **Howler.js:** Alternativa para gestión de audio ambiental, bucles y efectos sonoros espaciales si prefieres no usar la API nativa directamente.

### B. Modelos 3D y Utilería (Formato GLTF / GLB)
* **Sketchfab:** Excelente plataforma para buscar activos en 3D gratuitos (filtrando por licencia *Creative Commons*). Palabras clave: *"gothic lantern"*, *"dungeon wall modular"*, *"old wooden door"*, *"vampire creature"*.
* **Poly Pizza:** Repositorio de modelos 3D *low-poly* ligeros ideales para prototipado rápido en WebGL.
* **Mixamo (by Adobe):** Plataforma gratuita con rigs y animaciones para personajes humanos o criaturas 3D (para animar los movimientos de *Elias* o los *Lurkers*).

### C. Texturas PBR (Materiales de Paredes y Suelos)
* **AmbientCG (antes CC0 Textures):** Texturas de alta resolución gratuitas y de dominio público (CC0). Ideales para conseguir piedra de calabozo, madera podrida y adoquines húmedos con mapas de rugosidad y normales.
* **Poly Haven:** Texturas PBR e iluminación HDRI gratuitas para generar reflejos y mapas de luz coherentes en Three.js.

### D. Efectos de Audio y SFX
* **Freesound.org:** Biblioteca colaborativa de audio. Busca sonidos de *"heavy breathing"*, *"wooden door creak"*, *"water drip catacomb"*, *"whispers"*, *"heartbeat"*.
* **Incompetech (Kevin MacLeod):** Música ambiental y paisajes sonoros góticos/oscuros sin copyright.