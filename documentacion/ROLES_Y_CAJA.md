# Administrador y caja

Modelo actualizado el 3 de octubre de 2026. Reemplaza el acceso equivalente de administrador y atención descrito en la auditoría anterior.

Solo existen dos tipos de usuario: `admin` (Administrador) y `cashier` (Caja). Las cuentas iniciales son `administrador` y `caja`, ambas con contraseña `1234`. El usuario `atención` ya no tiene acceso.

## Permisos

| Función | Administrador | Caja |
| --- | --- | --- |
| Registrar nuevos pedidos y confirmar cobros | Sí | Sí |
| Resumen de pagos confirmados y pendientes de hoy | Sí | Sí |
| Preparación, despacho, detalle e impresión de pedidos del día | Sí | Sí |
| Consultar pedidos anteriores o sin fecha | Sí | No |
| Historial completo y exportación CSV | Sí | No |
| Reportes, métricas, exportación detallada y sugerencias de campañas | Sí | No |
| Dashboard general, catálogo, promociones y configuración | Sí | No |
| Crear, activar y desactivar cuentas de caja | Sí | No |
| Crear otros tipos de usuario | No; solo se agregan cuentas de caja | No |

El día se delimita de medianoche a medianoche en `America/Lima`. Caja ve los pedidos de ese día de todos los canales para atender al cliente y coordinar cocina. No ve pedidos anteriores, aunque estén pendientes, ni los registros antiguos que carecen de fecha. El administrador puede gestionar esos casos.

## Usuarios

Desde Usuarios, el administrador ingresa nombre, usuario único y contraseña para agregar una cuenta de caja. El rol se asigna en el servidor y no puede convertirse en administrador desde el formulario o una llamada directa a la API. La cuenta principal de administrador no se puede desactivar.

Desactivar una cuenta revoca sus sesiones y bloquea nuevos ingresos. Reactivarla conserva sus credenciales. Las cuentas se guardan en `data/users.db.json` con contraseñas derivadas mediante scrypt y sal individual; la API nunca devuelve el hash ni la sal. Este archivo local está excluido de Git y debe incluirse en los respaldos del negocio. Si el archivo falta en una instalación nueva, se generan las dos cuentas iniciales.

## Operación de caja

La entrada de caja abre directamente “Caja · Hoy”. El menú contiene solamente esa sección y Pedidos KDS. El formulario permite agregar productos disponibles del catálogo, cantidades, cliente, modalidad, medio de pago, indicaciones y delivery. El precio y el total se calculan de nuevo en el servidor; caja no puede fijar precios o descuentos arbitrarios. El pedido registra la cuenta que lo creó.

Los pagos confirmados son cobros marcados como recibidos, incluso si la entrega sigue pendiente. No constituyen un cierre contable, arqueo de efectivo ni una conciliación bancaria. El operador debe confirmar el pago cuando lo recibe o verifica su comprobante.

Pagos y cambios de estado muestran éxito después de confirmarse en el servidor. Caja avanza por la secuencia Nuevo → Cocina → Reparto → Entregado; para recojo pasa de Cocina a Entregado. No puede retroceder pedidos terminados. Los pagos digitales deben verificarse antes de enviar a cocina. El administrador conserva la posibilidad de corregir estados.

La sección Usuarios y las operaciones de catálogo/configuración están protegidas por rol en el servidor. La consulta de pedidos filtra los datos antes de enviarlos al navegador de caja; las consultas y modificaciones individuales fuera del día reciben 403. Intentar solicitar el historial completo también recibe 403.

## Verificación

`node tools/test-access.js` ejecuta en una copia temporal las 21 pruebas existentes y comprobaciones de:

- Alta de cuentas, usuarios duplicados y rechazo de roles distintos de caja.
- Restricciones de usuarios, configuración, catálogo e historial para caja.
- Exclusión de pedidos antiguos y sin fecha, también por identificador individual.
- Registro de pedido con precios autoritativos, verificación de pago y avance de estados.
- Desactivación con revocación inmediata, reactivación y persistencia tras reiniciar.
- Rechazo del antiguo usuario atención.

En el navegador se probó el alta de `caja2`, su ingreso con menú restringido, registro de un pedido, confirmación del cobro y aceptación en KDS. Estas pruebas se realizaron en una copia temporal; las cuentas y ventas de prueba no se agregaron a la base del negocio.

No se agregó un cierre de turno con saldo inicial, gastos o diferencias; esa función requiere definir el proceso de arqueo del negocio. El dashboard general conserva su diseño y secciones originales. Consulta [Reportes y sugerencias](./REPORTES_Y_SUGERENCIAS.md) para el análisis histórico, las exportaciones y los borradores de campañas. Integraciones se retiró del menú.
