# PostgreSQL transaccional mediante Supabase

Fecha: 2026-10-30. Base comprobada: rama `refactor/backend-modular`, HEAD `e82a5d70d58ed9e2a03c27e485d4e85b4caa5975`, árbol limpio antes de editar.

Estado y restricciones actualizados: [PLAN_SUPABASE_PRUEBAS.md](PLAN_SUPABASE_PRUEBAS.md). El propietario autorizó crear el proyecto de pruebas y usar npx/Supabase local. El esquema remoto y cualquier carga siguen pendientes. No se permite cargar pedidos ni usuarios en la nube.

## Alcance y decisiones

`RTQ_STORAGE=json|postgres` selecciona los repositorios en `createApp`. El valor por defecto sigue siendo `json`. No se cambian las URL HTTP ni los permisos del panel. Las rutas y la autenticación esperan los resultados de los repositorios; los métodos JSON conservan su retorno síncrono, los PostgreSQL devuelven promesas. Los normalizadores de pedidos y catálogo se comparten para conservar las reglas actuales.

No se añade ninguna dependencia. Node 18 o posterior aporta `fetch` y `AbortSignal.timeout`. Se usa PostgREST de Supabase con `SUPABASE_URL` y `SUPABASE_SECRET_KEY` (clave actual `sb_secret_…`, enviada solo en apikey). Se conserva `SUPABASE_SERVICE_ROLE_KEY` como alternativa para el JWT heredado, enviado también como Bearer. No se necesita `pg`, una contraseña SQL ni una URL con credenciales para el backend. Ninguna clave debe ponerse en variables `VITE_`, código frontend, repositorios ni logs.

Varias peticiones REST independientes no forman una transacción. Por eso `rtq_write_order` inserta el pedido y todos sus ítems en una sola llamada SQL, y `rtq_import_snapshot` importa y verifica todo el conjunto en otra llamada única. PostgREST confirma o revierte la transacción de cada RPC. Las funciones son `SECURITY INVOKER`, con `search_path` fijo, sin SQL dinámico y con parámetros JSONB.

Referencias oficiales: [transacciones de PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html), [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Esquema

La migración está en `supabase/migrations/20261030000000_transactional_storage.sql`.

| Tabla | Responsabilidad y restricciones |
|---|---|
| `products` | ID de texto original, nombre, icono, categoría, cantidad descriptiva, precio, promoción nullable, salsas, distintivo, descripción y stock booleano. Índice de categoría. |
| `store_config` | Una sola fila: PK booleana con `CHECK(id)`. Objeto JSONB completo, incluidas redes y objeto Yape. La configuración pequeña cambia como una unidad; JSONB conserva el PATCH superficial existente y campos adicionales. |
| `orders` | Metadatos de pedido, importes y fecha nullable. CHECK de canal, modalidad, estado e importes no negativos. Índices de fecha y estado/fecha. `createdBy` es texto histórico, sin FK que impida conservar pedidos de usuarios ausentes. |
| `order_items` | PK `(order_id, position)`, FK del pedido con borrado en cascada, `product_id` nullable con FK a productos y `ON DELETE SET NULL`. Cantidad entera positiva y precio no negativo. `original_product_id` conserva la referencia histórica. |
| `staff_users` | PK username, nombre, rol admin/cashier, activo, salt, passwordHash scrypt y fecha. Sin Supabase Auth ni creación automática de usuarios. |

Todo el dinero se almacena como `numeric(10,2)`: representa soles decimales exactamente y permite conciliar las sumas dentro de PostgreSQL. El migrador rechaza negativos, más de dos decimales y valores fuera de rango en vez de redondearlos silenciosamente. La suma del origen usa centavos con BigInt y la de destino NUMERIC; los informes de conciliación muestran el total como texto decimal. Cantidades y minutos usan enteros. Las secuencias internas conservan el orden de las listas; un upsert no cambia el orden ya existente. La segunda importación puede consumir números de secuencia, pero no duplica ni cambia los datos lógicos.

Las cinco tablas tienen RLS, sin políticas públicas. Además se revocan permisos de tablas y EXECUTE de todas las funciones a PUBLIC, anon y authenticated. Solo service_role recibe los permisos de backend. Ese rol omite RLS: la clave debe mantenerse secreta y los permisos de administrador/caja siguen aplicándose en Node. No se expone una consulta SQL genérica ni funciones SECURITY DEFINER.

## Migrador

```powershell
node tools/migrate-json-to-postgres.js <carpeta-temporal> --dry-run
# Solo después de autorizar la escritura en el destino correspondiente:
node tools/migrate-json-to-postgres.js <carpeta-temporal>
# Repetir el mismo comando para comprobar idempotencia.
```

La carpeta de entrada es obligatoria. El script solo la lee. `--dry-run` no consulta la red ni exige credenciales. Valida los campos conocidos, tipos, enumeraciones, IDs repetidos, importes, fechas con zona y hashes. Rechaza campos desconocidos en productos, pedidos, ítems y usuarios para evitar pérdida silenciosa; la configuración JSONB conserva campos adicionales. Los errores identifican colección, posición y campo, nunca sus valores. El modo completo está limitado a localhost; `--catalog-config-only` no abre ni transmite los archivos de pedidos/usuarios y usa una RPC separada que escribe solo productos y configuración.

La importación hace upsert de productos y pedidos por ID, usuarios por username y configuración por su clave única. Reemplaza los ítems de cada pedido usando la posición como identidad. No borra pedidos, productos ni usuarios sobrantes del destino: si el destino contiene datos ajenos al conjunto, la conciliación completa falla y revierte todos los cambios. Usar un destino vacío o el mismo conjunto previamente importado, con el negocio sin escrituras durante la transición.

Se bloquean las tablas durante la importación para evitar escrituras concurrentes. Antes del COMMIT se compara cada campo de todas las filas, ítems incluidos, normalizando fechas y tipos SQL. Se verifican también conteos y suma de totales. Una diferencia genera `RT001`, revierte todo y devuelve únicamente los nombres de colecciones discrepantes. No se imprimen registros, claves ni hashes.

Tratamientos explícitos:

- Pedido sin `createdAt`: se guarda NULL. Sigue visible para administración y excluido de caja por la regla de fecha. No se inventa la fecha de migración.
- Referencia a producto desconocido: `product_id` queda NULL y `original_product_id` conserva el texto original; la API conserva ese `productId` histórico. Un producto eliminado posteriormente usa el mismo mecanismo.
- Campos opcionales históricos ausentes: quedan NULL, incluidas salsas ausentes. Las nuevas escrituras usan los valores del normalizador existente. Las fechas válidas se representan como instantes UTC; el formato textual puede pasar de `Z` a `+00:00`.
- Archivo de usuarios ausente: se migran cero usuarios, sin inventar cuentas o contraseñas. La instalación PostgreSQL no permitirá iniciar sesión hasta importar usuarios válidos. Preparar las cuentas en una copia temporal, con contraseñas elegidas por el propietario, antes de autorizar la carga.

## Configuración y operación

`.env.example` contiene solo nombres y valores vacíos. `.env` y `.env.*` están ignorados, con excepción de `.env.example`. Node no carga esos archivos automáticamente; se pueden usar variables del proceso o `node --env-file=<archivo-privado> tools/server.js` en una versión de Node que admita esa opción. No copiar secretos al chat ni añadirlos a los comandos registrados.

Para Supabase local, una vez disponibles CLI y Docker:

```powershell
supabase start
supabase db reset --local
# Configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY mediante el entorno privado.
node tools/migrate-json-to-postgres.js <carpeta-temporal> --dry-run
node tools/migrate-json-to-postgres.js <carpeta-temporal>
node tools/migrate-json-to-postgres.js <carpeta-temporal>
$env:RTQ_STORAGE='postgres'
node tools/server.js
```

La primera verificación no pudo usar Supabase porque faltaba la CLI y Docker no iniciaba. En la continuación se autorizó npx (CLI 2.122.0) y la instalación de componentes locales. Se corrigieron sockets de arranque de Docker conservando sus directorios de runtime, y se instaló WSL. La prueba Supabase/PostgREST real sigue pendiente de un motor Linux operativo. No se creó un proyecto remoto ni se aplicó esquema remoto. Ver el plan actualizado para el bloqueo y los comandos exactos propuestos.

Para revisar el esquema desde Chrome, abrir el SQL Editor del proyecto que el propietario autorice y usar el contenido de la migración. Antes de pulsar Run hay que obtener autorización específica para aplicar esa migración. La importación real requiere otra autorización, con la carpeta y el proyecto de destino identificados. No se ejecutan `supabase link`, `supabase db push`, publicaciones ni despliegues en esta etapa.

Un timeout de red puede ocurrir después del COMMIT. El cliente no reintenta escrituras automáticamente. Consultar el pedido por ID antes de reintentar; el migrador se puede repetir sobre el mismo conjunto por su idempotencia.

## Verificación ejecutada

Antes de editar: `test-backend`, `test-system` (21/21), `test-access` y `test-reports` pasan. Los fallos previos separados son `syntax-check.js` por `app/index.html` ausente y `test-updated-frontend.js` por `web/dist/index.html` ausente (17 pruebas pasan, 1 falla).

Después: las cuatro suites pasan con JSON y PostgreSQL. `test-migration.js` comprueba validación, fechas, decimales, dry-run sin red y errores sin PII. `test-postgres.js --pg-bin <binarios-existentes>` crea y elimina un cluster temporal PostgreSQL 17 ligado a loopback, sin instalaciones y sin usar un servicio existente. Usa un adaptador HTTP de prueba que ejecuta las funciones SQL con el rol service_role. Las suites comprueban la persistencia en el almacenamiento seleccionado y usan copias temporales; las comprobaciones específicas de archivos ilegibles siguen ejecutándose explícitamente con JSON.

Resultado de la migración real y de su repetición sobre copias temporales:

| Métrica | Origen | Destino |
|---|---:|---:|
| Productos | 49 | 49 |
| Pedidos | 4 | 4 |
| Ítems | 8 | 8 |
| Usuarios | 0 | 0 |
| Suma de totales | 211.10 | 211.10 |

Diferencias: ninguna. Hay 3 pedidos históricos sin fecha. Se verificaron rollback de pedido e ítems, rollback de importación completa, producto desconocido, conservación de salt/hash y login scrypt, IDs concurrentes, actualizaciones concurrentes parciales, rechazo de registros sobrantes, RLS y falta de acceso público. La comprobación de RLS incluyó otorgar SELECT temporalmente a anon: obtuvo cero filas sin políticas, y se revocó el permiso.

Esta es una prueba de PostgreSQL real con un adaptador de transporte; **no es una prueba de Supabase/PostgREST real**. Falta ejecutar `tools/test-supabase.js`, que exige una clave actual sb_secret auténtica de la CLI y comprueba gateway/PostgREST. Faltan verificar allí publicación de RPC, configuración del proyecto, límites, timeouts y el ciclo completo de importación. Las suites destructivas solo aceptan loopback y fuentes dentro de os.tmpdir().

Los hashes SHA-256 de `data/` se comparan antes y después. No se hace ningún commit ni se escribe en esos archivos.

## Riesgos pendientes

- Sesiones y límites de intentos siguen en memoria; no se comparten entre instancias y se pierden al reiniciar.
- Las cuentas iniciales JSON conservan su comportamiento anterior; si no se fijan contraseñas, siguen usando el valor débil existente. PostgreSQL no las genera. No subir esas cuentas por accidente.
- Falta definir y probar respaldos, restauración, retención, revocación/rotación de claves y gestión de secretos antes de producción.
- El backend aún carga listas completas para filtrar y construir reportes en Node. La agregación JSONB evita truncamiento por max_rows de PostgREST, pero no resuelve el crecimiento del historial; faltan consultas paginadas y filtros SQL.
- Hay que detener escrituras durante el cambio definitivo para no divergir entre JSON y PostgreSQL. Volver a `RTQ_STORAGE=json` no copia a disco pedidos creados en PostgreSQL.
- La migración inicial no incluye un downgrade destructivo. Una reversión de esquema debe planificarse y autorizarse después de respaldar la base.
- Las validaciones permisivas de configuración y los precios manuales de administración siguen como antes. Esta etapa no reemplaza la futura autenticación real.

## Propuesta de commits, sin ejecutarlos

Archivos creados o modificados y su responsabilidad:

| Archivos | Responsabilidad |
|---|---|
| `supabase/migrations/20261030000000_transactional_storage.sql` | Tablas, restricciones, índices, permisos, operaciones RPC y conciliación transaccional. |
| `supabase/config.toml` | Puertos y servicios de Supabase local; sin Auth ni Storage en esta etapa. |
| `tools/migrate-json-to-postgres.js` | Validación, lectura del origen, dry-run, conteos y ejecución de la importación. |
| `tools/backend/repositories/supabase-rpc.js` | Transporte exclusivo del servidor, timeout sin reintentos y errores sin datos privados. |
| `tools/backend/repositories/postgres.repositories.js` | Implementación asíncrona de los cuatro repositorios, scrypt y operaciones del panel. |
| `tools/backend/repositories/orders.repository.js`, `catalog.repository.js` | Extracción de normalizadores compartidos; mantienen el almacenamiento JSON anterior. |
| `tools/backend/app.js` | Selección del almacenamiento y espera de la sesión. |
| `tools/backend/auth.js` | Consulta asíncrona de usuarios, credenciales y vigencia de sesión. |
| `tools/backend/routes/auth.routes.js`, `users.routes.js`, `caja.routes.js`, `orders.routes.js`, `catalog.routes.js`, `config.routes.js`, `reports.routes.js` | Espera de lecturas y escrituras; mantienen las URL y los permisos existentes. |
| `tools/server.js` | Identifica correctamente el almacenamiento al iniciar sin mostrar secretos. |
| `.env.example`, `.gitignore` | Variables vacías y exclusión de archivos de secretos y temporales Supabase. |
| `tools/test-migration.js` | Validaciones sintéticas, aislamiento del origen y manejo seguro del transporte. |
| `tools/test-postgres.js` | Cluster SQL temporal, migración doble, atomicidad, concurrencia, RLS y ejecución de suites. |
| `tools/test-storage.js` | Fixtures y comprobación de persistencia para cada almacenamiento, solo en pruebas. |
| `tools/test-backend.js`, `test-system.js`, `test-access.js` | Adaptación de las comprobaciones de persistencia y espera de autenticación; no se elimina ninguna prueba. |
| `documentacion/POSTGRESQL_SUPABASE.md`, `ARQUITECTURA_BACKEND_MODULAR.md` | Decisiones, instrucciones, resultados y estado pendiente de Supabase. |

1. `Define el esquema transaccional y los permisos privados de Supabase` — migración y configuración local.
2. `Agrega la migración verificable de JSON a PostgreSQL` — cliente RPC compartido, migrador y pruebas de validación.
3. `Permite seleccionar repositorios PostgreSQL sin cambiar las rutas` — repositorios, normalizadores, await, configuración de entorno y mensajes de inicio.
4. `Verifica la persistencia PostgreSQL y documenta la transición` — adaptación de suites, cluster aislado, resultados y riesgos.

Cada commit requiere presentar su diff, resultados y mensaje al propietario y esperar su autorización. El árbol de trabajo permanece sin commits.
