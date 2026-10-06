(function() {
  'use strict';
  const el = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  const labels = { new: 'Nuevo', kitchen: 'En cocina', delivery: 'En reparto', delivered: 'Entregado', cancelled: 'Cancelado' };
  let catalog = [], cart = [];
  let saving = false;
  function total() {
    const subtotal = cart.reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0);
    const fee = el('cash-mode').value === 'delivery' ? Math.round((Number(el('cash-fee').value) || 0) * 100) : 0;
    el('cash-total').textContent = money((subtotal + fee) / 100);
  }
  function renderCart() {
    const container = el('cash-cart'); container.replaceChildren();
    if (!cart.length) { const empty = document.createElement('p'); empty.textContent = 'Agrega los productos del pedido.'; container.append(empty); }
    cart.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'cash-cart-row';
      const name = document.createElement('span'); name.textContent = `${item.qty} × ${item.name}`;
      const price = document.createElement('strong'); price.textContent = money(item.price * item.qty);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-outline btn-sm'; remove.textContent = 'Quitar';
      remove.setAttribute('aria-label', `Quitar ${item.name}`); remove.disabled = saving;
      remove.addEventListener('click', () => { cart.splice(index, 1); renderCart(); });
      row.append(name, price, remove); container.append(row);
    }); total();
  }
  async function loadCashCatalog() {
    if (!window.adminAuthenticated) return;
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar la carta.');
      const data = await res.json();
      if (!window.adminAuthenticated) return;
      catalog = data.filter(product => product.stock !== false);
      const select = el('cash-product'); const previous = select.value; select.replaceChildren();
      catalog.forEach(product => { const option = document.createElement('option'); option.value = product.id;
        option.textContent = `${product.name} · ${money(product.promo ?? product.price)}`; select.append(option); });
      if (catalog.some(product => product.id === previous)) select.value = previous;
      renderCash();
    } catch (error) { el('cash-feedback').textContent = error.message; }
  }
  function renderCash() {
    const today = day(Date.now());
    const orders = window.ORDERS.filter(order => order.createdAt && !Number.isNaN(Date.parse(order.createdAt)) && day(order.createdAt) === today);
    const confirmed = orders.filter(order => order.payVerified && order.status !== 'cancelled');
    const pending = orders.filter(order => !order.payVerified && order.status !== 'cancelled');
    const summary = el('cash-summary'); summary.replaceChildren();
    [['Pedidos de hoy', orders.length], ['Pagos confirmados', money(confirmed.reduce((sum, order) => sum + Math.round(order.total * 100), 0) / 100)], ['Por cobrar / verificar', money(pending.reduce((sum, order) => sum + Math.round(order.total * 100), 0) / 100)]].forEach(([label, value]) => {
      const card = document.createElement('div'); card.className = 'history-stat';
      const title = document.createElement('span'); title.textContent = label;
      const amount = document.createElement('strong'); amount.textContent = value; card.append(title, amount); summary.append(card);
    });
    const rows = el('cash-rows'); rows.replaceChildren();
    orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).forEach(order => {
      const row = document.createElement('tr');
      const customer = document.createElement('td'); const id = document.createElement('strong'); id.textContent = order.id;
      const name = document.createElement('small'); name.textContent = order.customer; customer.append(id, name);
      const status = document.createElement('td'); status.textContent = labels[order.status] || order.status;
      const payment = document.createElement('small'); payment.textContent = `${order.payMethod} · ${order.payVerified ? 'Confirmado' : 'Por verificar'}`; status.append(payment);
      const amount = document.createElement('td'); amount.textContent = money(order.total);
      const action = document.createElement('td'); const button = document.createElement('button'); button.className = 'btn btn-outline btn-sm'; button.textContent = 'Ver detalle';
      button.setAttribute('aria-label', `Ver pedido ${order.id}`); button.addEventListener('click', () => window.openOrderDetailModal(order.id)); action.append(button);
      if (!order.payVerified) {
        const verify = document.createElement('button'); verify.className = 'btn btn-outline btn-sm'; verify.textContent = 'Confirmar pago';
        verify.setAttribute('aria-label', `Confirmar pago ${order.id}`);
        verify.addEventListener('click', async () => { verify.disabled = true; await window.verifyPayment(order.id); verify.disabled = false; }); action.append(verify);
      }
      row.append(customer, status, amount, action); rows.append(row);
    });
    if (!orders.length) { const row = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 4; td.textContent = 'Todavía no hay pedidos registrados hoy.'; row.append(td); rows.append(row); }
    el('cash-day-label').textContent = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'full' }).format(new Date());
  }
  function resetCashForm() {
    cart = []; el('cash-order-form').reset(); el('cash-delivery-fields').hidden = true; el('cash-address').required = false;
    el('cash-feedback').textContent = ''; renderCart(); renderCash();
  }
  window.loadCashCatalog = loadCashCatalog; window.renderCash = renderCash; window.resetCashForm = resetCashForm;
  document.addEventListener('DOMContentLoaded', () => {
    el('cash-refresh').addEventListener('click', async () => { await window.refreshOrders(); await loadCashCatalog(); });
    el('cash-add').addEventListener('click', () => {
      const product = catalog.find(product => product.id === el('cash-product').value); const qty = Number(el('cash-qty').value);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 99) { el('cash-feedback').textContent = 'Selecciona un producto y una cantidad de 1 a 99.'; return; }
      const existing = cart.find(item => item.productId === product.id);
      if (existing && existing.qty + qty > 99) { el('cash-feedback').textContent = 'El máximo por producto es 99.'; return; }
      if (existing) existing.qty += qty; else cart.push({ productId: product.id, name: product.name, price: Number(product.promo ?? product.price), qty });
      el('cash-feedback').textContent = ''; renderCart();
    });
    el('cash-mode').addEventListener('change', () => { const delivery = el('cash-mode').value === 'delivery'; el('cash-delivery-fields').hidden = !delivery; el('cash-address').required = delivery; total(); });
    el('cash-fee').addEventListener('input', total);
    el('cash-order-form').addEventListener('submit', async event => {
      event.preventDefault(); if (saving || !window.adminAuthenticated) return;
      if (!cart.length) { el('cash-feedback').textContent = 'Agrega al menos un producto.'; return; }
      const payload = { customer: el('cash-customer').value, phone: el('cash-phone').value, mode: el('cash-mode').value,
        payMethod: el('cash-payment').value, payVerified: el('cash-paid').checked, address: el('cash-address').value,
        deliveryFee: Number(el('cash-fee').value), notes: el('cash-notes').value, items: cart.map(item => ({ productId: item.productId, qty: item.qty })) };
      saving = true; el('cash-feedback').textContent = 'Guardando pedido…';
      const controls = Array.from(el('cash-order-form').querySelectorAll('input, select, textarea, button')); controls.forEach(control => control.disabled = true);
      try {
        const res = await fetch('/api/caja/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.status === 401) window.lockAdminApp();
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar el pedido.');
        if (!window.adminAuthenticated) return;
        window.ORDERS = [data.order, ...window.ORDERS.filter(order => order.id !== data.order.id)];
        resetCashForm(); window.renderKanban(); window.saveOrdersData();
        el('cash-feedback').textContent = `Pedido ${data.order.id} registrado por ${money(data.order.total)} y enviado a cocina.`;
      } catch (error) { el('cash-feedback').textContent = error.message; }
      finally { saving = false; controls.forEach(control => control.disabled = false); renderCart(); }
    });
    renderCart();
  });
})();
