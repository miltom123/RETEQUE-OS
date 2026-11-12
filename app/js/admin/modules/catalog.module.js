// ===================================================
// MODULE: GESTION DE CARTA, PRECIOS & STOCK
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

    let catalogFilterQuery = '';
    let catalogFilterDebounceTimer = null;
    function filterCatalogTable(val) {
      catalogFilterQuery = (val || '').toLowerCase().trim();
      clearTimeout(catalogFilterDebounceTimer);
      catalogFilterDebounceTimer = setTimeout(() => {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(renderCatalog);
        } else {
          renderCatalog();
        }
      }, 100);
    }

    function renderCatalog() {
      const tbody = document.getElementById('catalog-table-body');
      if (!tbody) return;

      const filtered = CATALOG.filter(p => {
        if (!catalogFilterQuery) return true;
        return (p.name + ' ' + p.cat + ' ' + p.id + ' ' + (p.desc || '')).toLowerCase().includes(catalogFilterQuery);
      });

      // Update table subtitle counter
      const counterEl = document.querySelector('#tab-catalog .table-toolbar strong');
      if (counterEl) {
        counterEl.textContent = `${CATALOG.length} productos activos`;
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">
              No se encontraron productos que coincidan con "<strong>${escapeHtml(catalogFilterQuery)}</strong>".
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(prod => {
        let badgeHtml = '';
        if (prod.badge === 'MÁS VENDIDO') badgeHtml = '<span class="col-badge badge-orange" style="margin-left:6px;font-size:10px;">⭐ Top</span>';
        if (prod.badge === 'NUEVO') badgeHtml = '<span class="col-badge badge-green" style="margin-left:6px;font-size:10px;">🔥 Nuevo</span>';
        if (prod.badge === 'RECOMENDADO') badgeHtml = '<span class="col-badge badge-purple" style="margin-left:6px;font-size:10px;">👑 Chef</span>';
        if (prod.badge === 'PROMO') badgeHtml = '<span class="col-badge badge-blue" style="margin-left:6px;font-size:10px;">🏷️ Promo</span>';

        const cleanId = encodeURIComponent(String(prod.id || ''));
        const safeName = escapeHtml(prod.name || '');
        const safeCat = escapeHtml(prod.cat || 'Clásicos');
        const safeQty = escapeHtml(prod.qty || 'Porción estándar');
        const safeId = escapeHtml(prod.id || '');
        const safeSauces = escapeHtml(prod.sauces || '');
        const safeIcon = escapeHtml(prod.icon || '🥟');
        const numPrice = Number(prod.price) || 0;
        const numPromo = prod.promo ? Number(prod.promo) : null;

        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-size:22px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:var(--surface-subtle); border-radius:8px; border:1px solid var(--border); flex:none;">
                  ${safeIcon}
                </div>
                <div>
                  <div style="font-weight:700; font-size:13.5px; display:flex; align-items:center;">
                    ${safeName} ${badgeHtml}
                  </div>
                  <div style="font-size:11.5px; color:var(--text-muted);">
                    ${safeQty} · <span style="font-family:monospace; color:var(--text-light);">ID: ${safeId}</span>
                  </div>
                </div>
              </div>
            </td>
            <td><span class="col-badge badge-blue">${safeCat}</span></td>
            <td style="font-weight:600;">S/ ${numPrice.toFixed(2)}</td>
            <td>
              ${numPromo ? `<span style="color:var(--primary);font-weight:800;background:var(--primary-light);padding:2px 6px;border-radius:4px;">S/ ${numPromo.toFixed(2)}</span>` : '<span style="color:var(--text-light)">—</span>'}
            </td>
            <td style="font-size:12px; color:var(--text-muted);">${safeSauces}</td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <label class="switch">
                  <input type="checkbox" ${prod.stock ? 'checked' : ''} onchange="toggleStock('${cleanId}', this.checked)">
                  <span class="slider"></span>
                </label>
                <span style="font-size:11.5px; font-weight:600; color:${prod.stock ? 'var(--success)' : 'var(--danger)'}">
                  ${prod.stock ? 'En Stock' : 'Agotado'}
                </span>
              </div>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-outline btn-sm" onclick="openNewProductModal('${cleanId}')" title="Editar detalles de producto">
                  ✏️ Editar
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // RFI-15: todo cambio de la carta se guarda primero en el servidor; si falla, la tabla no cambia
    async function catalogApi(url, options) {
      const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (res.status === 401) { window.lockAdminApp(); throw new Error('Tu sesión venció. Ingresa de nuevo.'); }
      if (res.status === 403) throw new Error('Solo el administrador puede cambiar la carta.');
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio.');
      return data;
    }

    function replaceProduct(saved) {
      const idx = CATALOG.findIndex(p => p.id === saved.id);
      if (idx > -1) CATALOG[idx] = saved; else CATALOG.unshift(saved);
      if (window.saveCatalogData) window.saveCatalogData();
      renderCatalog();
    }

    async function toggleStock(id, inStock) {
      const prod = CATALOG.find(p => p.id === id);
      if (!prod) return;
      try {
        const data = await catalogApi(`/api/catalog/${encodeURIComponent(id)}/stock`, { method: 'PATCH', body: JSON.stringify({ stock: inStock }) });
        replaceProduct(data.product);
        showToast(`Stock de "${prod.name}" actualizado a ${inStock ? 'DISPONIBLE' : 'AGOTADO'}`);
      } catch (error) {
        renderCatalog(); // devuelve el interruptor a su estado real
        showToast('⚠️ ' + error.message);
      }
    }

    // Modal Operations for Products
    function openNewProductModal(editId = null) {
      const form = document.getElementById('product-form');
      if (!form) return;
      form.reset();

      const modalTitle = document.getElementById('mod-product-title');
      const editIdInput = document.getElementById('prod-edit-id');
      const deleteBtn = document.getElementById('btn-delete-product');

      if (editId) {
        const prod = CATALOG.find(p => p.id === editId);
        if (!prod) return;

        modalTitle.textContent = `Editar Producto: ${prod.name}`;
        editIdInput.value = prod.id;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-cat').value = prod.cat;
        document.getElementById('prod-qty').value = prod.qty || '10 unidades';
        document.getElementById('prod-price').value = prod.price;
        document.getElementById('prod-promo').value = prod.promo || '';
        document.getElementById('prod-sauces').value = prod.sauces;
        document.getElementById('prod-badge').value = prod.badge || '';
        document.getElementById('prod-desc').value = prod.desc || '';
        document.getElementById('prod-stock').checked = !!prod.stock;

        selectProductIcon(prod.icon || '🥟');
        deleteBtn.style.display = 'inline-flex';
      } else {
        modalTitle.textContent = '+ Agregar Nuevo Producto al Menú';
        editIdInput.value = '';
        document.getElementById('prod-qty').value = '10 unidades';
        document.getElementById('prod-price').value = '16.00';
        document.getElementById('prod-promo').value = '';
        document.getElementById('prod-stock').checked = true;
        selectProductIcon('🥟');
        deleteBtn.style.display = 'none';
      }

      document.getElementById('modal-new-product').classList.add('open');
    }

    function closeProductModal() {
      const modal = document.getElementById('modal-new-product');
      if (modal) modal.classList.remove('open');
    }

    function selectProductIcon(emoji) {
      document.getElementById('prod-icon').value = emoji;
      document.querySelectorAll('#emoji-picker .emoji-btn').forEach(btn => {
        if (btn.getAttribute('data-emoji') === emoji) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    }

    async function handleSaveProduct(e) {
      e.preventDefault();
      const editId = document.getElementById('prod-edit-id').value;
      const name = document.getElementById('prod-name').value.trim();
      const cat = document.getElementById('prod-cat').value;
      const qty = document.getElementById('prod-qty').value.trim();
      const price = parseFloat(document.getElementById('prod-price').value) || 0;
      const promoRaw = document.getElementById('prod-promo').value;
      const promo = promoRaw ? parseFloat(promoRaw) : null;
      const sauces = document.getElementById('prod-sauces').value;
      const badge = document.getElementById('prod-badge').value;
      const desc = document.getElementById('prod-desc').value.trim();
      const icon = document.getElementById('prod-icon').value || '🥟';
      const stock = document.getElementById('prod-stock').checked;

      if (!name || price <= 0) {
        showToast('⚠️ Por favor completa el nombre y un precio válido.');
        return;
      }

      const base = editId ? CATALOG.find(p => p.id === editId) : null;
      const product = {
        ...(base || {}),
        id: editId || name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 20) + '_' + Math.floor(100 + Math.random() * 900),
        name, cat, qty, price, promo, sauces, badge, desc, icon, stock
      };
      const submit = document.querySelector('#product-form button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        const data = await catalogApi('/api/catalog', { method: 'POST', body: JSON.stringify(product) });
        replaceProduct(data.product);
        playAlertSound();
        closeProductModal();
        showToast(editId ? `✅ Producto "${data.product.name}" actualizado.` : `🎉 "${data.product.name}" agregado a la carta.`);
      } catch (error) {
        showToast('⚠️ ' + error.message);
      } finally {
        if (submit) submit.disabled = false;
      }
    }

    async function handleDeleteProduct() {
      const editId = document.getElementById('prod-edit-id').value;
      if (!editId) return;

      const prod = CATALOG.find(p => p.id === editId);
      const name = prod ? prod.name : 'el producto';

      if (!confirm(`¿Estás seguro de eliminar "${name}" del menú? Esta acción no se puede deshacer.`)) return;
      try {
        await catalogApi(`/api/catalog/${encodeURIComponent(editId)}`, { method: 'DELETE' });
        CATALOG = CATALOG.filter(p => p.id !== editId);
        window.CATALOG = CATALOG;
        if (window.saveCatalogData) window.saveCatalogData();
        renderCatalog();
        closeProductModal();
        showToast(`🗑️ "${name}" ha sido eliminado del catálogo.`);
      } catch (error) { showToast('⚠️ ' + error.message); }
    }

window.filterCatalogTable = filterCatalogTable;
window.renderCatalog = renderCatalog;
window.toggleStock = toggleStock;
window.openNewProductModal = openNewProductModal;
window.closeProductModal = closeProductModal;
window.selectProductIcon = selectProductIcon;
window.handleSaveProduct = handleSaveProduct;
window.handleDeleteProduct = handleDeleteProduct;

// Cargar catálogo oficial del servidor al iniciar
(async function initCatalogSync() {
  try {
    const res = await fetch('/api/catalog');
    if (res.ok) {
      const remote = await res.json();
      if (Array.isArray(remote) && remote.length > 0) {
        window.CATALOG = remote;
        renderCatalog();
      }
    }
  } catch (e) {}
})();
