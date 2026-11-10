const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB_SRC = path.join(ROOT, 'web', 'src');

console.log('--- INICIANDO VERIFICACIÓN DEL FRONTEND MÓVIL (PLAN_IMPLEMENTACION) ---');

// 1. Verificar que NO existen llamadas a syncOrderToKDS en web/src
console.log('\n[1/4] Verificando ausencia de syncOrderToKDS en checkout público...');
function checkNoSyncOrder(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkNoSyncOrder(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (file !== 'orderSync.ts') {
        assert(!content.includes('syncOrderToKDS('), `Encontrada llamada a syncOrderToKDS en ${fullPath}`);
      }
    }
  }
}
checkNoSyncOrder(WEB_SRC);
console.log('  ✓ [PASS] Cero llamadas a syncOrderToKDS() en todo web/src');

// 2. Verificar existencia de componentes y páginas móviles
console.log('\n[2/4] Verificando estructura modular de componentes móviles...');
const requiredFiles = [
  'types/product.ts',
  'types/cart.ts',
  'types/orderRequest.ts',
  'services/catalog.api.ts',
  'store/favoritesStore.ts',
  'mobile/layouts/MobileLayout.tsx',
  'mobile/components/MobileHeader.tsx',
  'mobile/components/BottomNavigation.tsx',
  'mobile/components/ProductCard.tsx',
  'mobile/components/ProductConfigurator.tsx',
  'mobile/components/CartItem.tsx',
  'mobile/components/CustomerForm.tsx',
  'mobile/components/FulfillmentSelector.tsx',
  'mobile/components/OrderSummary.tsx',
  'mobile/pages/HomePage.tsx',
  'mobile/pages/MenuPage.tsx',
  'mobile/pages/SearchPage.tsx',
  'mobile/pages/ProductPage.tsx',
  'mobile/pages/ComboPage.tsx',
  'mobile/pages/PromotionsPage.tsx',
  'mobile/pages/FavoritesPage.tsx',
  'mobile/pages/CartPage.tsx',
  'mobile/pages/OrderRequestPage.tsx',
  'mobile/pages/OfflinePage.tsx',
];

for (const rel of requiredFiles) {
  const p = path.join(WEB_SRC, rel);
  assert(fs.existsSync(p), `Archivo requerido no encontrado: ${rel}`);
}
console.log(`  ✓ [PASS] Todos los ${requiredFiles.length} archivos modulares creados correctamente`);

// 3. Verificar rutas en el Router
console.log('\n[3/4] Verificando configuración de rutas en router.tsx...');
const routerContent = fs.readFileSync(path.join(WEB_SRC, 'app', 'router.tsx'), 'utf8');
const routes = [
  '/app',
  '/app/menu',
  '/app/search',
  '/app/product/:slug',
  '/app/combo/:slug',
  '/app/promociones',
  '/app/favoritos',
  '/app/carrito',
  '/app/pedido',
  '/app/offline',
];

for (const r of routes) {
  assert(routerContent.includes(`path="${r}"`), `Ruta ${r} no declarada en AppRouter`);
}
console.log('  ✓ [PASS] Todas las rutas de la app móvil están registradas en React Router');

// 4. El pedido se registra en el servidor y WhatsApp lleva solo su código
console.log('\n[4/4] Verificando que el checkout registra el pedido antes de abrir WhatsApp...');
const whatsappContent = fs.readFileSync(path.join(WEB_SRC, 'lib', 'whatsapp.ts'), 'utf8');
const orderApiContent = fs.readFileSync(path.join(WEB_SRC, 'lib', 'orderApi.ts'), 'utf8');
const orderPageContent = fs.readFileSync(path.join(WEB_SRC, 'mobile', 'pages', 'OrderRequestPage.tsx'), 'utf8');
assert(orderApiContent.includes("'/api/public/orders'"), 'El checkout no crea el pedido en el servidor');
assert(orderApiContent.includes("'Idempotency-Key'"), 'Un reintento podría duplicar el pedido (falta Idempotency-Key)');
assert(orderApiContent.includes("'/api/public/quote'"), 'Los cupones no se validan en el servidor');
assert(whatsappContent.includes('prepareWhatsAppWindow') && whatsappContent.includes('openWhatsAppOrder'), 'Falta abrir WhatsApp sin que el navegador lo bloquee');
assert(orderPageContent.includes('submitOrder') && orderPageContent.includes('order.code'), 'La pantalla de pedido no muestra el código RTQ');
assert(!whatsappContent.includes('PEDIDO RETEQUEÑOS'), 'WhatsApp todavía arma el pedido completo en el navegador');
assert(orderApiContent.includes('StoreUnavailableError') && whatsappContent.includes('buildFallbackOrderUrl') && orderPageContent.includes('buildFallbackOrderUrl'), 'Si la tienda no responde, el cliente no tiene cómo pedir');
console.log('  ✓ [PASS] Pedido registrado en el servidor, WhatsApp solo con el código y respaldo si la tienda no responde');

console.log('\n======================================================');
console.log('VERIFICACIÓN DEL FRONTEND MÓVIL EXITOSA: 4/4 FASES OK');
console.log('======================================================\n');
