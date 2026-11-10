// Estados de un pedido. Los cuatro del KDS no cambian de significado.
// `pending_confirmation`: pedido de la web que caja todavía no confirmó por WhatsApp.
// `cancelled`: pedido anulado; queda en el historial, fuera de ventas y del KDS.
const ORDER_STATUSES = ['pending_confirmation', 'new', 'kitchen', 'delivery', 'delivered', 'cancelled'];

// Cambios que puede hacer caja; el administrador puede corregir cualquier estado
function cashierNextStatuses(order) {
  return {
    pending_confirmation: ['new', 'cancelled'],
    new: ['kitchen'],
    kitchen: order.mode === 'pickup' ? ['delivered'] : ['delivery'],
    delivery: ['delivered'],
    delivered: [],
    cancelled: [],
  }[order.status] || [];
}

module.exports = { ORDER_STATUSES, cashierNextStatuses };
