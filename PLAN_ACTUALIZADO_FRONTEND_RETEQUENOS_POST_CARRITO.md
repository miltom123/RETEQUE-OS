# RETEQUEÑOS — PLAN ACTUALIZADO DE CIERRE DEL FRONTEND
## Versión posterior al reporte de corrección del carrito

**Objetivo:** continuar desde el estado actual del frontend React sin rehacer lo que ya fue corregido, cerrar los pendientes reales del plan y dejar la aplicación lista para una presentación al dueño y un deploy rápido.

---

# 1. ESTADO ACTUAL CONFIRMADO POR EL REPORTE

Los siguientes puntos se consideran **resueltos** y NO deben reconstruirse salvo que una prueba posterior detecte una regresión.

## 1.1 Tarjetas de producto

Archivo principal:

```text
ProductCard.tsx
```

Estado resuelto:

- En la vista de cuadrícula existe un botón rojo visible con icono `ShoppingCart` y texto **“Agregar”**.
- En la vista horizontal/promociones existe el botón **“Agregar al carrito”**.
- La acción de añadir al carrito ya es identificable visualmente.
- Ya no debe depender únicamente de un pequeño botón circular `+`.

**Regla:** no volver a simplificar estas acciones a iconos ambiguos sin texto.

---

## 1.2 Detalle de producto y combos

Archivo principal:

```text
ProductPage.tsx
```

Estado resuelto:

- La barra de acción inferior utiliza `sticky bottom-0`.
- El bloque queda anclado dentro del contenedor de la interfaz.
- Incluye:
  - selector de cantidad `- / +`;
  - botón **“Agregar al carrito”**;
  - icono `ShoppingCart`;
  - total acumulado en tiempo real.
- Se corrigió el problema que producía `position: fixed` dentro del simulador.

**Regla:** mantener este patrón como CTA principal del detalle de producto.

---

## 1.3 Modal de configuración

Archivo principal:

```text
ProductConfigurator.tsx
```

Estado resuelto:

- El botón de confirmación ya dice **“Agregar al carrito”**.
- Incluye icono de carrito.
- La terminología del flujo quedó unificada.

---

## 1.4 Contención móvil y navegación

Archivos principales:

```text
MobileLayout.tsx
router.tsx
```

Estado resuelto:

- Se agregó contexto de contención mediante una solución equivalente a:

```css
transform: translateZ(0);
```

- Los elementos inferiores ya no se desplazan fuera del marco del preview móvil en monitores grandes.
- Existe `hideBottomNav` para ocultar la navegación general en:
  - detalle de producto;
  - pedido/checkout;
- El CTA principal tiene prioridad visual en esas pantallas.

---

## 1.5 Flujo básico de carrito

Estado resuelto según las pruebas reportadas:

```text
/app/menu
→ abrir producto/configurador
→ Agregar al carrito
→ actualización del carrito
→ notificación
→ contador actualizado
```

Esto debe conservarse.

---

# 2. ACLARACIÓN: QUÉ NO DEBE VOLVERSE A HACER

No invertir tiempo en:

- renombrar nuevamente “Agregar” / “Agregar al carrito”;
- reemplazar el CTA por un `+` sin descripción;
- volver a `position: fixed` en la barra del producto;
- crear otra barra de compra paralela;
- duplicar el carrito;
- reconstruir `ProductCard`, `ProductPage` o `ProductConfigurator` desde cero;
- modificar las correcciones actuales solo por razones estéticas menores antes de terminar los pendientes estructurales.

La prioridad ahora cambia de **“hacer visible el carrito”** a **“cerrar la aplicación como frontend real y desplegable”**.

---

# 3. PENDIENTE CRÍTICO 1 — DIFERENCIAR PREVIEW DE DESARROLLO Y PRODUCCIÓN

El reporte confirma que se corrigió el contenido **dentro del simulador de teléfono**, pero nuestro objetivo final sigue siendo que la aplicación no dependa de ese simulador en producción.

Se deben soportar dos contextos:

## 3.1 Preview de desarrollo

Puede conservar:

```text
marco del smartphone
contención transformada
proporción de iPhone
preview centrado
```

solo como herramienta de desarrollo/demostración.

## 3.2 Producción

En producción la app debe utilizar directamente el viewport.

En celular:

```text
┌──────────────────────────────┐
│ Header                       │
│                              │
│ Contenido                    │
│                              │
│                              │
├──────────────────────────────┤
│ BottomNavigation             │
└──────────────────────────────┘
```

No depender de:

```text
marco negro del iPhone
notch dibujado
botones laterales falsos
fondo oscuro alrededor
ancho fijo de 390px
```

## Criterio de aceptación

Debe ser posible activar/desactivar el preview sin cambiar las páginas.

Una opción válida:

```text
VITE_DEVICE_PREVIEW=true|false
```

o un flag equivalente de desarrollo.

---

# 4. PENDIENTE CRÍTICO 2 — FONDO GENERAL CLARO

El fondo oscuro exterior del preview no forma parte de la identidad final.

Para producción:

```css
body {
  background: #faf8f4;
}
```

o usar el token claro equivalente del sistema de diseño.

No dejar un gran espacio negro alrededor de la aplicación cuando se abra desde PC.

## Resultado esperado

```text
APP clara
+
fondo claro
+
contenedor responsive
```

No:

```text
APP clara pequeña
+
pantalla negra enorme
```

---

# 5. PENDIENTE CRÍTICO 3 — BOTTOM NAVIGATION COMO PARTE REAL DEL APP SHELL

Aunque el reporte confirma que existe navegación general y `hideBottomNav`, todavía debe verificarse que esté arquitectónicamente dentro del layout de la aplicación.

Estructura objetivo:

```tsx
<AppShell>
  <AppHeader />

  <main>
    <Outlet />
  </main>

  {!hideBottomNav && <BottomNavigation />}
</AppShell>
```

La navegación debe contener:

```text
Inicio
Menú
Promos
Favoritos
Carrito
```

## Carrito

El carrito debe:

- estar disponible desde la barra inferior;
- mostrar un badge con la cantidad;
- actualizarse en tiempo real;
- mantenerse entre páginas;
- conservarse al refrescar mediante persistencia local.

Ejemplo:

```text
0 → sin badge
1 → badge 1
3 → badge 3
```

## Verificar

El reporte confirma actualización del contador, pero aún debe comprobarse:

- persistencia después de F5;
- persistencia al cerrar/reabrir navegador;
- comportamiento con carrito vacío;
- comportamiento con más de 9 ítems;
- ausencia de doble acceso redundante al carrito en header + bottom nav.

---

# 6. PENDIENTE CRÍTICO 4 — RESPONSIVE REAL PARA CELULAR, TABLET Y PC

El frontend no debe quedar optimizado únicamente para el simulador.

## Celular

Probar:

```text
360
375
390
393
414
430
```

Objetivo:

- dos columnas cuando el ancho lo permita;
- texto sin cortes problemáticos;
- imágenes consistentes;
- CTA visible;
- BottomNavigation correcta;
- safe area correcta.

## Tablet

Probar:

```text
768
820
1024
```

Permitir 3 columnas cuando corresponda.

## Desktop

Probar:

```text
1280
1366
1440
1920
```

En PC utilizar el espacio disponible.

Ejemplo:

```css
.app-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
```

No limitar todo el frontend a un ancho de smartphone en producción.

---

# 7. PENDIENTE CRÍTICO 5 — LOGIN Y AUTENTICACIÓN DEL CLIENTE

Crear el login del cliente inspirado visualmente en el login del panel admin, pero orientado al consumidor.

Rutas:

```text
/app/login
/app/register
/app/forgot-password
/app/profile
```

## Login

Campos:

```text
Correo
Contraseña
```

Acciones:

```text
INICIAR SESIÓN
Continuar con Google
Crear cuenta
Olvidé mi contraseña
Continuar como invitado
```

## Registro

Campos mínimos:

```text
Nombre
Correo
Celular
Contraseña
Confirmar contraseña
```

También:

```text
Registrarme con Google
```

## Regla de negocio

**NO obligar al usuario a iniciar sesión para realizar un pedido.**

El flujo invitado debe poder:

```text
ver productos
personalizar
agregar al carrito
completar datos
enviar pedido por WhatsApp
```

---

# 8. PENDIENTE CRÍTICO 6 — AUTENTICACIÓN CON GOOGLE

Para deploy rápido utilizar preferentemente:

```text
Firebase Authentication
```

con Google Provider, salvo que ya se haya configurado otra solución estable.

Crear una capa desacoplada:

```text
services/auth.service.ts
```

Interfaz esperada:

```ts
loginWithGoogle()
loginWithEmail()
registerWithEmail()
logout()
resetPassword()
getCurrentUser()
```

No llamar Firebase directamente desde componentes visuales si puede evitarse.

Variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
...
```

Nunca hardcodear credenciales en JSX/TSX.

---

# 9. PENDIENTE CRÍTICO 7 — PERFIL REAL, SIN DATOS FICTICIOS

Ruta:

```text
/app/profile
```

Mostrar únicamente información real:

```text
Nombre
Correo
Celular
Favoritos
Cerrar sesión
```

No añadir todavía:

```text
historial falso
puntos falsos
pedido entregado ficticio
pago verificado ficticio
tracking simulado
```

---

# 10. PENDIENTE CRÍTICO 8 — SWITCH VISUAL iOS / DEFAULT

Mantener una sola aplicación.

No crear:

```text
IOSMenuPage
AndroidMenuPage
IOSCartPage
AndroidCartPage
```

Implementar un estado de UI:

```ts
type PlatformStyle = 'default' | 'ios'
```

por ejemplo:

```ts
interface UIStore {
  platform: PlatformStyle;
  setPlatform: (platform: PlatformStyle) => void;
}
```

Persistir:

```text
retequenos-ui-platform
```

en `localStorage`.

## Modo iOS

Modificar solo tokens visuales:

- radios;
- sombras;
- blur;
- header;
- bottom navigation;
- inputs;
- modales;
- spacing;
- transiciones;
- tipografía del sistema.

Usar:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

---

# 11. PENDIENTE CRÍTICO 9 — SAFE AREAS DE iPHONE

El diseño debe funcionar en un iPhone real, no solo dentro del frame simulado.

Aplicar:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Ejemplo:

```css
.bottom-navigation {
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}
```

y adaptar el header al `safe-area-inset-top`.

---

# 12. PENDIENTE CRÍTICO 10 — FLUJO DE PEDIDO DEFINITIVO

El frontend NO tendrá pasarela de pago.

Eliminar o no implementar:

```text
tarjeta
Yape
Plin
transferencia
subida de comprobante
pago verificado
paymentMethod
paymentStatus
```

## Flujo final

```text
Catálogo
↓
Producto
↓
Personalización
↓
Carrito
↓
Datos
↓
Modalidad
↓
Resumen
↓
WhatsApp
```

---

# 13. DELIVERY — SOLO INFORMACIÓN PARA WHATSAPP

Permitir:

```text
Delivery
Recojo
```

Si el usuario elige Delivery solicitar:

```text
Dirección
Referencia opcional
```

No implementar:

```text
tarifa automática
mapa
distancia
ETA
motorizado
tracking
asignación de conductor
```

Mostrar:

```text
Delivery: A coordinar por WhatsApp
```

El precio mostrado en el frontend corresponde a productos y descuentos válidos, no al costo final del delivery.

---

# 14. WHATSAPP — REGLA DEFINITIVA

Botón final:

**ENVIAR PEDIDO POR WHATSAPP**

Acción:

```text
validar
↓
generar mensaje
↓
generar wa.me
↓
abrir WhatsApp
```

No ejecutar automáticamente:

```text
POST /api/pedidos
```

No ejecutar:

```text
syncOrderToKDS()
```

No mostrar:

```text
Pedido confirmado
Pago confirmado
Pedido recibido
```

solo por haber abierto WhatsApp.

## Mensaje mínimo

Debe incluir:

```text
Cliente
Celular
Productos
Presentación
Opciones
Extras
Cantidades
Subtotal
Descuento
Total de productos
Modalidad
Dirección si aplica
Referencia
Observaciones
Delivery a coordinar
```

---

# 15. PENDIENTE CRÍTICO 11 — CATÁLOGO ÚNICO

No seguir creando copias del catálogo.

Meta:

```text
data/catalog.db.json
        ↓
GET /api/catalog
        ↓
frontend React
```

Crear o consolidar:

```text
services/catalog.api.ts
```

No escribir productos directamente dentro de componentes.

Las estructuras locales existentes pueden utilizarse como fallback temporal durante la migración, pero no deben convertirse en otra fuente de verdad permanente.

---

# 16. PENDIENTE CRÍTICO 12 — FAVORITOS

Debe funcionar inicialmente sin login mediante persistencia local.

Después del login se debe dejar preparada la arquitectura para sincronización futura.

Verificar:

```text
agregar favorito
quitar favorito
refresh
reinicio del navegador
navegación entre vistas
```

---

# 17. PENDIENTE CRÍTICO 13 — ESTADOS DE UX

Añadir estados consistentes para:

```text
loading
error
sin productos
sin resultados
carrito vacío
sin conexión
acción exitosa
```

No dejar pantallas completamente vacías ni errores técnicos sin tratamiento.

---

# 18. PENDIENTE CRÍTICO 14 — ACCESIBILIDAD BÁSICA

Antes del deploy verificar:

- botones con nombre accesible;
- imágenes con `alt`;
- inputs con `label`;
- foco visible;
- navegación por teclado en desktop;
- contraste suficiente;
- targets táctiles razonables;
- modales que recuperen el foco al cerrarse.

Especial atención a:

```text
ProductCard
ProductConfigurator
ProductPage
BottomNavigation
Login
Checkout
```

---

# 19. PENDIENTE CRÍTICO 15 — PWA Y DEPLOY

Mantener el proyecto listo para:

```bash
npm run build
```

Salida:

```text
dist/
```

Variables de entorno:

```text
VITE_API_URL=
VITE_WHATSAPP_NUMBER=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_DEVICE_PREVIEW=
```

Preparar PWA:

```text
manifest
icons
theme-color
viewport
display standalone
```

Objetivo:

- abrir desde navegador;
- funcionar bien en PC;
- funcionar bien en Android/iPhone;
- poder añadirse a pantalla de inicio posteriormente.

---

# 20. PENDIENTE CRÍTICO 16 — RETIRO DEL HTML LEGACY

No continuar desarrollando:

```text
app/index.html
```

Debe quedar congelado como referencia hasta que exista paridad suficiente.

Cuando el frontend React cubra las vistas válidas:

```text
Inicio
Menú
Búsqueda
Producto
Configurador
Promos
Favoritos
Carrito
Datos del pedido
Resumen
WhatsApp
Login
Registro
Perfil
```

eliminar progresivamente:

```text
app/index.html
app/support.js
app/js/mobile/
app/css/mobile.css
```

Revisar `manifest.json` y `sw.js` para trasladar la responsabilidad PWA al frontend React.

---

# 21. NUEVA PRIORIDAD DE IMPLEMENTACIÓN

El problema de “Agregar al carrito” ya está resuelto.

El orden de trabajo ahora debe ser:

## FASE 1 — Cerrar layout real

- separar preview y producción;
- fondo claro;
- AppShell real;
- BottomNavigation interna;
- responsive celular/tablet/PC;
- verificar carrito persistente.

## FASE 2 — Autenticación

- Login;
- Registro;
- Recuperación;
- Google;
- Invitado;
- Perfil.

## FASE 3 — iOS/default

- switch;
- tokens;
- persistencia;
- safe areas;
- validar iPhone real.

## FASE 4 — Checkout final

- quitar cualquier resto de pagos;
- Delivery/Recojo informativo;
- resumen;
- WhatsApp;
- confirmar que no se crea KDS automáticamente.

## FASE 5 — Datos reales

- catálogo central;
- favoritos persistentes;
- estados loading/error/empty;
- eliminar mocks innecesarios.

## FASE 6 — Deploy

- PWA;
- env;
- build;
- responsive QA;
- accesibilidad básica;
- pruebas finales.

## FASE 7 — Legacy

- matriz de paridad;
- retirar `app/index.html`;
- retirar runtime y scripts legacy.

---

# 22. MATRIZ DE ESTADO ACTUAL

| Funcionalidad | Estado |
|---|---|
| Botón visible en tarjetas | ✅ Resuelto |
| Botón “Agregar al carrito” en detalle | ✅ Resuelto |
| Botón del configurador | ✅ Resuelto |
| Selector cantidad + total en detalle | ✅ Resuelto |
| Contención del CTA dentro del preview | ✅ Resuelto |
| `hideBottomNav` en producto/pedido | ✅ Resuelto |
| Actualización del contador del carrito | ✅ Resuelto |
| Notificación al agregar | ✅ Resuelto |
| Persistencia del carrito tras refresh | ⚠️ Verificar |
| BottomNavigation dentro de AppShell real | ⚠️ Verificar/Completar |
| Fondo claro de producción | ⏳ Pendiente |
| Eliminar dependencia del smartphone frame en producción | ⏳ Pendiente |
| Responsive real desktop | ⏳ Pendiente |
| Login cliente | ⏳ Pendiente |
| Crear cuenta | ⏳ Pendiente |
| Google Auth | ⏳ Pendiente |
| Recuperar contraseña | ⏳ Pendiente |
| Comprar como invitado | ⏳ Pendiente |
| Perfil real | ⏳ Pendiente |
| Switch iOS/default | ⏳ Pendiente |
| Safe areas iPhone | ⏳ Pendiente |
| Checkout sin pagos | ⚠️ Verificar/Completar |
| Delivery solo informativo | ⚠️ Verificar/Completar |
| WhatsApp sin KDS automático | ⚠️ Verificar/Completar |
| Catálogo único vía API | ⏳ Pendiente |
| Favoritos persistentes | ⚠️ Verificar |
| PWA | ⏳ Pendiente |
| Build producción limpio | ⏳ Pendiente |
| Eliminación del legacy | ⏳ Pendiente |

---

# 23. PRUEBAS DE NO REGRESIÓN DEL CARRITO

Antes de cerrar cada fase, repetir:

## Desde Menú

```text
/app/menu
→ Agregar
→ producto entra al carrito
→ badge cambia
```

## Desde Detalle

```text
producto
→ elegir cantidad
→ total cambia
→ Agregar al carrito
→ badge cambia
```

## Desde Configurador

```text
producto configurable
→ seleccionar opciones
→ Agregar al carrito
→ mantener opciones
→ badge cambia
```

## Navegación

```text
agregar producto
→ Inicio
→ Promos
→ Favoritos
→ Carrito
```

El estado no debe perderse.

## Refresh

```text
agregar producto
→ F5
→ carrito conserva contenido
```

si la persistencia ya está implementada.

---

# 24. CRITERIOS DE CIERRE DEL FRONTEND

No declarar terminado hasta verificar:

```text
✓ CTA “Agregar al carrito” visible y funcional
✓ ProductPage sticky sin salirse de su contenedor
✓ configurador funcional
✓ carrito persistente
✓ BottomNavigation correctamente integrada
✓ carrito en BottomNavigation
✓ fondo claro
✓ sin dependencia del frame móvil en producción
✓ responsive celular
✓ responsive tablet
✓ responsive PC
✓ login email
✓ registro
✓ Google Auth
✓ recuperación
✓ invitado
✓ perfil
✓ switch iOS/default
✓ safe area iPhone
✓ checkout sin pasarela
✓ delivery sin cálculo
✓ WhatsApp correcto
✓ no creación automática de KDS
✓ catálogo real
✓ favoritos persistentes
✓ loading/error/empty
✓ accesibilidad básica
✓ PWA preparada
✓ npm run build sin errores
✓ consola sin errores relevantes
✓ legacy listo para eliminar
```

---

# 25. REGLA FINAL PARA ANTIGRAVITY

**No rehacer las correcciones ya implementadas.**

Trabajar incrementalmente sobre el estado actual.

El foco pasa a ser:

```text
PROTOTIPO CORREGIDO
        ↓
APP SHELL REAL
        ↓
RESPONSIVE
        ↓
AUTENTICACIÓN
        ↓
MODO iOS
        ↓
CHECKOUT WHATSAPP
        ↓
DATOS REALES
        ↓
PWA / DEPLOY
        ↓
ELIMINAR LEGACY
```

El simulador de teléfono puede seguir existiendo como herramienta de preview, pero **no debe definir la arquitectura del frontend de producción**.

El resultado final debe sentirse como una aplicación real cuando se abre directamente desde un celular y como una web responsive correctamente aprovechada cuando se abre desde PC.
