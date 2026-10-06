// ===================================================
// RETEQUEÑOS ADMIN - APLICACIÓN PRINCIPAL & BOOTSTRAP
// ===================================================

// KDS Live Clock
function updateKDSClock() {
  const now = new Date();
  const optionsDate = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  let dateStr = now.toLocaleDateString('es-PE', optionsDate);
  dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  dateStr = dateStr.replace('.', '');
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const dateEl = document.getElementById('kds-current-date');
  const timeEl = document.getElementById('kds-current-time');
  if (dateEl) dateEl.textContent = dateStr;
  if (timeEl) timeEl.textContent = timeStr;
}

// Navigation & Tab Switching
function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.hasAttribute('data-tab') || !window.canAccessTab(btn.dataset.tab)) return;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const tabEl = document.getElementById(tabId);
      if (tabEl) tabEl.classList.add('active');

      const headings = {
        'tab-reports': ['Reportes & Oportunidades', 'Histórico detallado, métricas reales y propuestas de mejora'],
        'tab-cash': ['Caja · Operación del día', 'Registra pedidos, confirma pagos y sigue los despachos de hoy'],
        'tab-users': ['Usuarios & Accesos', 'Administra las cuentas de caja de tu equipo'],
        'tab-dashboard': ['Dashboard & Métricas', 'Visión ejecutiva del negocio en tiempo real'],
        'tab-kanban': ['Monitor de Cocina y Despacho en Vivo', 'Gestiona todos tus pedidos, desde la recepción hasta la entrega'],
        'tab-history': ['Historial de pedidos', 'Todos tus pedidos, en un solo lugar'],
        'tab-catalog': ['Menú & Control de Stock', 'Administración de productos, precios y disponibilidad'],
        'tab-promos': ['Cupones & Ofertas', 'Motor de promociones y planificador de días especiales'],
        'tab-customers': ['Clientes & Notificaciones Push', 'CRM de fidelización y campañas directas'],
        'tab-surveys': ['Encuestas & Reseñas', 'Feedback de clientes, origen de la publicidad y cupones por encuesta']
      };

      if (headings[tabId]) {
        const ph = document.getElementById('page-heading');
        const ps = document.getElementById('page-subheading');
        if (ph) ph.textContent = headings[tabId][0];
        if (ps) ps.textContent = headings[tabId][1];
      }

      const topAction = document.getElementById('topbar-action-btn');
      if (topAction) topAction.hidden = !['tab-dashboard', 'tab-kanban', 'tab-promos'].includes(tabId);
      if (tabId === 'tab-history' && window.renderOrderHistory) window.renderOrderHistory();
      if (tabId === 'tab-cash' && window.loadCashCatalog) window.loadCashCatalog();
      if (tabId === 'tab-users' && window.loadUsers) window.loadUsers();
      if (tabId === 'tab-reports' && window.loadReports) window.loadReports();
      if (tabId === 'tab-dashboard') {
        setTimeout(() => {
          if (window.initCharts) window.initCharts();
          if (window.renderTopProducts) window.renderTopProducts('hoy');
          if (window.renderDashboardFeedback) window.renderDashboardFeedback();
        }, 50);
        const actBtn = document.getElementById('topbar-action-btn');
        const actTxt = document.getElementById('topbar-btn-text');
        if (actTxt) actTxt.textContent = '+ Nuevo pedido';
        if (actBtn) actBtn.onclick = () => document.querySelector('[data-tab="tab-cash"]').click();
      } else if (tabId === 'tab-kanban') {
        if (window.renderKanban) window.renderKanban();
        const actBtn = document.getElementById('topbar-action-btn');
        const actTxt = document.getElementById('topbar-btn-text');
        if (actTxt) actTxt.textContent = '+ Nuevo pedido';
        if (actBtn) actBtn.onclick = () => document.querySelector('[data-tab="tab-cash"]').click();
      } else if (tabId === 'tab-promos') {
        const actBtn = document.getElementById('topbar-action-btn');
        const actTxt = document.getElementById('topbar-btn-text');
        if (actTxt) actTxt.textContent = '+ Nueva campaña';
        if (actBtn) actBtn.onclick = window.focusNewCouponForm;
      }
    });
  });
}

// Global App Initialization
let adminStarted = false;
window.startAdminApp = function() {
  if (adminStarted) { window.startOrderSync(); return; }
  adminStarted = true;
  if (window.startOrderSync) window.startOrderSync();
  if (window.initAudioControls) window.initAudioControls();
  
  initNavigation();
  setInterval(updateKDSClock, 1000);
  updateKDSClock();

  if (window.renderKanban) window.renderKanban();
  if (window.renderCatalog) window.renderCatalog();
  if (window.renderCoupons) window.renderCoupons();
  if (window.renderWeekPromos) window.renderWeekPromos();
  if (window.renderTopProducts) window.renderTopProducts('hoy');
  if (window.renderDashboardFeedback) window.renderDashboardFeedback();
  if (window.renderSurveys) window.renderSurveys();
  if (window.initCharts) window.initCharts();
};
window.addEventListener('DOMContentLoaded', () => window.initAdminAuth());
