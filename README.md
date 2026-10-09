# Liam El Explorador · aplicación móvil

Versión 0.3.2. Proyecto aislado: **New-Coinsbit/Liam-el-explorador-** (guion final). Conserva la portada original, el valle aprobado y las barras compactas. No modifica ni depende de otros repositorios o servicios del usuario.

## Ejecutar

Node 22 o superior; verificado con Node 24.

```sh
npm ci
npm run build
npm test
npm start
```

Abrir http://localhost:3000. PGlite conserva los datos de desarrollo en `.local-data/`, excluido de git. Producción requiere `DATABASE_URL` de PostgreSQL dedicado. Sin esa conexión, las operaciones de cuentas se rechazan con un mensaje visible; no se simula guardado. Las migraciones versionadas son transaccionales y conservan cuentas, IDs, resultados y premios existentes.

## Implementado

- Registro de alumnos/profesores, colegios, grado, cumpleaños, edad coherente, asignaturas, ID único y 24 avatares. Contraseñas scrypt, sesiones HttpOnly, protección de origen y límites de intentos.
- Cuenta familiar independiente, varios hijos, acceso del alumno por ID, cambio de contraseña del niño, entrada al perfil infantil y retorno protegido con PIN. Al convertir una cuenta anterior, el adulto elige una contraseña exclusiva y conserva el progreso del niño.
- Confirmación de correo y recuperación de contraseña/PIN mediante HTTPS (Resend) o SMTP. Enlaces de un uso y 30 minutos; recuperar el acceso revoca también las sesiones de los hijos vinculados. Requiere configurar un proveedor, un remitente autorizado y `APP_ORIGIN`.
- Administración `/#admin`: aprobar colegios, autorizar profesores con correo confirmado y colegio aprobado, revisar reportes y ocultar mensajes. Clave `ADMIN_KEY`, cookie independiente y sesiones de 30 minutos.
- Bloqueos de niveles en el servidor, lista y mapa. Dos estrellas permiten avanzar, tres son excelente. Repetir conserva el mejor resultado para sumar estrellas.
- Historial de cada intento, resultados por materia, explicaciones, pendientes e informes familiares. Las respuestas reenviadas con el mismo ID no duplican intentos. La vista muestra los últimos 100; la base conserva el historial completo.
- Premios configurables y marca de entrega por el adulto cuando se alcanza la meta. Las estrellas no se descuentan.
- Siete actividades iniciales de ejemplo y editor para elegir respuestas, ordenar, relacionar palabras/emoji, escuchar inglés y escribir resultados numéricos. Grado, tema y materia configurables. El catálogo de ejemplo no sustituye un currículo escolar completo.
- Refuerzo fotográfico con objetivo: repasar, preparar evaluación o reforzar errores recientes. Las fotos nuevas se envían para análisis y no se conservan en la tabla de actividades. Los borradores se pueden editar antes de publicarse; las preguntas publicadas permanecen estables para proteger el historial.
- Grupos con colegio y grado, profesores autorizados, códigos de ingreso familiar, actividades compartidas e informes limitados al propio grupo.
- Contactos por ID dentro de una clase compartida, aprobación de ambos adultos, mensajes privados, reacciones, bloqueo, reportes y retos compartidos desbloqueados para ambos participantes.
- Novedades dentro de la app; integración Web Push con autorización del adulto y mensajes genéricos sin nombres ni contenido escolar en la pantalla bloqueada. Incluye estado por teléfono, prueba, desactivación y control de permisos; requiere claves VAPID.
- PWA instalable, caché de recursos públicos y cola de intentos en la pestaña al perder conexión. Nunca se cachean respuestas API, chats ni fotos privadas. Solo sincroniza con el mismo alumno; no es una biblioteca completa para estudiar sin internet.
- Proyecto Android Capacitor y preparación de recursos. La compilación avanza con JDK 21 y Gradle; se detiene en la licencia pendiente de Android SDK Build-Tools 35. No se ha generado ni firmado un APK. Véase `docs/MOBILE.md`.
- Búho antes del reto, zorro al finalizar, confeti, sonido opcional de ambiente y navegación inferior común de 56 px, oculta en pantallas secundarias.

## Visual y 3D

La aventura principal usa `adventure-approved.webp` con controles reales superpuestos, respetando la referencia. La portada conserva `welcome-art.webp` completa. El prototipo 360° continúa separado e identificado como «en desarrollo». No representa el acabado visual final.

Se implementó un cargador de personajes GLB con animaciones idle/walk/greet/explain/clap, mezcla de movimientos y liberación de recursos. Está desactivado hasta recibir un conjunto completo de modelos aprobados. **Todavía faltan los modelos volumétricos fieles, el escenario final y sus animaciones naturales.** No se sustituyeron por nuevas figuras improvisadas. `docs/3D-ASSETS.md` define el contrato.

## Despliegue y accesos pendientes

La versión 0.3.1 está publicada en https://liam-explorador-mobile.onrender.com desde el 8 de octubre de 2026. El código está en `main` del repositorio indicado arriba. GitHub ya permite publicar; ese bloqueo quedó resuelto. El servicio gratuito `liam-explorador-mobile` es independiente de los servicios antiguos con nombres parecidos.

El registro y la persistencia quedaron activados el 8 de octubre de 2026, después de autorizar el usuario una base exclusiva. `/api/health` devuelve 200 y `database: true`. PostgreSQL 17 usa el plan `0.1c-256mb`, 1 GB, región Virginia y conexión interna; el crecimiento automático y las conexiones externas permanecen desactivados. El costo base estimado autorizado fue de US$6,30 mensuales antes de impuestos y consumos adicionales. `DATABASE_URL`, `APP_ORIGIN` y una clave administrativa aleatoria están configuradas solo en Render.

Se verificaron en el servidor HTTPS el registro con datos ficticios, ID único, estrellas, desbloqueo de nivel, reintento sin duplicación, PIN, premio, avatar y conservación del progreso tras cerrar e iniciar sesión. El formulario público ya permite crear cuentas. Los colegios se incorporan mediante solicitud y aprobación; no se inventó un catálogo de instituciones reales. Véase `docs/PRODUCTION-ACTIVATION.md`.

1. Configurar `MAIL_PROVIDER=resend`, `RESEND_API_KEY` y un `MAIL_FROM` verificado para activar correo por HTTPS. Configurar `OPENAI_API_KEY` para activar el refuerzo fotográfico. Las claves permanecen en Render. Véase `docs/RELEASE-0.3.2.md`.
2. Incorporar los colegios reales y verificar docentes. La autorización de un profesor requiere confirmar su correo, por lo que ese flujo sigue pendiente del proveedor de correo.
3. Verificar la experiencia en teléfonos físicos y completar los recursos 3D y la distribución móvil.

`render.yaml` conserva la configuración prevista para activar esos servicios. La instalación de dependencias incluye las herramientas de compilación incluso con `NODE_ENV=production`. La revisión 0.3.2 añade el transporte de correo HTTPS y mejores controles de IA y Web Push. Correo e IA continúan pendientes de credenciales; sus pruebas usan respuestas simuladas. Las pruebas previas usan correo y respuestas IA de prueba sin envíos externos. El despliegue web no equivale a un APK ni al escenario 3D final.

## Pruebas

```sh
npm test
node scripts/export-preview.js test-results/liam-preview.html
node tests/ui-mobile.cjs
node tests/ui-platform.cjs
node tests/ui-audit.cjs
node tests/ui-selectors.cjs
node tests/ui-adventure.cjs
node tests/ui-approved-map.cjs
```

Las pruebas UI locales requieren Playwright y Chromium; `CHROMIUM_EXECUTABLE` y `CODEX_PRIMARY_RUNTIME_NODE_MODULES` permiten indicar las herramientas. Esas pruebas usan bases temporales que se eliminan al terminar. La verificación pública deja una cuenta técnica privada identificada en `docs/PRODUCTION-ACTIVATION.md`; no es una persona ni un colegio real. Consulte también `docs/VALIDATION.md` y `docs/RELEASE-0.3.1.md` y `docs/RELEASE-0.3.2.md`.

## Referencias técnicas

- https://nodemailer.com/smtp
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/images-vision
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- https://capacitorjs.com/docs/config
- https://render.com/docs/blueprint-spec
