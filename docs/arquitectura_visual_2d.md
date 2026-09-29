# Arquitectura Visual 2D — *The Folktales of Eggers*

Especificación técnica del motor visual (sustituye al enfoque 3D/Three.js).

## 1. Técnica

**Estilo Node-Based 360° / Pseudo-3D Fotorrealista de Alta Definición.**

- Panoramas/escenas pre-renderizadas o fotografías de alta calidad, estilizadas en 2.5D con capas dinámicas de paraje, iluminación volumétrica WebGL y filtros de posprocesado modernos (Glow, Blur, Depth of Field, Chromatic Aberration).
- No requiere modelar en 3D.
- **Mientras no haya fotos:** los escenarios se modelan con CSS3 (gradientes, formas, sombras); luego se sustituyen las capas por imágenes HD sin tocar la lógica.

## 2. Motor visual (Canvas 2D + CSS)

El jugador se desplaza por **nodos** de un laberinto con movimientos suaves de cámara en 1.ª persona, transiciones de lente cinematográficas y capas de profundidad (Parallax Depth Mapping).

**Navegación:** WASD/flechas entre nodos. El ratón solo hace parallax de mirada y mueve la linterna.

### A. Renderizado por capas (Layering System)

1. **Fondo (Background Node):** render estático HD del escenario actual.
2. **Capa de Profundidad (Normal & Depth Maps):** filtros CSS/Canvas que reaccionan a la posición de la linterna en tiempo real (relieve dinámico sin modelos 3D).
3. **Capa de Iluminación Volumétrica (Light & Fog Layer):** niebla en tiempo real con partículas canvas/WebGL.
4. **Capa de Entes (Entities):** ilustraciones/sprites HD con sombras direccionales.
5. **Capa UI / Lente de Cámara:** polvo flotante, gotas de condensación, viñeta, aberración cromática y movimiento orgánico de la mirada (Head Bobbing).

## 3. Dirección de arte por acto

| Acto | Escenario | Estética | Efectos |
|---|---|---|---|
| I — La Bruja | Bosque colonial de Nueva Inglaterra | HD, grano fino 35mm, sombras ultranegras, tonos fríos/desaturados | Niebla reactiva a la linterna, ceniza e insectos en el haz de luz |
| II — El Faro | Isla rocosa, 1890 | Monocromático ultra alto contraste, ratio 1:1 (cuadrado expresionista) | Lens-flare hiperrealistas, gotas de lluvia/sal en el lente, reflejos especulares |
| III — El Hombre del Norte | Criptas nórdicas | Fuego y ceniza volcánica, ámbar profundo y negro carbón | Bloom de brasas, Heat Haze que deforma el fondo |
| IV — Nosferatu | Catacumbas de Wisborg, 1838 | Claroscuro gótico, sepia oscuro, mampostería húmeda detallada | Sombras largas dinámicas con máscaras vectoriales |
| V — Werwulf | Abadía maldita en ruinas | Luna azul plomizo, niebla hiperrealista a ras de suelo | Motion Blur al girar, pupilas reflectantes, sangre con Bokeh |

## 4. Efectos (HTML5 & CSS3)

### Vista principal con posprocesado

```css
#cinematic-viewport {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #030303;
  filter: contrast(115%) brightness(90%) drop-shadow(0px 0px 20px #000);
}
```

### Niebla volumétrica y viñeta dinámica

```css
.cinematic-lens {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at var(--light-x, 50%) var(--light-y, 50%),
      transparent 10%,
      rgba(5, 5, 5, 0.6) 45%,
      rgba(0, 0, 0, 0.95) 90%);
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.9);
}
```

### Aberración cromática en pánico

```css
.panic-distortion {
  animation: cameraJitter 0.08s infinite alternate;
  filter: blur(0.5px) contrast(130%);
}

@keyframes cameraJitter {
  0%   { transform: translate(1px, 1px) scale(1.005); }
  100% { transform: translate(-1px, -1px) scale(1); }
}
```

### Movimiento de cámara orgánico (Head Bobbing & Look Offset)

```js
document.addEventListener('mousemove', (e) => {
  const moveX = (e.clientX / window.innerWidth - 0.5) * 30;
  const moveY = (e.clientY / window.innerHeight - 0.5) * 20;

  viewport.style.setProperty('--light-x', `${e.clientX}px`);
  viewport.style.setProperty('--light-y', `${e.clientY}px`);

  document.getElementById('scene-layer').style.transform =
    `translate3d(${moveX}px, ${moveY}px, 0px) scale(1.05)`;
});
```

## 5. Filtros de atmósfera por acto

```js
// Aplicar sobre el viewport según el acto actual
function setActAtmosphere(actIndex) {
  const viewport = document.getElementById('cinematic-viewport');
  switch (actIndex) {
    case 1: // La Bruja — tonos fríos, desaturados, sombríos
      viewport.style.filter = 'sepia(0.2) contrast(1.2) hue-rotate(180deg) brightness(0.7)';
      break;
    case 2: // El Faro — blanco y negro de alto contraste
      viewport.style.filter = 'grayscale(1) contrast(2.0) brightness(0.8)';
      break;
    case 3: // El Hombre del Norte — noche ártica, ceniza
      viewport.style.filter = 'sepia(0.3) contrast(1.4) hue-rotate(190deg) brightness(0.6)';
      break;
    case 4: // Nosferatu — sepia gótico expresionista
      viewport.style.filter = 'sepia(0.5) contrast(1.3) brightness(0.75)';
      break;
    case 5: // Werwulf — oscuridad medieval y rojo carmesí
      viewport.style.filter = 'sepia(0.4) contrast(1.5) hue-rotate(320deg) brightness(0.5)';
      break;
  }
}
```
