// ===================================================
// SERVICE: SINCRONIZACION EN VIVO CON API /api/pedidos
// Con autenticación por PIN, reconexión inteligente y persistencia
// ===================================================

(function() {
  'use strict';

  let isSyncing = false;
  let syncTimer = null;
  let pollInterval = 2500;
  let isConnected = false;

  function getAdminToken() { return ''; }
  function updateIndicator(status, text) {
    const el = document.getElementById('topbar-live-indicator');
    if (!el) return;

    if (status === 'connected') {
      el.style.borderColor = 'rgba(34, 197, 94, 0.3)';
      el.style.background = 'rgba(34, 197, 94, 0.08)';
      el.style.color = '#15803D';
      el.title = 'Conectado a la base de datos persistente en disco (Node.js)';
      el.innerHTML = `
        <span class="radar-beacon">
          <span class="radar-ping" style="background:#22C55E"></span>
          <span class="radar-dot" style="background:#22C55E"></span>
        </span>
        <span>● En Vivo: Node.js Seguro</span>
      `;
    } else if (status === 'auth_required') {
      el.style.borderColor = 'rgba(245, 166, 35, 0.3)';
      el.style.background = 'rgba(245, 166, 35, 0.08)';
      el.style.color = '#B45309';
      el.title = 'Requiere iniciar sesión';
      el.innerHTML = `
        <span class="radar-beacon">
          <span class="radar-dot" style="background:#F5A623"></span>
        </span>
        <span>Inicia sesión</span>
      `;
    } else {
      el.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      el.style.background = 'rgba(239, 68, 68, 0.08)';
      el.style.color = '#B91C1C';
      el.title = 'Servidor local desconectado o no disponible';
      el.innerHTML = `
        <span class="radar-beacon">
          <span class="radar-dot" style="background:#EF4444"></span>
        </span>
        <span>⚠ Servidor Offline</span>
      `;
    }
  }

  function showAdminAuthModal() { if (window.lockAdminApp) window.lockAdminApp(); }
  async function syncOrders() {
    if (isSyncing || !window.adminAuthenticated) return;
    isSyncing = true;
    const requestingUser = window.currentUser;

    try {
      const token = getAdminToken();
      const headers = {
        'Cache-Control': 'no-store'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-admin-token'] = token;
      }

      const res = await fetch('/api/pedidos', { headers, cache: 'no-store' });

      if (res.status === 401) {
        updateIndicator('auth_required');
        showAdminAuthModal();
        return;
      }

      if (!window.adminAuthenticated || requestingUser !== window.currentUser) return;
      if (res.ok) {
        const remoteOrders = await res.json();
        if (Array.isArray(remoteOrders)) {
          if (!isConnected) {
            isConnected = true;
            updateIndicator('connected');
          }

          const previousIds = new Set(window.ORDERS.map(o => o.id));
          const hasNew = remoteOrders.some(r => !previousIds.has(r.id) && r.status === 'new');
          const isFirstSync = window.ORDERS.length === 0 || previousIds.size === 0;
          const hasDifference = JSON.stringify(window.ORDERS) !== JSON.stringify(remoteOrders);

          if (hasDifference) {
            window.ORDERS = remoteOrders;
            if (window.saveOrdersData) window.saveOrdersData();
            if (window.renderKanban) {
              if (window.requestAnimationFrame) {
                window.requestAnimationFrame(() => window.renderKanban());
              } else {
                window.renderKanban();
              }
            }

            if (hasNew && !isFirstSync) {
              if (window.playAlertSound) window.playAlertSound();
              if (window.showToast) window.showToast('🔥 ¡NUEVO PEDIDO RECIBIDO Y GUARDADO EN DISCO!');
            }
          }
          if (window.renderCash) window.renderCash();
          if (hasDifference && window.refreshVisibleReports) window.refreshVisibleReports();
        }
      } else {
        isConnected = false;
        updateIndicator('offline');
      }
    } catch (err) {
      isConnected = false;
      updateIndicator('offline');
    } finally {
      isSyncing = false;
      clearTimeout(syncTimer);
      if (window.adminAuthenticated) syncTimer = setTimeout(syncOrders, pollInterval);
    }
  }

  // Optimización de energía: si la pestaña está oculta, reducir la frecuencia de polling
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pollInterval = 12000;
    } else {
      pollInterval = 2500;
      syncOrders();
    }
  });

  // Funciones exportadas al contexto global
  window.startOrderSync = function() {
    syncOrders();
  };
  window.refreshOrders = syncOrders;
  window.showAdminAuthModal = showAdminAuthModal;
  window.stopOrderSync = function() { clearTimeout(syncTimer); isConnected = false; };
  window.getAdminToken = getAdminToken;
})();
