(function() {
  'use strict';
  window.adminAuthenticated = false;
  window.currentUser = null;
  window.canAccessTab = tab => window.currentUser && (window.currentUser.role === 'admin' || ['tab-cash', 'tab-kanban'].includes(tab));
  function lockAdminApp() {
    window.adminAuthenticated = false;
    window.currentUser = null;
    if (window.resetReports) window.resetReports();
    if (window.resetCashForm) window.resetCashForm();
    document.getElementById('users-rows').replaceChildren();
    document.getElementById('users-form').reset();
    if (window.stopOrderSync) window.stopOrderSync();
    document.body.classList.add('auth-locked');
    document.getElementById('login-screen').hidden = false;
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').type = 'password';
    document.getElementById('toggle-password').textContent = 'Ver';
    document.getElementById('toggle-password').setAttribute('aria-pressed', 'false');
    document.getElementById('toggle-password').setAttribute('aria-label', 'Mostrar contraseña');
    ['history-search', 'history-status', 'history-from', 'history-to'].forEach(id => document.getElementById(id).value = '');
    document.querySelectorAll('.modal-backdrop.open').forEach(el => el.classList.remove('open'));
    window.ORDERS = [];
    if (window.renderKanban) window.renderKanban();
    if (window.renderOrderHistory) window.renderOrderHistory();
  }
  function enter(user) {
    window.currentUser = user;
    document.body.dataset.role = user.role;
    document.querySelectorAll('.nav-btn').forEach(button => {
      const permitted = window.canAccessTab(button.dataset.tab);
      button.closest('.nav-item').hidden = !permitted;
    });
    document.querySelectorAll('.nav-section').forEach(section => { section.hidden = user.role !== 'admin' && section.textContent.trim() !== 'OPERACIÓN PRINCIPAL'; });
    document.getElementById('session-name').textContent = user.name;
    document.getElementById('session-role').textContent = user.role === 'admin' ? 'Administrador' : 'Caja';
    document.querySelector('.brand-badge').textContent = user.role === 'admin' ? 'ADMIN' : 'CAJA';
    document.querySelectorAll('.user-avatar, .session-avatar').forEach(el => el.textContent = user.role === 'admin' ? 'AD' : 'CJ');
    window.adminAuthenticated = true;
    document.body.classList.remove('auth-locked');
    document.getElementById('login-screen').hidden = true;
    document.getElementById('login-password').value = '';
    window.startAdminApp();
    document.querySelector(`[data-tab="${user.role === 'admin' ? 'tab-dashboard' : 'tab-cash'}"]`).click();
  }
  window.lockAdminApp = lockAdminApp;
  window.initAdminAuth = async function() {
    // Eliminar tokens del ingreso anterior; la sesión usa una cookie HttpOnly.
    try { localStorage.removeItem('RTQ_ADMIN_TOKEN'); sessionStorage.removeItem('RTQ_ADMIN_TOKEN'); } catch (e) {}
    const error = document.getElementById('login-error');
    const submit = document.getElementById('login-submit');
    document.getElementById('toggle-password').addEventListener('click', function() {
      const input = document.getElementById('login-password');
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      this.textContent = visible ? 'Ocultar' : 'Ver';
      this.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
      this.setAttribute('aria-pressed', String(visible));
    });
    document.getElementById('login-form').addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      error.textContent = '';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: document.getElementById('login-username').value, password: document.getElementById('login-password').value })
        });
        const data = await res.json();
        if (!res.ok || !data.user) throw new Error(data.error || 'No se pudo iniciar sesión.');
        enter(data.user);
      } catch (e) { error.textContent = e instanceof TypeError ? 'No se pudo conectar. Revisa que el servidor esté encendido.' : e.message; }
      finally { submit.disabled = false; }
    });
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) throw new Error();
        lockAdminApp();
        document.getElementById('login-username').focus();
      } catch (e) { window.showToast('No se pudo cerrar la sesión. Inténtalo nuevamente.'); }
    });
    try {
      const res = await fetch('/api/auth/verify', { cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) enter(data.user);
    } catch (e) { console.error('[Acceso]', e); error.textContent = 'Servidor no disponible. Vuelve a intentar ingresar.'; }
  };
})();
