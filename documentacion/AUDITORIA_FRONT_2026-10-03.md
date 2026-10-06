# Auditoría del front · 3 de octubre de 2026

## Alcance

Revisión del panel `app/admin.html`, módulos administrativos, integración con `tools/server.js` y lectura del envío de pedidos del sitio React. Pruebas de navegación sobre el panel local. No se realizó una auditoría exhaustiva de todas las pantallas de la app móvil ni una evaluación de seguridad externa.

## Implementado

- Pantalla de acceso previa al panel: fondo rojo, logotipo existente, letras animadas, formulario sin registro, mostrar/ocultar contraseña y adaptación a pantallas pequeñas. Respeta la preferencia de reducir movimiento.
- Usuarios `administrador` y `atención` (también acepta `atencion`), contraseña `1234`. El servidor identifica los roles `admin` y `worker`, ambos con el mismo acceso por solicitud del negocio. No hay creación de cuentas.
- Verificación de sesión al abrir, cierre de sesión con revocación en servidor y regreso al ingreso cuando expira. Cookie HttpOnly; se eliminan los tokens y las copias de pedidos que antes se almacenaban en el navegador.
- Historial en el menú existente: todos los pedidos persistidos, búsqueda por código/cliente/teléfono, estado, fechas de creación en hora de Perú, 15 filas por página, detalle existente y CSV de los resultados filtrados. Totales de entregados separados de pedidos pendientes o cancelados. Renderizado de datos mediante texto y protección contra fórmulas en CSV.
- Corrección del desacople entre `window.ORDERS` y `ORDERS`, también presente en el catálogo: ahora la API y los módulos comparten la misma colección.
- Corrección de `catalogFilterQuery` sin declarar, que interrumpía la inicialización del panel.
- Los botones de módulos pendientes conservan la pantalla activa. La acción superior ya no conserva una acción de otra sección.
- Ajuste del encabezado para que sus controles se acomoden al ancho disponible; barra lateral con desplazamiento.

## Hallazgos pendientes, por prioridad

| Prioridad | Hallazgo y evidencia | Mejora propuesta |
| --- | --- | --- |
| Alta | Dashboard con fecha fija de septiembre de 2024, ventas, conversiones y gráficos de demostración (`admin.html`, `dashboard.module.js`, `analytics.data.js`). La conexión de pedidos no vuelve reales estas métricas. | Calcular indicadores desde pedidos y eventos reales; marcar explícitamente los bloques de demostración mientras se conectan. |
| Alta | KDS y catálogo muestran éxito y modifican datos locales antes de confirmar el resultado de la API. Varias llamadas ignoran errores mediante `.catch(() => {})` (`kanban.module.js`, `catalog.module.js`). | Esperar confirmación del servidor, mostrar estado de guardado y revertir ante rechazo o pérdida de conexión. |
| Alta | El sitio React intenta enviar la comanda a `/api/pedidos` y a `localhost:3000`; si ambos fallan devuelve `false` (`web/src/lib/orderSync.ts`). El localhost corresponde al dispositivo del cliente. | Configurar una dirección de API para cada entorno y mostrar claramente los pedidos no registrados; agregar reintentos con una clave que impida duplicados. |
| Media | `handleSendPush` solo muestra un mensaje afirmando un envío a 1,240 dispositivos (`customers.module.js`). | Conectar un servicio real o identificar el flujo como demostración y evitar confirmar envíos inexistentes. |
| Media | Reportes, Usuarios, Integraciones y soporte contienen acciones de demostración. | Identificar secciones pendientes y completar cada flujo con estados de carga, error y confirmación. |
| Media | Los tres pedidos actuales carecen de `createdAt`. | Recuperar las fechas de una fuente confiable si existe. Se muestran como “Sin fecha registrada”; no se les asignó la fecha actual. Los filtros de fecha excluyen pedidos sin fecha. |
| Media | La barra lateral y las tablas originales requieren una estrategia específica para teléfonos; hay modales sin gestión uniforme del foco. | Menú plegable para móvil, revisión a 390 px y 768 px, cierre con Escape, foco inicial y retorno de foco, roles accesibles en todos los diálogos. |
| Siguiente etapa | Ambos roles tienen permisos equivalentes. La contraseña solicitada es fija y sencilla. | Definir una matriz de permisos y credenciales configurables antes de exponer el sistema en producción. El PIN anterior solo sigue disponible si se habilita expresamente con `--pin` o `RTQ_ADMIN_PIN`. |

## Verificación

- Compilación del sitio React completada: TypeScript y Vite.
- `node tools/test-access.js`: 21/21 pruebas existentes más comprobaciones de usuarios, contraseñas inválidas, sesiones con cookie, lectura de pedidos, roles y revocación. Se ejecutan en una copia temporal, sin modificar la base del negocio.
- Navegador: ingreso de administrador y atención, cierre de sesión, restauración de sesión al navegar, tres pedidos persistidos, búsqueda por Paola y apertura del detalle correcto.
- La descarga CSV no se pudo confirmar en el navegador integrado: la espera de descarga expiró. El generador y la protección de celdas se revisaron en código.

## Cómo revisar

### Actualizaciones posteriores de esta misma sesión

- Los permisos equivalentes se reemplazaron por administrador y caja; Usuarios permite gestionar únicamente nuevas cuentas de caja. Consulta `ROLES_Y_CAJA.md`.
- Reportes ahora consulta y exporta el histórico real, métricas y sugerencias dinámicas; dejó de ser una acción de demostración. Integraciones se retiró del menú.
- Se restauró el dashboard original a solicitud del usuario tras reemplazarlo por una vista reducida. Conserva su diseño, secciones e indicadores originales; las métricas reales nuevas permanecen dentro de Reportes. Las estadísticas de canje/push en sus módulos originales aún requieren fuentes persistentes; no se usan para sugerir campañas en Reportes.
- Se verificó la descarga CSV del nuevo módulo en el navegador, y se probaron combinaciones y preparación de cupones en una copia con ventas aisladas. Consulta `REPORTES_Y_SUGERENCIAS.md` y `node tools/test-reports.js`.

Iniciar el servidor habitual y abrir `/admin`. Si ya estaba encendido antes del cambio, reiniciarlo para cargar la autenticación nueva. La vista de revisión creada durante esta tarea se sirvió en `http://localhost:3011/admin`.
