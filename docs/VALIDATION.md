# Validación de la primera construcción

## Servidor

`npm test` pasa. Las pruebas ejecutan la aplicación contra PostgreSQL local embebido (PGlite), crean cuentas ficticias y eliminan los datos al terminar.

Se verificaron edad/fecha de nacimiento, límites de calificación, rechazo de imágenes inválidas, registro, IDs, sesiones, PIN, permisos de premios, validación del avatar, respuestas correctas ocultas al alumno, estrellas sin duplicación por repetir, aislamiento entre cuentas, grupos privados, mensajes, reacciones, rechazo de origen externo y cierre de sesión.

## Móvil

Prueba automatizada en Chromium, 393 × 852 píxeles, táctil. Recorrió bienvenida, aventura, perfil, 24 avatares, reto de tres preguntas, resultado de tres estrellas, premio parental, comunidad y arranque del escenario WebGL. Sin errores JavaScript. Revisión visual de capturas: se corrigió el fondo repetido detrás de formularios, los iconos de la barra compartida y la limpieza del confeti al cambiar de pantalla.

La prueba de UI usa la vista previa en memoria; no sustituye la prueba de producción ni la revisión en un celular físico. PostgreSQL remoto, publicación Render, entrega de correos, proveedores de IA y modelos 3D finales siguen pendientes.

## Ajustes móviles · 0.1.1 · 8 de octubre de 2026

Los selectores de colegio, grado, día, mes, año, edad, materia, objetivo y respuesta usan un mismo panel verde, crema y dorado. Conservan los valores de formulario y la validación obligatoria; admiten teclado, cierre con Escape, búsqueda de colegio y devolución del foco. Se comprobó también su reconstrucción al cambiar de alumno a profesor y al navegar.

El fondo de los formularios ahora se dimensiona por el ancho de la aplicación. Se eliminó la imagen fija de 2.400 píxeles; abrir un panel, desplazarse por un formulario largo o cambiar la altura disponible del navegador no cambia su escala. Se ajustaron las columnas de fecha, los botones dobles y el espacio para textos largos.

Prueba automatizada `tests/ui-selectors.cjs`: pasó en Chromium táctil a 320, 360, 393 y 480 píxeles de ancho. Sin desbordamiento horizontal ni errores JavaScript. Verifica selección y FormData, teclado, búsqueda sin resultados, validación requerida, reinicio de formulario, cambio de rol, navegación, refuerzo, respuestas y estabilidad del fondo. Se revisaron visualmente las capturas del formulario y del panel abierto. Falta comprobar el comportamiento en teléfonos físicos con Safari y Android.

Para repetirla en un entorno con Playwright y Chromium instalados:

```sh
node scripts/export-preview.js test-results/liam-preview.html
node tests/ui-selectors.cjs
```

`CHROMIUM_EXECUTABLE` permite usar un Chromium ya instalado. La prueba no registra cuentas ni envía datos a servicios externos.

## Pantallas completas · 0.1.2 · 8 de octubre de 2026

Se eliminó el encabezado que combinaba la portada con un segundo nombre sobre la cara de Liam. Registro, acceso, retos, preguntas, perfil, comunidad y áreas de adultos ahora utilizan el ancho de la página con un título compacto. La bienvenida conserva su ilustración original. Aventura muestra un consejo con un retrato pequeño al pie; la celebración coloca a los compañeros debajo del resultado, sin repetir el logo. El aviso de vista previa ocupa su propia franja y ya no se superpone a los títulos.

Se revisaron capturas de registro, Aventura, Retos, Comunidad, Perfil, preguntas y resultado. El recorrido de navegación y la prueba de selectores pasaron en Chromium móvil, incluyendo anchos 320, 393 y 480, sin desbordamientos horizontales ni errores de JavaScript. La barra inferior continúa compartida. La revisión en teléfono físico y el despliegue remoto siguen pendientes.

## Bosque animado y controles compactos · 0.2.0 · 8 de octubre de 2026

Se recuperó el fondo de bosque con paneles de pergamino. Las cabeceras usan 44 px (antes 82), los campos 40 px y la barra inferior 56 px (antes 83), conservando los selectores de colegio, grado, fecha y edad. La barra aparece en Aventura, Retos, Chat y Perfil; las vistas de detalle usan retorno.

`tests/ui-adventure.cjs` pasó en Chromium con pantalla táctil simulada y anchos 320, 393 y 480. Verifica:

- Carga de las tres texturas del escenario y render WebGL en el HTML sin conexión.
- Cambio visible de los fotogramas de bienvenida; al pausar, dos capturas consecutivas son idénticas.
- AudioContext activo después de tocar sonido y ganancia cercana a cero al silenciar.
- Rotación de cámara superior a 360°, avance por el sendero y regreso al punto inicial.
- Bloqueo del segundo nivel antes de completar el primero, y desbloqueo después de tres estrellas.
- Búho y explicación antes de mostrar preguntas; resultados de tres y dos estrellas, suma de cinco y presencia del zorro.
- Ausencia de barra en explicación, preguntas, resultado y escena ampliada; retorno a la barra compartida.
- Fin de las actividades disponibles sin presentar una actividad repetida como un nuevo nivel.
- Ausencia de desbordamientos horizontales, errores JavaScript y solicitudes externas desde el HTML independiente.

`tests/ui-selectors.cjs` también pasó con las nuevas medidas. Las capturas se revisaron visualmente; se corrigieron el recorte del zorro, la vegetación demasiado simple, el inicio abrupto del sendero y las etiquetas de nivel superpuestas. Se grabó un recorrido de la aplicación real con su ambiente sonoro, no una animación de maqueta.

Alcance: se verificó Chromium automatizado, no un teléfono físico. Los compañeros son sprites de cuatro poses dentro del mundo 3D; el modelado volumétrico y los ciclos completos de caminar/aplaudir siguen pendientes. La publicación remota y los servicios de cuentas/IA mantienen los bloqueos documentados en README.

También se verificó el frontend servido por Express en modo producción, sin base de datos: módulos ES, texturas del escenario y apertura del búho desde el primer nivel, sin errores JavaScript. Reiniciar la vista previa limpia sus estrellas y actividades de demostración de forma coherente; no modifica ninguna cuenta real.

## Revisión visual tras el rechazo de 0.2.0 · 0.2.1

La comparación con las dos referencias originales detectó que la fidelidad visual no estaba conseguida, pese al resultado funcional anterior. `docs/VISUAL_REVIEW.md` registra diferencias corregidas y pendientes; no se considera final la escena 3D.

- `tests/ui-adventure.cjs`: pasó. Ahora verifica la portada original intacta, proporción, sonido, movimiento/pausa del ambiente 3D, flujo de retos y navegación. Retirar los cambios de pose fue intencional.
- `tests/ui-visual-regression.cjs`: pasó a 320 × 568, 393 × 852 y 480 × 740, densidad 2×. Revisa que título y personajes originales no se recorten ni queden bajo los botones. En pantallas cortas la bienvenida admite desplazamiento.
- Se comprobaron 20 orientaciones por tamaño (60 en total, cubriendo más de una vuelta completa por tamaño), sin etiquetas sobre las siluetas de los compañeros. Se revisaron visualmente capturas de giros y de las tres portadas verticales.
- Se verificó render a 2× en las pantallas simuladas, ausencia de desbordamiento horizontal y de errores JavaScript.

Límite explícito: estas pruebas no certifican equivalencia con la maqueta ni animación natural. La portada es estática y el mundo 3D sigue usando recortes en una pose fija; modelos volumétricos, paisaje fiel a la referencia y animaciones articuladas permanecen pendientes. No se ha probado un teléfono físico ni publicado una actualización remota.


## Referencias elegidas aplicadas · 0.2.2

`tests/ui-approved-map.cjs` verifica el mapa ilustrado a 320 × 568, 360 × 800, 393 × 852 y 480 × 740, con densidad 2×: proporción de la imagen conservada, personajes sin superposición de los niveles/cabecera/inicio, marcadores visibles dentro de la escena y sin colisiones, botón de inicio por encima de la navegación, barra compacta y sin errores JavaScript. Se inspeccionan capturas de la aplicación real.

`tests/ui-adventure.cjs` pasó con la nueva pantalla principal: portada intacta, registro compacto, audio activable y silencio, bloqueo del segundo nivel y desbloqueo al completar el primero, explicación del búho, resultados de tres/dos estrellas, cinco estrellas acumuladas, mensaje del zorro, regreso al mapa, fin de contenido disponible y navegación compartida. También abre el prototipo 360° separado, verifica movimiento/pausa ambiental, giro y avance, y vuelve al mapa elegido. La vista HTML funciona sin solicitudes externas.

Los avisos temporales se cierran al cambiar de pantalla para no quedar sobre los controles de otra vista. El mapa principal es una ilustración interactiva, no una simulación de volumen ni un modelo 3D terminado. La revisión en teléfono físico y el despliegue remoto siguen pendientes.

## Plataforma educativa · 0.3.0

`npm test` pasó con cinco grupos: contratos básicos, recorridos de cuentas/permisos/escuela/comunidad/aprendizaje, formatos de preguntas, objetivos IA con proveedor simulado y migración desde 0.2 con reapertura. Incluye reenvíos concurrentes sin duplicar intentos, ID ajeno rechazado, estrellas acumuladas conservadas, meta de premio obligatoria, familia con dos hijos, contraseñas distintas, recuperación que revoca sesiones, contactos con doble autorización y moderación de mensajes privados.

`tests/ui-platform.cjs` pasó con Express y una base temporal real: alumno completa un reto, el adulto entrega un premio y revisa el historial; convierte la cuenta en familiar y añade otro niño; el retorno del modo infantil exige PIN. Se corta la conexión durante un reto y se comprueba que el intento pendiente se guarda una vez al reconectar. El profesor crea desde el editor una actividad de ordenar, relacionar y calcular; la resuelve y obtiene tres estrellas. Sin errores JS ni desbordamiento a 320, 393 y 480 px.

`tests/ui-selectors.cjs` pasó adaptado al nuevo editor. `tests/ui-adventure.cjs` y `tests/ui-approved-map.cjs` pasaron conservando la portada, mapa y navegación aprobados. Las capturas de familia, resultados, editor y actividad se revisaron visualmente. `npm audit --omit=dev --audit-level=high` informó 0 vulnerabilidades.

Android: `cap add` y `cap sync android` pasaron en modo visual explícito. `assembleDebug` no pudo descargar Gradle por red inaccesible. No hay APK ni prueba física. El proveedor IA/SMTP/push real, PostgreSQL de Render y los modelos GLB finales no se probaron porque faltan configuración, recursos o acceso; no se incluyen en los resultados aprobados.

Se añadió además la comprobación del chat privado en el navegador: un mensaje entrante aparece automáticamente sin borrar el borrador del alumno; el envío desde la pantalla llega al servidor. El registro de entrega de un premio atribuye la acción al adulto familiar vinculado.

## Auditoría 0.3.1

Se completaron los seis grupos del servidor, el recorrido de plataforma y 57 combinaciones de pantalla/ancho en `ui-audit.cjs`. Se probaron navegación tardía, fotos normalizadas/corruptas, conservación de campos, PIN vencido y retorno al acceso por sesión caducada. Selectores, aventura y mapa aprobado también pasaron. Sin errores JavaScript en los recorridos aprobados; 0 vulnerabilidades reportadas por `npm audit --omit=dev --audit-level=high`. Ver `RELEASE-0.3.1.md` para matriz de requisitos, correcciones, alcance exacto y bloqueos.

La compilación Android superó el bloqueo de red previo, pero se detuvo por la licencia de Build-Tools 35 no aceptada. No hay APK ni despliegue remoto en esta entrega.
