const cents = value => Math.round((Number(value) || 0) * 100);
const amount = value => value / 100;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function dateParts(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type).value;
  return { day: [get('year'), get('month'), get('day')].join('-'), hour: get('hour') };
}
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
function buildReport(allOrders, catalog, params = new URLSearchParams(), now = new Date()) {
  const from = params.get('from') || '', to = params.get('to') || '';
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) throw new Error('Selecciona un rango de fechas válido.');
  const includeUndated = params.get('undated') !== 'false';
  const channel = params.get('channel') || '';
  const records = params.get('records') === 'all' ? 'all' : 'delivered';
  const orders = allOrders.filter(order => {
    const date = dateParts(order.createdAt);
    return (!channel || order.channel === channel) && (date ? (!from || date.day >= from) && (!to || date.day <= to) : includeUndated);
  });
  const sales = orders.filter(order => order.status === 'delivered');
  const open = orders.filter(order => ['new', 'kitchen', 'delivery'].includes(order.status));
  const confirmed = orders.filter(order => order.payVerified && order.status !== 'cancelled');
  const sum = (list, field) => amount(list.reduce((total, order) => total + cents(order[field]), 0));
  const summary = {
    orders: orders.length, delivered: sales.length, pending: open.length, cancelled: orders.filter(order => order.status === 'cancelled').length,
    salesTotal: sum(sales, 'total'), merchandiseSubtotal: sum(sales, 'subtotal'), discounts: sum(sales, 'discount'), deliveryFees: sum(sales, 'deliveryFee'),
    confirmedPayments: sum(confirmed, 'total'), deliveredUnverified: sum(sales.filter(order => !order.payVerified), 'total'),
    pendingPayments: sum(orders.filter(order => !order.payVerified && order.status !== 'cancelled'), 'total'),
    pendingOrdersValue: sum(open, 'total'), averageTicket: sales.length ? amount(Math.round(cents(sum(sales, 'total')) / sales.length)) : 0,
    averageBasket: sales.length ? amount(Math.round((cents(sum(sales, 'subtotal')) - cents(sum(sales, 'discount'))) / sales.length)) : 0,
    undatedOrders: orders.filter(order => !dateParts(order.createdAt)).length,
    datedSales: sales.filter(order => dateParts(order.createdAt)).length
  };
  const products = new Map(), daily = new Map(), hours = new Map(), channels = new Map(), payments = new Map(), pairMap = new Map();
  const identify = item => {
    const product = catalog.find(product => item.productId && product.id === item.productId) || catalog.find(product => normalize(product.name) === normalize(item.name));
    return { key: product ? product.id : normalize(item.name), product };
  };
  sales.forEach(order => {
    const date = dateParts(order.createdAt);
    if (date) {
      const point = daily.get(date.day) || { date: date.day, orders: 0, totalCents: 0 };
      point.orders++; point.totalCents += cents(order.total); daily.set(date.day, point);
      const hour = hours.get(date.hour) || { hour: date.hour, orders: 0, totalCents: 0 };
      hour.orders++; hour.totalCents += cents(order.total); hours.set(date.hour, hour);
    }
    for (const [map, key] of [[channels, order.channel || 'Sin canal'], [payments, order.payMethod || 'Sin medio de pago']]) {
      const point = map.get(key) || { label: key, orders: 0, totalCents: 0 };
      point.orders++; point.totalCents += cents(order.total); map.set(key, point);
    }
    const contained = new Set();
    (order.items || []).forEach(item => {
      const { key, product } = identify(item);
      const entry = products.get(key) || { key, productId: product?.id || null, name: product?.name || String(item.name || 'Producto sin nombre'), category: product?.cat || 'Sin vincular al catálogo', available: Boolean(product && product.stock !== false), units: 0, orders: 0, grossCents: 0 };
      entry.units += Number(item.qty) || 0; entry.grossCents += cents(item.price) * (Number(item.qty) || 0);
      if (!contained.has(key)) entry.orders++;
      contained.add(key); products.set(key, entry);
    });
    const keys = [...contained].sort();
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
      const key = JSON.stringify([keys[a], keys[b]]); const pair = pairMap.get(key) || { keys: [keys[a], keys[b]], orders: 0 };
      pair.orders++; pairMap.set(key, pair);
    }
  });
  const ranking = [...products.values()].sort((a, b) => b.units - a.units || b.grossCents - a.grossCents).map(({ grossCents, ...product }) => ({ ...product, grossSales: amount(grossCents) }));
  const pairs = [...pairMap.values()].sort((a, b) => b.orders - a.orders).map(pair => ({ names: pair.keys.map(key => products.get(key).name), productIds: pair.keys.map(key => products.get(key).productId), available: pair.keys.every(key => products.get(key).available), orders: pair.orders, share: sales.length ? Math.round(pair.orders / sales.length * 1000) / 10 : 0 }));
  const serialize = map => [...map.values()].map(({ totalCents, ...point }) => ({ ...point, total: amount(totalCents) }));
  const dailySales = serialize(daily).sort((a, b) => a.date.localeCompare(b.date));
  const hourlySales = serialize(hours).sort((a, b) => a.hour.localeCompare(b.hour));
  const suggestions = [];
  const smallSample = sales.length < 10;
  if (!sales.length) suggestions.push({ type: 'data', title: 'Aún no hay ventas entregadas', evidence: `${summary.pending} pedidos pendientes en esta selección.`, action: 'Completa los pedidos reales y amplía el período para detectar productos y combinaciones con demanda. No se generan descuentos a partir de pedidos pendientes.' });
  if (summary.undatedOrders) suggestions.push({ type: 'data', title: 'Completar fechas del histórico', evidence: `${summary.undatedOrders} pedidos no tienen fecha de creación.`, action: 'Recupera fechas de los comprobantes si existen. Esos pedidos no participan en horarios ni en la curva diaria; no se les asigna una fecha estimada.' });
  if (ranking.length) suggestions.push({ type: 'operation', title: 'Asegurar disponibilidad del más vendido', evidence: `${ranking[0].name}: ${ranking[0].units} unidades en ${ranking[0].orders} pedidos entregados.`, action: 'Revisa existencias y preparación de este producto antes de promocionarlo. Las unidades corresponden a presentaciones vendidas, no a piezas individuales.' });
  const available = ranking.filter(product => product.available);
  const provenPair = pairs.find(pair => pair.available && pair.orders >= 3);
  if (provenPair) suggestions.push({ type: 'combo', title: 'Probar un combo con demanda observada', evidence: `${provenPair.names.join(' + ')} aparecen juntos en ${provenPair.orders} pedidos (${provenPair.share}% de las ventas entregadas).`, action: 'Ofrece ambos como combo. Prueba primero sin descuento y mide unidades, ticket y costo de preparación antes de fijar un precio promocional.' });
  else if (available.length >= 2) {
    const second = available.slice(1).find(product => product.category !== available[0].category) || available[1];
    suggestions.push({ type: 'combo', title: 'Experimentar con dos favoritos', evidence: `${available[0].name} (${available[0].units} unidades) + ${second.name} (${second.units} unidades).`, action: 'Prueba ofrecerlos juntos como hipótesis de venta cruzada; todavía no hay al menos 3 compras conjuntas que validen este combo. Revisa disponibilidad, preparación y costos.' });
  }
  if (sales.length >= 5) {
    const minimum = Math.max(5, Math.ceil(summary.averageBasket * 1.2 / 5) * 5);
    const coupon = { code: 'TICKET5', name: 'Prueba de ticket mayor', percent: 5, minimum, limit: 20, days: 7 };
    suggestions.push({ type: 'coupon', title: 'Cupón piloto para elevar el ticket', evidence: `Compra promedio sin delivery: S/ ${summary.averageBasket.toFixed(2)}, sobre ${sales.length} ventas entregadas.`, action: `Probar 5% desde S/ ${minimum.toFixed(2)}, con 20 usos y 7 días de vigencia, sin acumular descuentos. Comparar el ticket sin delivery antes y después, y revisar costos para no reducir el margen.`, coupon });
  }
  if (hourlySales.length >= 2 && summary.datedSales >= 10 && dailySales.length >= 7) {
    const sorted = [...hourlySales].sort((a, b) => b.orders - a.orders);
    suggestions.push({ type: 'operation', title: 'Organizar la operación en la hora más demandada', evidence: `${sorted[0].hour}:00 concentra ${sorted[0].orders} ventas entregadas en ${dailySales.length} días con ventas.`, action: 'Refuerza la preparación y disponibilidad en esa franja. Para promociones por horario, primero registra horarios de apertura: una hora sin ventas no necesariamente es una hora de baja demanda.' });
  }
  if (summary.deliveredUnverified) suggestions.push({ type: 'payment', title: 'Revisar cobros de pedidos entregados', evidence: `S/ ${summary.deliveredUnverified.toFixed(2)} en ventas entregadas tienen pago sin confirmar.`, action: 'Revisa efectivo y comprobantes antes de confirmar estos cobros. No se contabilizan como pagos confirmados hasta verificarlos.' });
  return { generatedAt: now.toISOString(), timezone: 'America/Lima', filters: { from, to, channel, records, includeUndated },
    definitions: { sales: 'Pedidos entregados. Total incluye delivery y descuenta descuentos registrados.', confirmedPayments: 'Pedidos no cancelados marcados con pago verificado, incluso pendientes de entrega.', productSales: 'Importe bruto de líneas de producto; no asigna descuento del pedido ni delivery.', profit: 'No disponible: no hay costos de producto, reembolsos ni conciliación bancaria.', sample: smallSample ? 'Muestra pequeña: menos de 10 ventas entregadas. Sugerencias exploratorias.' : 'Sugerencias basadas en la selección; no prueban causalidad ni garantizan rentabilidad.' },
    summary, products: ranking, pairs, daily: dailySales, hours: hourlySales, channels: serialize(channels), payments: serialize(payments), suggestions,
    orders: (records === 'all' ? orders : sales).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)) };
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function csv(rows) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
function exportReport(report, type) {
  const commonHeader = ['Pedido', 'Fecha ISO', 'Fecha Perú', 'Estado', 'Cliente', 'Teléfono', 'Canal', 'Usuario caja', 'Modalidad', 'Dirección', 'Referencia', 'GPS', 'Pago', 'Pago verificado', 'Subtotal pedido PEN', 'Delivery pedido PEN', 'Descuento pedido PEN', 'Total pedido PEN (no sumar en detalle)', 'Efectivo recibido', 'Motorizado', 'Prioridad', 'Tiempo registrado', 'Minutos registrados', 'Notas'];
  const orderRow = order => [order.id, order.createdAt, dateParts(order.createdAt)?.day, order.status, order.customer, order.phone, order.channel, order.createdBy, order.mode, order.address, order.reference, order.gps, order.payMethod, order.payVerified ? 'Sí' : 'No', order.subtotal, order.deliveryFee, order.discount, order.total, order.cashWith, order.driver, order.priority ? 'Sí' : 'No', order.time, order.elapsedMinutes, order.notes];
  if (type === 'orders') return csv([ [...commonHeader, 'Productos completos JSON', 'Registro completo JSON'], ...report.orders.map(order => [...orderRow(order), JSON.stringify(order.items || []), JSON.stringify(order)]) ]);
  if (type === 'details') return csv([ [...commonHeader, 'Línea', 'Producto ID', 'Producto', 'Cantidad', 'Precio unitario PEN', 'Importe bruto línea PEN', 'Salsas'], ...report.orders.flatMap(order => (order.items?.length ? order.items : [{}]).map((item, index) => [...orderRow(order), index + 1, item.productId, item.name, item.qty, item.price, amount(cents(item.price) * (Number(item.qty) || 0)), item.sauces])) ]);
  if (type === 'metrics') {
    const rows = [['Sección', 'Indicador', 'Detalle', 'Valor', 'Unidad']];
    rows.push(['Contexto', 'Generado', '', report.generatedAt, 'ISO'], ['Contexto', 'Filtros', '', JSON.stringify(report.filters), 'JSON']);
    Object.entries(report.definitions).forEach(([key, value]) => rows.push(['Definiciones', key, '', value, 'Texto']));
    Object.entries(report.summary).forEach(([key, value]) => rows.push(['Resumen', key, '', value, /Total|Subtotal|discounts|Fees|Payments|Unverified|Value|Ticket|Basket/.test(key) ? 'PEN' : 'Pedidos']));
    report.products.forEach(product => rows.push(['Productos', product.name, 'Unidades', product.units, 'Presentaciones'], ['Productos', product.name, 'Importe bruto', product.grossSales, 'PEN'], ['Productos', product.name, 'Pedidos', product.orders, 'Pedidos']));
    for (const key of ['daily', 'hours', 'channels', 'payments']) report[key].forEach(point => rows.push([key, point.date || point.hour || point.label, 'Pedidos', point.orders, 'Pedidos'], [key, point.date || point.hour || point.label, 'Ventas entregadas', point.total, 'PEN']));
    report.pairs.forEach(pair => rows.push(['Combinaciones', pair.names.join(' + '), 'Pedidos conjuntos', pair.orders, 'Pedidos'], ['Combinaciones', pair.names.join(' + '), 'Participación', pair.share, '%']));
    report.suggestions.forEach(suggestion => rows.push(['Sugerencias', suggestion.title, suggestion.evidence, suggestion.action, 'Texto']));
    return csv(rows);
  }
  if (type === 'json') return JSON.stringify(report, null, 2);
  throw new Error('Formato de exportación inválido.');
}
module.exports = { buildReport, exportReport, dateParts };
