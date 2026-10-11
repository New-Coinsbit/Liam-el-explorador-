# Cámara y hasta 20 imágenes · 0.3.3 · 11 de octubre de 2026

Solicitud: «Tomar foto» debe abrir directamente la cámara y el refuerzo escolar debe admitir hasta 20 imágenes.

- Android: captura mediante ACTION_IMAGE_CAPTURE con URI temporal de FileProvider y permisos limitados a esa imagen. Cancelar o fallar no abre la galería. Declaración de visibilidad para la cámara del sistema. No se pide acceso general a las fotos ni un permiso de cámara para usar la aplicación externa.
- Navegador: cámara en vivo mediante getUserMedia, preferencia por cámara trasera, captura, cancelación y cierre de las pistas al salir. Un permiso denegado muestra cómo recuperarlo, sin abrir galería automáticamente.
- Galería: selección múltiple, incorporación acumulativa, combinación con capturas, contador 0–20, miniaturas y eliminación individual. Se añaden hasta los espacios disponibles y se avisa si sobran imágenes. Archivos dañados no eliminan las imágenes válidas.
- Se conserva el formulario al seleccionar fotos y navegar dentro de la aplicación. Las imágenes permanecen en memoria; no se guardan en caché pública ni en base de datos. Recargar/cerrar la app descarta la selección no enviada.
- API: recibe entre 1 y 20 imágenes y envía todas al proveedor en orden. Conserva compatibilidad con `image` del APK 0.3.2. Límite de JSON de 28 MiB exclusivamente en POST /api/reinforcement, validación individual existente y tope conjunto de 28.000.000 caracteres (aprox. 20 MiB de imágenes). El resto de endpoints mantiene 5 MiB.
- El adulto sigue revisando el borrador. La IA requiere su credencial real; las pruebas no la activan en producción.
- Versión Android 0.3.3/código 4; caché web 0.3.3 incluye el nuevo módulo.

## Verificación

Pruebas automáticas del servidor: lote de 20 que supera el límite anterior de 5 MB, orden de envío al proveedor simulado, compatibilidad con una imagen, rechazo de cero/21/formatos inválidos, respuesta 413, fotos no persistidas y revisión obligatoria.

Prueba de interfaz con Chromium y cámara simulada: cámara directa sin selector, galería múltiple, acumulación, límite 20/21, quitar/añadir, formulario conservado, envío de 20 imágenes, conservación tras fallo del servidor, imagen corrupta, cancelación y apagado de cámara, navegación y anchos 320/393/480.

Compilación Android y prueba en teléfono físico: registrar resultados después de generar el APK. La cámara simulada del navegador no sustituye la prueba del APK en el teléfono del usuario.
