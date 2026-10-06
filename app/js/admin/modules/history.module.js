(function() {
  'use strict';
  const labels = { new: 'Nuevo', kitchen: 'En cocina', delivery: 'En reparto', delivered: 'Entregado', cancelled: 'Cancelado' };
  let page = 1;
  const size = 15;
  const el = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value) || 0);
  function dateKey(order) {
    const date = new Date(order.createdAt);
    if (!order.createdAt || Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = type => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function filtered() {
    const query = el('history-search').value.trim().toLocaleLowerCase('es');
    const status = el('history-status').value;
    const from = el('history-from').value;
    const to = el('history-to').value;
    if (from && to && from > to) return [];
    return window.ORDERS.filter(order => {
      const date = dateKey(order);
      return (!query || `${order.id} ${order.customer} ${order.phone}`.toLocaleLowerCase('es').includes(query)) &&
        (!status || order.status === status) && (!from || date >= from) && (!to || (date && date <= to));
    }).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  }
  function cell(row, value, secondary) {
    const td = document.createElement('td');
    const text = document.createElement('strong');
    text.textContent = value;
    td.append(text);
    if (secondary) { const small = document.createElement('small'); small.textContent = secondary; td.append(small); }
    row.append(td);
    return td;
  }
  function render() {
    if (!el('history-rows')) return;
    const orders = filtered();
    const pages = Math.max(1, Math.ceil(orders.length / size));
    page = Math.min(page, pages);
    const summary = el('history-summary');
    summary.replaceChildren();
    const delivered = orders.filter(o => o.status === 'delivered');
    [['Pedidos encontrados', orders.length], ['Entregados', delivered.length], ['Total entregado', money(delivered.reduce((sum, o) => sum + Math.round((Number(o.total) || 0) * 100), 0) / 100)]].forEach(([title, value]) => {
      const card = document.createElement('div'); card.className = 'history-stat';
      const label = document.createElement('span'); label.textContent = title;
      const number = document.createElement('strong'); number.textContent = value;
      card.append(label, number); summary.append(card);
    });
    const invalid = el('history-from').value && el('history-to').value && el('history-from').value > el('history-to').value;
    el('history-feedback').textContent = invalid ? 'La fecha inicial debe ser anterior o igual a la fecha final.' : 'Las fechas corresponden a la creación del pedido, en hora de Perú.';
    const rows = el('history-rows'); rows.replaceChildren();
    orders.slice((page - 1) * size, page * size).forEach(order => {
      const row = document.createElement('tr');
      const date = dateKey(order) ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt)) : 'Sin fecha registrada';
      cell(row, order.id, date); cell(row, order.customer || 'Sin nombre', order.phone);
      cell(row, order.mode === 'pickup' ? 'Recojo en tienda' : 'Delivery', order.channel === 'whatsapp' ? 'WhatsApp' : order.channel === 'caja' ? 'Caja' : order.channel === 'web' ? 'Web' : 'App');
      const status = document.createElement('td'); const badge = document.createElement('span');
      badge.className = 'history-status'; if (labels[order.status]) badge.classList.add(order.status);
      badge.textContent = labels[order.status] || order.status || 'Sin estado'; status.append(badge); row.append(status);
      cell(row, order.payMethod || 'Sin registrar', order.payVerified ? 'Verificado' : 'Por verificar');
      cell(row, money(order.total));
      const action = document.createElement('td'); const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm'; button.textContent = 'Ver detalle';
      button.setAttribute('aria-label', `Ver detalle del pedido ${order.id}`);
      button.addEventListener('click', () => window.openOrderDetailModal(order.id));
      action.append(button); row.append(action); rows.append(row);
    });
    if (!orders.length) {
      const row = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 7;
      td.textContent = window.adminAuthenticated ? 'No hay pedidos que coincidan con estos filtros.' : 'Ingresa para consultar tus pedidos.'; row.append(td); rows.append(row);
    }
    el('history-count').textContent = `${orders.length} pedidos · Página ${page} de ${pages}`;
    el('history-prev').disabled = page <= 1; el('history-next').disabled = page >= pages;
    el('history-export').disabled = !orders.length;
  }
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }
  window.renderOrderHistory = render;
  document.addEventListener('DOMContentLoaded', () => {
    ['history-search', 'history-status', 'history-from', 'history-to'].forEach(id => el(id).addEventListener('input', () => { page = 1; render(); }));
    el('history-reset').addEventListener('click', () => { ['history-search', 'history-status', 'history-from', 'history-to'].forEach(id => el(id).value = ''); page = 1; render(); });
    el('history-prev').addEventListener('click', () => { page--; render(); });
    el('history-next').addEventListener('click', () => { page++; render(); });
    el('history-export').addEventListener('click', () => {
      if (!window.adminAuthenticated) return;
      const header = ['Pedido', 'Fecha (Perú)', 'Cliente', 'Teléfono', 'Estado', 'Modalidad', 'Pago', 'Total (PEN)'];
      const data = filtered().map(o => [o.id, dateKey(o), o.customer, o.phone, labels[o.status] || o.status, o.mode === 'pickup' ? 'Recojo' : 'Delivery', o.payMethod, o.total]);
      const blob = new Blob(['\uFEFF' + [header, ...data].map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'retequenos-historial.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  });
})();
