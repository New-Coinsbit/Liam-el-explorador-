# Entrega 0.3.0 · 8 de octubre de 2026

Trabajo exclusivo en `New-Coinsbit/Liam-el-explorador-`, rama local `feat/complete-school-platform`. Base anterior: f81ad76.

## Resultado desarrollado

Cuentas familiares con varios hijos y contraseñas separadas; confirmación/recuperación de acceso; administración de colegios y docentes; contactos autorizados y chat privado; retos entre compañeros; revisión de reportes; progreso e historial; entrega de premios; bloqueos reales de niveles; objetivos de refuerzo y edición de borradores IA; siete actividades iniciales con cinco formatos; PWA y reenvío seguro de intentos; proyecto Android; cargador de modelos con rigging.

La bienvenida y el valle aprobados se conservaron. No se alteraron las imágenes originales para simular movimientos.

## Pruebas

- API con base PostgreSQL embebida: permisos familiares, aislamiento entre usuarios/grupos, profesor pendiente/verificado, recuperación de un solo uso y revocación de sesiones, reportes y bloqueo de contactos, no duplicación concurrente de intentos, premios, formatos de pregunta y borradores inmutables tras publicar.
- IA con respuesta controlada: objetivo y grado cero llegan al generador y `store` permanece desactivado. No hubo llamada real al proveedor.
- Migración desde esquema anterior y reapertura: cuentas, ID, estrellas y premios se conservan.
- Playwright móvil: creación de familia y hermano, premio entregado, historial, actividad de ordenar/relacionar/calcular, intento finalizado sin internet y sincronizado al volver, ausencia de errores JS y desbordamientos a 320/393/480.
- Regresión de portada, mapa aprobado, selectores, sonido, pausa, prototipo 360°, explicación búho, evaluación y navegación compacta.

## Límites verificables

El repositorio remoto permanece vacío y el proyecto no está desplegado. La integración GitHub no tiene acceso habilitado a este repositorio; no se usó otro repositorio como alternativa. Render no tiene una base dedicada para Liam; la base gratuita disponible corresponde a otro proyecto y no se tocó.

SMTP, IA y Web Push requieren configuración real. El catálogo educativo inicial es una muestra; no se ha construido un currículo ilimitado por grado. La ruta acepta nuevas actividades de profesores sin un límite fijo programado, pero no inventa contenido educativo automáticamente.

Android está preparado y sincronizado, pero no compilado/firmado ni probado físicamente. El 3D final conserva su estado pendiente por falta de modelos volumétricos y escenario final fiel a la referencia. Las ilustraciones aprobadas continúan siendo la visual principal.
