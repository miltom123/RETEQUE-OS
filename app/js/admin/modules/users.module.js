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
        } else action.textContent = 'Cuenta principal · ';
        const edit = document.createElement('button'); edit.className = 'btn btn-outline btn-sm'; edit.textContent = 'Editar';
        edit.setAttribute('aria-label', `Editar ${user.username}`);
        edit.addEventListener('click', () => openEditor(row, user));
        action.append(' ', edit);
        row.append(name, role, status, action); rows.append(row);
      });
    } catch (error) { el('users-feedback').textContent = error.message; }
  }
  // Fila de edición debajo de la cuenta: nombre y, si se escribe, contraseña nueva
  function openEditor(row, user) {
    const open = el('users-rows').querySelector('.user-edit-row');
    if (open) open.remove();
    const editor = document.createElement('tr'); editor.className = 'user-edit-row';
    const cell = document.createElement('td'); cell.colSpan = 4;
    const form = document.createElement('form'); form.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center;';
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.value = user.name; nameInput.maxLength = 60; nameInput.required = true;
    nameInput.className = 'co-input'; nameInput.setAttribute('aria-label', `Nombre de ${user.username}`);
    const passInput = document.createElement('input'); passInput.type = 'password'; passInput.autocomplete = 'new-password'; passInput.minLength = 4; passInput.maxLength = 128;
    passInput.placeholder = 'Contraseña nueva (opcional)'; passInput.className = 'co-input'; passInput.setAttribute('aria-label', `Contraseña nueva de ${user.username}`);
    const save = document.createElement('button'); save.type = 'submit'; save.className = 'btn btn-primary btn-sm'; save.textContent = 'Guardar';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-outline btn-sm'; cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => editor.remove());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const changes = {};
      if (nameInput.value.trim() !== user.name) changes.name = nameInput.value;
      if (passInput.value) changes.password = passInput.value;
      if (!Object.keys(changes).length) { editor.remove(); return; }
      save.disabled = true;
      try {
        await api(`/api/users/${encodeURIComponent(user.username)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
        const own = user.username === window.currentUser?.username;
        el('users-feedback').textContent = changes.password
          ? `${user.username}: datos guardados. Las sesiones abiertas con la contraseña anterior se cerraron.`
          : `${user.username}: nombre actualizado.`;
        // Cambiar la contraseña propia cierra esta sesión: el panel pide volver a entrar
        if (own && changes.password) { window.lockAdminApp(); return; }
        await loadUsers();
      } catch (error) { el('users-feedback').textContent = error.message; save.disabled = false; }
    });
    form.append(nameInput, passInput, save, cancel); cell.append(form); editor.append(cell);
    row.after(editor); nameInput.focus();
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
