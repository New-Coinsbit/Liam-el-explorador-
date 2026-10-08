# Auditoría integral · 0.3.1 · 8 de octubre de 2026

**Actualización posterior de publicación:** GitHub quedó habilitado y esta versión se publicó en `main` y en https://liam-explorador-mobile.onrender.com el 8 de octubre de 2026. La comprobación HTTPS devolvió 200 en la portada, salud y configuración. Continúa pendiente PostgreSQL dedicado; registro y persistencia permanecen deshabilitados. Los bloqueos de GitHub descritos abajo son el estado histórico al terminar la auditoría local, ya resuelto. Consulte el README para el estado actual.

Repositorio exclusivo: `New-Coinsbit/Liam-el-explorador-`. Rama de trabajo: `fix/mobile-complete-audit`. El código está guardado localmente; la publicación remota sigue bloqueada. Esta auditoría no certifica un cumplimiento del 100 % ni sustituye pruebas en teléfonos físicos.

## Correcciones de esta revisión

- Retorno de cuenta familiar, recuperación de acceso, contactos, informes y administración sin ciclos de navegación. Las subpantallas de contraseña infantil y resultados del grupo tienen retorno propio.
- Limpieza de datos de la cuenta al cambiar entre adulto, niños o sesión: fotos, borradores, conversaciones, actividades e informes. Las respuestas tardías no reemplazan una pantalla nueva ni datos de otra cuenta.
- Caducidad del PIN de padres de 10 minutos reflejada en la interfaz. Una operación protegida vuelve a pedir el PIN si caducó. La sesión vencida lleva al acceso con un mensaje comprensible.
- Orden individual estable de los niveles. Una actividad antigua compartida después se agrega al final de la pista disponible. La migración 005 mantiene cuentas, puntuaciones e historial.
- Fotos de cámara de hasta 20 MB de origen: decodificación, orientación y reducción a 1600 px por lado máximo antes de enviar. Se elimina la metadata mediante recodificación. Se rechazan formatos no admitidos o archivos dañados. Se conservan título, materia y objetivo al elegir la foto.
- Errores de conexión, demora, respuesta inválida, formulario vacío, imagen demasiado grande y demasiados intentos con mensajes en español. Solo una falla de red deja un intento pendiente; un error de validación no se trata como falta de conexión.
- Recompensa siguiente calculada entre premios sin entregar; fecha de entrega visible. La meta inicial es de 10 estrellas.
- Registro transaccional para no dejar colegios solicitados huérfanos si el correo ya existe. Grado vacío rechazado, sin convertirlo en Transición.
- Creación de grupo y membresía del profesor en una sola transacción. Mensajes ocultados no admiten reacciones nuevas.
- Editor de actividades acepta resultados decimales e indica qué pregunta incompleta revisar.
- Copia específica de la versión Android de prueba: acceso directo a explorar, aviso de que no tiene cuentas reales e instalación ya realizada. No ofrece notificaciones nativas que aún no están implementadas.
- Versión y caché pública actualizadas a 0.3.1. Las ilustraciones originales y el mapa aprobado no cambiaron.

## Correspondencia con lo solicitado

| Solicitud | Estado comprobado | Límite pendiente |
| --- | --- | --- |
| Niño explorador y título Liam El Explorador | Portada original completa, sin título duplicado sobre la cara | Modelo volumétrico final de Liam |
| Bienvenida, niño, búho, zorro y continuar | Arte original conservado, navegación y audio opcional funcionales | Animación natural de personajes y entorno de bienvenida |
| Registro obligatorio alumno/profesor | Campos, IDs, colegio, grado, edad, fecha coherente y áreas múltiples probados | Activación pública y catálogo real de colegios |
| Interacción y retos escolares | Grupos, contactos autorizados, mensajes, corazones/emojis, bloqueos, reportes y retos probados con cuentas ficticias | Verificación en servidor público y supervisión operativa real |
| Calificación de 1, 2 y 3 estrellas | Repetición/avance, cálculo en servidor, confeti y explicación probados | Búho y zorro aplaudiendo con animación articulada |
| Premios de los papás | Metas, bloqueo por estrellas insuficientes, entrega e identificación del adulto probados | Validación en producción |
| Perfil, estrellas, foto y 24 avatares | Suma sin duplicar por repetir, selección, normalización de fotos y aislamiento por cuenta | Galería/cámara en Android e iPhone físicos |
| Fotografías para refuerzo con IA | Flujo, objetivos, revisión del adulto y contrato del proveedor implementados; simulación de IA aprobada | Credencial y evaluación del proveedor real con material escolar representativo |
| Permisos y app móvil | Interfaz vertical, PWA y proyecto Android; permisos solicitados al usar funciones | Licencia SDK, APK, firma, distribución e iOS. Internet no usa una autorización emergente de instalación |
| Pista y nuevos niveles escolares | Siete actividades iniciales, cinco formatos, editor y ampliación por actividades publicadas; orden estable | Contenido/currículo suficiente; no se promete generación infinita autónoma |
| Ecosistema 3D realista 360° | Prototipo separado con cámara, ambiente y sonido; cargador de modelos preparado | Escenario final, tres modelos fieles, rigging y animaciones. El mapa principal sigue siendo una ilustración interactiva |
| Barras compactas, selectores y pantallas completas | Cabecera de 44 px, barra inferior común de 56 px en raíces, oculta durante retos; selectores y retornos probados | Verificación física con teclado, áreas seguras y accesibilidad de sistema |

## Evidencia de pruebas

- `npm test`: 6 grupos aprobados, incluidos recorridos extensos de cuentas, familia, permisos, puntuación, formatos, IA simulada, migraciones y casos nuevos de auditoría.
- `tests/ui-platform.cjs`: recorrido real con Express + PGlite temporal. Registro, reto, entrega de premio, historial, dos niños, PIN, reconexión de intento, editor y chat privado con actualización sin borrar el borrador.
- `tests/ui-audit.cjs`: 19 pantallas × 3 anchos (320, 393 y 480 px), 57 comprobaciones sin desbordamiento, encabezados compactos y sin textos `undefined`/`NaN`. Además: retorno familiar, respuesta tardía, foto normalizada, foto corrupta, campos conservados, PIN vencido, sesión vencida y copia de versión nativa de prueba.
- `tests/ui-selectors.cjs`: campos/selectores, teclado, búsqueda, validación y estabilidad del fondo a 320/360/393/480 px.
- `tests/ui-adventure.cjs`: portada/mapa originales, audio, prototipo 360°, controles, niveles, explicación del búho, resultados y barra retráctil. Sin solicitudes externas en la vista HTML independiente.
- `tests/ui-approved-map.cjs`: niveles, cabecera y botón sin superponerse a las siluetas de Liam, zorro o búho a 320/360/393/480 px y densidad 2×.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades reportadas. No equivale a una auditoría de penetración ni garantiza ausencia de vulnerabilidades desconocidas.
- Capturas de registro, área familiar, refuerzo y mapa revisadas visualmente. Las imágenes originales permanecen idénticas a las de la versión 0.3.0.

Las pruebas usan Chromium automatizado y una base PostgreSQL embebida temporal con datos ficticios. No se enviaron correos ni mensajes a personas reales. La simulación de correo/IA no demuestra entrega SMTP ni calidad de respuestas del proveedor en producción. No se certifica Safari, un dispositivo físico, carga concurrente masiva ni PostgreSQL administrado remoto.

## Android: avance y bloqueo exacto

Se obtuvieron y verificaron Gradle 8.14.3, JDK 21, plataforma Android 36 y herramientas 36 en un directorio aislado. `cap sync android` pasó. Gradle arrancó y configuró los proyectos, superando el bloqueo previo de red.

La compilación pidió instalar **Android SDK Build-Tools 35.0.0** y se detuvo porque su licencia no está aceptada. No se aceptó el acuerdo ni se creó un archivo de aceptación. No se generó un APK/AAB. Un responsable debe revisar/aceptar la licencia en Android Studio SDK Manager, instalar ese componente y compilar. Para la versión real también falta la URL HTTPS publicada, una clave de firma de distribución y pruebas del teléfono.

## Publicación: bloqueos externos comprobados

1. El repositorio correcto no aparece entre los repositorios habilitados para la instalación GitHub 167005685. Sigue vacío. La denegación previa fue `403 Resource not accessible by integration`; no se intentó eludirla ni escribir en el repositorio antiguo.
2. No existe PostgreSQL exclusivo de Liam disponible. La creación previa de otra instancia gratuita fue rechazada por el límite de una activa. No se reutilizó la base de otro proyecto ni se contrató un plan de pago.
3. Faltan configuración real de correo, IA, notificaciones y origen público. El código y los avisos distinguen los servicios aún no activos.
4. No se modificaron los servicios antiguos de Render que apuntan a otro proyecto. `render.yaml` describe un servicio nuevo para el repositorio exacto.

Para continuar la publicación: habilitar `New-Coinsbit/Liam-el-explorador-` en la instalación de GitHub, disponer de una base PostgreSQL propia de Liam y configurar sus variables privadas en Render. Después se publicará el código, se desplegará el servicio y se repetirá la auditoría del recorrido con HTTPS. La autorización del usuario para desplegar ya existe; los impedimentos son de acceso y recursos, no una nueva solicitud de permiso general.
