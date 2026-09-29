# Documento de Diseño de Juego (GDD): El Laberinto de Eggers (Eggers' Folklore)

## 1. Concepto General y Estructura

* **Título:** *The Folktales of Eggers: A Journey Through Darkness*
* **Género:** Anthology Horror / Laberinto Progresivo 3D (HTML5, CSS3, Three.js).
* **Premisa:** El jugador es una alma atrapada en una encrucijada del tiempo que debe atravesar **5 niveles/actos independientes**, cada uno representando la atmósfera, la época y las criaturas de una de las películas de Robert Eggers.

---

## 2. Los 5 Actos (Filmografía de Robert Eggers)

### Acto I: *La Bruja* (*The Witch* - 1630)
* **Escenario:** Un bosque puritano opresivo en Nueva Inglaterra envuelto en niebla.
* **Objetivo:** Encontrar las 3 páginas del Grimorio para abrir la cabaña del bosque.
* **Amenazas/Entes:**
  * **Black Phillip:** El macho cabrío negro que te acecha desde la penumbra.
  * **La Bruja del Bosque:** Aparece sorpresivamente si el jugador permanece mucho tiempo en áreas oscuras.
* **Mecánica Especial:** Uso de una antorcha de madera que se consume rápidamente.

### Acto II: *El Faro* (*The Lighthouse* - 1890)
* **Escenario:** Una isla rocosa claustrofóbica, los cimientos húmedos del faro y pasillos de piedra sumergidos.
* **Objetivo:** Recolectar las llaves de bronce para llegar a la linterna superior del faro.
* **Amenazas/Entes:**
  * **Gaviotas Furiosas / Sirena:** Sombras acuáticas y graznidos ensordecedores.
  * **La Locura de la Isla:** Alucinaciones de la sirena que distorsionan el mapa (paredes que aparecen y desaparecen).
* **Mecánica Especial:** Filtro CSS en **blanco y negro estricto (1:1 o 4:3)** con alto contraste.

### Acto III: *El Hombre del Norte* (*The Northman* - Siglo X)
* **Escenario:** Catacumbas vikingas cubiertas de nieve, ceniza y estatuas de rúnicas.
* **Objetivo:** Encontrar la espada ancestral *Draugr* para romper el sello de la puerta de salida.
* **Amenazas/Entes:**
  * **El Caballero No-Muerto (Draugr):** Cazador pesado que rompe puertas si te detecta.
  * **Las Valkirias Espectrales:** Susurran en el aire y alertan al Draugr sobre tu posición.
* **Mecánica Especial:** Antorchas en las paredes que puedes encender para frenar el avance de las sombras.

### Acto IV: *Nosferatu* (1838)
* **Escenario:** El laberinto subterráneo de la ciudad de Wisborg y el castillo del Conde.
* **Objetivo:** Recolectar los 3 **Sigilos de Cera** para abrir las rejas de la alcantarilla hacia el puerto.
* **Amenazas/Entes:**
  * **El Conde Orlok / Pestilencia:** Se mueve rápido en total oscuridad y reduce drásticamente la cordura si lo miras a los ojos.
  * **Devoradores de la Plaga:** Criaturas ciegas que reaccionan al ruido de pisadas.
* **Mecánica Especial:** Farol de aceite clásico con medidor de combustible y viñeteado sepia.

### Acto V: *Werwulf* (Inglaterra, Siglo XIV)
* **Escenario:** El bosque primitivo medieval de Dartmoor, valles oscuros y ruinas de una capilla medieval en ruinas bajo una luna llena sangrienta.
* **Objetivo:** Hacer sonar las campanas de la capilla antes de ser cazado para ahuyentar a la bestia.
* **Amenazas/Entes:**
  * **El Hombre Lobo (Werwulf):** Un cazador hiperagresivo que acecha entre la vegetación y las ruinas. Si te huela o te ve, iniciará una persecución a alta velocidad.
* **Mecánica Especial:** Sistema de sigilo extremo; el jugador debe agacharse y avanzar entre las sombras/coberturas para evitar que la bestia detecte el aroma o ruido.

---

## 3. Implementación Técnica por Actos (JavaScript & Three.js)

### Cambio Cinemático de Filtros de Pantalla (CSS3 / Shaders)

```javascript
// Cambiar la atmósfera según el acto actual de la película
function setActAtmosphere(actIndex) {
  const canvas = document.getElementById('game-canvas');
  
  switch(actIndex) {
    case 1: // The Witch (1630) - Tonos fríos, desaturados y sombríos
      canvas.style.filter = "sepia(0.2) contrast(1.2) hue-rotate(180deg) brightness(0.7)";
      scene.fog = new THREE.FogExp2(0x1a201c, 0.09);
      break;
    case 2: // The Lighthouse (1890) - Blanco y Negro de alto contraste
      canvas.style.filter = "grayscale(1) contrast(2.0) brightness(0.8)";
      scene.fog = new THREE.FogExp2(0x111111, 0.12);
      break;
    case 3: // The Northman (Siglo X) - Noche ártica azulada y ceniza
      canvas.style.filter = "sepia(0.3) contrast(1.4) hue-rotate(190deg) brightness(0.6)";
      scene.fog = new THREE.FogExp2(0x0a101d, 0.07);
      break;
    case 4: // Nosferatu (1838) - Sepia gótico y expresionista
      canvas.style.filter = "sepia(0.5) contrast(1.3) brightness(0.75)";
      scene.fog = new THREE.FogExp2(0x1a1816, 0.08);
      break;
    case 5: // Werwulf (Siglo XIV) - Oscuridad medieval y rojo carmesí
      canvas.style.filter = "sepia(0.4) contrast(1.5) hue-rotate(320deg) brightness(0.5)";
      scene.fog = new THREE.FogExp2(0x15080a, 0.1);
      break;
  }
}
```

---

## 4. Repositorios y Fuentes Recomendadas para los 5 Niveles

### Modelos 3D por Temática (Sketchfab / PolyPizza)
* **Acto I (La Bruja):** Cabana puritana, árboles secos, macho cabrío (*black goat*), estatuas paganas.
* **Acto II (El Faro):** Faro victoriano (*lighthouse*), gaviotas, linterna industrial, barriles de madera.
* **Acto III (El Hombre del Norte):** Piedras rúnicas, escudos vikingos, criptas nórdicas, espadas antiguas.
* **Acto IV (Nosferatu):** Arquitectura gótica, féretros, ratas, farol de aceite de 1830.
* **Acto V (Werwulf):** Ruinas de iglesias góticas, hombres lobo (*werewolf*), bosque medieval.

### Efectos Sonoros (Freesound.org)
* **La Bruja:** Susurros en inglés antiguo, crujidos de madera en el bosque, suspiros.
* **El Faro:** Bocina de niebla (*foghorn*), oleaje rompiendo contra rocas, risas maniacas.
* **El Hombre del Norte:** Cantos nórdicos lejanos, viento helado, choque de metales.
* **Nosferatu:** Pasos metálicos en piedra, chillidos de ratas, respiración jadeante.
* **Werwulf:** Aullidos a lo lejos, gruñidos feroces entre la hierba, pisadas pesadas sobre tierra.