// ===================================================
// DATA: ANALYTICS, ORIGEN PUBLICIDAD, ENCUESTAS Y RESEÑAS
// ===================================================

const TOP_PRODUCTS = {
      hoy: [
        { icon: '🏷️', name: 'Promo Duo (20 unid. + 2 gaseosas)', orders: 48, sales: 1723.20 },
        { icon: '🧀', name: 'Tequeños de Queso (10 unid.)', orders: 32, sales: 512.00 },
        { icon: '🥓', name: 'Tequeños Jamón y Queso (10 unid.)', orders: 19, sales: 304.00 },
        { icon: '🍫', name: 'Tequeños de Chocolate (10 unid.)', orders: 14, sales: 238.00 },
        { icon: '🍕', name: 'Pizza La Hawaiana (35 cm)', orders: 9, sales: 333.00 }
      ],
      mes: [
        { icon: '🏷️', name: 'Promo Duo (20 unid. + 2 gaseosas)', orders: 612, sales: 21970.80 },
        { icon: '🧀', name: 'Tequeños de Queso (10 unid.)', orders: 498, sales: 7968.00 },
        { icon: '🍱', name: 'Promo Familiar (40 unid. + gaseosa 2 L)', orders: 231, sales: 14760.90 },
        { icon: '🍕', name: 'Promo Tequepizza (pizza + 5 tequeños)', orders: 187, sales: 8209.30 },
        { icon: '🥓', name: 'Tequeños Jamón y Queso (10 unid.)', orders: 176, sales: 2816.00 }
      ]
    };;

// Origen de la publicidad: se llenará con las respuestas reales de la encuesta
const ATTRIBUTION = [];;

let SURVEYS = [
      { id: 'SV-2026-08', title: '¿Cómo estuvo tu pedido?', until: '2026-09-30', reward: 3, couponCode: 'ENCUESTA3', couponUntil: '2026-09-30', google: true, responses: 34, coupons: 31, active: true, link: 'retequenos.com/encuesta/ago-2026' }
    ];;

let REVIEWS = [
      { date: '16/09 20:41', order: 'RTQ-2046', customer: 'Gonzalo P.', stars: 5, source: 'Facebook / Instagram', improve: [], comment: 'Llegó calientito y la mayopalta es lo máximo.', coupon: 'ENCUESTA3', google: true },
      { date: '16/09 19:55', order: 'RTQ-2044', customer: 'Karina M.', stars: 4, source: 'TikTok', improve: ['Cremas'], comment: 'Las cremas vinieron un poco escasas para 20 tequeños.', coupon: 'ENCUESTA3', google: true },
      { date: '15/09 21:10', order: 'RTQ-2031', customer: 'Luis A.', stars: 3, source: 'Recomendación', improve: ['Tiempo de entrega'], comment: 'Demoró 50 min por la lluvia, pero el sabor bien.', coupon: 'ENCUESTA3', google: false },
      { date: '15/09 20:02', order: 'RTQ-2027', customer: 'Fiorella C.', stars: 5, source: 'Pasé por el local', improve: [], comment: 'La atención del mesero excelente, volveré.', coupon: 'ENCUESTA3', google: true },
      { date: '14/09 19:30', order: 'RTQ-2012', customer: 'Renzo V.', stars: 4, source: 'Facebook / Instagram', improve: ['Atención'], comment: 'Buen combo, la respuesta por WhatsApp tardó un poco.', coupon: 'ENCUESTA3', google: true },
      { date: '14/09 18:45', order: 'RTQ-2009', customer: 'Camila R.', stars: 5, source: 'TikTok', improve: [], comment: 'Vi el video del queso derretido y era igualito 😍', coupon: 'ENCUESTA3', google: true },
      { date: '13/09 21:20', order: 'RTQ-1998', customer: 'Jorge T.', stars: 2, source: 'Google', improve: ['Temperatura', 'Empaque'], comment: 'Llegaron tibios y la caja un poco aplastada.', coupon: 'ENCUESTA3', google: false }
    ];;

window.TOP_PRODUCTS = TOP_PRODUCTS;
window.ATTRIBUTION = ATTRIBUTION;
window.SURVEYS = SURVEYS;
window.REVIEWS = REVIEWS;
