# Recursos visuales y sonido · 0.2.2

Los tres recursos nuevos se generaron con la herramienta integrada de generación de imágenes, usando `public/assets/welcome-art.webp` como referencia de estilo. Se conservan como WebP dentro del proyecto. La conversión conserva la transparencia de los atlas.

| Archivo | Uso |
| --- | --- |
| `public/assets/forest-panorama.webp` | Fondo panorámico del entorno 3D y de los formularios. |
| `public/assets/companions-atlas.webp` | Cuatro poses por personaje: saludo de Liam, explicación del búho y cola del zorro. |
| `public/assets/forest-props.webp` | Vegetación, helechos, rocas y plantas florales del bosque. |

## Prompts de producción

### Panorama

Referencia de estilo: ilustración aprobada de bienvenida. Un panorama ambiental equirectangular continuo de 360°, proporción 2:1: valle tropical verde, montañas rocosas distantes, cascadas, río turquesa, luz dorada de la mañana, cielo azul y nubes suaves. Cámara en un claro mirando al valle. Acabado cinematográfico realista de videojuego 3D infantil, texturas naturales de hojas y piedra. Bordes izquierdo y derecho continuos, horizonte consistente. Sin personajes, logotipo, texto, números, botones ni interfaz.

### Personajes

Referencia de identidad y estilo: ilustración aprobada de bienvenida. Un atlas transparente con cuatro columnas y tres filas: arriba, cuatro poses de cuerpo completo de Liam, niño de ocho años con cabello marrón, gafas blancas, camisa ocre, shorts oliva, botas y mochila; saluda levantando y bajando la mano derecha. En medio, cuatro poses del búho marrón con gafas y libro, levantando el ala para explicar y cerrando brevemente los ojos. Abajo, cuatro poses del zorro naranja con pecho crema y pañuelo turquesa, moviendo la cola a izquierda, arriba y derecha. Mantener identidad, escala, iluminación y posición por personaje. Fondo alfa, sin paisaje, texto ni interfaz.

El recurso generado tiene bandas de alturas distintas; `atlasRows` en `world.js` y los tamaños CSS usan las bandas reales, no asumen tercios idénticos.

### Vegetación

Referencia de estilo: bosque cinematográfico realista de la bienvenida. Un atlas transparente 2 × 2: arriba izquierda, rama de copa frondosa con muchas hojas pequeñas y detalle de ramitas; arriba derecha, helechos y hierbas; abajo izquierda, roca irregular cubierta de musgo con helechos pequeños; abajo derecha, arbusto tropical de hojas brillantes y flores rojas. Cuadrantes separados, objetos completos, texturas naturales, luz cálida; sin suelo, cielo, niebla, caracteres ni texto.

## Qué se mueve

El terreno, el sendero, los portales, el agua y la cámara se renderizan con Three.js. La vegetación usa planos con textura y geometría instanciada. Las nubes se desplazan; las hojas caen y oscilan; el agua desplaza su textura.

Liam, búho y zorro son **ilustraciones planas en una pose fija dentro del prototipo 3D**. Se ha retirado la alternancia de poses, el balanceo y el salto al avanzar: cambiaban rasgos y proporciones, y no constituían una animación natural. Se orientan hacia la cámara y todavía no ofrecen una vista posterior modelada. El arte final con modelos y ciclos de caminar/aplaudir completos continúa pendiente. La comparación del 8 de octubre confirmó que el escenario y estos personajes NO reproducen todavía la fidelidad de la maqueta aprobada.

La bienvenida vuelve a usar `welcome-art.webp` completa, con su logotipo y personajes originales, manteniendo la proporción 933:1686. Es una ilustración estática; no se anuncia como escena 3D animada. Se conserva el sonido opcional. El movimiento ambiental permanece en Aventura.

El sonido es una composición procedimental original: viento y agua filtrados, más llamadas suaves de pájaros. Se genera localmente con Web Audio, sin descargar pistas ni grabar al usuario. Se inicia desde el botón de sonido; la preferencia se conserva y se suspende al ocultar la página. La lectura opcional del búho utiliza la voz disponible en el dispositivo.

## Referencias técnicas

- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/docs/pages/CanvasTexture.html
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices


## Escena de Aventura elegida · 0.2.2

El usuario confirma la referencia original de bienvenida y el objetivo visual de Aventura. El nuevo recurso `public/assets/adventure-approved.webp` (853 × 1843) procede de una edición con la herramienta integrada de imágenes de `adventure-reference.png`: se retiró únicamente la interfaz impresa y se reconstruyó el fondo que cubría. Se conserva la composición del valle, el niño de espaldas, el búho y el zorro. El archivo se codificó como WebP sin pérdida y sin cambiar sus dimensiones.

La escena principal es una ilustración con controles HTML sobre puntos del sendero, no un modelo 3D. `adventure-map.js` calcula el encuadre manteniendo la proporción y protege la zona de los personajes. La cámara 360° anterior permanece accesible como prototipo separado, con aviso de desarrollo; el objetivo del modelado final sigue siendo este mismo valle.

Prompt final de edición (herramienta integrada, sin CLI):

> Use case: precise-object-edit. Edit target: the supplied approved portrait mobile game scene. Produce a clean background plate for this EXACT scene by removing ONLY the printed UI overlays and inpainting the landscape behind those overlays. Preserve the original portrait framing, perspective, layout, lighting, colors, all visible landscape details, and all three characters exactly as they are. Preserve Liam seen FROM BEHIND at lower center-left, his white glasses profile, brown hair, ochre shirt, green shorts, detailed brown backpack and boots; preserve the orange fox FROM BEHIND at lower right; preserve the large brown owl with round gold glasses at the middle left sitting on its rock. Preserve the cinematic detailed valley with the turquoise river, tall mountains, multiple waterfalls, footbridge, raised winding stone trail climbing the RIGHT side into clouds, wooden railings, lush mossy rocks, overhanging upper-left foliage. Remove: the Liam logo upper left, the CONCEPTO MÓVIL text, star counter and settings button, the parchment mission card and its leaf icon/text, the wooden 'Más niveles por descubrir' sign, the three numbered circular markers and their glowing bases (leave bare continuous stone path exactly there), the joystick, 360 button, INICIAR RETO button, swipe hint, and entire bottom navigation. Inpaint only those deleted UI regions with matching continuation of the surrounding terrain, sky and foliage. Reconstruct ground at the bottom without moving the characters. Do NOT redesign this scene, do NOT move or change the characters, do NOT change their poses or facial identity, do NOT add any characters, do NOT crop their feet or the fox tail. This is the identical approved image with UI removed, not a new interpretation. Highest detail and sharp native texture quality, vertical portrait same aspect ratio as input. No text, letters, numbers, icons, logos or interface anywhere.
