// ===================================================
// MODULE: MOTORIZADOS Y ALERTA DE DESPACHO (RFI-14, RNF-06)
// El administrador registra a los motorizados; n8n ofrece los pedidos al grupo
// y avisa al operador si nadie toma el pedido en los minutos configurados.
// ===================================================
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  let drivers = [];

  async function api(url, options) {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) window.lockAdminApp();
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
    return data;
  }

  function render() {
    const rows = el('drivers-rows');
    if (!rows) return;
    rows.replaceChildren();
    if (!drivers.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 4; td.textContent = 'Aún no hay motorizados registrados.';
      tr.append(td); rows.append(tr);
    }
    drivers.forEach((driver, index) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td'); name.textContent = driver.name;
      const phone = document.createElement('td'); phone.textContent = driver.phone;
      const status = document.createElement('td'); status.textContent = driver.active !== false ? 'Activo' : 'Inactivo';
      const action = document.createElement('td');
      const toggle = document.createElement('button'); toggle.className = 'btn btn-outline btn-sm';
      toggle.textContent = driver.active !== false ? 'Desactivar' : 'Activar';
      toggle.addEventListener('click', () => save(drivers.map((d, i) => i === index ? { ...d, active: d.active === false } : d)));
      const remove = document.createElement('button'); remove.className = 'btn btn-outline btn-sm'; remove.textContent = 'Quitar';
      remove.addEventListener('click', () => { if (confirm(`¿Quitar a ${driver.name}?`)) save(drivers.filter((_, i) => i !== index)); });
      action.append(toggle, ' ', remove);
      tr.append(name, phone, status, action); rows.append(tr);
    });
  }

  async function save(list, minutes) {
    try {
      const body = { drivers: list };
      if (minutes !== undefined) body.dispatchAlertMinutes = minutes;
      const data = await api('/api/drivers', { method: 'PUT', body: JSON.stringify(body) });
      drivers = data.drivers; el('drivers-minutes').value = data.dispatchAlertMinutes;
      el('drivers-feedback').textContent = 'Cambios guardados.';
      render();
      if (window.loadDrivers) window.loadDrivers();
      return true;
    } catch (error) { el('drivers-feedback').textContent = error.message; return false; }
  }

  async function loadDriversAdmin() {
    if (window.currentUser?.role !== 'admin' || !el('drivers-rows')) return;
    try {
      const data = await api('/api/drivers', { method: 'GET', cache: 'no-store' });
      drivers = data.drivers; el('drivers-minutes').value = data.dispatchAlertMinutes;
      el('drivers-n8n').textContent = data.n8nConfigured
        ? 'n8n conectado: los pedidos de delivery se ofrecen al grupo al pasar a reparto.'
        : 'n8n no está configurado (RTQ_N8N_WEBHOOK_URL). Los despachos quedarán para coordinar a mano.';
      render();
    } catch (error) { el('drivers-feedback').textContent = error.message; }
  }
  window.loadDriversAdmin = loadDriversAdmin;

  document.addEventListener('DOMContentLoaded', () => {
    const form = el('drivers-form');
    if (!form) return;
    el('driver-phone').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const ok = await save([...drivers, { name: el('driver-name').value.trim(), phone: el('driver-phone').value, active: true }]);
      if (ok) { el('driver-name').value = ''; el('driver-phone').value = ''; }
    });
    el('drivers-minutes-save').addEventListener('click', () => save(drivers, Number(el('drivers-minutes').value)));
  });
})();
