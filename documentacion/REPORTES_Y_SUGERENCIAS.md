# Reportes y oportunidades

Actualizado el 3 de octubre de 2026. Disponible únicamente para Administrador. Caja recibe 403 tanto al consultar como al exportar la API. Se eliminó Integraciones del menú.

## Datos y filtros

El informe se calcula en el servidor desde todos los pedidos persistidos y el catálogo actual. No utiliza los indicadores de demostración del módulo de cupones. Permite seleccionar fechas, canal e inclusión de registros sin fecha. Sin fechas seleccionadas analiza todo el histórico. Los días y horas corresponden a America/Lima.

La elección “Ventas entregadas” o “Todos los pedidos y estados” cambia los registros del detalle y de la exportación; los indicadores siempre distinguen ventas entregadas, pendientes y cancelaciones de la selección. Los registros sin fecha pueden incluirse en totales, pero no en curvas diarias ni horarios. No se inventan fechas, costos ni ganancias.

El reporte se actualiza al cambiar los filtros, al pulsar Actualizar y cuando la sincronización detecta cambios de pedidos mientras está abierto. Una selección inválida deshabilita las exportaciones y retira las cifras anteriores.

## Indicadores

- Ventas: suma del total registrado de pedidos entregados, incluyendo delivery y descontando descuentos registrados.
- Cobros confirmados: total de pedidos no cancelados con pago verificado; también incluye pendientes de entrega.
- Ticket promedio: ventas entregadas divididas por número de pedidos entregados.
- Compra promedio sin delivery: subtotal menos descuento de ventas entregadas, dividido por pedidos entregados; se usa para sugerir mínimos de cupón.
- Productos: unidades de presentaciones vendidas y valor bruto de sus líneas, antes de descuentos del pedido y delivery. Los productos se vinculan por identificador o nombre normalizado exacto.
- Curva diaria, canales, medios de pago y horarios: ventas entregadas. El día es el de creación del pedido, pues no existe un campo histórico fiable de fecha de entrega.
- Combinaciones: pedidos entregados que contienen ambos productos, contabilizados una vez por pedido aunque haya líneas repetidas.

El dashboard principal conserva su diseño y secciones originales, incluidos sus indicadores de demostración pendientes de conexión. El cálculo real nuevo se mantiene dentro de Reportes. Los registros sin fecha se consultan allí. Reportes no presenta utilidad, margen ni conversión sin datos de costos y visitas.

## Exportaciones

Todas respetan los filtros y se descargan desde el servidor con autorización de administrador:

| Archivo | Contenido |
| --- | --- |
| Detalle por producto CSV | Una fila por línea: pedido, fecha, cliente, teléfono, canal, cuenta de caja, entrega, dirección, referencia, GPS, pago, verificación, subtotal, delivery, descuento, total, efectivo, motorizado, prioridad, tiempos y notas; además identificador de producto, cantidad, precio, importe bruto y salsas. |
| Pedidos completos CSV | Una fila por pedido con los datos anteriores y JSON de productos y del registro íntegro, preservando campos adicionales. |
| Métricas y sugerencias CSV | Contexto, filtros, definiciones, indicadores, productos, ventas temporales, canales, pagos, combinaciones y recomendaciones. |
| Informe completo JSON | Informe íntegro y registros originales de la selección. |

El total del pedido se repite en cada línea del detalle y está rotulado “no sumar en detalle”. Los CSV llevan BOM UTF-8, comillas escapadas y protección de campos que podrían interpretarse como fórmulas. Solo se exporta lo que efectivamente está registrado; las celdas faltantes quedan vacías.

## Sugerencias dinámicas

Las recomendaciones explican el dato observado y una acción posible:

- Disponibilidad y preparación del producto más vendido.
- Combo de productos disponibles con al menos tres compras conjuntas; si no existe, combinación exploratoria de dos favoritos, priorizando categorías diferentes.
- Cupón piloto desde cinco ventas entregadas: 5%, mínimo superior a la compra promedio sin delivery, 20 usos, un uso por cliente y siete días. Es una hipótesis para evaluar, no una rentabilidad calculada.
- Organización de la hora más demandada solo con diez ventas fechadas, siete días con ventas y dos horarios observados. No se interpreta una hora sin ventas como baja demanda sin conocer los horarios de apertura.
- Recuperación de fechas faltantes y conciliación de entregados con cobros sin confirmar.

“Preparar borrador de cupón” abre el formulario existente con los parámetros sugeridos, todos los días, toda la carta, estado Borrador y sin acumulación ni envío push. Evita códigos ya existentes. No guarda ni activa automáticamente una campaña. El administrador revisa costos y reglas antes de guardarla. La publicación y aplicación de cupones al checkout continúa dependiendo de la funcionalidad del módulo existente; este informe no implementa un motor nuevo de canje.

## Verificación

`node tools/test-reports.js` valida sumas, cancelaciones, cobros, zona horaria, fechas inválidas, filtros, compras conjuntas únicas, productos no disponibles, umbrales de sugerencias y preservación de datos en las exportaciones.

`node tools/test-access.js` ejecuta las 21 pruebas existentes y pruebas de roles, caja y reportes en una copia temporal. Incluye 401 sin sesión, 403 para caja, exportaciones del administrador y rechazo de filtros inválidos. Se verificó en el navegador la vista real, la ausencia de Integraciones y, en una copia con ventas de prueba, el flujo de preparación del cupón. Los pedidos del negocio no se alteraron.
