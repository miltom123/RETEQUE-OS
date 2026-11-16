// ===================================================
// MODULE: DASHBOARD, METRICAS & GRAFICOS CHART.JS
// ===================================================

    let chartHourlyInstance = null;
    let chartChannelsInstance = null;
    let chartAttributionInstance = null;
    let currentCurvePeriod = 'hoy';

    // ---- Métricas reales ----
    // Cuenta como venta todo pedido que no esté anulado ni esperando confirmación de la web.
    const DAY_MS = 86400000;
    const limaDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
    const limaHour = value => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hourCycle: 'h23' }).format(new Date(value)));
    const daysAgo = n => limaDay(Date.now() - n * DAY_MS);
    const soles = value => 'S/ ' + Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const sumTotals = list => Math.round(list.reduce((sum, o) => sum + Math.round(Number(o.total || 0) * 100), 0)) / 100;
    const CURVE_HOURS = Array.from({ length: 14 }, (_, i) => i + 10); // 10:00 a 23:00

    function salesOrders() {
      return (window.ORDERS || []).filter(o => o.createdAt && !Number.isNaN(Date.parse(o.createdAt)) && !['cancelled', 'pending_confirmation'].includes(o.status));
    }
    function ordersOn(days) {
      const set = new Set(days);
      return salesOrders().filter(o => set.has(limaDay(o.createdAt)));
    }
    const lastDays = (from, count) => Array.from({ length: count }, (_, i) => daysAgo(from + i));
    function thisMonth() {
      const month = daysAgo(0).slice(0, 7);
      return salesOrders().filter(o => limaDay(o.createdAt).startsWith(month));
    }

    function salesCurve(period) {
      const list = period === 'hoy' ? ordersOn([daysAgo(0)]) : ordersOn(lastDays(0, 7));
      const byHour = new Map(CURVE_HOURS.map(h => [h, 0]));
      list.forEach(o => { const h = limaHour(o.createdAt); if (byHour.has(h)) byHour.set(h, byHour.get(h) + Number(o.total || 0)); });
      const data = CURVE_HOURS.map(h => Math.round(byHour.get(h) * 100) / 100);
      const top = Math.max(0, ...data);
      const maxVal = Math.max(100, Math.ceil((top * 1.2) / 50) * 50);
      const peakIndex = top > 0 ? data.indexOf(top) : -1;
      return { labels: CURVE_HOURS.map(h => `${String(h).padStart(2, '0')}:00`), data, maxVal, list, peakIndex, peak: top };
    }

    function peakHour() {
      const counts = new Map();
      const recent = ordersOn(lastDays(0, 7));
      recent.forEach(o => { const h = limaHour(o.createdAt); counts.set(h, (counts.get(h) || 0) + 1); });
      if (!counts.size) return null;
      const [hour, count] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      return { label: `${String(hour).padStart(2, '0')}:00 - ${String((hour + 1) % 24).padStart(2, '0')}:00 hrs`, share: Math.round(count / recent.length * 100) };
    }

    function topProducts(period) {
      const list = period === 'mes' ? thisMonth() : ordersOn([daysAgo(0)]);
      const byName = new Map();
      list.forEach(o => (o.items || []).forEach(item => {
        const name = String(item.name || 'Producto');
        const row = byName.get(name) || { icon: '🥟', name, orders: 0, sales: 0 };
        row.orders += Number(item.qty) || 1;
        row.sales += (Number(item.price) || 0) * (Number(item.qty) || 1);
        byName.set(name, row);
      }));
      return [...byName.values()].sort((a, b) => b.orders - a.orders || b.sales - a.sales).slice(0, 5);
    }

    const CHANNEL_GROUPS = [
      { label: 'Web · delivery', color: '#EF4444', test: o => o.channel === 'web' && o.mode === 'delivery' },
      { label: 'Web · recojo', color: '#10B981', test: o => o.channel === 'web' && o.mode !== 'delivery' },
      { label: 'Caja / mostrador', color: '#F59E0B', test: o => o.channel === 'caja' },
      { label: 'Panel y WhatsApp', color: '#8B5CF6', test: () => true }
    ];
    function channelMix() {
      const rows = CHANNEL_GROUPS.map(g => ({ ...g, count: 0 }));
      const list = thisMonth();
      list.forEach(o => { rows.find(r => r.test(o)).count += 1; });
      return { rows, total: list.length };
    }

    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

    function renderDashboardKpis() {
      const today = ordersOn([daysAgo(0)]);
      const yesterday = ordersOn([daysAgo(1)]);
      const week = ordersOn(lastDays(0, 7));
      const salesToday = sumTotals(today), salesYesterday = sumTotals(yesterday);

      const longDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
      setText('dash-date-text', `Hoy, ${longDate}`);

      setText('kpi-sales', soles(salesToday));
      setText('kpi-sales-trend', salesYesterday > 0
        ? `${salesToday >= salesYesterday ? '▲' : '▼'} ${Math.round((salesToday - salesYesterday) / salesYesterday * 100)}% vs. ayer (${soles(salesYesterday)})`
        : 'Ayer no hubo ventas para comparar');

      setText('kpi-orders-count', String(today.length));
      setText('kpi-orders-trend', `${yesterday.length} ayer · ${week.length} en 7 días`);

      setText('kpi-ticket', today.length ? soles(salesToday / today.length) : '—');
      setText('kpi-ticket-trend', week.length ? `Promedio de 7 días: ${soles(sumTotals(week) / week.length)}` : 'Sin pedidos en 7 días');

      setText('kpi-conv', '—');
      setText('kpi-conv-sub', 'La web todavía no registra los clics');

      const month = thisMonth();
      const byPhone = new Map();
      month.forEach(o => { const phone = String(o.phone || '').replace(/\D/g, '').slice(-9); if (phone) byPhone.set(phone, (byPhone.get(phone) || 0) + 1); });
      const repeat = [...byPhone.values()].filter(n => n > 1).length;
      setText('kpi-repeat', byPhone.size ? `${Math.round(repeat / byPhone.size * 100)}%` : '—');
      setText('kpi-repeat-sub', byPhone.size ? `${repeat} de ${byPhone.size} clientes del mes volvieron` : 'Sin clientes este mes');

      setText('kpi-rating', '—');
      setText('kpi-rating-sub', 'Todavía no hay reseñas registradas');

      const peak = peakHour();
      setText('ins-peak', peak ? peak.label : 'Sin ventas en 7 días');

      const top = topProducts('mes')[0];
      setText('ins-top', top ? top.name : 'Sin ventas este mes');

      const couponUses = new Map();
      month.forEach(o => String(o.notes || '').split(' · ').forEach(part => {
        const m = part.match(/^Cupón ([A-Z0-9_-]+)$/);
        if (m) couponUses.set(m[1], (couponUses.get(m[1]) || 0) + 1);
      }));
      const bestCoupon = [...couponUses.entries()].sort((a, b) => b[1] - a[1])[0];
      setText('ins-coupon', bestCoupon ? bestCoupon[0] : 'Ninguno');
      setText('ins-coupon-sub', bestCoupon ? `${plural(bestCoupon[1], 'pedido', 'pedidos')} este mes` : 'Ningún cupón usado este mes');

      const soldOut = (window.CATALOG || []).filter(p => p.stock === false);
      setText('ins-stock', soldOut.length ? soldOut[0].name : 'Ninguno');
      setText('ins-stock-sub', soldOut.length > 1 ? `y ${soldOut.length - 1} más agotados` : soldOut.length ? 'Agotado en la carta' : 'Toda la carta disponible');

      const curve = salesCurve(currentCurvePeriod);
      setText('curve-subtitle', peak ? `Hora pico en 7 días: ${peak.label} (${peak.share}% de los pedidos)` : 'Aún no hay ventas para calcular la hora pico');
      updatePeakTooltip(curve);

      const mix = channelMix();
      setText('channels-total', String(mix.total));
      const legend = document.getElementById('channels-legend');
      if (legend) legend.innerHTML = mix.rows.map(r => `
                <div class="dash-channel-legend-item">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${r.color}; flex-shrink:0;"></span>
                    <span style="font-weight:600; color:#374151;">${escapeHtml(r.label)}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:800; color:#111827;">${mix.total ? Math.round(r.count / mix.total * 100) : 0}%</span>
                    <span style="color:#6B7280; font-size:11px;">${plural(r.count, 'orden', 'órdenes')}</span>
                  </div>
                </div>`).join('');
    }

    function updatePeakTooltip(curve) {
      const tooltip = document.getElementById('dash-peak-tooltip');
      if (!tooltip) return;
      if (curve.peakIndex < 0) { tooltip.style.display = 'none'; return; }
      tooltip.style.display = 'block';
      tooltip.innerHTML = `
            <div class="dash-chart-tooltip-title">${currentCurvePeriod === 'hoy' ? 'Pico de hoy' : 'Pico en 7 días'}</div>
            <div class="dash-chart-tooltip-val">${soles(curve.peak)}</div>
            <div class="dash-chart-tooltip-time">${curve.labels[curve.peakIndex]} hrs</div>`;
    }

    // Vuelve a calcular todo; el panel lo llama al abrir el dashboard y cuando llegan pedidos nuevos
    function refreshDashboard() {
      if (!document.getElementById('tab-dashboard')?.classList.contains('active')) return;
      renderDashboardKpis();
      initCharts();
      renderTopProducts(document.getElementById('top-btn-mes')?.classList.contains('active') ? 'mes' : 'hoy');
    }

    // Curva de ventas nativa en HTML5 Canvas (100% resiliente y offline)
    function renderNativeSalesCurve(period = 'hoy') {
      const canvas = document.getElementById('chart-hourly-sales');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || canvas.parentElement?.clientWidth || 600;
      const height = rect.height || 240;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const { labels, data, maxVal } = salesCurve(period);

      ctx.clearRect(0, 0, width, height);

      const paddingLeft = 46;
      const paddingRight = 20;
      const paddingTop = 25;
      const paddingBottom = 28;
      const chartW = width - paddingLeft - paddingRight;
      const chartH = height - paddingTop - paddingBottom;

      // Líneas de cuadrícula y eje Y
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '500 10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const y = paddingTop + (chartH / steps) * i;
        const val = Math.round(maxVal - (maxVal / steps) * i);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        ctx.fillText('S/ ' + val, paddingLeft - 8, y);
      }

      // Puntos de la curva
      const points = data.map((val, idx) => {
        const x = paddingLeft + (chartW / (data.length - 1)) * idx;
        const y = paddingTop + chartH - (val / maxVal) * chartH;
        return { x, y, val, label: labels[idx] };
      });

      // Relleno degradado suave
      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.16)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.005)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, paddingTop + chartH);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, paddingTop + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Trazo de la curva roja con resplandor neón
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.shadowColor = 'rgba(239, 68, 68, 0.45)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.restore();

      // Puntos y etiquetas del eje X
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      points.forEach((pt) => {
        // Label hora
        ctx.fillStyle = '#9CA3AF';
        ctx.fillText(pt.label, pt.x, paddingTop + chartH + 8);

        // Círculo del punto con brillo
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      });
    }

    function initCharts() {
      // Si Chart.js aún no está cargado, dibujamos la curva nativa de inmediato y reintentamos
      if (typeof Chart === 'undefined') {
        renderNativeSalesCurve(currentCurvePeriod);
        setTimeout(initCharts, 300);
        return;
      }

      try {
        const ctxHourly = document.getElementById('chart-hourly-sales');
        if (ctxHourly) {
          if (chartHourlyInstance) chartHourlyInstance.destroy();
          const curve = salesCurve(currentCurvePeriod);
          chartHourlyInstance = new Chart(ctxHourly, {
            type: 'line',
            data: {
              labels: curve.labels,
              datasets: [{
                label: 'Ventas (Soles)',
                data: curve.data,
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.38,
                pointBackgroundColor: '#EF4444',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 4.5,
                pointHoverRadius: 6.5
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#111827',
                  padding: 8,
                  titleFont: { size: 11, weight: 'bold' },
                  bodyFont: { size: 12 },
                  callbacks: {
                    label: ctx => `Ventas: S/ ${ctx.parsed.y.toFixed(2)}`
                  }
                }
              },
              scales: {
                y: {
                  min: 0,
                  max: curve.maxVal,
                  grid: { color: '#F3F4F6' },
                  ticks: {
                    stepSize: curve.maxVal / 4,
                    font: { size: 10.5, weight: '500' },
                    color: '#9CA3AF',
                    callback: v => 'S/ ' + v
                  }
                },
                x: {
                  grid: { display: false },
                  ticks: {
                    font: { size: 10.5, weight: '500' },
                    color: '#9CA3AF'
                  }
                }
              }
            }
          });
        }

        // Mix de Pedidos por Canal (Doughnut)
        const ctxChannels = document.getElementById('chart-channels-mix');
        if (ctxChannels) {
          if (chartChannelsInstance) chartChannelsInstance.destroy();
          const mix = channelMix();
          chartChannelsInstance = new Chart(ctxChannels, {
            type: 'doughnut',
            data: {
              labels: mix.rows.map(r => r.label),
              datasets: [{
                // Sin pedidos se dibuja un anillo gris en vez de un gráfico vacío
                data: mix.total ? mix.rows.map(r => r.count) : [1],
                backgroundColor: mix.total ? mix.rows.map(r => r.color) : ['#E5E7EB'],
                borderWidth: 2.5,
                borderColor: '#FFFFFF'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: ctx => mix.total ? `${ctx.label}: ${ctx.parsed} órdenes` : 'Sin pedidos este mes'
                  }
                }
              },
              cutout: '72%'
            }
          });
        }

        // Origen de la publicidad: "¿Cómo nos conocieron?"
        const ctxAttr = document.getElementById('chart-attribution');
        // Las encuestas todavía no se guardan en el servidor: sin respuestas no hay gráfico
        if (ctxAttr && ATTRIBUTION.length) {
          if (chartAttributionInstance) chartAttributionInstance.destroy();
          chartAttributionInstance = new Chart(ctxAttr, {
            type: 'doughnut',
            data: {
              labels: ATTRIBUTION.map(a => a.source),
              datasets: [{
                data: ATTRIBUTION.map(a => a.pct),
                backgroundColor: ATTRIBUTION.map(a => a.color),
                borderWidth: 2,
                borderColor: '#FFFFFF'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              cutout: '70%'
            }
          });
        }
      } catch (err) {
        console.warn('[Dashboard] Falló Chart.js, recurriendo a Canvas nativo:', err);
        renderNativeSalesCurve(currentCurvePeriod);
      }
    }

    // Toggle período en la curva de ventas
    function setSalesCurvePeriod(period) {
      currentCurvePeriod = period;
      const btnHoy = document.getElementById('btn-curve-hoy');
      const btnSemana = document.getElementById('btn-curve-semana');
      const tooltip = document.getElementById('dash-peak-tooltip');
      
      if (period === 'hoy') {
        if (btnHoy) {
          btnHoy.style.background = '#FFF0F1';
          btnHoy.style.color = '#EF4444';
          btnHoy.style.fontWeight = '700';
        }
        if (btnSemana) {
          btnSemana.style.background = 'transparent';
          btnSemana.style.color = '#6B7280';
          btnSemana.style.fontWeight = '600';
        }
        applyCurve();
      } else {
        if (btnSemana) {
          btnSemana.style.background = '#FFF0F1';
          btnSemana.style.color = '#EF4444';
          btnSemana.style.fontWeight = '700';
        }
        if (btnHoy) {
          btnHoy.style.background = 'transparent';
          btnHoy.style.color = '#6B7280';
          btnHoy.style.fontWeight = '600';
        }
        applyCurve();
      }
    }

    function applyCurve() {
      const curve = salesCurve(currentCurvePeriod);
      if (chartHourlyInstance) {
        chartHourlyInstance.data.labels = curve.labels;
        chartHourlyInstance.data.datasets[0].data = curve.data;
        chartHourlyInstance.options.scales.y.max = curve.maxVal;
        chartHourlyInstance.options.scales.y.ticks.stepSize = curve.maxVal / 4;
        chartHourlyInstance.update();
      } else {
        renderNativeSalesCurve(currentCurvePeriod);
      }
      updatePeakTooltip(curve);
    }

    // Redibujar curva nativa en resize con throttling vía requestAnimationFrame
    let resizeRafId = null;
    window.addEventListener('resize', () => {
      if (chartHourlyInstance) return;
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        renderNativeSalesCurve(currentCurvePeriod);
      });
    }, { passive: true });

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderTopProducts(period) {
      const list = topProducts(period);
      const max = list.length ? list[0].orders : 1;
      const colors = ['#FF2442', '#F59E0B', '#8B5CF6', '#10B981', '#06B6D4'];
      const el = document.getElementById('top-products-list');
      if (!el) return;
      if (!list.length) el.innerHTML = `<div style="font-size:12.5px; color:#6B7280; padding:8px 0;">${period === 'mes' ? 'Todavía no hay ventas este mes.' : 'Todavía no hay ventas hoy.'}</div>`;
      else el.innerHTML = list.map((p, i) => `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:13px;">
            <span style="font-weight:700; color:#111827;">${i + 1}. ${escapeHtml(p.icon)} ${escapeHtml(p.name)}</span>
            <span style="font-weight:700; ${i === 0 ? 'color:#EF4444;' : 'color:#111827;'}">${plural(Number(p.orders || 0), 'unidad', 'unidades')} - S/ ${Number(p.sales || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style="height:7px; background:#F3F4F6; border-radius:999px; overflow:hidden;">
            <div style="width:${Math.round(p.orders / max * 100)}%; height:100%; background:${colors[i]}; border-radius:999px;"></div>
          </div>
        </div>`).join('');
      
      const sub = document.getElementById('top-products-subtitle');
      if (sub) sub.textContent = period === 'mes' ? 'Acumulado del mes - base para decidir promos y pauta' : 'Órdenes despachadas hoy - base para decidir promos y pauta';
      
      ['hoy', 'mes'].forEach(k => {
        const b = document.getElementById('top-btn-' + k);
        if (!b) return;
        const on = k === period;
        b.classList.toggle('active', on);
        b.style.background = on ? '#FFF0F1' : 'transparent';
        b.style.color = on ? '#EF4444' : '#6B7280';
        b.style.fontWeight = on ? '700' : '600';
      });
    }

    function starsHtml(n) {
      const cleanN = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
      return '<span style="color:#F59E0B; letter-spacing:1px;">' + '★'.repeat(cleanN) + '</span><span style="color:#E5E7EB; letter-spacing:1px;">' + '★'.repeat(5 - cleanN) + '</span>';
    }

    // Las encuestas todavía no se guardan en el servidor: se muestra el estado vacío, no ejemplos
    function renderDashboardFeedback() {
      const empty = text => `<div style="font-size:12.5px; color:#6B7280; padding:8px 0;">${text}</div>`;
      const lg = document.getElementById('attribution-legend');
      if (lg) lg.innerHTML = ATTRIBUTION.length ? ATTRIBUTION.map(a => `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
          <span style="color:#374151; font-weight:500;">${escapeHtml(a.source)}</span>
          <strong style="color:#111827;">${Number(a.pct || 0)}%</strong>
        </div>`).join('') : empty('Todavía no hay respuestas de encuesta.');
      const rl = document.getElementById('dashboard-reviews-list');
      if (rl) rl.innerHTML = empty('Todavía no hay reseñas registradas.');
      const tp = document.getElementById('improve-topics');
      if (tp) tp.innerHTML = '<span style="font-size:11.5px; color:#6B7280;">Sin datos</span>';
      const badge = document.getElementById('badge-reviews');
      if (badge) badge.hidden = true;
    }

window.initCharts = initCharts;
window.refreshDashboard = refreshDashboard;
window.renderDashboardKpis = renderDashboardKpis;
window.setSalesCurvePeriod = setSalesCurvePeriod;
window.renderTopProducts = renderTopProducts;
window.renderDashboardFeedback = renderDashboardFeedback;
window.starsHtml = starsHtml;
