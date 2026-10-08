# Contrato de personajes 3D

La referencia aprobada es `public/assets/adventure-approved.webp`; la portada es `welcome-art.webp`. El usuario rechazó figuras pixeladas y movimientos de recortes. No se cambia el arte principal mientras falte el conjunto final.

`client/rigged-companions.js` se compila a `public/js/rigged-companions.js`. El prototipo 360° consulta `public/assets/models/manifest.json`; actualmente declara `awaiting-approved-models` y mantiene el prototipo existente.

Solo activar `status: "approved"` después de revisar los tres modelos como un conjunto. Cada entrada `characters.liam`, `characters.owl`, `characters.fox` debe definir:

- `file`: GLB autocontenido dentro de `/assets/models/`.
- `scale`, `position: [x,y,z]`, `rotationY`: ajuste en metros dentro del grupo de compañeros.
- `animations`: mapa de idle, walk, greet, explain y clap a nombres de clips del GLB.

El cargador exige todos los clips, carga los tres personajes antes de retirar los sprites, mezcla acciones en 0.3 segundos, pausa el avance temporal cuando el usuario pausa, y libera geometrías, texturas y mezcladores al abandonar la escena. Si falta un archivo/clip, no muestra un conjunto parcial. La prueba actual valida únicamente que el prototipo existente mantiene su recorrido; no hay modelos finales con los que validar el conjunto activado.

Pendiente artístico: modelado fiel de Liam, búho y zorro en volumen; rigging facial/corporal, ciclos naturales y entorno de cascadas/puentes fiel a la composición elegida. También falta integrar y revisar los ciclos de explicación y aplauso en sus escenas finales. El código de carga no sustituye esos activos ni constituye por sí solo el ecosistema 3D final solicitado.
