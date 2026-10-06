const assert = require('node:assert/strict');
const { buildReport, exportReport, dateParts } = require('./reports');
const catalog = [{ id: 'a', name: 'Clásicos', cat: 'Tequeños', stock: true }, { id: 'b', name: 'Bebida', cat: 'Bebidas', stock: true }];
const sold = Array.from({ length: 5 }, (_, index) => ({
  id: `S${index}`, createdAt: `2026-10-0${index + 1}T18:00:00Z`, status: 'delivered',
  customer: '=HYPERLINK("test")', channel: 'caja', payMethod: 'Yape', payVerified: index !== 0,
  subtotal: 25, discount: 2, deliveryFee: 5, total: 28, customField: 'Preservar dato',
  items: [{ productId: 'a', name: 'Clásicos', qty: 2, price: 10 }, { productId: 'b', name: 'Bebida', qty: 1, price: 5 }]
}));
const orders = [...sold,
  { id: 'P', createdAt: '2026-10-03T18:00:00Z', status: 'new', total: 12.10, payVerified: true },
  { id: 'X', createdAt: '2026-10-03T18:00:00Z', status: 'cancelled', total: 999, payVerified: true },
  { id: 'U', status: 'delivered', subtotal: 0.20, total: 0.20, payVerified: true, items: [] }
];
const report = buildReport(orders, catalog);
assert.equal(report.summary.salesTotal, 140.20);
assert.equal(report.summary.confirmedPayments, 124.30);
assert.equal(report.summary.pendingOrdersValue, 12.10);
assert.equal(report.summary.deliveredUnverified, 28);
assert.equal(report.summary.undatedOrders, 1);
assert.equal(report.summary.cancelled, 1);
assert.equal(report.orders.length, 6);
assert.equal(report.products[0].units, 10);
assert.equal(report.products[0].grossSales, 100);
assert.equal(report.pairs[0].orders, 5);
assert.equal(report.daily.reduce((sum, point) => sum + point.orders, 0), 5);
assert.ok(report.suggestions.some(item => item.title === 'Probar un combo con demanda observada'));
assert.equal(report.suggestions.find(item => item.coupon).coupon.minimum, 25);
assert.equal(dateParts('2026-10-04T02:00:00Z').day, '2026-10-03');
const filtered = buildReport(orders, catalog, new URLSearchParams({ from: '2026-10-03', to: '2026-10-03', undated: 'false', records: 'all' }));
assert.equal(filtered.summary.salesTotal, 28);
assert.equal(filtered.orders.length, 3);
assert.equal(filtered.summary.undatedOrders, 0);
assert.equal(buildReport(orders, catalog, new URLSearchParams({ channel: 'caja' })).summary.delivered, 5);
assert.throws(() => buildReport(orders, catalog, new URLSearchParams({ from: '2026-02-30' })));
assert.throws(() => buildReport(orders, catalog, new URLSearchParams({ from: '2026-10-04', to: '2026-10-03' })));
const sparse = buildReport(sold.slice(0, 2), catalog);
assert.ok(!sparse.suggestions.some(item => item.coupon));
assert.ok(sparse.suggestions.some(item => item.title === 'Experimentar con dos favoritos'));
const unavailable = buildReport(sold, catalog.map(item => ({ ...item, stock: false })));
assert.ok(!unavailable.suggestions.some(item => item.type === 'combo'));
const duplicate = buildReport([{ ...sold[0], items: [...sold[0].items, sold[0].items[0]] }], catalog);
assert.equal(duplicate.pairs[0].orders, 1);
assert.equal(duplicate.products[0].orders, 1);
assert.ok(!buildReport(orders.filter(item => item.status !== 'delivered'), catalog).suggestions.some(item => item.coupon || item.type === 'combo'));
const csv = exportReport(report, 'orders');
assert.ok(csv.startsWith('\uFEFF'));
assert.ok(csv.includes("'="), 'Evitar fórmulas al abrir campos del cliente en una hoja de cálculo');
assert.ok(csv.includes('Preservar dato'));
assert.ok(exportReport(report, 'details').includes('no sumar en detalle'));
assert.ok(exportReport(report, 'metrics').includes('Sugerencias'));
assert.equal(JSON.parse(exportReport(report, 'json')).orders.find(item => item.id === 'S0').customField, 'Preservar dato');
assert.throws(() => exportReport(report, 'invalid'));
console.log('Reportes: totales, fechas Perú, filtros, combinaciones, cupones y exportación completa: PASS');
