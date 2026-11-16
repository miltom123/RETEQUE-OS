// ===================================================
// MODULE: CUPONES, OFERTAS & MOTOR DE PROMOCIONES
// ===================================================

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // only: filtro opcional de la tabla; los contadores siempre usan todos los cupones
    function renderCoupons(filterText = '', only = null) {
      const tbody = document.getElementById('co-table-body');
      if (!tbody) return;
      if (window.saveCouponsData) window.saveCouponsData();

      const filtered = DETAILED_COUPONS.filter(c => {
        if (only && !only(c)) return false;
        if (!filterText) return true;
        const q = filterText.toLowerCase();
        return c.code.toLowerCase().includes(q) ||
               c.name.toLowerCase().includes(q) ||
               c.segment.toLowerCase().includes(q) ||
               c.status.toLowerCase().includes(q);
      });

      tbody.innerHTML = filtered.map(c => {
        let statusBadge = '';
        if (c.status === 'Activo') {
          statusBadge = '<span class="co-day-badge co-badge-activa">● Activo</span>';
        } else if (c.status === 'Programado') {
          statusBadge = '<span class="co-day-badge co-badge-programada">● Programado</span>';
        } else if (c.status === 'Pausado') {
          statusBadge = '<span class="co-day-badge co-badge-pausada">● Pausado</span>';
        } else {
          statusBadge = `<span class="co-day-badge" style="background:#F3F4F6;color:#6B7280;">● ${escapeHtml(c.status)}</span>`;
        }

        const pushBadge = c.push
          ? '<span style="background:#DEF7EC;color:#03543F;font-weight:700;font-size:11px;padding:2px 8px;border-radius:6px;">Sí</span>'
          : '<span style="background:#FEF3C7;color:#92400E;font-weight:700;font-size:11px;padding:2px 8px;border-radius:6px;">No</span>';

        const pausePlayIcon = c.status === 'Activo'
          ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
          : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

        const encodedCode = encodeURIComponent(c.code);

        return `
          <tr>
            <td><span class="co-table-code">${escapeHtml(c.code)}</span></td>
            <td>
              <div style="font-weight:700;color:#111827;font-size:12.5px;">${escapeHtml(c.name)}</div>
              ${c.minOrder ? `<div style="font-size:10.5px;color:#9CA3AF;">Mínimo: ${escapeHtml(c.minOrder)}</div>` : ''}
            </td>
            <td>${statusBadge}</td>
            <td><span style="font-size:11.5px;color:#4B5563;white-space:nowrap;">${escapeHtml(c.validity)}</span></td>
            <td><span style="font-size:11.5px;color:#4B5563;white-space:nowrap;">${escapeHtml(c.schedule)}</span></td>
            <td><span style="font-size:11.5px;font-weight:600;color:#4B5563;">${escapeHtml(c.segment)}</span></td>
            <td><span style="font-size:11.5px;font-weight:700;color:#111827;" title="Pedidos de la web que usaron el cupón">${Number(c.uses || 0)}</span></td>
            <td>${pushBadge}</td>
            <td style="text-align:right;">
              <div class="co-table-actions">
                <button type="button" class="co-act-btn" onclick="previewCouponInMockup('${encodedCode}')" title="Ver en teléfono">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button type="button" class="co-act-btn" onclick="editCoupon('${encodedCode}')" title="Editar cupón">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button type="button" class="co-act-btn" onclick="toggleCouponStatus('${encodedCode}')" title="${c.status === 'Activo' ? 'Pausar cupón' : 'Reactivar cupón'}">
                  ${pausePlayIcon}
                </button>
                <button type="button" class="co-act-btn" onclick="duplicateCoupon('${encodedCode}')" title="Duplicar cupón">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button type="button" class="co-act-btn delete" onclick="deleteCoupon('${encodedCode}')" title="Eliminar cupón">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Contadores reales de los cupones guardados en el servidor
      const activeCount = DETAILED_COUPONS.filter(c => c.status === 'Activo').length;
      const scheduledCount = DETAILED_COUPONS.filter(c => c.status === 'Programado').length;
      const totalCreated = DETAILED_COUPONS.length;
      const activeEl = document.getElementById('kpi-active-count');
      const activeSub = document.getElementById('kpi-active-sub');
      const schedEl = document.getElementById('kpi-scheduled-count');
      if (activeEl) activeEl.textContent = activeCount;
      if (activeSub) activeSub.textContent = `de ${totalCreated} cupones creados`;
      if (schedEl) schedEl.textContent = scheduledCount;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const inThree = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 3 * 86400000));
      const expiring = DETAILED_COUPONS.filter(c => c.server && c.server.active && c.server.endDate && c.server.endDate >= today && c.server.endDate <= inThree).length;
      const expEl = document.getElementById('kpi-expiring-count');
      if (expEl) expEl.textContent = expiring;
      const usesEl = document.getElementById('kpi-uses-month');
      if (usesEl) usesEl.textContent = DETAILED_COUPONS.reduce((sum, c) => sum + Number(c.uses || 0), 0);
    }

    // Render Weekly Promo Scheduler
    function renderWeekPromos() {
      const grid = document.getElementById('co-week-grid');
      if (!grid) return;

      grid.innerHTML = DETAILED_WEEK_SCHEDULE.map((col, idx) => {
        const itemsHtml = col.items.length > 0 ? col.items.map(item => `
          <div class="co-day-card">
            <div class="co-day-time">${escapeHtml(item.time)}</div>
            <div class="co-day-card-title">${escapeHtml(item.title)}</div>
            <span class="co-day-badge ${item.status === 'Activa' ? 'co-badge-activa' : 'co-badge-programada'}">
              ● ${escapeHtml(item.status)}
            </span>
          </div>
        `).join('') : '<div class="co-day-empty">Sin promociones</div>';

        const addBtnHtml = col.allowAdd ? `
          <button type="button" class="co-btn-add-offer" onclick="openAddOfferModal('${escapeHtml(col.day)}', ${idx})">
            + Agregar oferta
          </button>
        ` : '';

        return `
          <div class="co-day-col">
            <div class="co-day-header">
              <div>
                <div class="co-day-name ${col.day === 'DOMINGO' ? 'muted' : ''}">${escapeHtml(col.day)}</div>
                <div class="co-day-date">${escapeHtml(col.date)}</div>
              </div>
              <div class="co-day-more" onclick="showToast('Opciones para ${escapeHtml(col.day)}')">⋮</div>
            </div>
            <div class="co-day-items">
              ${itemsHtml}
            </div>
            ${addBtnHtml}
          </div>
        `;
      }).join('');
    }

    // Live Phone Preview Synchronizer
    function updateLivePreview() {
      const codeInput = document.getElementById('form-code');
      const nameInput = document.getElementById('form-name');
      const discountInput = document.getElementById('form-discount-val');
      const minInput = document.getElementById('form-min-order');
      const endDateInput = document.getElementById('form-end-date');

      const code = codeInput ? codeInput.value.trim().toUpperCase() : 'BIENVENIDO10';
      const name = nameInput ? nameInput.value.trim() : 'en tu primera compra';
      const discount = discountInput ? discountInput.value.trim() : 'S/ 5.00';
      const min = minInput ? minInput.value.trim() : 'S/ 20.00';
      const endDate = endDateInput ? endDateInput.value.trim() : '30/10/2025';

      const badgeEl = document.getElementById('preview-badge');
      const valEl = document.getElementById('preview-val');
      const descEl = document.getElementById('preview-desc');
      const expEl = document.getElementById('preview-expires');
      const minEl = document.getElementById('preview-min');

      if (badgeEl) badgeEl.textContent = code ? `¡${code}!` : '¡OFERTA!';
      if (descEl) descEl.textContent = name || 'en productos seleccionados';
      if (expEl) expEl.textContent = `📅 Válido hasta ${endDate || 'fecha fin'}`;
      if (minEl) minEl.textContent = `🛒 Pedido mínimo: ${min || 'S/ 0.00'}`;

      if (valEl) {
        valEl.textContent = '';
        const span = document.createElement('span');
        if (discount.includes('%')) {
          span.textContent = discount;
          valEl.appendChild(span);
          valEl.appendChild(document.createTextNode(' OFF'));
        } else if (discount.toLowerCase().includes('envío') || discount.toLowerCase().includes('gratis')) {
          span.textContent = 'ENVÍO';
          valEl.appendChild(span);
          valEl.appendChild(document.createTextNode(' GRATIS'));
        } else if (discount.toLowerCase().includes('2x1')) {
          span.textContent = '2x1';
          valEl.appendChild(span);
          valEl.appendChild(document.createTextNode(' PROMO'));
        } else {
          span.textContent = discount;
          valEl.appendChild(span);
          valEl.appendChild(document.createTextNode(' OFF'));
        }
      }
    }

    // Form Event Handlers
    function handleBenefitTypeChange() {
      const type = document.getElementById('form-benefit-type').value;
      const discountInput = document.getElementById('form-discount-val');
      if (type === 'fixed') discountInput.value = 'S/ 5.00';
      else if (type === 'percent') discountInput.value = '20%';
      else if (type === 'bogo') discountInput.value = '2x1';
      else if (type === 'shipping') discountInput.value = 'Envío gratis';
      else if (type === 'gift') discountInput.value = 'Tequeños gratis';
      updateLivePreview();
    }

    function setAudience(seg, btn) {
      currentAudience = seg;
      document.querySelectorAll('.co-audience-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      showToast(`Segmento seleccionado: ${seg}`);
    }

    function generateAutoCode() {
      const prefixes = ['RETQ', 'PROMO', 'DESCUENTO', 'FIESTA', 'SUPER'];
      const num = Math.floor(10 + Math.random() * 90);
      const code = prefixes[Math.floor(Math.random() * prefixes.length)] + num;
      const codeInput = document.getElementById('form-code');
      if (codeInput) {
        codeInput.value = code;
        updateLivePreview();
      }
      showToast(`🎲 Código generado: ${code}`);
    }

    // ---- Cupones guardados en el servidor ----
    // La tienda aplica código, tipo (monto fijo o porcentaje), valor, pedido mínimo, estado y fechas.
    // Segmento, horario, límite de usos y push se muestran en el formulario pero la tienda no los aplica.

    const toIsoDate = text => {
      const value = String(text || '').trim();
      if (!value) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) throw new Error(`La fecha "${value}" debe ser DD/MM/AAAA.`);
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    };
    const toDmy = iso => iso ? iso.split('-').reverse().join('/') : '';
    const amount = text => {
      const n = parseFloat(String(text || '').replace(',', '.').replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : NaN;
    };
    const peruToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    function couponUses(code) {
      const mark = `Cupón ${code}`;
      return (window.ORDERS || []).filter(o => o.status !== 'cancelled' && String(o.notes || '').split(' · ').includes(mark)).length;
    }

    // Fila de la tabla a partir del cupón del servidor
    function toRow(c) {
      const today = peruToday();
      let status = c.active ? 'Activo' : 'Pausado';
      if (c.active && c.startDate && today < c.startDate) status = 'Programado';
      if (c.endDate && today > c.endDate) status = 'Vencido';
      return {
        code: c.code, name: c.name, status, server: c,
        validity: `${toDmy(c.startDate) || 'Desde hoy'} - ${toDmy(c.endDate) || 'Sin fin'}`,
        schedule: 'Todo el día', segment: 'Todos', uses: couponUses(c.code), push: false,
        discountVal: c.type === 'percent' ? `${c.value}%` : `S/ ${Number(c.value).toFixed(2)}`,
        benefitType: c.type, minOrder: `S/ ${Number(c.minOrder || 0).toFixed(2)}`,
        startDate: toDmy(c.startDate), endDate: toDmy(c.endDate)
      };
    }

    let serverCoupons = [];
    function showServerCoupons(list) {
      serverCoupons = Array.isArray(list) ? list : [];
      DETAILED_COUPONS = serverCoupons.map(toRow);
      window.DETAILED_COUPONS = DETAILED_COUPONS;
      renderCoupons(document.getElementById('co-search-table')?.value || '');
    }

    async function loadServerCoupons() {
      if (window.currentUser?.role !== 'admin') return;
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los cupones.');
        showServerCoupons(data.coupons || []);
      } catch (error) {
        showToast(`⚠️ ${error.message}`);
      }
    }

    // Guarda la lista completa; el panel solo cambia si el servidor la aceptó
    async function saveServerCoupons(list, okMessage) {
      let res, data = {};
      try {
        res = await fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coupons: list }) });
        try { data = await res.json(); } catch (e) {}
      } catch (e) {
        showToast('⚠️ No hay conexión con el servidor. El cupón no se guardó.');
        return false;
      }
      if (res.status === 401 && window.lockAdminApp) window.lockAdminApp();
      if (!res.ok) { showToast(`⚠️ ${data.error || 'El servidor no guardó el cupón.'}`); return false; }
      showServerCoupons(data.config?.coupons || list);
      if (okMessage) showToast(okMessage);
      return true;
    }

    // Lee el formulario y arma el cupón tal como lo guarda el servidor
    function couponFromForm(statusOverride) {
      const type = document.getElementById('form-benefit-type').value;
      if (!['fixed', 'percent'].includes(type)) throw new Error('Por ahora la tienda solo aplica cupones de monto fijo o porcentaje.');
      const value = amount(document.getElementById('form-discount-val').value);
      if (!(value > 0)) throw new Error('Escribe el valor del descuento, por ejemplo S/ 5.00 o 10%.');
      const status = statusOverride || document.getElementById('form-status').value;
      return {
        code: document.getElementById('form-code').value.trim().toUpperCase(),
        name: document.getElementById('form-name').value.trim(),
        type, value,
        minOrder: amount(document.getElementById('form-min-order').value) || 0,
        active: status === 'Activo' || status === 'Programado',
        startDate: toIsoDate(document.getElementById('form-start-date').value),
        endDate: toIsoDate(document.getElementById('form-end-date').value)
      };
    }

    async function saveCouponFromForm(statusOverride) {
      let coupon;
      try { coupon = couponFromForm(statusOverride); } catch (error) { showToast(`⚠️ ${error.message}`); return; }
      const editing = editingCouponCode;
      const others = serverCoupons.filter(c => c.code !== editing);
      if (others.some(c => c.code === coupon.code)) { showToast(`⚠️ Ya existe un cupón con el código ${coupon.code}.`); return; }
      const list = editing
        ? serverCoupons.map(c => (c.code === editing ? coupon : c))
        : [coupon, ...serverCoupons];
      const saved = await saveServerCoupons(list, editing ? `✅ Cupón "${coupon.code}" actualizado.` : `⚡ Cupón "${coupon.code}" creado.`);
      if (!saved) return;
      editingCouponCode = null;
      document.getElementById('form-coupon-title').textContent = 'Crear / Editar cupón';
    }

    function handleFormSubmit(e) {
      e.preventDefault();
      saveCouponFromForm();
    }

    function handleSaveDraft() {
      saveCouponFromForm('Borrador');
    }

    function handleScheduleCoupon() {
      const start = document.getElementById('form-start-date').value.trim();
      if (!start) { showToast('⚠️ Para programar el cupón indica la fecha de inicio.'); return; }
      saveCouponFromForm('Programado');
    }

    function editCoupon(rawCode) {
      const code = decodeURIComponent(rawCode || '');
      const c = DETAILED_COUPONS.find(item => item.code === code);
      if (!c) return;
      editingCouponCode = code;
      document.getElementById('form-coupon-title').textContent = `Editar cupón: ${code}`;
      document.getElementById('form-code').value = c.code;
      document.getElementById('form-name').value = c.name;
      document.getElementById('form-discount-val').value = c.discountVal || 'S/ 5.00';
      document.getElementById('form-min-order').value = c.minOrder || 'S/ 20.00';
      if (c.benefitType) document.getElementById('form-benefit-type').value = c.benefitType;
      if (c.startDate) document.getElementById('form-start-date').value = c.startDate;
      if (c.endDate) document.getElementById('form-end-date').value = c.endDate;
      if (c.status) document.getElementById('form-status').value = c.status;
      setAudience(c.segment || 'Todos');
      updateLivePreview();
      document.getElementById('form-card-container').scrollIntoView({ behavior: 'smooth' });
      showToast(`✏️ Editando cupón "${code}"`);
    }

    function previewCouponInMockup(rawCode) {
      const code = decodeURIComponent(rawCode || '');
      const c = DETAILED_COUPONS.find(item => item.code === code);
      if (!c) return;
      document.getElementById('preview-badge').textContent = `¡${c.code}!`;
      document.getElementById('preview-desc').textContent = c.name;
      document.getElementById('preview-expires').textContent = `📅 Válido hasta ${c.endDate || c.validity}`;
      document.getElementById('preview-min').textContent = `🛒 Pedido mínimo: ${c.minOrder || 'S/ 20.00'}`;
      const valEl = document.getElementById('preview-val');
      if (valEl) {
        valEl.textContent = '';
        const span = document.createElement('span');
        span.textContent = c.discountVal || 'S/ 5.00';
        valEl.appendChild(span);
        valEl.appendChild(document.createTextNode(' OFF'));
      }
      document.querySelector('.co-phone-mockup').scrollIntoView({ behavior: 'smooth' });
      showToast(`📱 Vista previa cargada para "${code}"`);
    }

    function toggleCouponStatus(rawCode) {
      const code = decodeURIComponent(rawCode || '');
      const current = serverCoupons.find(c => c.code === code);
      if (!current) return;
      const active = !current.active;
      saveServerCoupons(serverCoupons.map(c => (c.code === code ? { ...c, active } : c)),
        `Cupón "${code}" ${active ? 'reactivado' : 'pausado'}.`);
    }

    async function duplicateCoupon(rawCode) {
      const code = decodeURIComponent(rawCode || '');
      const current = serverCoupons.find(c => c.code === code);
      if (!current) return;
      let copyCode = `${code.slice(0, 24)}_COPIA`;
      for (let n = 2; serverCoupons.some(c => c.code === copyCode); n++) copyCode = `${code.slice(0, 22)}_COPIA${n}`;
      const copy = { ...current, code: copyCode, name: `${current.name} (copia)`.slice(0, 80), active: false };
      if (await saveServerCoupons([copy, ...serverCoupons], `📋 Cupón duplicado como "${copyCode}" (pausado).`)) editCoupon(encodeURIComponent(copyCode));
    }

    function deleteCoupon(rawCode) {
      const code = decodeURIComponent(rawCode || '');
      if (!confirm(`¿Estás seguro de eliminar el cupón "${code}"? Esta acción no se puede deshacer.`)) return;
      saveServerCoupons(serverCoupons.filter(c => c.code !== code), `🗑️ Cupón "${code}" eliminado.`);
    }

    let couponsFilterDebounceTimer = null;
    function filterCouponsTable() {
      clearTimeout(couponsFilterDebounceTimer);
      couponsFilterDebounceTimer = setTimeout(() => {
        const query = document.getElementById('co-search-table')?.value || '';
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(() => renderCoupons(query));
        } else {
          renderCoupons(query);
        }
      }, 100);
    }

    function filterTableByStatus(status) {
      document.getElementById('co-search-table').value = status;
      renderCoupons(status);
      document.getElementById('co-table-body').scrollIntoView({ behavior: 'smooth' });
      showToast(`Filtrando cupones con estado: ${status}`);
    }

    // Muestra solo los cupones activos que vencen en los próximos 3 días
    function filterTableExpiring() {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const inThree = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 3 * 86400000));
      document.getElementById('co-search-table').value = '';
      renderCoupons('', c => c.server && c.server.active && c.server.endDate && c.server.endDate >= today && c.server.endDate <= inThree);
      document.getElementById('co-table-body').scrollIntoView({ behavior: 'smooth' });
      showToast('Mostrando cupones que vencen en los próximos 3 días');
    }

    function applyRuleTemplate(template) {
      if (template === 'baja_demanda') {
        document.getElementById('form-code').value = 'DEMANDA15';
        document.getElementById('form-name').value = 'Alivio horario bajo 15% OFF';
        document.getElementById('form-discount-val').value = '15%';
        document.getElementById('form-benefit-type').value = 'percent';
        document.getElementById('form-min-order').value = 'S/ 25.00';
        document.getElementById('form-start-time').value = '15:00';
        document.getElementById('form-end-time').value = '18:00';
        setAudience('Todos');
        showToast('⚡ Plantilla de Baja Demanda aplicada al formulario');
      } else if (template === 'bienvenida') {
        document.getElementById('form-code').value = 'BIENVENIDO10';
        document.getElementById('form-name').value = 'Bienvenida nuevos usuarios';
        document.getElementById('form-discount-val').value = 'S/ 5.00';
        document.getElementById('form-benefit-type').value = 'fixed';
        document.getElementById('form-min-order').value = 'S/ 20.00';
        setAudience('Nuevos');
        showToast('👤 Plantilla de Cupón de Bienvenida aplicada');
      } else if (template === 'inactivos') {
        document.getElementById('form-code').value = 'TEEXTRAÑAMOS';
        document.getElementById('form-name').value = 'Vuelve a pedir con S/ 6 de descuento';
        document.getElementById('form-discount-val').value = 'S/ 6.00';
        document.getElementById('form-benefit-type').value = 'fixed';
        document.getElementById('form-min-order').value = 'S/ 25.00';
        setAudience('Inactivos');
        showToast('👥 Plantilla de Recuperación de Inactivos aplicada');
      }
      updateLivePreview();
      document.getElementById('form-card-container').scrollIntoView({ behavior: 'smooth' });
    }

    function saveWeekSchedule() {
      showToast('💾 Programación semanal sincronizada exitosamente con la App móvil');
    }

    function navigateWeek(dir) {
      showToast(dir > 0 ? 'Visualizando siguiente semana' : 'Visualizando semana anterior');
    }

    function openAddOfferModal(day, idx) {
      const rawName = prompt(`Agregar promoción para el ${day} (ej. "2x1 en Tequeños"):`);
      if (rawName && rawName.trim()) {
        const name = rawName.trim().replace(/[<>]/g, '').slice(0, 100);
        DETAILED_WEEK_SCHEDULE[idx].items.push({
          time: '18:00 - 22:00',
          title: name,
          status: 'Activa'
        });
        renderWeekPromos();
        showToast(`✅ Oferta agregada para ${day}`);
      }
    }

    function focusNewCouponForm() {
      // Switch tab to promos if not already active
      const promoBtn = document.querySelector('.nav-btn[data-tab="tab-promos"]');
      if (promoBtn) promoBtn.click();
      setTimeout(() => {
        const input = document.getElementById('form-code');
        if (input) {
          input.focus();
          document.getElementById('form-card-container').scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      showToast('🎯 Formulario de nueva campaña listo para configurar');
    }

    function handleGlobalSearch(e) {
      const val = e.target.value.trim();
      if (e.key === 'Enter' || val.length > 2) {
        const promoBtn = document.querySelector('.nav-btn[data-tab="tab-promos"]');
        if (promoBtn) promoBtn.click();
        const tableSearch = document.getElementById('co-search-table');
        if (tableSearch) {
          tableSearch.value = val;
          filterCouponsTable();
        }
      }
    }

    function toggleTableFilterMenu() {
      const current = document.getElementById('co-search-table').value;
      if (!current) {
        filterTableByStatus('Activo');
      } else {
        document.getElementById('co-search-table').value = '';
        renderCoupons('');
        showToast('Filtro restablecido (mostrando todos los cupones)');
      }
    }

    function sanitizeCsvCell(str) {
      const val = String(str ?? '');
      // Mitigación de CSV Formula Injection: si comienza con = + - @ prefijar con comilla simple
      const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
      return `"${safe.replace(/"/g, '""')}"`;
    }

    function exportCouponsCSV() {
      const headers = ['Codigo', 'Nombre', 'Estado', 'Vigencia', 'Horario', 'Segmento', 'Usos', 'Limite', 'Push'];
      const rows = DETAILED_COUPONS.map(c => [
        sanitizeCsvCell(c.code),
        sanitizeCsvCell(c.name),
        sanitizeCsvCell(c.status),
        sanitizeCsvCell(c.validity),
        sanitizeCsvCell(c.schedule),
        sanitizeCsvCell(c.segment),
        Number(c.uses || 0),
        Number(c.limit || 0),
        c.push ? 'Si' : 'No'
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retequenos-cupones-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📥 Cupones exportados en CSV exitosamente');
    }

    // Push Simulator Logic

window.renderCoupons = renderCoupons;
window.loadServerCoupons = loadServerCoupons;
window.renderWeekPromos = renderWeekPromos;
window.updateLivePreview = updateLivePreview;
window.handleBenefitTypeChange = handleBenefitTypeChange;
window.setAudience = setAudience;
window.generateAutoCode = generateAutoCode;
window.handleFormSubmit = handleFormSubmit;
window.handleSaveDraft = handleSaveDraft;
window.handleScheduleCoupon = handleScheduleCoupon;
window.editCoupon = editCoupon;
window.previewCouponInMockup = previewCouponInMockup;
window.toggleCouponStatus = toggleCouponStatus;
window.duplicateCoupon = duplicateCoupon;
window.deleteCoupon = deleteCoupon;
window.filterCouponsTable = filterCouponsTable;
window.filterTableByStatus = filterTableByStatus;
window.filterTableExpiring = filterTableExpiring;
window.applyRuleTemplate = applyRuleTemplate;
window.saveWeekSchedule = saveWeekSchedule;
window.navigateWeek = navigateWeek;
window.openAddOfferModal = openAddOfferModal;
window.focusNewCouponForm = focusNewCouponForm;
window.prepareSuggestedCoupon = function(coupon) {
  if (window.currentUser?.role !== 'admin') return;
  editingCouponCode = null;
  currentAudience = 'Todos';
  focusNewCouponForm();
  const today = new Date();
  const end = new Date(today.getTime() + (coupon.days - 1) * 86400000);
  const date = value => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
  let code = coupon.code, suffix = 2;
  while (DETAILED_COUPONS.some(item => item.code.toUpperCase() === code.toUpperCase())) code = coupon.code + suffix++;
  const fields = {
    'form-code': code, 'form-name': coupon.name, 'form-benefit-type': 'percent',
    'form-discount-val': `${coupon.percent}%`, 'form-min-order': `S/ ${coupon.minimum.toFixed(2)}`,
    'form-total-limit': coupon.limit, 'form-user-limit': 1, 'form-start-date': date(today),
    'form-end-date': date(end), 'form-start-time': '00:00', 'form-end-time': '23:59', 'form-status': 'Borrador'
  };
  Object.entries(fields).forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = value; });
  document.querySelectorAll('.co-audience-pill').forEach(button => button.classList.toggle('active', button.textContent.trim() === 'Todos'));
  document.querySelectorAll('input[name="days"]').forEach(input => input.checked = true);
  document.querySelectorAll('input[name="applyTo"]').forEach(input => input.checked = input.value === 'all');
  ['form-stackable', 'form-send-push', 'form-public-app'].forEach(id => { const input = document.getElementById(id); if (input) input.checked = false; });
  document.getElementById('form-coupon-title').textContent = 'Revisar propuesta basada en ventas';
  updateLivePreview();
  showToast('Propuesta preparada sin activar. Revisa costos, reglas y código antes de guardarla.');
};
window.handleGlobalSearch = handleGlobalSearch;
window.toggleTableFilterMenu = toggleTableFilterMenu;
window.exportCouponsCSV = exportCouponsCSV;
