# Revisión visual comparada · 8 de octubre de 2026 · 0.2.1

Referencias: `public/assets/welcome-art.png` (933 × 1686) y `public/assets/adventure-reference.png` (853 × 1843). Se compararon con capturas reales de 0.2.0 y de la corrección 0.2.1. La maqueta es el objetivo visual; que la aplicación funcione no demuestra que se parezca a ella.

| Elemento | Diferencia encontrada en 0.2.0 | Corrección / estado de 0.2.1 |
| --- | --- | --- |
| Portada y título | El título se extrajo mediante una máscara de la portada y se colocó sobre otro escenario. El borde se difuminaba y perdía su integración original. | Se restaura la ilustración original completa, sin máscara ni logo separado, a proporción constante. |
| Personajes de bienvenida | Cuatro poses distintas reemplazaban los personajes del arte original. Cambiaban manos, caras y tamaños al alternarse. | Vuelven los personajes originales dentro de la portada. La bienvenida es estática con sonido opcional; todavía no tiene la animación volumétrica solicitada. |
| Nitidez | Render limitado a 1,35 píxeles por píxel CSS; panorama de 1774 × 887 repartido en 360°. | Render hasta 2×, filtrado anisotrópico hasta 8× y sombras 1024. Mejora técnica parcial: el panorama y las texturas no adquieren detalle nuevo por aumentar el render. |
| Números sobre Liam | Etiquetas HTML superpuestas al canvas; no se comprobaban profundidad ni silueta. La proyección usaba la cámara del fotograma anterior. | Actualización de matrices antes de proyectar, comprobación de siluetas de los tres compañeros y oclusión por terreno, rocas y troncos. Se ocultan durante el arrastre y se evita solapamiento entre etiquetas. |
| Movimiento artificial | Cambios bruscos entre cuatro poses, balanceo y salto del recorte al avanzar. No había rigging ni ciclo de caminar. | Se retiran esas simulaciones. Se conserva el movimiento ambiental y de cámara. Animaciones naturales de los personajes pendientes. |
| Pista y paisaje | La maqueta muestra un valle montañoso con cascadas, puentes y sendero elevado. El prototipo usa suelo llano, árboles repetidos y vegetación en planos. | No resuelto por esta corrección. Requiere construir y texturizar ese paisaje tridimensional siguiendo la composición aprobada. |
| Personajes durante el giro | El niño de la maqueta mira hacia el camino; los recortes del prototipo miran siempre a cámara. No hay espalda ni volumen real. | Sigue pendiente el modelado de Liam, búho y zorro, sus vistas completas y animación articulada. |
| Formato vertical | El contenido debe conservar jerarquía y evitar cubrir título, caras o controles. | Portada revisada a 320 × 568, 393 × 852 y 480 × 740. En alturas cortas admite desplazamiento para conservar los personajes completos y el acceso a Continuar. Se conservan formulario compacto y selectores. |

## Resultado

La portada y los errores concretos de superposición están corregidos en el código local. La fidelidad completa del mundo 3D sigue pendiente y no se considera aprobada. Las comprobaciones automatizadas anteriores eran funcionales y no justificaban dar la fidelidad visual por conseguida.

Antes de considerar final la escena se necesitan: paisaje del valle acorde a la referencia; modelos de personajes con materiales de suficiente resolución; rigging y ciclos de reposo, saludo, marcha y celebración; cámara y composición aprobadas a varias alturas y orientaciones; revisión en un teléfono físico.

La publicación GitHub/Render mantiene los bloqueos de acceso ya documentados. No se modificaron otros repositorios ni servicios.
