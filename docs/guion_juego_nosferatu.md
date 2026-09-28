# Guion y Documento de Diseño Narrativo: Ecos de la Peste

## 1. Ficha Técnica y Concepto

* **Título sugerido:** *Ecos de la Peste: La Travesía de Wisborg*
* **Género:** Horror de supervivencia / Laberinto en HTML5, CSS3 y JavaScript.
* **Inspiración:** Estética gótica, expresionismo alemán y la atmósfera opresiva del *Nosferatu* de Robert Eggers.
* **Año de ambientación:** Década de 1830 (Finales del siglo XIX).

---

## 2. Ambientación y Tono

### Estética Visual
* **Paleta de Colores:** Tonos góticos sepia, monocromáticos y claroscuros violentos.
* **Entorno:** Muros de piedra húmeda, pasillos estrechos, tumbas profanadas, alcantarillados y galerías de madera en ruinas.
* **Efectos CSS recomendados:** Filtros de grano de película, viñeteado dinámico para la pérdida de cordura, luces en la oscuridad usando `radial-gradient` y animaciones de niebla.

### Atmósfera Sonora
* Rumor distante de ratas, gotas de agua cayendo y crujidos de madera.
* Cantos gregorianos distorsionados o notas graves de órgano.
* Sonido tenue de una respiración agónica y susurros cuando los entes están cerca.

---

## 3. Premisa Principal

Eres **Elias**, un joven pasante de contabilidad atrapado en las profundidades del ayuntamiento de Wisborg. La ciudad ha sido puesta en cuarentena estricta tras la llegada del *Demeter*, un navío fantasma encallado sin tripulación viva. La única salida de la ciudad es ascender desde la fosa más profunda hasta los muelles a través de un antiguo complejo de galerías y acueductos subterráneos. 

Las sombras que habitan el laberinto obedecen al Conde de la Peste, un ente ancestral que busca alimentarse de la desesperación de los sobrevivientes.

---

## 4. Estructura del Guion en 5 Actos

### Introducción (Pantalla de Inicio / Inicio del Juego)
* **Texto en Pantalla:**
  > *"Wisborg sucumbe. El barco sin tripulación trajo consigo más que ratas; trajo la sombra de la Muerte Antigua. Atrapado bajo la ciudad contaminada, debes subir a la superficie antes de que la niebla consuma tu mente. Pero en este laberinto, la luz no te protege... solo revela dónde estás."*

---

### Acto I: El Despertar en La Fosa
* **Ubicación:** Las catacumbas inferiores y depósitos de cadáveres.
* **Objetivo:** Recuperar la **Llave del Pasadizo Inferior**.
* **Guion de Eventos:**
  * **Inicio:** Despiertas entre féretros abiertos e inscripciones en las paredes hechas por víctimas anteriores.
  * **Conflicto:** Escuchas el chasquido de garras sobre la piedra. Te topas con el primer tipo de entidad: los **Devoradores de Peste**.
  * **Punto de Inflexión:** Al tomar la llave, se escucha una voz distante y grave que retumba en las paredes: *"Nadie abandona la carne que me pertenece."*

---

### Acto II: Las Galerías de la Peste
* **Ubicación:** El antiguo sistema de alcantarillado y drenajes de la ciudad.
* **Objetivo:** Recolectar 3 **Sigilos de Cera** para abrir la Puerta Arqueada.
* **Guion de Eventos:**
  * **Ambiente:** Pasillos inundados de agua estancada que reducen la velocidad del jugador. Hay enjambres de ratas que reaccionan a la luz.
  * **Conflicto:** Introduce a la **Sombra Acechante**, una figura alta e hiperestirada que persigue al jugador desde la distancia y reacciona al movimiento rápido.
  * **Pistas Narrativas:** Encuentras notas de los médicos de la peste que revelan que los enfermos no murieron por la infección, sino sacrificados para contener al ente.

---

### Acto III: El Asilo Olvidado
* **Ubicación:** Los cimientos del manicomio municipal y salas de contención subterráneas.
* **Objetivo:** Resolver el acertijo de los **Mecanismos de Engranajes** para elevar la reja de hierro.
* **Guion de Eventos:**
  * **Ambiente:** Celdas abiertas, camisas de fuerza abandonadas y paredes cubiertas de símbolos alquímicos.
  * **Conflicto:** Aparecen los **Ecos Dementes**, apariciones espectrales que distorsionan la pantalla y el control si miras directamente hacia ellos.
  * **Punto de Inflexión:** Un diario confirma que el Conde no es un mito; está usando la epidemia como cobertura para cazar a los atrapados en la oscuridad.

---

### Acto IV: La Galería de los Espejos y Estatuas
* **Ubicación:** Las criptas privadas de la nobleza de Wisborg bajo la catedral.
* **Objetivo:** Encontrar el **Cáliz de Plata** para desactivar las trampas del pasadizo real.
* **Guion de Eventos:**
  * **Ambiente:** Pasillos flanqueados por espejos rotos y estatuas de santos decapitados. El laberinto aquí genera ilusiones visuales (callejones sin salida fijos que cambian cuando no los miras).
  * **Tensión:** La luz del farol comienza a fallar con más frecuencia. Se manifiesta la **Presencia Primigenia**, un evento donde la pantalla pierde color y el jugador debe esconderse hasta que pase la sombra principal.

---

### Acto V: El Umbral del Puerto (Clímax y Escape)
* **Ubicación:** Los túneles de escape bajo el muelle de carga.
* **Objetivo:** Encender la campana del faro subterráneo para despejar la niebla densa y atravesar la reja final.
* **Guion de Eventos:**
  * **Ambiente:** Bruma espesa que limita el rango de visión a pocos pixeles. Oyes el oleaje del mar muy cerca.
  * **Tensión Máxima:** Todos los tipos de entes persiguen al jugador a la vez. Las reservas de luz están al mínimo.
  * **Monólogo Final del Ente (Voz ambiental):**
    > *"Caminas hacia la libertad, pero la pestilencia ya habita en tus pulmones. Wisborg caerá, y tú serás su último aliento."*

---

## 5. Entes Enemigos y Comportamiento (AI)

| Ente | Comportamiento | Mecánica de Evitación |
| :--- | :--- | :--- |
| **Devoradores de Peste** | Ciegas pero sensibles al ruido/pasos rápidos. | Caminar despacio o quedarse quieto. |
| **Sombra Acechante** | Sigue al jugador a distancia; corta las luces cercanas. | Apuntar la luz del farol directamente para frenarla brevemente. |
| **Ecos Dementes** | Inmóviles pero aplican distorsión visual y reducen cordura. | No mirar hacia ellos (girar la vista en el juego). |
| **Presencia Primigenia** | Evento global de caza en los últimos actos. | Esconderse en alcobas oscuras o apagar la luz. |

---

## 6. Textos de Finalización

### Final de Victoria (Escapes del laberinto)
> *"Empujas la pesada puerta de madera húmeda y la brisa helada del río impacto tu rostro. Detrás de ti, los susurros de las catacumbas se apagan en la distancia. Wisborg yace en silencio bajo la sombra de la plaga, pero tú has logrado emerger de las profundidades."*

### Final de Derrota (Game Over)
> *"La oscuridad total devora la última llama de tu farol. Sientes uñas gélidas cerrándose sobre tu cuello antes de que puedas dar el siguiente paso. Tu cuerpo se une a los cimientos de Wisborg, y tu nombre se pierde para siempre en la fosa."*