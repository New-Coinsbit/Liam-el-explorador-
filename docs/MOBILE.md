# Salida móvil 0.3.2

## PWA

El manifest incluye iconos 192/512, orientación vertical y presentación standalone. `sw.js` guarda únicamente recursos públicos. La instalación se ofrece mediante el navegador cuando este la admite y hay HTTPS; no se solicitan permisos al arrancar.

Un reto previamente abierto se puede terminar si se pierde internet. La respuesta pendiente se conserva en `sessionStorage`, bajo el ID del alumno, y se reenvía con un ID de intento estable al recuperar conexión. Cambiar de usuario no envía respuestas al perfil equivocado. Cerrar la pestaña puede perder respuestas aún pendientes: la pantalla informa esta limitación. Chat, IA, registro y carga de nuevas actividades necesitan conexión.

Web Push usa VAPID y requiere soporte de navegador. La pantalla muestra si está activo en este dispositivo, si falta permiso, si está bloqueado o si el servicio no está disponible. Permite activar, desactivar, volver a comprobar y enviar una prueba al mismo dispositivo. La petición de permiso ocurre por un clic del adulto, nunca al abrir la aplicación. El adulto autoriza desde «En tu teléfono». La suscripción está vinculada a una sesión activa y a su usuario. No contiene nombres de niños, texto de mensajes ni calificaciones en la notificación del sistema. El servidor acepta exclusivamente proveedores push conocidos y URL HTTPS. No sustituye las notificaciones nativas de Firebase en Android WebView.

## Proyecto Android

El directorio `android/` se generó con Capacitor 8.5.3. Se mantienen icono propio, pantalla inicial verde, orientación vertical, tráfico seguro y copia de seguridad deshabilitada. No se guardan claves de firma. La conexión nativa utiliza el plugin HTTP/Cookies de Capacitor y el origen HTTPS que se configure al preparar.

```sh
npm ci
npm run build
LIAM_API_ORIGIN=https://liam-explorador-mobile.onrender.com npm run android:prepare
npx cap open android
```

En el servidor configurar `APP_NATIVE_ORIGIN=https://localhost` solo para esta salida nativa. Los clientes web siguen usando el mismo origen; no se activa CORS abierto. El origen remoto se añade a los recursos Android al compilar, no a la copia web pública.

Para inspección visual sin servidor:

```sh
node scripts/prepare-android.js --preview
```

Esta variante dice «vista previa» y no activa cuentas. No usarla como una versión publicada con datos reales.

La revisión 0.3.1 obtuvo y verificó Gradle 8.14.3, JDK 21 y plataforma SDK 36 con herramientas 36 en un directorio aislado. Gradle ya arrancó y configuró los proyectos. La compilación se detuvo al requerir Android SDK Build-Tools 35.0.0 con una licencia no aceptada. No se aceptó el acuerdo, ni se generó un APK/AAB. El responsable debe revisar/aceptar la licencia e instalar el componente con Android Studio SDK Manager antes de ejecutar `./gradlew assembleDebug`.

La cámara/galería utiliza el selector de archivos del sistema; su funcionamiento, cookies de sesión y permisos deben probarse en Android físico. Web Push se verifica aparte en la PWA; no se implementó Firebase nativo. La versión nativa de prueba informa esta limitación y no ofrece un botón de instalación del navegador cuando ya está instalada. El proyecto 0.3.2 ya se sincronizó con https://liam-explorador-mobile.onrender.com. Falta aceptar la licencia indicada, compilar, probar en un teléfono físico y aportar una clave propia de firma para distribución.

La versión iOS no está generada.
