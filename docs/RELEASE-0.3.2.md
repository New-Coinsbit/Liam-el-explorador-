# Continuación funcional · 0.3.2 · 9 de octubre de 2026 UTC

## Alcance

Único repositorio: `New-Coinsbit/Liam-el-explorador-`.
Único servicio de aplicación: `srv-db42h2k9v7es738si9hg`.
Se conservan la portada, el mapa aprobado, los personajes ilustrados, los sonidos y las barras compactas. No se modifican imágenes ni estilos globales. No se crea otro servicio de pago.

## Cambios

- Web Push: estado por sesión y teléfono, autorización del adulto, permiso solicitado por clic, prueba dirigida únicamente a la suscripción de esa sesión, desactivación y recuperación de permisos bloqueados. El servidor valida el par VAPID, restringe destinos HTTPS, limita las pruebas y elimina suscripciones vencidas. Los avisos no contienen datos de menores.
- Correo: transporte HTTPS con Resend, compatible con el servicio web gratuito de Render; SMTP sigue disponible para entornos que lo admitan. Solo se habilita con proveedor, credencial, remitente y origen configurados. Los fallos del proveedor no exponen claves ni contenido de correos.
- IA: tratamiento de interrupciones, respuestas incompletas, rechazos, salida inválida y tiempos de espera. Se validan entre tres y ocho preguntas de cuatro opciones; la foto ilegible no produce una actividad inventada. El adulto sigue revisando el borrador antes de publicar. Se mantiene `store:false` y el modelo existente.
- Android: versión 0.3.2, código de versión 3, recursos sincronizados con `https://liam-explorador-mobile.onrender.com`. La copia web no incluye configuración nativa. No se generó APK/AAB ni se aceptaron licencias.
- Actualización de la PWA: activa la caché nueva después de descargar todos sus recursos públicos. No recarga un reto abierto ni borra respuestas pendientes; al volver a abrir o recargar se usan los archivos actuales. La revisión pública detectó y corrigió la espera indefinida que mantenía la interfaz anterior cuando había otras pestañas abiertas.

## Verificación de código

- `npm test`: 10 grupos aprobados, sin fallos. Incluyen cuentas, PIN, aislamiento entre alumnos, progreso, migraciones, correo HTTPS con transporte simulado, errores de IA simulados, suscripciones por sesión y revocación al cerrar sesión.
- `npm run build`: correcto.
- `LIAM_API_ORIGIN=https://liam-explorador-mobile.onrender.com npm run android:prepare`: correcto. Se verificó que la configuración generada apunta al servidor real y no al modo de vista previa.
- `git diff --check`: correcto. Sin cambios en `public/assets/`.
- Se agregó `tests/ui-mobile.cjs` para los estados de notificación. Los recorridos UI automatizados no pudieron ejecutarse en este entorno: el ejecutable local estaba vacío y la descarga de Chromium llegó truncada. No se contabilizan como aprobados. La comprobación visual del despliegue se realiza por separado en el navegador.

Las pruebas usan datos ficticios y transportes simulados. No envían correos, mensajes ni notificaciones a personas reales. No demuestran entrega en un teléfono físico ni calidad pedagógica de un análisis real de IA.

## Configuración que falta aportar

1. **Correo**: una cuenta de Resend con remitente/dominio verificado. Guardar exclusivamente en Render `MAIL_PROVIDER=resend`, `RESEND_API_KEY` y `MAIL_FROM`. No enviar claves por chat. Después, comprobar confirmación, recuperación y autorización docente con cuentas controladas por el responsable.
2. **IA**: guardar `OPENAI_API_KEY` del proyecto autorizado en Render. El proveedor requiere una cuenta con acceso y facturación/cuota disponibles. Después, evaluar fotos escolares de prueba sin datos personales y revisar exactitud por grado antes del uso con alumnos.
3. **Android**: el responsable debe revisar y aceptar la licencia pendiente de Android SDK Build-Tools 35.0.0 en Android Studio, compilar, probar en dispositivo y aportar la firma de distribución. La sincronización de recursos no equivale a un APK terminado. Web Push no sustituye Firebase nativo.
4. **Contenido**: catálogo de colegios reales, docentes autorizados y actividades revisadas. No aprobar las instituciones ficticias de auditoría.
5. **3D**: modelos finales y animaciones fieles a la referencia, y escenario completo. El prototipo 360° sigue identificado como desarrollo, separado de la aventura aprobada. Véase `3D-ASSETS.md`.

Referencias técnicas: [Render Free](https://render.com/docs/free), [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

El estado del despliegue y sus comprobaciones públicas se registran en `PRODUCTION-ACTIVATION.md`. Esta revisión no certifica el cumplimiento al 100 % de los requisitos visuales, nativos ni pedagógicos.
