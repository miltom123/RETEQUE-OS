(function() {
  'use strict';
  const el = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value) || 0);
  let snapshot = null, page = 1, reportRequest = 0;
  const size = 15;
  const labels = { new: 'Nuevo', kitchen: 'En cocina', delivery: 'En reparto', delivered: 'Entregado', cancelled: 'Cancelado' };
  function text(tag, value, className) { const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; }
  function params() {
    const query = new URLSearchParams({ records: el('report-records').value, undated: String(el('report-undated').checked) });
    for (const key of ['from', 'to', 'channel']) if (el(`report-${key}`).value) query.set(key, el(`report-${key}`).value);
    return query;
  }
  function exportsEnabled(enabled) {
    for (const type of ['details', 'orders', 'metrics', 'json']) {
      const link = el(`report-export-${type}`); link.setAttribute('aria-disabled', String(!enabled));
      if (enabled) { const query = params(); query.set('type', type); link.href = '/api/reports/export?' + query; }
      else link.removeAttribute('href');
    }
  }
  async function fetchReport(query) {
    const res = await fetch('/api/reports?' + query, { cache: 'no-store' });
    const data = await res.json();
    if (res.status === 401) window.lockAdminApp();
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar el reporte.');
    return data;
  }
  function summary(containerId, data, today = false) {
    const container = el(containerId); container.replaceChildren();
    const values = today ? [
      ['Ventas entregadas hoy', money(data.salesTotal), `${data.delivered} pedidos entregados`],
      ['Cobros confirmados hoy', money(data.confirmedPayments), 'Incluye pedidos pendientes con pago confirmado'],
      ['Pedidos pendientes hoy', data.pending, `${money(data.pendingOrdersValue)} por completar`],
      ['Ticket promedio hoy', money(data.averageTicket), 'Ventas entregadas, incluye delivery']
    ] : [
      ['Ventas entregadas', money(data.salesTotal), `${data.delivered} pedidos entregados`],
      ['Cobros confirmados', money(data.confirmedPayments), 'No cancelados; incluye pendientes pagados'],
      ['Ticket promedio', money(data.averageTicket), 'Incluye delivery y descuento'],
      ['Productos sin delivery', money(data.merchandiseSubtotal - data.discounts), 'Subtotal de ventas menos descuentos'],
      ['Descuentos registrados', money(data.discounts), 'Solo ventas entregadas'],
      ['Delivery registrado', money(data.deliveryFees), 'Solo ventas entregadas'],
      ['Pedidos pendientes', data.pending, `${money(data.pendingOrdersValue)} por completar`],
      ['Pagos por verificar', money(data.pendingPayments), `${data.cancelled} pedidos cancelados excluidos`]
    ];
    values.forEach(([label, value, note]) => { const card = document.createElement('div'); card.className = 'history-stat'; card.append(text('span', label), text('strong', value), text('small', note)); container.append(card); });
  }
  function bars(id, points, labelKey = 'label', valueKey = 'total', formatter = money) {
    const container = el(id); container.replaceChildren();
    if (!points.length) { container.append(text('p', 'Todavía no hay ventas entregadas para este análisis.', 'report-empty')); return; }
    const maximum = Math.max(1, ...points.map(point => point[valueKey]));
    points.forEach(point => {
      const row = document.createElement('div'); row.className = 'report-bar-row';
      const heading = document.createElement('div'); heading.append(text('span', point[labelKey]), text('strong', formatter(point[valueKey])));
      const track = document.createElement('div'); track.className = 'report-bar-track';
      const fill = document.createElement('span'); fill.style.width = `${Math.max(0, point[valueKey] / maximum * 100)}%`; track.append(fill); row.append(heading, track); container.append(row);
    });
  }
  function dailyPoints(report) {
    if (!report.daily.length && (!report.filters.from || !report.filters.to)) return [];
    const from = report.filters.from || report.daily[0]?.date;
    const to = report.filters.to || report.daily.at(-1)?.date;
    if (!from || !to) return [];
    const last = new Date(to + 'T00:00:00Z'); const first = new Date(from + 'T00:00:00Z');
    const start = new Date(Math.max(first.getTime(), last.getTime() - 29 * 86400000));
    const map = new Map(report.daily.map(point => [point.date, point])); const result = [];
    for (let date = start; date <= last; date = new Date(date.getTime() + 86400000)) {
      const key = date.toISOString().slice(0, 10); result.push(map.get(key) || { date: key, total: 0, orders: 0 });
    }
    return result;
  }
  function renderOrders() {
    if (!snapshot) {
      el('report-order-count').textContent = 'Sin selección disponible';
      el('report-page-label').textContent = 'Página 1 de 1';
      el('report-prev').disabled = true; el('report-next').disabled = true;
      return;
    }
    const rows = el('report-orders'); rows.replaceChildren(); const pages = Math.max(1, Math.ceil(snapshot.orders.length / size)); page = Math.min(page, pages);
    snapshot.orders.slice((page - 1) * size, page * size).forEach(order => {
      const row = document.createElement('tr');
      const id = document.createElement('td'); id.append(text('strong', order.id), text('small', order.createdAt && !Number.isNaN(Date.parse(order.createdAt)) ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt)) : 'Sin fecha registrada'));
      const customer = document.createElement('td'); customer.append(text('strong', order.customer), text('small', order.phone || 'Sin teléfono'));
      const state = document.createElement('td'); state.append(text('span', labels[order.status] || order.status), text('small', `${order.payMethod || 'Sin medio'} · ${order.payVerified ? 'Confirmado' : 'Por verificar'}`));
      const total = text('td', money(order.total)); const action = document.createElement('td');
      const button = text('button', 'Ver detalle', 'btn btn-outline btn-sm'); button.setAttribute('aria-label', `Ver reporte del pedido ${order.id}`);
      button.addEventListener('click', () => window.openOrderDetailModal(order.id)); action.append(button); row.append(id, customer, state, total, action); rows.append(row);
    });
    if (!snapshot.orders.length) { const row = document.createElement('tr'); const cell = text('td', 'No hay registros con estos criterios.'); cell.colSpan = 5; row.append(cell); rows.append(row); }
    el('report-order-count').textContent = `${snapshot.orders.length} registros para exportar · ${snapshot.filters.records === 'all' ? 'Todos los estados' : 'Ventas entregadas'}`;
    el('report-page-label').textContent = `Página ${page} de ${pages}`; el('report-prev').disabled = page <= 1; el('report-next').disabled = page >= pages;
  }
  function render(report) {
    summary('report-summary', report.summary);
    bars('report-daily', dailyPoints(report), 'date');
    el('report-daily').append(text('small', 'Vista de hasta 30 días. Las exportaciones conservan todas las fechas con ventas del período.', 'report-footnote'));
    const rows = el('report-products'); rows.replaceChildren();
    report.products.forEach(product => { const row = document.createElement('tr'); const name = document.createElement('td'); name.append(text('strong', product.name), text('small', product.category)); row.append(name, text('td', product.units), text('td', product.orders), text('td', money(product.grossSales))); rows.append(row); });
    if (!report.products.length) { const row = document.createElement('tr'); const cell = text('td', 'Se necesitan ventas entregadas para identificar los productos más vendidos.'); cell.colSpan = 4; row.append(cell); rows.append(row); }
    bars('report-channels', report.channels); bars('report-payments', report.payments);
    const pairs = el('report-pairs'); pairs.replaceChildren();
    report.pairs.slice(0, 10).forEach(pair => { const card = document.createElement('div'); card.className = 'report-pair'; card.append(text('strong', pair.names.join(' + ')), text('p', `${pair.orders} pedidos conjuntos · ${pair.share}% de las ventas entregadas`)); pairs.append(card); });
    if (!report.pairs.length) pairs.append(text('p', 'Aún no hay compras conjuntas registradas en ventas entregadas.', 'report-empty'));
    el('report-confidence').textContent = report.definitions.sample;
    const suggestions = el('report-suggestions'); suggestions.replaceChildren();
    report.suggestions.forEach(suggestion => {
      const card = document.createElement('article'); card.className = `report-suggestion ${suggestion.type}`;
      card.append(text('h3', suggestion.title), text('p', suggestion.evidence, 'report-evidence'), text('p', suggestion.action));
      if (suggestion.coupon) { const button = text('button', 'Preparar borrador de cupón →', 'btn btn-outline btn-sm'); button.addEventListener('click', () => window.prepareSuggestedCoupon(suggestion.coupon)); card.append(button); }
      suggestions.append(card);
    });
    renderOrders();
  }
  async function loadReports() {
    if (window.currentUser?.role !== 'admin') return;
    const request = ++reportRequest, user = window.currentUser;
    exportsEnabled(false); el('report-feedback').textContent = 'Actualizando métricas y sugerencias…';
    try {
      const report = await fetchReport(params());
      if (request !== reportRequest || user !== window.currentUser) return;
      snapshot = report; render(report); exportsEnabled(true);
      el('report-feedback').textContent = `${report.summary.orders} pedidos analizados · ${report.summary.delivered} entregados · ${report.summary.undatedOrders} sin fecha · Actualizado ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', timeStyle: 'medium' }).format(new Date(report.generatedAt))}. Ventas no equivale a utilidad.`;
    } catch (error) { if (request === reportRequest) {
      snapshot = null;
      ['report-summary', 'report-orders', 'report-products', 'report-suggestions', 'report-daily', 'report-pairs', 'report-channels', 'report-payments'].forEach(id => el(id).replaceChildren());
      el('report-confidence').textContent = 'Análisis no disponible para esta selección.';
      el('report-feedback').textContent = error.message;
      renderOrders();
    } }
  }
  function resetReports() {
    snapshot = null; reportRequest++;
    ['report-summary', 'report-orders', 'report-products', 'report-suggestions', 'report-daily', 'report-pairs', 'report-channels', 'report-payments'].forEach(id => el(id)?.replaceChildren());
    exportsEnabled(false);
    renderOrders();
  }
  window.loadReports = loadReports; window.resetReports = resetReports;
  window.refreshVisibleReports = function() {
    if (el('tab-reports').classList.contains('active')) loadReports();
  };
  document.addEventListener('DOMContentLoaded', () => {
    exportsEnabled(false);
    ['from', 'to', 'channel', 'records', 'undated'].forEach(key => el(`report-${key}`).addEventListener('change', () => { page = 1; loadReports(); }));
    el('report-refresh').addEventListener('click', loadReports);
    el('report-reset').addEventListener('click', () => { ['from', 'to', 'channel'].forEach(key => el(`report-${key}`).value = ''); el('report-records').value = 'delivered'; el('report-undated').checked = true; page = 1; loadReports(); });
    el('report-prev').addEventListener('click', () => { page--; renderOrders(); }); el('report-next').addEventListener('click', () => { page++; renderOrders(); });
  });
})();
