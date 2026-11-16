// ===================================================
// DATA: CUPONES Y OFERTAS PROGRAMADAS
// ===================================================

const DEFAULT_COUPONS = [
      { code: 'ENCUESTA3', type: 'fixed', val: 3, min: 15, uses: 31, limit: 999, active: true, expires: '2026-09-30', label: 'S/ 3.00 OFF por completar la encuesta post-pedido' },
      { code: 'MARTESRETQ', type: 'percent', val: 20, min: 25, uses: 142, limit: 200, active: true, expires: '', label: '20% OFF Martes de Retequeños' },
      { code: 'BIENVENIDO', type: 'fixed', val: 5, min: 20, uses: 89, limit: 999, active: true, expires: '', label: 'S/ 5.00 OFF Primera compra' },
      { code: 'ENVIOGRATIS', type: 'shipping', val: 5.90, min: 35, uses: 45, limit: 100, active: true, expires: '2026-09-30', label: 'Delivery gratis en pedidos > S/ 35' }
    ];;

const WEEK_PROMOS = [
      { day: 'Lun', name: 'Lunes', promo: 'Envío Gratis > S/30', active: true },
      { day: 'Mar', name: 'Martes', promo: 'Martes de Retequeños (20% OFF)', active: true },
      { day: 'Mié', name: 'Miércoles', promo: '2x1 en Refrescos', active: false },
      { day: 'Jue', name: 'Jueves', promo: '30% OFF Tequeños de Chocolate', active: true },
      { day: 'Vie', name: 'Viernes', promo: 'Promo Familiar Especial', active: true },
      { day: 'Sáb', name: 'Sábado', promo: 'After-Work Retequeño', active: true },
      { day: 'Dom', name: 'Domingo', promo: 'Delivery S/ 2.90', active: false }
    ];;

const DEFAULT_DETAILED_COUPONS = [
      {
        code: 'BIENVENIDO10',
        name: 'S/ 5 OFF en tu primera compra',
        status: 'Activo',
        validity: '01 - 30 Oct 2025',
        schedule: 'Todo el día',
        segment: 'Nuevos',
        uses: 281,
        limit: 999,
        push: true,
        discountVal: 'S/ 5.00',
        benefitType: 'fixed',
        minOrder: 'S/ 20.00',
        startDate: '01/10/2025',
        endDate: '30/10/2025',
        startTime: '00:00',
        endTime: '23:59',
        days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
        badge: '¡BIENVENIDO!'
      },
      {
        code: 'MARTESRETQ',
        name: '20% OFF todos los martes',
        status: 'Activo',
        validity: '01 Oct - 31 Dic 2025',
        schedule: 'Todo el día',
        segment: 'Todos',
        uses: 342,
        limit: 2000,
        push: true,
        discountVal: '20%',
        benefitType: 'percent',
        minOrder: 'S/ 25.00',
        startDate: '01/10/2025',
        endDate: '31/12/2025',
        startTime: '00:00',
        endTime: '23:59',
        days: ['Mar'],
        badge: 'MARTES RETEQUEÑOS'
      },
      {
        code: 'ENCUESTA3',
        name: 'S/ 3 OFF por encuesta',
        status: 'Programado',
        validity: '01 - 31 Oct 2025',
        schedule: '12:00 - 18:00',
        segment: 'Todos',
        uses: 0,
        limit: 999,
        push: true,
        discountVal: 'S/ 3.00',
        benefitType: 'fixed',
        minOrder: 'S/ 15.00',
        startDate: '01/10/2025',
        endDate: '31/10/2025',
        startTime: '12:00',
        endTime: '18:00',
        days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        badge: 'ENCUESTA'
      },
      {
        code: 'ENVIOGRATIS',
        name: 'Delivery gratis en pedidos > S/ 35',
        status: 'Activo',
        validity: '01 - 30 Oct 2025',
        schedule: 'Todo el día',
        segment: 'Todos',
        uses: 198,
        limit: 1000,
        push: false,
        discountVal: 'Envío Gratis',
        benefitType: 'shipping',
        minOrder: 'S/ 35.00',
        startDate: '01/10/2025',
        endDate: '30/10/2025',
        startTime: '00:00',
        endTime: '23:59',
        days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        badge: 'ENVÍO GRATIS'
      },
      {
        code: 'AFTERWORK',
        name: 'Happy Hour 2x1 en bebidas',
        status: 'Pausado',
        validity: '01 Oct - 30 Nov 2025',
        schedule: '18:00 - 21:00',
        segment: 'Frecuentes',
        uses: 54,
        limit: 500,
        push: true,
        discountVal: '2x1',
        benefitType: 'bogo',
        minOrder: 'S/ 20.00',
        startDate: '01/10/2025',
        endDate: '30/11/2025',
        startTime: '18:00',
        endTime: '21:00',
        days: ['Mié', 'Vie', 'Sáb'],
        badge: 'AFTER WORK'
      }
    ];;

let DETAILED_WEEK_SCHEDULE = [
      {
        day: 'LUNES',
        date: '29 Sep',
        items: [
          { time: '12:00 - 15:00', title: 'Almuerzo 15% OFF', status: 'Activa' },
          { time: '18:00 - 21:00', title: 'Happy Hour', status: 'Activa' }
        ],
        allowAdd: false
      },
      {
        day: 'MARTES',
        date: '30 Sep',
        items: [
          { time: 'Todo el día', title: 'Martes de Retequeños', status: 'Activa' }
        ],
        allowAdd: true
      },
      {
        day: 'MIÉRCOLES',
        date: '1 Oct',
        items: [
          { time: '12:00 - 15:00', title: '2x1 en refrescos', status: 'Programada' },
          { time: '20:00 - 23:00', title: 'After Work', status: 'Programada' }
        ],
        allowAdd: false
      },
      {
        day: 'JUEVES',
        date: '2 Oct',
        items: [
          { time: '12:00 - 15:00', title: 'Promo de Chocolate', status: 'Activa' }
        ],
        allowAdd: true
      },
      {
        day: 'VIERNES',
        date: '3 Oct',
        items: [
          { time: '18:00 - 22:00', title: 'Happy Hour', status: 'Activa' }
        ],
        allowAdd: false
      },
      {
        day: 'SÁBADO',
        date: '4 Oct',
        items: [
          { time: 'Todo el día', title: 'Envío Gratis', status: 'Programada' }
        ],
        allowAdd: false
      },
      {
        day: 'DOMINGO',
        date: '5 Oct',
        items: [],
        allowAdd: true
      }
    ];;

let currentAudience = 'Todos';
let editingCouponCode = null;

// Cargar cupones de localStorage si existen
let savedCoupons = null;
let savedDetailedCoupons = null;
try {
  const c = localStorage.getItem('RTQ_ADMIN_COUPONS');
  if (c) savedCoupons = JSON.parse(c);
  const dc = localStorage.getItem('RTQ_ADMIN_DETAILED_COUPONS');
  if (dc) savedDetailedCoupons = JSON.parse(dc);
} catch (e) {
  console.warn('[Coupons Data] Error al leer localStorage:', e);
}

let COUPONS = (Array.isArray(savedCoupons) && savedCoupons.length > 0) ? savedCoupons : DEFAULT_COUPONS;
// Los cupones reales los carga el panel desde el servidor (loadServerCoupons); no hay ejemplos ni copia local
let DETAILED_COUPONS = [];
try { localStorage.removeItem('RTQ_ADMIN_DETAILED_COUPONS'); } catch (e) {}

function saveCouponsData() {
  try {
    localStorage.setItem('RTQ_ADMIN_COUPONS', JSON.stringify(COUPONS));
  } catch (e) {
    console.error('[Coupons Data] Error al guardar en localStorage:', e);
  }
}

window.COUPONS = COUPONS;
window.WEEK_PROMOS = WEEK_PROMOS;
window.DETAILED_COUPONS = DETAILED_COUPONS;
window.DETAILED_WEEK_SCHEDULE = DETAILED_WEEK_SCHEDULE;
window.currentAudience = currentAudience;
window.editingCouponCode = editingCouponCode;
window.saveCouponsData = saveCouponsData;

