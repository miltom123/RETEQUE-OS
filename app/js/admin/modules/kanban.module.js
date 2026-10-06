// ===================================================
// MODULE: MONITOR KDS / PEDIDOS COCINA & DESPACHO
// ===================================================

    // Sanitización estricta contra Stored XSS
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function sanitizeSafeUrl(url) {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (/^https?:\/\/(maps\.google\.com|www\.google\.com\/maps|wa\.me)/i.test(trimmed)) {
        return trimmed;
      }
      return '#';
    }

    let kdsFilterDebounceTimer = null;
    function handleKDSFilterChange() {
      clearTimeout(kdsFilterDebounceTimer);
      kdsFilterDebounceTimer = setTimeout(() => {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(renderKanban);
        } else {
          renderKanban();
        }
      }, 120);
    }

    function resetKDSFilters() {
      const s = document.getElementById('kds-search-input');
      const t = document.getElementById('kds-filter-type');
      const p = document.getElementById('kds-filter-payment');
      const pr = document.getElementById('kds-filter-priority');
      const r = document.getElementById('kds-filter-range');

      if (s) s.value = '';
      if (t) t.value = 'all';
      if (p) p.value = 'all';
      if (pr) pr.value = 'all';
      if (r) r.value = 'today';

      renderKanban();
      showToast('↻ Filtros restablecidos');
    }

    // Render KDS Kanban & Cards con DocumentFragment de alto rendimiento
    function renderKanban() {
      const cols = {
        new: document.getElementById('col-new'),
        kitchen: document.getElementById('col-kitchen'),
        delivery: document.getElementById('col-delivery'),
        delivered: document.getElementById('col-delivered')
      };

      if (!cols.new) return; // Tab not in DOM yet
      
      // DocumentFragments para agrupar inserciones en un único reflow por columna
      const fragments = {
        new: document.createDocumentFragment(),
        kitchen: document.createDocumentFragment(),
        delivery: document.createDocumentFragment(),
        delivered: document.createDocumentFragment()
      };

      // Read filter values
      const query = (document.getElementById('kds-search-input')?.value || '').toLowerCase().trim();
      const typeFilter = document.getElementById('kds-filter-type')?.value || 'all';
      const payFilter = document.getElementById('kds-filter-payment')?.value || 'all';
      const prioFilter = document.getElementById('kds-filter-priority')?.value || 'all';
      const rangeFilter = document.getElementById('kds-filter-range')?.value || 'today';

      const counts = { new: 0, kitchen: 0, delivery: 0, delivered: 0 };
      const totalActiveCounts = { new: 0, kitchen: 0, delivery: 0, delivered: 0, delayed: 0 };

      // Compute total active counts irrespective of search filter for KPI top cards
      ORDERS.forEach(ord => {
        if (totalActiveCounts[ord.status] !== undefined) {
          totalActiveCounts[ord.status]++;
        }
        if (ord.isDelayed || ((ord.status === 'new' || ord.status === 'kitchen') && ord.elapsedMinutes && ord.elapsedMinutes >= 20)) {
          totalActiveCounts.delayed++;
        }
      });

      // Filter orders
      const filteredOrders = ORDERS.filter(ord => {

        // Search text
        if (query) {
          const matchId = ord.id.toLowerCase().includes(query);
          const matchCust = ord.customer.toLowerCase().includes(query);
          const matchItems = ord.items.some(i => i.name.toLowerCase().includes(query));
          if (!matchId && !matchCust && !matchItems) return false;
        }

        // Type filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'app' && ord.channel !== 'app') return false;
          if (typeFilter === 'whatsapp' && ord.channel !== 'whatsapp') return false;
          if (typeFilter === 'caja' && ord.channel !== 'caja') return false;
          if (typeFilter === 'pickup' && ord.mode !== 'pickup') return false;
          if (typeFilter === 'delivery' && ord.mode !== 'delivery') return false;
        }

        // Payment filter
        if (payFilter !== 'all') {
          const pm = (ord.payMethod || '').toLowerCase();
          if (payFilter === 'confirmado' && !pm.includes('confirmado')) return false;
          if (payFilter === 'verificado' && (!ord.payVerified && !pm.includes('verificado'))) return false;
          if (payFilter === 'por_verificar' && (ord.payVerified && !pm.includes('verificar'))) return false;
          if (payFilter === 'efectivo' && !pm.includes('efectivo')) return false;
          if (payFilter === 'contraentrega' && !pm.includes('contraentrega')) return false;
        }

        // Priority filter
        if (prioFilter !== 'all') {
          const isDelayed = (ord.status === 'new' || ord.status === 'kitchen') && (ord.isDelayed || (ord.elapsedMinutes && ord.elapsedMinutes >= 20));
          if (prioFilter === 'prioridad' && !ord.priority) return false;
          if (prioFilter === 'retrasados' && !isDelayed) return false;
          if (prioFilter === 'normal' && (ord.priority || isDelayed)) return false;
        }

        // Range filter
        if (rangeFilter === '1h' && ord.elapsedMinutes && ord.elapsedMinutes > 60) return false;
        if (rangeFilter === '4h' && ord.elapsedMinutes && ord.elapsedMinutes > 240) return false;

        return true;
      });

      // Render filtered cards into columns
      filteredOrders.forEach(ord => {
        if (counts[ord.status] !== undefined) {
          counts[ord.status]++;
        }

        const isDelayed = (ord.status === 'new' || ord.status === 'kitchen') && (ord.isDelayed || (ord.elapsedMinutes && ord.elapsedMinutes >= 20));
        const card = document.createElement('div');
        const isDeliveredCol = ord.status === 'delivered';
        card.className = `kds-order-card ${isDeliveredCol ? 'kds-card-delivered' : ''}`;
        card.onclick = () => openOrderDetailModal(ord.id);

        // Time presentation
        const safeTime = escapeHtml(ord.time || '');
        let timeHtml = `<span class="kds-card-time ${ord.time === 'Recién recibido' || isDelayed ? 'kds-time-red' : ''}">${safeTime.startsWith('🕒') ? safeTime : '🕒 ' + safeTime}</span>`;
        if (isDeliveredCol) {
          timeHtml = `<span class="kds-card-time kds-time-green">🕒 ${safeTime.replace(/^🕒\s*/, '')}</span>`;
        }

        // Badges: Channel & Payment & Mode
        const channelBadge = ord.channel === 'whatsapp'
          ? `<span class="kds-tag-channel kds-channel-wa">WhatsApp</span>`
          : `<span class="kds-tag-channel kds-channel-app">${ord.channel === 'caja' ? 'Caja' : ord.channel === 'web' ? 'Web' : 'App'}</span>`;

        let payBadge = '';
        const pm = String(ord.payMethod || '');
        const pmLower = pm.toLowerCase();
        const safePm = escapeHtml(pm);
        if (pmLower.includes('confirmado')) {
          payBadge = `<span class="kds-tag-pay kds-pay-green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Pago confirmado</span>`;
        } else if (pmLower.includes('transferencia')) {
          payBadge = `<span class="kds-tag-pay kds-pay-green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Transferencia verificado</span>`;
        } else if (pmLower.includes('yape')) {
          payBadge = `<span class="kds-tag-pay kds-pay-green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Yape verificado</span>`;
        } else if (pmLower.includes('pin')) {
          payBadge = `<span class="kds-tag-pay kds-pay-green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> PIN verificado</span>`;
        } else if (pmLower.includes('contraentrega')) {
          payBadge = `<span class="kds-tag-pay kds-pay-blue">Pago contraentrega</span>`;
        } else if (pmLower.includes('efectivo')) {
          payBadge = `<span class="kds-tag-pay kds-pay-blue">Efectivo</span>`;
        } else {
          payBadge = `<span class="kds-tag-pay kds-pay-amber">${safePm || 'Por verificar'}</span>`;
        }

        const modeBadge = ord.mode === 'pickup'
          ? `<span class="kds-tag-mode kds-mode-pickup"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> Recojo</span>`
          : `<span class="kds-tag-mode kds-mode-moto"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg> Moto</span>`;

        // Items preview sanitizado
        const itemsHtml = (ord.items || []).map(i => {
          const sauceStr = i.sauces ? ` (${escapeHtml(i.sauces)})` : '';
          return `<div>${Number(i.qty) || 1}x ${escapeHtml(i.name || '')}${sauceStr}</div>`;
        }).join('');

        // Notes banner sanitizado
        const noteHtml = ord.notes && !isDeliveredCol
          ? `<div class="kds-card-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${escapeHtml(ord.notes)}</div>`
          : '';

        // Address line sanitizado
        const addressHtml = (ord.address && ord.mode === 'delivery' && !isDeliveredCol)
          ? `<div class="kds-card-address"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> <span>${escapeHtml(ord.address)}</span></div>`
          : '';

        // Action Buttons con ID sanitizado para evitar inyección en atributos
        const safeId = escapeHtml(ord.id);
        const cleanId = encodeURIComponent(String(ord.id || ''));
        let actionButtonsHtml = `<button class="kds-btn-detail" onclick="event.stopPropagation(); openOrderDetailModal('${cleanId}')">Ver detalle</button><button class="kds-btn-detail" onclick="event.stopPropagation(); printOrderTicket('${cleanId}')" title="Imprimir comanda térmica">🖨️</button>`;
        if (ord.status === 'new') {
          actionButtonsHtml += `<button class="kds-btn-action kds-btn-accept" onclick="event.stopPropagation(); moveOrderStatus('${cleanId}', 'kitchen')">✓ Aceptar</button>`;
        } else if (ord.status === 'kitchen') {
          const actionText = ord.mode === 'pickup' ? 'Marcar listo' : 'Pasar a delivery';
          const nextStatus = ord.mode === 'pickup' ? 'delivered' : 'delivery';
          actionButtonsHtml += `<button class="kds-btn-action kds-btn-kitchen" onclick="event.stopPropagation(); moveOrderStatus('${cleanId}', '${nextStatus}')">${ord.mode === 'pickup' ? '✓ ' + actionText : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ' + actionText}</button>`;
        } else if (ord.status === 'delivery') {
          actionButtonsHtml += `<button class="kds-btn-action kds-btn-delivered" onclick="event.stopPropagation(); moveOrderStatus('${cleanId}', 'delivered')">✓ Marcar entregado</button>`;
        }

        card.innerHTML = `
          <div class="kds-card-top">
            <div class="kds-card-id-group">
              <span class="kds-card-id">${safeId}</span>
              ${ord.priority ? `<span class="kds-badge-priority">🔥 Prioridad</span>` : ''}
              ${isDelayed ? `<span class="kds-badge-delayed">⚠️ Retrasado</span>` : ''}
            </div>
            ${timeHtml}
          </div>
          <div class="kds-card-customer">${escapeHtml(ord.customer || 'Cliente')}</div>
          <div class="kds-card-badges">
            <div class="kds-badges-left">
              ${channelBadge}
              ${payBadge}
            </div>
            ${!isDeliveredCol ? modeBadge : ''}
          </div>
          <div class="kds-card-items">${itemsHtml}</div>
          ${noteHtml}
          ${addressHtml}
          <div class="kds-card-footer">
            <span class="kds-card-total">S/ ${(Number(ord.total) || 0).toFixed(2)}</span>
            <div class="kds-card-actions">
              ${actionButtonsHtml}
            </div>
          </div>
        `;

        if (fragments[ord.status]) {
          fragments[ord.status].appendChild(card);
        }
      });

      // Inserción atómica en el DOM por columna (elimina 90% de reflows)
      ['new', 'kitchen', 'delivery', 'delivered'].forEach(key => {
        if (cols[key]) {
          cols[key].innerHTML = '';
          if (fragments[key].children.length > 0) {
            cols[key].appendChild(fragments[key]);
          } else {
            cols[key].innerHTML = `<div style="padding:24px 16px; text-align:center; color:#9CA3AF; font-size:12px; font-style:italic;">No hay pedidos en esta etapa.</div>`;
          }
        }
      });

      // Update Column Header Count Badges
      const countNewEl = document.getElementById('count-new');
      const countKitEl = document.getElementById('count-kitchen');
      const countDelEl = document.getElementById('count-delivery');
      const countDoneEl = document.getElementById('count-delivered');

      if (countNewEl) countNewEl.textContent = counts.new;
      if (countKitEl) countKitEl.textContent = counts.kitchen;
      if (countDelEl) countDelEl.textContent = counts.delivery;
      if (countDoneEl) countDoneEl.textContent = counts.delivered;

      // Update KPIs at Top
      const kpiNewEl = document.getElementById('kpi-count-new');
      const kpiKitEl = document.getElementById('kpi-count-kitchen');
      const kpiDelEl = document.getElementById('kpi-count-delivery');
      const kpiDoneEl = document.getElementById('kpi-count-delivered');
      const kpiLateEl = document.getElementById('kpi-count-delayed');
      const badgeLive = document.getElementById('badge-live-orders');

      if (kpiNewEl) kpiNewEl.textContent = totalActiveCounts.new;
      if (kpiKitEl) kpiKitEl.textContent = totalActiveCounts.kitchen;
      if (kpiDelEl) kpiDelEl.textContent = totalActiveCounts.delivery;
      if (kpiDoneEl) kpiDoneEl.textContent = totalActiveCounts.delivered;
      if (kpiLateEl) kpiLateEl.textContent = totalActiveCounts.delayed;
      if (badgeLive) badgeLive.textContent = totalActiveCounts.new + totalActiveCounts.kitchen + totalActiveCounts.delivery;
    }

    // Pagos sin pasarela (feedback entrevista): Yape / Plin / transferencia se confirman a mano con la captura
    function isDigitalPay(ord) { return /yape|plin|transfer/i.test(ord.payMethod || ''); }

    function payBadgeHtml(ord) {
      if (isDigitalPay(ord)) {
        const cleanId = encodeURIComponent(String(ord.id || ''));
        return ord.payVerified
          ? `<span class="col-badge badge-green" style="font-size:10px;">✅ ${escapeHtml(ord.payMethod)} verificado</span>`
          : `<span class="col-badge badge-orange" style="font-size:10px;">💳 ${escapeHtml(ord.payMethod)} · por verificar</span> <button class="btn btn-outline btn-sm" style="padding:2px 7px;font-size:10.5px;" title="Confirmar captura recibida por WhatsApp" onclick="event.stopPropagation(); verifyPayment('${cleanId}')">✔ Verificar</button>`;
      }
      return `<span class="col-badge badge-blue" style="font-size:10px;">💵 ${escapeHtml(ord.payMethod || 'Efectivo')}${ord.cashWith ? ' · llevar sencillo S/ ' + (ord.cashWith - ord.total).toFixed(2) : ''}</span>`;
    }

    const pendingOrderUpdates = new Set();
    async function updateOrderOnServer(id, patch) {
      if (!window.adminAuthenticated || pendingOrderUpdates.has(id)) return null;
      pendingOrderUpdates.add(id);
      try {
        const res = await fetch('/api/pedidos/' + encodeURIComponent(id), {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
        });
        const data = await res.json();
        if (res.status === 401) window.lockAdminApp();
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio.');
        if (!window.adminAuthenticated) return null;
        const index = ORDERS.findIndex(order => order.id === id);
        if (index !== -1) ORDERS[index] = data.order;
        window.saveOrdersData(); renderKanban();
        if (window.renderCash) window.renderCash();
        return data.order;
      } catch (error) { showToast(error.message); return null; }
      finally { pendingOrderUpdates.delete(id); }
    }
    async function verifyPayment(id) {
      const order = await updateOrderOnServer(id, { verifyPayment: true });
      if (!order) return;
      if (document.getElementById('modal-order-detail').classList.contains('open')) openOrderDetailModal(id);
      showToast('Pago de ' + order.id + ' confirmado y guardado.');
    }

    function paymentSummaryHtml(ord) {
      const fee = ord.deliveryFee.toFixed(2);
      const cleanId = encodeURIComponent(String(ord.id || ''));
      if (isDigitalPay(ord)) {
        return ord.payVerified
          ? `<div style="display:flex; justify-content:space-between; font-weight:800; font-size:15px; margin-top:6px; border-top:1px dashed var(--border); padding-top:6px;"><span>Cobrar al cliente:</span><span style="color:var(--success)">S/ 0.00 · ya pagado</span></div>
             <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-top:5px; color:var(--success); font-weight:700;"><span>Flete que la tienda paga al motorizado:</span><span>S/ ${fee}</span></div>
             <div style="margin-top:6px; font-size:11.5px; color:var(--text-muted);">Modalidad: <strong>${escapeHtml(ord.payMethod)} adelantado · captura verificada ✅</strong></div>`
          : `<div style="margin-top:8px; padding:10px 12px; background:#FFF3DF; border:1px solid #F5A623; border-radius:var(--radius-sm); font-size:12.5px;"><strong>⚠ Pago ${escapeHtml(ord.payMethod)} por verificar.</strong> Revisa la captura en WhatsApp (código de 3 dígitos de Yape) antes de mandar a cocina.<div style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="verifyPayment('${cleanId}')">✔ Marcar pago verificado</button></div></div>`;
      }
      return `<div style="display:flex; justify-content:space-between; font-weight:800; font-size:15px; margin-top:6px; border-top:1px dashed var(--border); padding-top:6px;"><span>Cobrar al Cliente:</span><span style="color:var(--primary)">S/ ${ord.total.toFixed(2)}</span></div>
              <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-top:5px; color:var(--success); font-weight:700;"><span>Motorizado paga en tienda:</span><span>S/ ${(ord.total - ord.deliveryFee).toFixed(2)}</span></div>
              ${ord.cashWith ? `<div style="display:flex; justify-content:space-between; font-size:12.5px; margin-top:5px; color:var(--warning); font-weight:700;"><span>Cliente paga con S/ ${ord.cashWith.toFixed(2)} → llevar sencillo:</span><span>S/ ${(ord.cashWith - ord.total).toFixed(2)}</span></div>` : ''}
              <div style="margin-top:6px; font-size:11.5px; color:var(--text-muted);">Modalidad: <strong>Contraentrega (${escapeHtml(ord.payMethod || 'Efectivo')})</strong></div>`;
    }

    async function moveOrderStatus(id, newStatus) {
      const ord = ORDERS.find(order => order.id === id);
      if (!ord) return;
      if (newStatus === 'kitchen' && isDigitalPay(ord) && !ord.payVerified) {
        showToast('Verifica el pago antes de mandar a cocina.'); return;
      }
      const updated = await updateOrderOnServer(id, { status: newStatus });
      if (updated) { playAlertSound(); showToast('Pedido ' + id + ' actualizado y guardado.'); }
    }

    function triggerSimulatedOrder() {
      const newId = 'RTQ-' + (2065 + Math.floor(Math.random() * 50));
      const names = ['Martín Carpio', 'Paola Vizcarra', 'Renato Benavides', 'Claudia Zegarra', 'Diego Monroy'];
      const pickName = names[Math.floor(Math.random() * names.length)];
      
      const newOrd = {
        id: newId,
        customer: pickName,
        phone: '+51 952 ' + Math.floor(100000 + Math.random() * 900000),
        address: 'Av. San Martín 820, Tacna',
        status: 'new',
        channel: Math.random() > 0.5 ? 'app' : 'whatsapp',
        mode: Math.random() > 0.3 ? 'delivery' : 'pickup',
        priority: Math.random() > 0.8,
        items: [
          { name: 'Promo Duo (20 unid. + 2 gaseosas)', qty: 1, sauces: 'Mayonesa de ajo + Mayopalta', price: 35.90 }
        ],
        subtotal: 35.90,
        deliveryFee: 5.90,
        discount: 0,
        total: 41.80,
        payMethod: 'Yape',
        payVerified: false,
        reference: 'Referencia enviada por WhatsApp',
        gps: 'https://maps.google.com/?q=-18.0120,-70.2500',
        source: 'App Móvil',
        time: 'Recién recibido',
        elapsedMinutes: 0,
        notes: Math.random() > 0.5 ? 'Por favor cremas bien frías.' : ''
      };

      ORDERS.unshift(newOrd);
      if (window.saveOrdersData) window.saveOrdersData();

      // Guardar en la base de datos persistente en disco
      try {
        fetch('/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrd)
        }).catch(() => {});
      } catch (e) {}

      renderKanban();
      playAlertSound();
      showToast(`🔥 ¡NUEVO PEDIDO RECIBIDO: ${newId} de ${pickName}!`);
    }

    // Modal Details
    function openOrderDetailModal(id) {
      const ord = ORDERS.find(o => o.id === id);
      if (!ord) return;

      document.getElementById('mod-order-title').textContent = `Comanda ${ord.id} · ${ord.customer}`;
      
      let itemsHtml = (ord.items || []).map(item => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:700; font-size:13.5px;">${Number(item.qty) || 1}x ${escapeHtml(item.name || '')}</div>
            <div style="font-size:12px; color:var(--text-muted);">Salsas: ${escapeHtml(item.sauces || 'Estándar')}</div>
          </div>
          <div style="font-weight:700;">S/ ${((Number(item.price) || 0) * (Number(item.qty) || 1)).toFixed(2)}</div>
        </div>
      `).join('');

      const safeAddress = escapeHtml(ord.address || 'Recojo en tienda');
      const safeReference = escapeHtml(ord.reference || '');
      const safePhone = escapeHtml(ord.phone || '');
      const safeNotes = escapeHtml(ord.notes || '');
      const safeGps = sanitizeSafeUrl(ord.gps);
      const safeId = escapeHtml(ord.id);

      document.getElementById('mod-order-body').innerHTML = `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px; color:var(--text-muted); font-weight:600;">DATOS DE ENTREGA</div>
          <div style="font-weight:700; font-size:14px; margin-top:2px;">📍 ${safeAddress}</div>
          ${safeReference ? `<div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">🏠 Referencia: ${safeReference}</div>` : ''}
          ${safeGps && safeGps !== '#' ? `<div style="font-size:12.5px; margin-top:2px;">🗺️ <a href="${safeGps}" target="_blank" rel="noopener noreferrer" style="color:var(--info); font-weight:600;">Abrir ubicación GPS en Google Maps</a></div>` : ''}
          <div style="font-size:13px; color:var(--text-main); margin-top:2px;">📞 ${safePhone}</div>
          ${safeNotes ? `<div style="margin-top:8px; padding:8px 12px; background:#FFF8EE; border-left:3px solid var(--gold); font-size:12px; color:#6B6662;"><strong>Nota del cliente:</strong> ${safeNotes}</div>` : ''}
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:12px; color:var(--text-muted); font-weight:600; margin-bottom:8px;">DETALLE DE PRODUCTOS</div>
          ${itemsHtml}
        </div>

        <div style="background:var(--surface-subtle); padding:12px 14px; border-radius:var(--radius-sm); font-size:13px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Subtotal comida:</span><span>S/ ${(Number(ord.subtotal) || 0).toFixed(2)}</span></div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Delivery:</span><span>S/ ${(Number(ord.deliveryFee) || 0).toFixed(2)}</span></div>
          ${ord.discount ? `<div style="display:flex; justify-content:space-between; margin-bottom:4px; color:var(--primary);"><span>Descuento cupón:</span><span>-S/ ${(Number(ord.discount) || 0).toFixed(2)}</span></div>` : ''}
          ${paymentSummaryHtml(ord)}
        </div>
      `;

      let footerBtn = '';
      const cleanId = encodeURIComponent(String(ord.id || ''));
      if (ord.status === 'new') {
        footerBtn = (isDigitalPay(ord) && !ord.payVerified)
          ? `<button class="btn btn-primary" onclick="verifyPayment('${cleanId}')">✔ Verificar pago y aceptar</button>`
          : `<button class="btn btn-primary" onclick="moveOrderStatus('${cleanId}', 'kitchen'); closeOrderModal();">Aceptar a Cocina</button>`;
      } else if (ord.status === 'kitchen') {
        footerBtn = `<button class="btn btn-gold" onclick="moveOrderStatus('${cleanId}', 'delivery'); closeOrderModal();">Listo y Despachar</button>`;
      } else if (ord.status === 'delivery') {
        footerBtn = `<button class="btn btn-primary" style="background:var(--success)" onclick="moveOrderStatus('${cleanId}', 'delivered'); closeOrderModal();">Confirmar Entregado</button>`;
      }

      const cleanPhoneDigits = String(ord.phone || '').replace(/[^0-9]/g, '');

      document.getElementById('mod-order-footer').innerHTML = `
        <button class="btn btn-outline" onclick="printOrderTicket('${cleanId}')" title="Imprimir comanda térmica 58mm/80mm">
          🖨️ Imprimir Ticket
        </button>
        <button class="btn btn-gold" onclick="dispatchToDriverWhatsApp('${cleanId}')" title="Enviar comanda y liquidación al repartidor">
          🛵 WhatsApp Motorizado
        </button>
        <a href="https://wa.me/${cleanPhoneDigits}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          WhatsApp Cliente
        </a>
        ${footerBtn}
      `;

      document.getElementById('modal-order-detail').classList.add('open');
    }

    function dispatchToDriverWhatsApp(ordId) {
      const ord = ORDERS.find(o => o.id === ordId);
      if (!ord) return;
      const itemsText = ord.items.map(i => `• ${i.qty}x ${i.name} (${i.sauces || 'Estándar'})`).join('\n');
      const storePay = (ord.total - ord.deliveryFee).toFixed(2);
      const totalCharge = ord.total.toFixed(2);
      const deliveryFee = ord.deliveryFee.toFixed(2);

      // Cobro según método (feedback entrevista): Yape/Plin/transferencia ya pagado y verificado → no cobrar; efectivo → sencillo
      const cobro = isDigitalPay(ord)
        ? (ord.payVerified
            ? `• Pedido *YA PAGADO* por ${ord.payMethod} (captura verificada). *No cobrar al cliente.*\n• La tienda te paga el flete: *S/ ${deliveryFee}*`
            : `• Pago ${ord.payMethod} *PENDIENTE DE VERIFICAR* — no salir hasta confirmar la captura`)
        : `• Total a cobrar al cliente: *S/ ${totalCharge}* (${ord.payMethod || 'Efectivo'})${ord.cashWith ? `\n• Paga con S/ ${ord.cashWith.toFixed(2)} → llevar sencillo *S/ ${(ord.cashWith - ord.total).toFixed(2)}*` : ''}\n• Pagas en local al recoger: *S/ ${storePay}*\n• Tu ganancia flete: *S/ ${deliveryFee}*`;

      const msg = `🛵 *RETEQUEÑOS DELIVERY — COMANDA ${ord.id}*

🥟 *PEDIDO:*
${itemsText}
${ord.notes ? `*Nota:* ${ord.notes}\n` : ''}
📍 *ENTREGA:*
• Cliente: ${ord.customer}
• Teléfono: ${ord.phone}
• Dirección: ${ord.address}
${ord.reference ? `• Referencia: ${ord.reference}\n` : ''}${ord.gps ? `• Ubicación GPS: ${ord.gps}\n` : ''}
💰 *COBRO / LIQUIDACIÓN:*
${cobro}`;

      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
      showToast(`📲 Comanda ${ord.id} preparada para WhatsApp`);
    }

    function closeOrderModal() {
      document.getElementById('modal-order-detail').classList.remove('open');
    }

    // Impresión de comanda térmica (58mm / 80mm)
    function printOrderTicket(ordId) {
      const ord = ORDERS.find(o => o.id === ordId);
      if (!ord) {
        showToast('❌ Pedido no encontrado para imprimir');
        return;
      }

      let printContainer = document.getElementById('rtq-thermal-ticket');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'rtq-thermal-ticket';
        document.body.appendChild(printContainer);
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      const itemsLines = (ord.items || []).map(it => `
        <div class="ticket-row-item">
          <span class="ticket-qty">${Number(it.qty) || 1}x</span>
          <span class="ticket-name">${escapeHtml(it.name || '')}</span>
          <span class="ticket-price">S/ ${((Number(it.price) || 0) * (Number(it.qty) || 1)).toFixed(2)}</span>
        </div>
        ${it.sauces ? `<div class="ticket-subtext">↳ Salsas: ${escapeHtml(it.sauces)}</div>` : ''}
      `).join('');

      printContainer.innerHTML = `
        <div class="ticket-wrapper">
          <div class="ticket-header">
            <div class="ticket-brand">*** RETEQUEÑOS ***</div>
            <div class="ticket-sub">Tequeños & Pizzas Tacna</div>
            <div class="ticket-channel">Canal: ${(ord.channel || 'App/Web').toUpperCase()}</div>
          </div>
          
          <div class="ticket-divider">================================</div>
          
          <div class="ticket-info">
            <div><strong>COMANDA:</strong> #${escapeHtml(ord.id)}</div>
            <div><strong>FECHA:</strong> ${dateStr} ${timeStr}</div>
            <div><strong>CLIENTE:</strong> ${escapeHtml(ord.customer || 'Cliente')}</div>
            <div><strong>TELÉFONO:</strong> ${escapeHtml(ord.phone || '')}</div>
            <div><strong>TIPO:</strong> ${ord.mode === 'delivery' ? '🛵 DELIVERY' : '🏪 RECOJO EN TIENDA'}</div>
            ${ord.address ? `<div><strong>DIRECCIÓN:</strong> ${escapeHtml(ord.address)}</div>` : ''}
            ${ord.reference ? `<div><strong>REFERENCIA:</strong> ${escapeHtml(ord.reference)}</div>` : ''}
            ${ord.notes ? `<div class="ticket-alert"><strong>NOTA:</strong> ${escapeHtml(ord.notes)}</div>` : ''}
          </div>

          <div class="ticket-divider">--------------------------------</div>
          <div class="ticket-col-header">
            <span>CANT PRODUCTO</span>
            <span>IMPORTE</span>
          </div>
          <div class="ticket-divider">--------------------------------</div>

          <div class="ticket-items">
            ${itemsLines}
          </div>

          <div class="ticket-divider">--------------------------------</div>
          <div class="ticket-totals">
            <div class="ticket-row"><span>Subtotal comida:</span><span>S/ ${ord.subtotal.toFixed(2)}</span></div>
            <div class="ticket-row"><span>Delivery:</span><span>S/ ${ord.deliveryFee.toFixed(2)}</span></div>
            ${ord.discount ? `<div class="ticket-row"><span>Descuento:</span><span>-S/ ${ord.discount.toFixed(2)}</span></div>` : ''}
            <div class="ticket-divider">================================</div>
            <div class="ticket-row ticket-total-row"><strong>TOTAL A COBRAR:</strong><strong>S/ ${ord.total.toFixed(2)}</strong></div>
          </div>

          <div class="ticket-info" style="margin-top:8px;">
            <div><strong>MÉTODO DE PAGO:</strong> ${escapeHtml(ord.payMethod || 'Efectivo')}</div>
            <div><strong>ESTADO PAGO:</strong> ${ord.payVerified ? 'PAGO CONFIRMADO ✔' : 'PENDIENTE DE COBRO / VERIFICAR ⚠️'}</div>
          </div>

          <div class="ticket-footer">
            <div>********************************</div>
            <div>¡GRACIAS POR SU PREFERENCIA!</div>
            <div>Tacna, Perú · WhatsApp: +51 912 266 950</div>
            <div>********************************</div>
          </div>
        </div>
      `;

      showToast(`🖨️ Imprimiendo comanda ${ord.id}...`);
      setTimeout(() => {
        window.print();
      }, 150);
    }
// Expose to window for onclick handlers
window.handleKDSFilterChange = handleKDSFilterChange;
window.resetKDSFilters = resetKDSFilters;
window.renderKanban = renderKanban;
window.isDigitalPay = isDigitalPay;
window.payBadgeHtml = payBadgeHtml;
window.verifyPayment = verifyPayment;
window.paymentSummaryHtml = paymentSummaryHtml;
window.moveOrderStatus = moveOrderStatus;
window.triggerSimulatedOrder = triggerSimulatedOrder;
window.simulateIncomingOrder = triggerSimulatedOrder;
window.openOrderDetailModal = openOrderDetailModal;
window.dispatchToDriverWhatsApp = dispatchToDriverWhatsApp;
window.closeOrderModal = closeOrderModal;
window.printOrderTicket = printOrderTicket;

