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

La compilación local de 0.3.1 se detuvo al requerir Android SDK Build-Tools 35.0.0 con una licencia no aceptada. El 11 de octubre de 2026 se generó correctamente el APK 0.3.2 en GitHub Actions usando las herramientas ya instaladas del ejecutor Ubuntu 24.04: JDK 21, plataforma SDK 36 y Build-Tools 35.0.0. El flujo no ejecuta aceptación de licencias ni instalación automática del SDK (`android.builder.sdkDownload=false`).

La cámara/galería utiliza el selector de archivos del sistema; su funcionamiento, cookies de sesión y permisos deben probarse en Android físico. Web Push se verifica aparte en la PWA; no se implementó Firebase nativo. La versión nativa de prueba informa esta limitación y no ofrece un botón de instalación del navegador cuando ya está instalada. El APK 0.3.2 está conectado a https://liam-explorador-mobile.onrender.com, con `preview:false`. Falta probarlo en un teléfono físico y aportar una clave propia de firma para distribución.

### APK de prueba generado

- Archivo: `Liam-El-Explorador-0.3.2-prueba.apk` (23.338.573 bytes).
- Android 7.0/API 24 o superior; paquete `com.newcoinsbit.liamelexplorador`, versión 0.3.2/código 3.
- Compilación: https://github.com/New-Coinsbit/Liam-el-explorador-/actions/runs/38158833931
- Commit: `b6657cb9d6910c8ea5780e13bef20474ed723582`.
- SHA-256: `3639daa086ab7f9852acaa0054a4b1145f89ee9bf820700e2df5f69fa630f29d`.
- Firma de depuración RSA de 2048 bits verificada con `apksigner`; esquema APK v2 válido. No es una firma para publicar en Google Play.
- Se verificaron integridad del ZIP/APK, identidad, versión, origen HTTPS y coincidencia de las ilustraciones aprobadas con el repositorio. No se realizó una prueba en un teléfono físico.

`.github/workflows/android-apk.yml` permite generar nuevos APK desde Actions y cuando cambian los archivos de Android o los recursos de la aplicación. El artefacto se conserva 14 días en Actions. La clave de depuración se genera en cada ejecutor temporal: futuros APK de prueba pueden requerir desinstalar el anterior. Antes de distribuir actualizaciones estables debe configurarse una clave de firma duradera bajo control del propietario.

Para instalar esta prueba: descargar el APK en Android, abrirlo y, si el sistema lo solicita, permitir la instalación desde el navegador o gestor de archivos utilizado. Registro, comunidad y actividades nuevas requieren internet. Esta entrega empaqueta el estado actual 0.3.2; no completa las integraciones de IA/correo ni los modelos 3D pendientes.

La versión iOS no está generada.
