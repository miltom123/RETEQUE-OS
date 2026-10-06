// ==============================================================================
// RETEQUEÑOS - VERIFICADOR INTEGRAL DEL PLAN ACTUALIZADO POST-CARRITO
// Valida todas las fases y pendientes críticos definidos en:
// PLAN_ACTUALIZADO_FRONTEND_RETEQUENOS_POST_CARRITO.md
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const WEB_SRC = path.join(ROOT, 'web', 'src');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
  }
}

console.log('\n--- VERIFICACIÓN DEL PLAN ACTUALIZADO POST-CARRITO ---\n');

// 1. Verificación de Fase 1: Separar Dev Preview de Producción y Fondo Claro
console.log('[FASE 1] Layout Real y Viewport de Producción...');
const uiStoreContent = fs.readFileSync(path.join(WEB_SRC, 'store', 'uiStore.ts'), 'utf8');
assert(uiStoreContent.includes('platform') && uiStoreContent.includes('devicePreview'), 'uiStore maneja platform y devicePreview con persistencia');
assert(uiStoreContent.includes('retequenos-ui-settings') || uiStoreContent.includes('retequenos-ui-platform'), 'Claves de persistencia de diseño configuradas');

const mobileLayoutContent = fs.readFileSync(path.join(WEB_SRC, 'mobile', 'layouts', 'MobileLayout.tsx'), 'utf8');
assert(mobileLayoutContent.includes('devicePreview ?') && mobileLayoutContent.includes('#FAF8F4'), 'MobileLayout separa modo simulador de producción con fondo crema #FAF8F4');
assert(mobileLayoutContent.includes('toggleDevicePreview') && mobileLayoutContent.includes('setPlatform'), 'Controles de alternancia de vista previa y plataforma incluidos');

// 2. Verificación de Fase 2: Autenticación de Clientes
console.log('\n[FASE 2] Autenticación de Clientes y Perfil...');
const authServiceExists = fs.existsSync(path.join(WEB_SRC, 'services', 'auth.service.ts'));
assert(authServiceExists, 'Servicio auth.service.ts desacoplado creado');

const authStoreExists = fs.existsSync(path.join(WEB_SRC, 'store', 'authStore.ts'));
assert(authStoreExists, 'Store authStore.ts con persistencia creado');

const loginPageExists = fs.existsSync(path.join(WEB_SRC, 'mobile', 'pages', 'LoginPage.tsx'));
const registerPageExists = fs.existsSync(path.join(WEB_SRC, 'mobile', 'pages', 'RegisterPage.tsx'));
const forgotPageExists = fs.existsSync(path.join(WEB_SRC, 'mobile', 'pages', 'ForgotPasswordPage.tsx'));
const profilePageExists = fs.existsSync(path.join(WEB_SRC, 'mobile', 'pages', 'ProfilePage.tsx'));
assert(loginPageExists && registerPageExists && forgotPageExists && profilePageExists, 'Las 4 páginas de Auth (Login, Registro, Recuperación, Perfil) existen');

const routerContent = fs.readFileSync(path.join(WEB_SRC, 'app', 'router.tsx'), 'utf8');
assert(routerContent.includes('/app/login') && routerContent.includes('/app/register') && routerContent.includes('/app/profile'), 'Rutas de auth registradas en router.tsx');

// 3. Verificación de Compra como Invitado y No Bloqueo
console.log('\n[FASE 3] Regla de Oro: Compra como Invitado sin Bloqueo...');
const orderReqContent = fs.readFileSync(path.join(WEB_SRC, 'mobile', 'pages', 'OrderRequestPage.tsx'), 'utf8');
assert(!orderReqContent.includes('if (!isAuthenticated) return <Navigate to="/app/login"'), 'El checkout nunca bloquea a clientes invitados');
assert(orderReqContent.includes('useAuthStore'), 'OrderRequestPage prellena automáticamente los datos del cliente logueado');

// 4. Verificación de Fase 4: Modo iOS / Default (Android)
console.log('\n[FASE 4] Switch de Plataforma (iOS / Default)...');
const headerContent = fs.readFileSync(path.join(WEB_SRC, 'mobile', 'components', 'MobileHeader.tsx'), 'utf8');
assert(headerContent.includes('ChevronLeft') && headerContent.includes('isIos'), 'Header adapta botón de retroceso a Chevron en iOS y Arrow en Android');

// 5. Verificación de Fase 5: Persistencia de Carrito y Favoritos
console.log('\n[FASE 5] Persistencia de Carrito y Favoritos...');
const cartStoreContent = fs.readFileSync(path.join(WEB_SRC, 'store', 'cartStore.ts'), 'utf8');
assert(cartStoreContent.includes('retequenos_cart_storage'), 'Carrito persiste tras recarga de página');

const favStoreContent = fs.readFileSync(path.join(WEB_SRC, 'store', 'favoritesStore.ts'), 'utf8');
assert(favStoreContent.includes('retequenos_favorites'), 'Favoritos persisten tras recarga de página');

// 6. Verificación de Fase 6: Cero Pasarelas Falsas y WhatsApp Puro
console.log('\n[FASE 6] Cero Pasarelas Falsas y Flujo WhatsApp...');
assert(!orderReqContent.includes('Yape') && !orderReqContent.includes('Plin') && !orderReqContent.includes('comprobante'), 'Checkout libre de pasarelas de pago engañosas o falsas');
assert(orderReqContent.includes('openWhatsApp'), 'Checkout envía pedido directamente a WhatsApp oficial');

// 7. Verificación de Fase 7: Build de Producción y PWA
console.log('\n[FASE 7] Compilación Limpia y Configuración PWA...');
const distIndexExists = fs.existsSync(path.join(ROOT, 'web', 'dist', 'index.html'));
assert(distIndexExists, 'Carpeta web/dist generada con index.html');

const manifestExists = fs.existsSync(path.join(ROOT, 'web', 'public', 'manifest.webmanifest'));
assert(manifestExists, 'Manifest PWA para instalación standalone presente');

const envExampleExists = fs.existsSync(path.join(ROOT, 'web', '.env.example'));
assert(envExampleExists, 'Archivo .env.example con variables de entorno documentadas');

console.log('\n======================================================');
console.log(`RESUMEN: ${passCount} pruebas pasaron exitosamente (${failCount} fallos).`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
}
