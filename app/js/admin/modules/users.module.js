(function() {
  'use strict';
  const el = id => document.getElementById(id);
  async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (res.status === 401) window.lockAdminApp();
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
    return data;
  }
  async function loadUsers() {
    if (window.currentUser?.role !== 'admin') return;
    const rows = el('users-rows');
    try {
      const users = await api('/api/users', { cache: 'no-store' });
      if (window.currentUser?.role !== 'admin') return;
      rows.replaceChildren();
      users.forEach(user => {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const strong = document.createElement('strong'); strong.textContent = user.name;
        const small = document.createElement('small'); small.textContent = user.username; name.append(strong, small);
        const role = document.createElement('td'); role.textContent = user.role === 'admin' ? 'Administrador' : 'Caja';
        const status = document.createElement('td'); status.textContent = user.active ? 'Activo' : 'Inactivo';
        const action = document.createElement('td');
        if (user.role === 'cashier') {
          const button = document.createElement('button'); button.className = 'btn btn-outline btn-sm';
          button.textContent = user.active ? 'Desactivar' : 'Activar';
          button.setAttribute('aria-label', `${button.textContent} ${user.username}`);
          button.addEventListener('click', async () => {
            button.disabled = true;
            try {
              await api(`/api/users/${encodeURIComponent(user.username)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) });
              el('users-feedback').textContent = `${user.name}: ${user.active ? 'acceso desactivado y sesiones cerradas' : 'acceso activado'}.`;
              await loadUsers();
            } catch (error) { el('users-feedback').textContent = error.message; button.disabled = false; }
          });
          action.append(button);
        } else action.textContent = 'Cuenta principal';
        row.append(name, role, status, action); rows.append(row);
      });
    } catch (error) { el('users-feedback').textContent = error.message; }
  }
  window.loadUsers = loadUsers;
  document.addEventListener('DOMContentLoaded', () => {
    el('users-refresh').addEventListener('click', loadUsers);
    el('users-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (window.currentUser?.role !== 'admin') return;
      const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true;
      el('users-feedback').textContent = '';
      try {
        const data = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          name: el('user-name').value, username: el('user-username').value, password: el('user-password').value, role: 'cashier'
        }) });
        el('users-form').reset();
        el('users-feedback').textContent = `Cuenta ${data.user.username} creada. Ya puede ingresar al sistema.`;
        await loadUsers();
      } catch (error) { el('users-feedback').textContent = error.message; }
      finally { button.disabled = false; }
    });
  });
})();
