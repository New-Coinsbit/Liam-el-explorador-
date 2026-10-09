# Activación de datos · 8 de octubre de 2026

## Alcance

Único repositorio: `New-Coinsbit/Liam-el-explorador-`.
Aplicación: https://liam-explorador-mobile.onrender.com/

El usuario autorizó el costo recurrente de una base exclusiva de Liam. No se alteraron los servicios, repositorios ni bases de otros proyectos.

## Infraestructura comprobada

- Servicio: `liam-explorador-mobile`, `srv-db42h2k9v7es738si9hg`, web Node gratuito, Virginia.
- Base: `liam-explorador-db`, `dpg-db44onflot8c73fq84hg-a`, PostgreSQL 17, `0.1c-256mb`, 1 GB, Virginia.
- Crecimiento automático de almacenamiento desactivado. Acceso externo bloqueado; la aplicación usa la conexión interna.
- Configuración privada guardada en Render: `DATABASE_URL`, `APP_ORIGIN`, `ADMIN_KEY`. No se incluyen credenciales en este documento, en git ni en el frontend.
- Despliegue `dep-db44tklg1s2s7388jlk0`: activo el 9 de octubre a las 02:18:39 UTC, equivalente al 8 de octubre a las 21:18:39 de Bogotá. Código `6ac25171590a820d82f291614cd44a47c1e4e807`, versión 0.3.1.
- HTTPS `/api/health`: 200, `ok: true`, `database: true`. `/api/config`: base activa, IA y correo inactivos.

## Verificación en producción

Recorrido contra la API HTTPS real y PostgreSQL administrado, con datos inventados:

1. Sin sesión se rechaza el acceso al perfil. Una edad incoherente se rechaza antes de crear cuenta.
2. Registro válido, ID único y cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
3. Solicitud de colegio guardada como pendiente, sin aparecer en el catálogo aprobado.
4. Siete actividades iniciales disponibles; siguiente nivel bloqueado y respuestas correctas omitidas de las preguntas públicas.
5. Premios inaccesibles sin desbloquear el PIN del adulto.
6. Primer reto completado con tres estrellas y nivel 2 habilitado. Reenviar el mismo intento no duplica estrellas ni historial.
7. Premio configurado y entregado al alcanzar la meta, selección del avatar 24 y cierre de sesión.
8. Nuevo inicio de sesión conserva ID, tres estrellas, avatar, premio e historial. El PIN queda nuevamente bloqueado.
9. Una modificación desde un origen diferente se rechaza.
10. Administración protegida responde con la clave privada y muestra la solicitud pendiente.

El navegador público confirmó que desapareció el aviso de registro no disponible y que el botón Crear cuenta está habilitado. El selector de colegios ofrece «Mi colegio aún no aparece» mientras se construye el catálogo real.

La prueba dejó únicamente el perfil técnico privado `EX-A42610EBCE`, con nombre claramente ficticio, correo `example.invalid` y una solicitud de institución ficticia identificada como «no aprobar». No debe aprobarse ni incorporarse al catálogo público. No se enviaron correos ni mensajes a personas reales. No se abrieron conexiones externas a PostgreSQL para consultar o limpiar tablas.

## Límites pendientes

Esta activación acredita registro y persistencia; no certifica la aplicación al 100 %. Faltan correo real (incluida recuperación y confirmación docente), IA y evaluación de sus preguntas, notificaciones, catálogo real de colegios, 3D y animaciones finales, APK firmado y pruebas en dispositivos físicos. El chat escolar requiere los grupos y docentes autorizados; la conexión de la base no sustituye la confirmación de correo ni esas autorizaciones.

No se efectuaron pruebas de carga masiva, recuperación de backups ni reinicio forzado del servicio. La persistencia se comprobó mediante cierre de sesión y una sesión nueva contra la base remota.
