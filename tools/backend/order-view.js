// Vista de un pedido sin datos personales: seguimiento público (RFI-09) e historial del cliente (RFI-10).
// Nunca incluye nombre, celular, dirección, referencia, GPS ni datos del motorizado (RNF-03).
function publicOrderView(order) {
  return {
    id: order.id,
    status: order.status,
    mode: order.mode,
    time: order.time,
    elapsedMinutes: order.elapsedMinutes,
    channel: order.channel,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    payMethod: order.payMethod,
    payVerified: order.payVerified,
    createdAt: order.createdAt,
    scheduledFor: order.scheduledFor || null,
    statusAt: order.statusAt || {},
    hasReceipt: Boolean(order.receipt),
    driverAssigned: Boolean(order.dispatch && ['assigned', 'manual'].includes(order.dispatch.status)),
    items: (order.items || []).map(item => ({ name: item.name, qty: item.qty, price: item.price, sauces: item.sauces, ...(item.spec ? { spec: item.spec } : {}) })),
  };
}

// Lo que ve el personal: todo menos el hash del token de acceso del cliente y el del despacho
function staffOrderView(order) {
  if (!order) return order;
  const { accessTokenHash, ...rest } = order;
  if (rest.dispatch && rest.dispatch.takeTokenHash) rest.dispatch = { ...rest.dispatch, takeTokenHash: undefined };
  return rest;
}

module.exports = { publicOrderView, staffOrderView };
