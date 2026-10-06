# RETEQUEÑOS — PLAN DE IMPLEMENTACIÓN DEL FRONTEND REAL DE LA APP

## 1. Objetivo

Reconstruir el prototipo móvil existente en `app/index.html` como un frontend real, modular, mantenible y preparado para producción, conservando como referencia su identidad visual, navegación, catálogo, carrito y configuración de productos.

El archivo `app/index.html` no será la base tecnológica definitiva. Solo funcionará temporalmente como referencia visual durante la migración y deberá eliminarse cuando el nuevo frontend alcance paridad funcional.

La implementación deberá realizarse sobre el ecosistema React + TypeScript + Vite ya existente en:

`web/`

No se debe crear otro frontend React independiente salvo que aparezca una limitación técnica demostrable.

---

# 2. Decisión funcional principal

El flujo comercial definitivo NO tendrá:

- pasarela de pagos;
- pago con tarjeta dentro de la web/app;
- selección de Yape, Plin o transferencia dentro del checkout;
- carga de comprobantes;
- confirmación automática de pago;
- cálculo automático del costo de delivery;
- integración con repartidores;
- cálculo de ETA de delivery;
- seguimiento de repartidor;
- creación automática de una comanda KDS solo por pulsar WhatsApp.

El frontend tendrá como objetivo:

**armar correctamente la solicitud del pedido y enviarla prellenada al WhatsApp oficial de Retequeños.**

El flujo será:

```text
CATÁLOGO
   ↓
PRODUCTO
   ↓
PERSONALIZACIÓN
   ↓
CARRITO
   ↓
DATOS DEL CLIENTE
   ↓
RESUMEN DEL PEDIDO
   ↓
ENVIAR PEDIDO POR WHATSAPP
   ↓
CONVERSACIÓN CON RETEQUEÑOS
```

WhatsApp será el punto en el cual el negocio confirma disponibilidad, delivery, importe final de envío y forma de pago.

---

# 3. Regla importante sobre Delivery

No debe existir un «sistema de delivery» dentro del frontend.

Sí puede mantenerse únicamente una **preferencia de recepción**, porque constituye información útil para el mensaje:

```text
¿Cómo deseas recibir tu pedido?

○ Delivery — se coordina por WhatsApp
○ Recojo en tienda
```

Si se selecciona Delivery se pueden pedir:

```text
Dirección
Referencia
```

pero únicamente como información para incluir en WhatsApp.

NO calcular:

```text
costo de delivery
zona tarifaria
distancia
ETA
motorizado
ruta
tracking
```

Por ejemplo:

```text
Modalidad: Delivery
Dirección: Av. Bolognesi 845
Referencia: Frente al colegio...
Costo de envío: A coordinar por WhatsApp
```

Para recojo:

```text
Modalidad: Recojo en tienda
Local: [dirección oficial de Retequeños]
```

---

# 4. Arquitectura destino

Utilizar el proyecto existente:

```text
web/
```

y crear una capa específica para la experiencia móvil.

Estructura propuesta:

```text
web/src/

├── app/
│   ├── App.tsx
│   └── router.tsx
│
├── mobile/
│   ├── layouts/
│   │   └── MobileLayout.tsx
│   │
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── MenuPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── ProductPage.tsx
│   │   ├── ComboPage.tsx
│   │   ├── FavoritesPage.tsx
│   │   ├── PromotionsPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── OrderRequestPage.tsx
│   │   └── OfflinePage.tsx
│   │
│   ├── components/
│   │   ├── MobileHeader.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductConfigurator.tsx
│   │   ├── CartItem.tsx
│   │   ├── OrderSummary.tsx
│   │   ├── CustomerForm.tsx
│   │   └── FulfillmentSelector.tsx
│   │
│   └── styles/
│
├── store/
│   ├── cartStore.ts
│   ├── checkoutStore.ts
│   └── uiStore.ts
│
├── services/
│   └── catalog.api.ts
│
├── lib/
│   ├── whatsapp.ts
│   ├── money.ts
│   └── validation.ts
│
└── types/
    ├── product.ts
    ├── cart.ts
    └── orderRequest.ts
```

Reutilizar componentes existentes de `web/` cuando sean compatibles.

No duplicar nuevamente carrito, catálogo o modelos.

---

# 5. Rutas de la aplicación

Implementar inicialmente:

```text
/app
/app/menu
/app/search
/app/product/:slug
/app/promociones
/app/favoritos
/app/carrito
/app/pedido
```

La ruta:

```text
/app/pedido
```

reemplazará el antiguo conjunto de pantallas de entrega + revisión + pago.

No deberá existir:

```text
/app/payment
/app/payments
/app/yape
/app/tracking
```

en el MVP real.

---

# 6. Qué migrar de `app/index.html`

Utilizar el diseño actual como referencia para reconstruir:

```text
01 Splash
02 Onboarding
06 Inicio
07 Búsqueda/resultados
08 Menú
09 Detalle/personalización
10 Configuración de combos
11 Favoritos
12 Promociones
13 Carrito
16 Modalidad de recepción
17 Revisión del pedido
26 Estado offline
```

Pero no copiar literalmente el HTML ni sus estilos inline.

Cada bloque visual debe convertirse en componentes React reutilizables.

---

# 7. Qué NO migrar del prototipo

## Pantalla 18 — Método de pago

Eliminar completamente.

Eliminar:

```text
Efectivo
Yape
Plin
Transferencia
captura de pago
número Yape
selector de medio de pago
confirmación de pago
```

No debe existir una pantalla de método de pago.

---

## Pantalla 19 — Pedido confirmado

No puede decir:

```text
Pedido confirmado
Pedido recibido
Pedido registrado
```

solo por abrir WhatsApp.

Puede sustituirse por una pantalla o aviso:

```text
Tu solicitud está lista.

Enviaremos el detalle a WhatsApp para que Retequeños
confirme disponibilidad, entrega y forma de pago.
```

El botón debe decir:

**CONTINUAR EN WHATSAPP**

---

## Pantalla 20 — Tracking

No migrar todavía.

Actualmente presenta estados simulados y hasta permite simular la siguiente etapa.

Eliminar del MVP.

Solo podrá regresar cuando exista un pedido realmente confirmado por el negocio y un mecanismo seguro para que el cliente consulte ese pedido.

---

## Pantallas 21–22 — Historial y detalle

No implementar como funcionalidad real en esta fase si no existe una identidad persistente de cliente y pedidos confirmados vinculados a esa identidad.

No trasladar datos ficticios como:

```text
RTQ-1987
Pago verificado
Entregado
En camino
```

Podrán regresar en una fase posterior.

---

# 8. Login, registro y perfil

Las pantallas actuales:

```text
03 login
04 registro
05 recuperar contraseña
24 perfil
```

no deben convertirse en funcionalidades falsas.

Si actualmente no existe backend real para cuentas de clientes:

**dejarlas fuera del MVP.**

La compra no requerirá crear una cuenta.

Se podrá añadir autenticación de clientes después sin afectar el carrito ni el checkout.

---

# 9. Estado que debe desaparecer

Eliminar del nuevo modelo cualquier dependencia de:

```text
pay
payMethod
payVerified
showYape
yapeNumber
paymentMethod
paymentStatus
```

También eliminar del frontend público:

```text
deliveryFee calculado
driver
driverStatus
trackingStep
estimatedDelivery
```

El estado de checkout debe simplificarse aproximadamente a:

```ts
interface OrderRequest {
  customer: {
    name: string;
    phone: string;
  };

  fulfillment: {
    type: 'delivery' | 'pickup';
    address?: string;
    reference?: string;
  };

  items: CartItem[];

  notes?: string;

  subtotal: number;
  discount: number;
  totalProducts: number;
}
```

El total mostrado será exclusivamente:

```text
productos - descuentos válidos
```

No sumar costo de delivery.

Cuando sea Delivery mostrar:

```text
Costo de envío: A coordinar por WhatsApp
```

---

# 10. Nuevo flujo de checkout

## Paso 1 — Carrito

Mostrar:

```text
productos
presentaciones
opciones
cremas
extras
cantidades
notas
subtotal
descuento
total de productos
```

---

## Paso 2 — Datos

Solicitar:

```text
Nombre
Celular
Modalidad: Delivery / Recojo
```

Si selecciona Delivery:

```text
Dirección
Referencia opcional
```

Mantener:

```text
Observaciones generales
```

No pedir forma de pago.

---

## Paso 3 — Revisión

Mostrar únicamente:

```text
Cliente
Celular
Modalidad
Dirección, si corresponde
Productos
Opciones
Cantidades
Observaciones
Subtotal
Descuento
Total de productos
```

Si es Delivery:

```text
Delivery: costo a coordinar por WhatsApp
```

---

# 11. Botón final

Texto recomendado:

**HACER PEDIDO POR WHATSAPP**

o:

**ENVIAR PEDIDO POR WHATSAPP**

Al pulsarlo:

1. validar campos;
2. construir el mensaje;
3. generar URL `wa.me`;
4. abrir WhatsApp.

NO ejecutar:

```ts
syncOrderToKDS()
```

NO ejecutar:

```text
POST /api/pedidos
```

en esta etapa.

NO generar un pedido operacional dentro del KDS.

NO mostrar el pedido como confirmado.

---

# 12. Mensaje prellenado de WhatsApp

Formato objetivo:

```text
🥟 *PEDIDO RETEQUEÑOS*

👤 *CLIENTE*
Nombre: Milton Flores
Celular: 952741852

🛒 *PEDIDO*

2 × Tequeños de queso
• Presentación: 10 unidades
• Salsa: Mayonesa de ajo
• Extra: Queso

1 × Promo Duo
• Queso
• Mayonesa de ajo
• Mayopalta

🚚 *MODALIDAD*
Delivery

📍 Dirección:
Av. Bolognesi 845, Tacna

📌 Referencia:
Frente al colegio...

💰 *RESUMEN*
Subtotal: S/ 51.90
Descuento: S/ 5.00
Total productos: S/ 46.90

Delivery: A coordinar por WhatsApp

📝 *OBSERVACIONES*
Sin ají, por favor.

Hola 👋 Quisiera solicitar este pedido.
¿Podrían confirmarme disponibilidad, delivery y forma de pago?
```

Para recojo:

```text
🏪 MODALIDAD
Recojo en tienda
```

y no solicitar dirección.

---

# 13. Cambios necesarios sobre el `web/` actual

Actualmente existe:

```text
web/src/lib/whatsapp.ts
```

Debe mantenerse como base pero simplificarse.

Eliminar del flujo:

```ts
import { syncOrderToKDS } from './orderSync';
```

y eliminar la ejecución de:

```ts
syncOrderToKDS(...)
```

dentro de:

```ts
openWhatsAppCheckout()
```

El helper de WhatsApp debe limitarse a:

```text
validar datos
generar texto
generar URL
abrir WhatsApp
```

Nada más.

---

# 14. `orderSync.ts`

Actualmente:

```text
web/src/lib/orderSync.ts
```

envía automáticamente el pedido a `/api/pedidos`.

No debe utilizarse en el checkout público.

Si no queda utilizado por otra parte del frontend, eliminarlo.

No mantener lógica muerta «por si acaso».

---

# 15. Catálogo

El nuevo frontend no debe crear una cuarta versión del catálogo.

Meta final:

```text
data/catalog.db.json
       ↓
   GET /api/catalog
       ↓
Frontend cliente
       ↓
Panel administrador
```

Crear:

```text
services/catalog.api.ts
```

para encapsular el consumo.

No escribir nuevamente productos directamente dentro de componentes React.

Las estructuras existentes en:

```text
web/src/data/catalog/
```

pueden utilizarse durante la transición como referencia, pero el objetivo final es que el catálogo público provenga del servidor.

---

# 16. Estrategia de migración

No intentar convertir las 1,406 líneas automáticamente.

Reconstruir componente por componente.

Orden:

### Fase A — Base

- crear rutas `/app/*`;
- crear `MobileLayout`;
- implementar navegación inferior;
- trasladar tokens visuales;
- tipografía;
- colores;
- botones;
- cards;
- estados de carga/error.

### Fase B — Catálogo

- Home;
- categorías;
- búsqueda;
- menú;
- promociones;
- detalle;
- configuradores.

### Fase C — Carrito

- añadir;
- eliminar;
- cantidades;
- opciones;
- extras;
- subtotal;
- descuentos;
- persistencia local.

### Fase D — Solicitud de pedido

- formulario del cliente;
- Delivery/Recojo como preferencia;
- dirección/referencia;
- observaciones;
- revisión;
- generación de WhatsApp.

### Fase E — Limpieza

Eliminar todas las referencias de pago, tracking ficticio y pedidos de demostración.

### Fase F — Retiro del legacy

Solo después de validar el nuevo frontend.

---

# 17. Elementos legacy que deberán desaparecer

Cuando la migración haya terminado y las pruebas sean satisfactorias, eliminar:

```text
app/index.html
app/support.js
app/css/mobile.css
app/js/mobile/
```

Revisar también si siguen siendo necesarios:

```text
app/manifest.json
app/sw.js
```

Si la nueva aplicación va a ser PWA, trasladar correctamente esa responsabilidad al proyecto `web/`, no conservar dos implementaciones.

NO tocar:

```text
app/admin.html
```

como consecuencia de esta migración.

El panel administrador es un frente diferente.

---

# 18. No modificar el legacy durante la reconstrucción

Desde que comience la migración:

`app/index.html` queda congelado.

No agregar nuevas funcionalidades allí.

Si el dueño solicita un cambio:

```text
prototipo aprobado
       ↓
implementar directamente en React
```

Evitar hacer primero el cambio en HTML y después repetirlo en React.

---

# 19. Criterios obligatorios de aceptación

La migración no se considerará terminada hasta cumplir todos:

## Arquitectura

```text
✓ React
✓ TypeScript
✓ componentes reutilizables
✓ React Router
✓ Zustand donde corresponda
✓ sin pseudo-tags <sc-if>, <sc-for>, <x-dc>
✓ sin dependencia de support.js
✓ sin grandes cantidades de estilos inline
```

## Flujo

```text
✓ agregar productos
✓ personalizarlos
✓ cambiar cantidades
✓ aplicar descuento permitido
✓ ingresar datos
✓ escoger Delivery/Recojo
✓ revisar pedido
✓ generar WhatsApp correctamente
```

## Pagos

```text
✓ ninguna pasarela
✓ ningún selector de pago
✓ ninguna confirmación automática
✓ ningún comprobante
✓ ningún estado "pago verificado"
```

## Delivery

```text
✓ no calcular tarifa
✓ no calcular ETA
✓ no asignar motorizado
✓ no hacer tracking
✓ señalar "a coordinar por WhatsApp"
```

## KDS

Pulsar:

```text
ENVIAR PEDIDO POR WHATSAPP
```

NO debe crear automáticamente una orden en KDS.

## Calidad

Ejecutar obligatoriamente:

```bash
npm run build
```

sin errores TypeScript.

No dejar errores en consola.

Validar diseño al menos en:

```text
360 px
390 px
430 px
768 px
desktop
```

---

# 20. Condición para eliminar `app/index.html`

Antes de borrarlo verificar visualmente las pantallas una por una.

Crear una matriz:

```text
LEGACY                 NUEVO FRONT              ESTADO

Inicio                 /app                     OK
Menú                   /app/menu                OK
Búsqueda               /app/search              OK
Producto               /app/product/:slug       OK
Combo                   componente configurador OK
Favoritos              /app/favoritos           OK
Promociones            /app/promociones         OK
Carrito                /app/carrito              OK
Entrega + revisión     /app/pedido               OK
Pago                   ELIMINADO                 OK
Tracking ficticio      ELIMINADO                 OK
```

Cuando todos los elementos requeridos estén `OK`, realizar el borrado del legacy.

---

# 21. Resultado final esperado

La arquitectura debe quedar:

```text
                 RETEQUEÑOS
                     │
              FRONTEND CLIENTE
              React + TypeScript
                     │
         ┌───────────┴────────────┐
         │                        │
   Catálogo/API               WhatsApp
         │                        │
   información real        solicitud detallada
```

El frontend:

- construye el carrito;
- recoge los datos;
- calcula únicamente productos/descuentos válidos;
- prepara la solicitud;
- abre WhatsApp.

WhatsApp:

- confirma disponibilidad;
- coordina delivery;
- coordina pago;
- termina el proceso comercial.

El frontend NO debe fingir que esas operaciones ya ocurrieron.

---

# 22. Regla para Antigravity

No realizar una «traducción» automática de `app/index.html` a JSX.

Usar el HTML solamente como:

**referencia visual + referencia de flujo.**

La implementación React deberá reconstruirse con componentes, stores, servicios y modelos adecuados.

Cada módulo migrado debe sustituir definitivamente su equivalente legacy.

No ampliar el archivo HTML antiguo.

No mantener dos versiones funcionales una vez terminada la migración.

---

# 23. Decisiones adicionales de implementación

## 23.1 Usar `web/` como frontend cliente común

No crear un cuarto proyecto si no existe una necesidad técnica real.

El proyecto `web/` ya dispone de:

- React;
- TypeScript;
- Vite;
- router;
- Zustand;
- carrito;
- configuradores;
- integración con WhatsApp.

La migración debe reutilizar esa infraestructura.

## 23.2 WhatsApp no confirma el pedido

Abrir WhatsApp no equivale a:

- confirmar disponibilidad;
- registrar el pedido;
- confirmar pago;
- crear una orden de cocina;
- crear una orden de reparto.

Por ello, el flujo público no debe sincronizar automáticamente el checkout con KDS.

## 23.3 Creación posterior del pedido operativo

En una fase posterior puede implementarse en Caja una acción rápida del tipo:

**“Registrar pedido recibido por WhatsApp”**

A partir de ese momento recién deberá existir la comanda operacional y aparecer en KDS.

Esta separación evita pedidos fantasma y mantiene coherencia entre la conversación comercial y la operación interna.
