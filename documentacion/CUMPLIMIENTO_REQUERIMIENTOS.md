# Cumplimiento de requerimientos (RFI-01 a RFI-15 y RNF-01 a RNF-12)

> Auditoría y correcciones del 12 de noviembre de 2026. Cada fila dice **dónde** está implementado y **cómo se verifica**.
> Pruebas: `Ejecutar pruebas.cmd` (o `node tools/test-requirements.js` para lo nuevo). Ninguna prueba modifica `data/`.

## Qué estaba mal antes de esta revisión

| Hallazgo | Requerimiento | Corrección |
|---|---|---|
| Registro e inicio de sesión simulados en `localStorage` (cualquier contraseña entraba) y desactivados | RFI-01 | Cuentas reales en el servidor (`/api/customers/*`), contraseñas con scrypt, sesión firmada HMAC |
| La ficha móvil ofrecía salsas inventadas y no cobraba extras; las promos no dejaban elegir sabores | RFI-03, RFI-04 | `ProductOptionsForm` (tamaño, cremas, extras con precio del servidor, cantidad, notas) y configurador de promos con notas para cocina |
| Sin mapa, sin programar, sin elegir pago ni adjuntar constancia | RFI-06/07/08 | `MapPicker`, `ScheduleSelector`, `PaymentSelector` y subida de constancia |
| No existía seguimiento ni historial | RFI-09, RFI-10 | `/app/seguimiento/:codigo` y `/app/pedidos` con "Repetir pedido" |
| Dashboard 100 % con cifras inventadas | RFI-11 | Calculado con los pedidos reales |
| El KDS mostraba "Yape verificado" aunque no lo estuviera; tiempos fijos | RFI-12, RFI-13 | Estado de pago real, constancia visible, tiempos con la hora de cada estado |
| No había integración con n8n | RFI-14 | `tools/backend/dispatch.js` + flujo `automation/n8n/` |
| Crear producto en el panel fallaba (`newProduct` fuera de alcance) y los errores del servidor se ocultaban | RFI-15 | El panel espera al servidor y muestra el error; la web muestra los productos nuevos |
| El total aceptaba ±S/ 0.05 del navegador; el panel podía fijar precios de productos del catálogo | RNF-02 | Total siempre recalculado; líneas del catálogo con precio del catálogo |
| `PATCH /api/config` aceptaba cualquier campo; el ícono del producto no se limpiaba | RNF-04 | Lista blanca validada; ícono sin etiquetas |
| `tools/node.cmd` apuntaba a `C:\Users\LENOVO\...` | RNF-10 | Usa el Node instalado o el de Antigravity del usuario actual |
| El logo del encabezado móvil pedía una ruta inexistente en bucle (cientos de 404) | RNF-06 | Ruta corregida |

## Requerimientos funcionales

| ID | Dónde | Verificación |
|---|---|---|
| RFI-01 Registro e inicio de sesión | `tools/backend/routes/customers.routes.js`, `repositories/customers.repository.js`, `customer-auth.js`; `web/src/services/auth.service.ts` | `test-requirements.js` (registro, correo repetido, contraseña mala, token alterado) |
| RFI-02 Catálogo por categorías, búsqueda y filtros | `web/src/mobile/pages/MenuPage.tsx` (categorías, solo disponibles, orden por precio), `SearchPage.tsx` | Navegador |
| RFI-03 Detalle con foto, descripción, extras y cantidad | `web/src/mobile/pages/ProductPage.tsx`, `components/ProductOptionsForm.tsx` | Navegador; el servidor cotiza los extras (`test-pricing.js`) |
| RFI-04 Personalizar promociones | `components/configurator/ProductConfiguratorModal.tsx` (sabores, cremas, bebida, agregados, notas para cocina) | Navegador |
| RFI-05 Carrito y cupones | `store/cartStore.ts`, `hooks/useServerCoupon.ts`, cupones validados en `tools/backend/pricing.js` | `test-pricing.js`, `test-web-orders.js` |
| RFI-06 Direcciones con ubicación en el mapa | `mobile/components/MapPicker.tsx` (OpenStreetMap, tocar para marcar o "Mi ubicación"), `AddressBook.tsx`; el pedido guarda el enlace GPS | `test-requirements.js` (direcciones, máximo 5, coordenadas) |
| RFI-07 Delivery o recojo y programar | `FulfillmentSelector.tsx`, `ScheduleSelector.tsx`; servidor exige de 30 min a 7 días (`public.routes.js`) | `test-requirements.js` |
| RFI-08 Método de pago y constancia | `PaymentSelector.tsx`; `routes/receipts.routes.js` (solo con el token del pedido, firma JPG/PNG/WEBP, hasta 2 MB) | `test-requirements.js` |
| RFI-09 Estado del pedido | `mobile/pages/OrderTrackingPage.tsx` (se actualiza cada 10 s); `GET /api/pedidos/:id` sin datos personales | `test-requirements.js` |
| RFI-10 Historial y repetir | `mobile/pages/OrdersPage.tsx`, `lib/repeatOrder.ts`; `GET /api/customers/me/orders` | `test-requirements.js` y navegador |
| RFI-11 Dashboard de ventas, pedidos y más pedidos | `app/js/admin/modules/dashboard.module.js` (ventas hoy/mes, pedidos, ticket, en curso, pagos por verificar, curva por hora/7 días, canales, top 5, tiempos) | Navegador; `test-system.js` SEC-07 |
| RFI-12 KDS por estado con alerta sonora | `kanban.module.js`, `services/sync.service.js` (suena con pedido nuevo, pedido web, constancia recibida y fallo de despacho) | Navegador |
| RFI-13 Verificar pago | KDS: "Ver constancia" y "Verificar"; el servidor no deja pasar a cocina un pago digital sin verificar | `test-requirements.js`, `test-backend.js` |
| RFI-14 n8n envía la comanda al motorizado | `tools/backend/dispatch.js`, `routes/dispatch.routes.js`, `automation/n8n/despacho-motorizado.workflow.json`; motorizados en Usuarios | `test-requirements.js` (con un n8n simulado) |
| RFI-15 Productos, promociones, precios y stock | `app/js/admin/modules/catalog.module.js`; la web aplica precios, stock, altas y bajas (`web/src/services/catalog.api.ts`) | `test-backend.js`, navegador |

## Requerimientos no funcionales

| ID | Cómo se cumple |
|---|---|
| RNF-01 | Pedidos, pagos, constancias, despacho y carta exigen sesión del personal; motorizados y cambios de carta solo administrador. |
| RNF-02 | El servidor cotiza con el catálogo en céntimos; subtotal y total siempre recalculados (`normalizeOrder`). |
| RNF-03 | El seguimiento público y el historial no incluyen nombre, celular, dirección ni GPS. El mensaje al grupo de motorizados solo lleva código, productos y cobro; la comanda completa va en privado al motorizado asignado. Clientes, constancias y secreto están en `.gitignore`. |
| RNF-04 | Validación en servidor de cuentas, direcciones, pedidos, constancias (firma del archivo), motorizados y configuración (lista blanca). |
| RNF-05 | Pedidos y estado de despacho en disco con escritura atómica. Si n8n falla, el pedido igual pasa a reparto, queda "n8n falló" en el KDS, suena una alerta y se puede reintentar o registrar la coordinación manual ("Ya lo coordiné"). |
| RNF-06 | KDS cada 2,5 s. n8n espera `dispatchAlertMinutes` (5 por defecto, editable en Usuarios > Motorizados) y alerta al operador si nadie tomó el pedido. |
| RNF-07 | Interfaz en español, móvil primero, con mensajes de validación junto a cada campo. |
| RNF-08 | Solo APIs estándar (fetch, canvas, geolocalización opcional); el mapa no depende de librerías. |
| RNF-09 | Rutas, repositorios y servicios separados por responsabilidad; este documento y los comentarios de cada módulo. |
| RNF-10 | `Iniciar app (celular).cmd` sirve tienda, app y panel con `tools/node.cmd` (Node instalado o el de Antigravity). Requiere `web/dist` compilado una vez. |
| RNF-11 | `tools/test-requirements.js` más las suites anteriores; `Ejecutar pruebas.cmd` corre todas. |
| RNF-12 | Sin pasarela de tarjeta ni bot: la constancia la verifica caja; n8n solo automatiza el despacho. |

## Configurar n8n

1. Importa `automation/n8n/despacho-motorizado.workflow.json` en n8n.
2. En n8n define `RTQ_N8N_TOKEN`, `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` y `WHATSAPP_GROUP_ID` (el flujo envía `{ to, text }` por HTTP; adapta el nodo a tu proveedor de WhatsApp).
3. En el backend define `RTQ_N8N_WEBHOOK_URL` (URL del webhook `rtq-despacho`), el mismo `RTQ_N8N_TOKEN` y `RTQ_PUBLIC_URL`.
4. Registra a los motorizados en Panel > Usuarios > Motorizados.

## Límites conocidos

- Con `RTQ_STORAGE=postgres`, constancia y despacho todavía no se guardan (falta una migración con una columna `jsonb`) y las cuentas de clientes se guardan en `data/customers.db.json`.
- La recuperación de contraseña se atiende por WhatsApp: no hay servidor de correo.
- El flujo de n8n no se probó contra una instancia real; el backend sí se prueba contra un n8n simulado.
