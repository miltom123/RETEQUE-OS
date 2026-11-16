/**
 * Despacho al motorizado (RFI-14):
 *   POST /api/pedidos/:id/dispatch   (personal) { driverId?, manual? } ofrece al grupo o asigna directo
 *   GET  /api/dispatch/take?o=&t=     página donde el motorizado toma el pedido con su celular
 *   POST /api/dispatch/take          { o, t, phone }
 *   GET  /api/internal/dispatch/:id  (n8n, cabecera x-rtq-token) ¿alguien tomó el pedido?
 *   GET|PUT /api/drivers             (administrador) motorizados y minutos para alertar
 */
const { readJsonBody, sendJson } = require('../http');
const { cleanId } = require('../sanitize');
const { canAccessOrder } = require('../auth');
const { activeDrivers, alertMinutes, normalizeDrivers } = require('../dispatch');
const { staffOrderView } = require('../order-view');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

function takePage(orderId) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tomar pedido ${escapeHtml(orderId)}</title>
<style>body{font-family:system-ui,sans-serif;background:#FFF8EE;margin:0;padding:24px;color:#242424}main{max-width:380px;margin:auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px #0001}
input,button{width:100%;box-sizing:border-box;font-size:16px;padding:12px;border-radius:10px;margin-top:10px}input{border:1px solid #DDD}button{border:0;background:#FF3038;color:#fff;font-weight:700}#msg{margin-top:14px;font-weight:600}</style></head>
<body><main><h1 style="font-size:20px">🛵 Pedido ${escapeHtml(orderId)}</h1>
<p>Escribe tu celular registrado como motorizado para tomar este pedido. Te llegará la comanda completa por WhatsApp.</p>
<form id="f"><label for="p">Tu celular</label><input id="p" inputmode="numeric" maxlength="11" required placeholder="9XXXXXXXX"><button>Tomar pedido</button></form>
<p id="msg" role="status"></p></main>
<script>
const q=new URLSearchParams(location.search);
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('msg');m.textContent='Enviando…';
try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({o:q.get('o'),t:q.get('t'),phone:document.getElementById('p').value})});
const d=await r.json();m.style.color=r.ok?'#13A24D':'#C81E1E';m.textContent=r.ok?'¡Listo! El pedido es tuyo, revisa tu WhatsApp.':d.error;if(r.ok)e.target.remove();}catch(_){m.textContent='Sin conexión. Inténtalo otra vez.';}};
</script></body></html>`;
}

async function handleDispatch({ req, res, pathname, parsedUrl, currentUser }, deps) {
  const { repos, dispatcher, checkTakeLimit } = deps;

  const match = pathname.match(/^\/api\/pedidos\/([^/]+)\/dispatch$/);
  if (match && req.method === 'POST') {
    if (!currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
    const order = await repos.orders.getById(cleanId(match[1]));
    if (!order) return sendJson(res, 404, { error: 'Pedido no encontrado.' });
    if (!canAccessOrder(currentUser, order)) return sendJson(res, 403, { error: 'Caja solo puede gestionar pedidos del día.' });
    if (order.mode !== 'delivery' || !['kitchen', 'delivery'].includes(order.status)) return sendJson(res, 400, { error: 'Solo se despachan pedidos de delivery en cocina o en reparto.' });
    let body;
    try { body = await readJsonBody(req, 4 * 1024); } catch { return sendJson(res, 400, { error: 'Datos inválidos.' }); }
    let updated;
    if (body.driverId) {
      const driver = activeDrivers(await repos.config.get()).find(d => d.id === cleanId(String(body.driverId)));
      if (!driver) return sendJson(res, 400, { error: 'Elige un motorizado activo.' });
      updated = await dispatcher.assign(order, driver, { manual: body.manual === true });
    } else {
      updated = await dispatcher.offer(order);
    }
    return sendJson(res, 200, { ok: true, order: staffOrderView(updated) });
  }

  if (pathname === '/api/dispatch/take') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
      res.end(takePage(cleanId(parsedUrl.searchParams.get('o') || '')));
      return true;
    }
    if (req.method === 'POST') {
      const limit = checkTakeLimit(req.socket.remoteAddress || 'unknown');
      if (!limit.allowed) return sendJson(res, 429, { error: limit.error });
      let body;
      try { body = await readJsonBody(req, 2 * 1024); } catch { return sendJson(res, 400, { error: 'Datos inválidos.' }); }
      const result = await dispatcher.take(cleanId(String(body.o || '')), String(body.t || ''), body.phone);
      return sendJson(res, result.ok ? 200 : 400, result.ok ? { ok: true, orderId: result.order.id, driver: result.driver.name } : { error: result.error });
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }

  const internal = pathname.match(/^\/api\/internal\/dispatch\/([^/]+)$/);
  if (internal && req.method === 'GET') {
    if (!dispatcher.isServiceRequest(req)) return sendJson(res, 401, { error: 'Token de servicio inválido.' });
    const order = await repos.orders.getById(cleanId(internal[1]));
    if (!order) return sendJson(res, 404, { error: 'Pedido no encontrado.' });
    const dispatch = order.dispatch || {};
    return sendJson(res, 200, {
      orderId: order.id,
      orderStatus: order.status,
      dispatchStatus: dispatch.status || null,
      assigned: ['assigned', 'manual'].includes(dispatch.status),
      driverName: dispatch.driverName || null,
      alertAfterMinutes: alertMinutes(await repos.config.get()),
    });
  }

  if (pathname === '/api/drivers') {
    // Ver: todo el personal (para asignar). Cambiar: solo administrador, regla en app.js
    if (!currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
    if (req.method === 'GET') {
      const config = (await repos.config.get()) || {};
      return sendJson(res, 200, { drivers: config.drivers || [], dispatchAlertMinutes: alertMinutes(config), n8nConfigured: dispatcher.configured });
    }
    if (req.method === 'PUT') {
      try {
        const body = await readJsonBody(req, 16 * 1024);
        const patch = { drivers: normalizeDrivers(body.drivers) };
        if (body.dispatchAlertMinutes !== undefined) {
          const minutes = Number(body.dispatchAlertMinutes);
          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) throw new Error('Los minutos para alertar deben ser de 1 a 60.');
          patch.dispatchAlertMinutes = minutes;
        }
        const config = await repos.config.update(patch);
        return sendJson(res, 200, { ok: true, drivers: config.drivers, dispatchAlertMinutes: alertMinutes(config) });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }

  return false;
}

module.exports = { handleDispatch };
