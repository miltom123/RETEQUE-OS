# Backend modular: límites entre módulos y siguientes etapas

Fecha: 2026-10-30. Punto de partida: HEAD `08cb0d3`.

## Qué cambió y qué no

`tools/server.js` concentraba en un solo archivo la configuración, las utilidades HTTP, las sesiones, los repositorios JSON, las reglas de pedidos y el servidor de estáticos. En este lote ese contenido se repartió en módulos dentro de `tools/backend/`, sin cambiar el comportamiento.

- Las rutas, códigos de estado, cabeceras, mensajes y formatos JSON son los mismos. Se comprobó con una comparación de 59 peticiones contra el servidor de HEAD y el refactorizado, cada uno con datos temporales: respuestas idénticas y mismo estado final en disco.
- `tools/server.js` sigue siendo la entrada. Acepta los mismos argumentos (`--port`, `-p`, `--lan`, `-Lan`, `--pin`) y empieza a escuchar al ejecutarse o al importarse, porque `Iniciar app (celular).cmd`, `tools/serve-app.ps1` y `tools/test-system.js` dependen de ello.
- No se agregaron dependencias ni se cambió el frontend, los datos ni la forma de almacenar.

**Separar archivos no corrige ningún problema de seguridad.** Los riesgos de la sección "Riesgos que siguen abiertos" están igual que antes. Este lote solo deja cada riesgo en un módulo concreto, para corregirlo después con cambios pequeños y fáciles de revisar.

## Mapa de módulos

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `tools/server.js` | Entrada de línea de comandos: lee argumentos, crea la aplicación, llama a `listen` e imprime el mensaje de inicio. | `backend/config`, `backend/app` |
| `tools/backend/app.js` | Composición: crea repositorios, autenticación y limitadores; aplica la regla "solo administrador"; recorre las rutas en orden; devuelve un `http.Server` **sin escuchar**. | todos los de abajo |
| `tools/backend/config.js` | Rutas de carpetas (`app/`, `data/`, `web/dist`), lectura de argumentos y tipos MIME. No toca el disco. | — |
| `tools/backend/http.js` | CORS, lectura de cuerpo JSON con límite de 64 KB, respuestas JSON y extracción del token (Bearer, `x-admin-token`, cookie). Sin estado. | — |
| `tools/backend/sanitize.js` | Limpieza de identificadores, textos y URL de mapas. | — |
| `tools/backend/dates.js` | Día calendario en hora de Perú. | — |
| `tools/backend/auth.js` | Sesiones en memoria, bloqueo tras 5 intentos fallidos, PIN heredado opcional y regla de acceso de caja a pedidos del día. Cada instancia tiene su propio estado. | `users.repository`, `dates` |
| `tools/backend/rate-limit.js` | Límite de 30 pedidos públicos por minuto por IP. | — |
| `tools/backend/repositories/*.repository.js` | Lectura y escritura de `orders.db.json`, `catalog.db.json` y `store.config.json` (archivo temporal y luego `rename`). Reciben la ruta del archivo. | `sanitize` |
| `tools/users.repository.js` | Usuarios con contraseña derivada con scrypt (sin cambios; se dejó en su lugar). | — |
| `tools/reports.js` | Cálculo y exportación de reportes (sin cambios). | — |
| `tools/backend/routes/*.routes.js` | Un archivo por área: `reports`, `users`, `caja`, `auth`, `orders`, `config`, `catalog`, `static`. Cada función devuelve `true` si respondió; si no, la petición pasa a la siguiente. | `http`, repositorios, `auth` |

Reglas de dependencia:

- Las rutas no se conocen entre sí ni crean repositorios. Reciben todo lo que usan como parámetro (`deps`).
- Los repositorios no conocen HTTP ni sesiones.
- `config`, `http`, `sanitize` y `dates` no dependen de ningún otro módulo del backend.
- El orden de `API_ROUTES` en `app.js` reproduce la cadena de condiciones original. Por ejemplo, `PUT /api/pedidos` sigue llegando al servidor de estáticos y devuelve 404 en texto plano. Cambiar ese orden cambia el comportamiento.

## Pruebas sin abrir puertos ni usar `data/`

```js
const { createApp } = require('./tools/backend/app');
const app = createApp({ dataDir: carpetaTemporal, logger: { log() {}, warn() {} } });
// app.server todavía no escucha; app.handleRequest(req, res) se puede llamar directamente.
```

- Importar cualquier módulo de `tools/backend/` no abre puertos ni escribe archivos.
- `createApp` sí lee y, si falta algún archivo, escribe en `dataDir`: crea `users.db.json` con los usuarios iniciales y `orders.db.json` con la semilla. Por eso las pruebas deben pasar siempre una carpeta temporal.
- `tools/test-backend.js` sigue este patrón y verifica que `data/` no cambie.

## Riesgos que siguen abiertos (sin cambios en este lote)

| Riesgo | Dónde está ahora |
|---|---|
| `POST /api/pedidos` es público y acepta precios, `status` y `payVerified` enviados por el cliente. Además, si el `id` no es texto, la comprobación de duplicados y `insert` generan cada una un `RTQ-NNNN` aleatorio distinto; el segundo puede coincidir con un pedido existente y `insert` lo reemplaza. | `routes/orders.routes.js`, `repositories/orders.repository.js` |
| Si `orders.db.json` no se puede leer, se reemplaza por los pedidos de demostración y se pierde el contenido anterior. | `OrderRepository.init` |
| Las contraseñas iniciales de `administrador` y `caja` son `1234` si no se definen `RTQ_ADMIN_PASSWORD` y `RTQ_CAJA_PASSWORD`. | `tools/users.repository.js` |
| La autenticación del cliente en la web es simulada; las sesiones del personal viven en memoria y se pierden al reiniciar. | `web/src`, `backend/auth.js` |
| `PATCH /api/config` acepta cualquier objeto y lo mezcla con la configuración sin validarlo. | `routes/config.routes.js` |
| La persistencia en JSON reescribe el archivo completo en cada cambio: no hay transacciones entre archivos ni control de concurrencia entre procesos. | `repositories/` |

## Resuelto en la etapa de robustez mínima

- Una URL mal codificada (por ejemplo `/%E0%A4%A`) o una cabecera `Host` inválida lanzaban un error sin capturar que **detenía el proceso**. Ahora `app.js` responde 400. Cualquier otro error no controlado de una petición se registra y se responde con 500, sin exponer detalles internos.
- `tools/test-system.js` (y por tanto `Ejecutar pruebas.cmd`) modificaba `data/` real al ejecutarse desde el proyecto. Ahora se copia a una carpeta temporal y se ejecuta allí; si ya está dentro de la carpeta temporal del sistema (como cuando lo lanza `test-access.js`), se ejecuta en el lugar.

## Siguientes etapas propuestas

1. **Admisión de pedidos y precios.** En `POST /api/pedidos`, tomar los precios del catálogo como ya hace caja; ignorar `status`, `payVerified`, `createdBy` y totales enviados por el cliente; rechazar `id` existentes en lugar de reemplazarlos; validar con un esquema explícito. No reemplazar datos ilegibles con la semilla: detener el arranque y avisar.
2. **PostgreSQL transaccional.** Definir interfaces de repositorio a partir de las clases actuales, agregar una implementación PostgreSQL con migraciones versionadas y transacciones por pedido, y migrar los datos JSON con un script que se pueda verificar. Las rutas no deberían cambiar.
3. **Autenticación real.** Sesiones persistentes con expiración y revocación, obligar a cambiar las contraseñas iniciales, quitar el PIN heredado, y autenticación de clientes en la web en lugar de la simulada.
4. **Integración n8n idempotente.** Eventos de pedido emitidos después de confirmar la transacción (patrón *outbox*), con clave de idempotencia por pedido y evento, reintentos con espera creciente y firma de webhooks.
