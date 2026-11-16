// ===================================================
// MODULE: DASHBOARD CON DATOS REALES (RFI-11)
// Ventas, pedidos y productos más pedidos se calculan con window.ORDERS, que el
// panel sincroniza con /api/pedidos cada 2,5 s. Anulados y por confirmar no son venta.
// ===================================================

    let currentCurvePeriod = 'hoy';
    let currentTopPeriod = 'hoy';

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    const money = n => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Día y hora en Tacna, igual que el servidor y los reportes
    const limaParts = value => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
      const get = type => parts.find(p => p.type === type).value;
      return { day: `${get('year')}-${get('month')}-${get('day')}`, month: `${get('year')}-${get('month')}`, hour: Number(get('hour')) };
    };
    const isSale = o => o.createdAt && !['cancelled', 'pending_confirmation'].includes(o.status);
    const isDigital = o => /yape|plin|transfer/i.test(o.payMethod || '');

    function salesFor(filter) {
      const list = (window.ORDERS || []).filter(o => isSale(o) && filter(limaParts(o.createdAt)));
      return { list, total: Math.round(list.reduce((s, o) => s + Math.round((Number(o.total) || 0) * 100), 0)) / 100 };
    }

    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

    function renderKpis() {
      const now = Date.now();
      const today = limaParts(now).day;
      const yesterday = limaParts(now - 864e5).day;
      const month = limaParts(now).month;
      const t = salesFor(p => p.day === today);
      const y = salesFor(p => p.day === yesterday);
      const m = salesFor(p => p.month === month);

      setText('dash-date-text', 'Hoy, ' + new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' }));
      setText('kpi-sales', money(t.total));
      setText('kpi-sales-trend', y.total ? `${t.total >= y.total ? '▲' : '▼'} ${Math.abs(Math.round((t.total - y.total) / y.total * 100))}% vs. ayer (${money(y.total)})` : `Ayer: ${money(y.total)}`);
      setText('kpi-orders-count', String(t.list.length));
      setText('kpi-orders-trend', `Ayer: ${y.list.length} pedidos`);
      setText('kpi-ticket', money(t.list.length ? t.total / t.list.length : 0));
      const active = (window.ORDERS || []).filter(o => ['new', 'kitchen', 'delivery'].includes(o.status));
      setText('kpi-active', String(active.length));
      const pending = (window.ORDERS || []).filter(o => o.status === 'pending_confirmation').length;
      setText('kpi-active-detail', `${active.filter(o => o.status === 'kitchen').length} en cocina · ${pending} web por confirmar`);
      setText('kpi-unverified', String((window.ORDERS || []).filter(o => isDigital(o) && !o.payVerified && !['cancelled', 'delivered'].includes(o.status)).length));
      setText('kpi-month', money(m.total));
      setText('kpi-month-detail', `${m.list.length} pedidos este mes`);
    }

    // Barras en canvas: sin dependencias y funciona sin internet
    function drawBars(labels, values) {
      const canvas = document.getElementById('chart-hourly-sales');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || canvas.parentElement.clientWidth || 600;
      const height = rect.height || 240;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const left = 58, right = 12, top = 16, bottom = 28;
      const w = width - left - right, h = height - top - bottom;
      const max = Math.max(10, ...values) * 1.1;
      ctx.font = '500 10.5px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const yy = top + h / 4 * i;
        ctx.strokeStyle = '#F3F4F6'; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(width - right, yy); ctx.stroke();
        ctx.fillStyle = '#6B7280'; ctx.fillText('S/ ' + Math.round(max - max / 4 * i), left - 6, yy);
      }
      const slot = w / values.length;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      values.forEach((v, i) => {
        const bh = v / max * h;
        const x = left + slot * i + slot * 0.18;
        ctx.fillStyle = v ? '#EF4444' : '#FECACA';
        ctx.fillRect(x, top + h - bh, slot * 0.64, Math.max(bh, v ? 2 : 1));
        ctx.fillStyle = '#6B7280';
        ctx.fillText(labels[i], left + slot * i + slot / 2, top + h + 8);
      });
    }

    function renderCurve() {
      const orders = (window.ORDERS || []).filter(isSale);
      let labels, values;
      if (currentCurvePeriod === 'hoy') {
        const today = limaParts(Date.now()).day;
        const hours = Array.from({ length: 24 }, () => 0);
        orders.forEach(o => { const p = limaParts(o.createdAt); if (p.day === today) hours[p.hour] += Number(o.total) || 0; });
        // Se muestran las horas con ventas y el horario de atención (17:00 a 23:00)
        const used = hours.map((v, i) => (v || (i >= 17 && i <= 23)) ? i : -1).filter(i => i >= 0);
        labels = used.map(i => String(i).padStart(2, '0') + ':00');
        values = used.map(i => Math.round(hours[i] * 100) / 100);
        setText('dash-curve-title', 'Ventas por hora de hoy');
      } else {
        labels = []; values = [];
        for (let d = 6; d >= 0; d--) {
          const ts = Date.now() - d * 864e5;
          const day = limaParts(ts).day;
          labels.push(new Date(ts).toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric' }));
          values.push(salesFor(p => p.day === day).total);
        }
        setText('dash-curve-title', 'Ventas de los últimos 7 días');
      }
      const peak = values.indexOf(Math.max(...values));
      setText('dash-curve-subtitle', values[peak] > 0 ? `Pico: ${labels[peak]} con ${money(values[peak])}` : 'Aún no hay ventas en este periodo');
      drawBars(labels, values);
      ['hoy', 'semana'].forEach(k => toggleButton('btn-curve-' + k, k === currentCurvePeriod));
    }

    function toggleButton(id, on) {
      const b = document.getElementById(id);
      if (!b) return;
      b.style.background = on ? '#FFF0F1' : 'transparent';
      b.style.color = on ? '#B91C1C' : '#4B5563';
      b.style.fontWeight = on ? '700' : '600';
      b.setAttribute('aria-pressed', String(on));
    }

    function renderChannels() {
      const today = limaParts(Date.now()).day;
      const list = (window.ORDERS || []).filter(o => isSale(o) && limaParts(o.createdAt).day === today);
      const groups = [
        ['Web y app', o => o.channel === 'web' || o.channel === 'app', '#EF4444'],
        ['Caja (mostrador)', o => o.channel === 'caja', '#F59E0B'],
        ['WhatsApp', o => o.channel === 'whatsapp', '#10B981'],
        ['Delivery', o => o.mode === 'delivery', '#3B82F6'],
        ['Recojo en tienda', o => o.mode === 'pickup', '#8B5CF6'],
      ];
      const el = document.getElementById('dash-channel-list');
      if (!el) return;
      el.innerHTML = groups.map(([label, fn, color]) => {
        const n = list.filter(fn).length;
        const pct = list.length ? Math.round(n / list.length * 100) : 0;
        return `<div class="dash-channel-legend-item"><div style="display:flex; align-items:center; gap:8px;"><span style="width:10px; height:10px; border-radius:50%; background:${color}; flex-shrink:0;"></span><span style="font-weight:600; color:#374151;">${label}</span></div>
          <div style="display:flex; align-items:center; gap:10px;"><span style="font-weight:800; color:#111827;">${pct}%</span><span style="color:#4B5563; font-size:11px;">${n} pedidos</span></div></div>`;
      }).join('') || '';
    }

    function renderTopProducts(period) {
      currentTopPeriod = period === 'mes' ? 'mes' : 'hoy';
      const now = limaParts(Date.now());
      const totals = new Map();
      (window.ORDERS || []).filter(isSale).forEach(o => {
        const p = limaParts(o.createdAt);
        if (currentTopPeriod === 'hoy' ? p.day !== now.day : p.month !== now.month) return;
        (o.items || []).forEach(item => {
          const key = item.name || 'Producto';
          const row = totals.get(key) || { name: key, qty: 0, sales: 0 };
          row.qty += Number(item.qty) || 1;
          row.sales += (Number(item.price) || 0) * (Number(item.qty) || 1);
          totals.set(key, row);
        });
      });
      const list = [...totals.values()].sort((a, b) => b.qty - a.qty || b.sales - a.sales).slice(0, 5);
      const el = document.getElementById('top-products-list');
      if (el) {
        const max = list.length ? list[0].qty : 1;
        const colors = ['#EF4444', '#F59E0B', '#8B5CF6', '#10B981', '#06B6D4'];
        el.innerHTML = list.length ? list.map((p, i) => `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:13px; gap:8px;">
              <span style="font-weight:700; color:#111827;">${i + 1}. ${escapeHtml(p.name)}</span>
              <span style="font-weight:700; color:#111827; white-space:nowrap;">${p.qty} und. · ${money(p.sales)}</span>
            </div>
            <div style="height:7px; background:#F3F4F6; border-radius:999px; overflow:hidden;"><div style="width:${Math.round(p.qty / max * 100)}%; height:100%; background:${colors[i]}; border-radius:999px;"></div></div>
          </div>`).join('') : '<p style="color:#4B5563; font-size:13px;">Aún no hay ventas en este periodo.</p>';
      }
      setText('top-products-subtitle', currentTopPeriod === 'mes' ? 'Unidades vendidas este mes' : 'Unidades vendidas hoy');
      ['hoy', 'mes'].forEach(k => toggleButton('top-btn-' + k, k === currentTopPeriod));
    }

    // Promedio en minutos entre dos estados, con las horas que guarda el servidor (statusAt)
    function averageMinutes(list, from, to) {
      const spans = list.map(o => o.statusAt && Date.parse(o.statusAt[to]) - Date.parse(o.statusAt[from])).filter(ms => Number.isFinite(ms) && ms >= 0);
      return spans.length ? (spans.reduce((a, b) => a + b, 0) / spans.length / 60000).toFixed(1) + ' min' : '—';
    }

    function renderSla() {
      const el = document.getElementById('dash-sla');
      if (!el) return;
      const today = limaParts(Date.now()).day;
      const list = (window.ORDERS || []).filter(o => o.createdAt && limaParts(o.createdAt).day === today);
      const boxes = [
        ['👨‍🍳 EN COCINA', averageMinutes(list, 'kitchen', 'delivery')],
        ['🛵 EN REPARTO', averageMinutes(list, 'delivery', 'delivered')],
        ['⏱️ DE COCINA A ENTREGA', averageMinutes(list, 'kitchen', 'delivered')],
      ];
      el.innerHTML = boxes.map(([label, value]) => `<div style="padding:14px; background:#FAFAFA; border-radius:10px; border:1px solid #E5E7EB;">
        <div style="font-size:10.5px; color:#4B5563; font-weight:700;">${label}</div>
        <div style="font-family:var(--font-display); font-size:22px; font-weight:800; color:#111827; margin-top:6px;">${value}</div></div>`).join('');
    }

    function renderDashboard() {
      if (!document.getElementById('tab-dashboard')) return;
      renderKpis(); renderCurve(); renderChannels(); renderTopProducts(currentTopPeriod); renderSla();
    }

    function setSalesCurvePeriod(period) {
      currentCurvePeriod = period === 'semana' ? 'semana' : 'hoy';
      renderCurve();
    }

    let resizeRafId = null;
    window.addEventListener('resize', () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(renderCurve);
    }, { passive: true });

    function starsHtml(n) {
      const cleanN = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
      return '<span style="color:#F59E0B; letter-spacing:1px;">' + '★'.repeat(cleanN) + '</span><span style="color:#E5E7EB; letter-spacing:1px;">' + '★'.repeat(5 - cleanN) + '</span>';
    }

    // Las encuestas tienen su propia pestaña; aquí solo se actualiza el contador del menú
    function renderDashboardFeedback() {
      const badge = document.getElementById('badge-reviews');
      if (badge && Array.isArray(window.REVIEWS)) badge.textContent = String(window.REVIEWS.length);
    }

window.initCharts = renderDashboard;
window.renderDashboard = renderDashboard;
window.setSalesCurvePeriod = setSalesCurvePeriod;
window.renderTopProducts = renderTopProducts;
window.renderDashboardFeedback = renderDashboardFeedback;
window.starsHtml = starsHtml;
