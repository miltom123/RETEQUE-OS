# Supabase: alcance autorizado y siguiente verificación

Fecha: 2026-10-30. No autoriza commits, publicaciones ni cargas remotas.

Estado comprobado al cerrar esta revisión: CLI Supabase 2.122.0 disponible mediante npx; WSL 3.0.3.0 instalado; VirtualMachinePlatform habilitada por DISM con salida 3010 (requiere reiniciar Windows). No se reinició el equipo. `npx supabase start` no pudo iniciar el stack antes de instalar esos componentes; `db reset --local` y `test-supabase.js` siguen pendientes y NO se presentan como PASS. El proyecto remoto no se creó: el formulario conserva RETEQUE-OS/Miltom123 FREE/Americas, con la contraseña aún vacía.

La recuperación de Docker conservó, sin borrar sus contenidos, los directorios de sockets en `Docker/run.reteque-backup-f7a56d18`, `Docker/run.reteque-backup-d7cda629` y `docker-secrets-engine.reteque-backup-6b1e2949`, bajo LocalAppData. No se hizo factory reset ni se tocaron volúmenes de contenedores. Docker está detenido para el reinicio.

Verificación realizada después de estos cambios: cuatro suites con JSON PASS, cuatro suites con PostgreSQL temporal PASS, validación del migrador y sus cabeceras PASS, importación SQL limitada PASS sin cambios en pedidos/usuarios, sintaxis de los scripts nuevos correcta, diff sin errores de whitespace y SHA-256 de los tres archivos de data/ idéntico. La propuesta de bootstrap del administrador sigue siendo solo una propuesta.

## Autorizaciones actuales

- Crear RETEQUE-OS en Miltom123, plan FREE, para pruebas.
- Usar npx para la CLI, iniciar Supabase local y aplicar migraciones solo con `db reset --local`.
- Instalar los componentes locales necesarios si faltan. No se ha autorizado reiniciar Windows ni restablecer Docker.
- El esquema remoto requiere una autorización posterior, después de validar Supabase local real.
- Pedidos y usuarios no se cargan en la nube. El catálogo y la configuración requieren una autorización aparte.

## Clave secreta actual

El backend admite `SUPABASE_SECRET_KEY` (`sb_secret_…`) y conserva `SUPABASE_SERVICE_ROLE_KEY` como alternativa para el antiguo JWT. La clave actual se envía en `apikey`, sin `Authorization: Bearer`: no es un JWT. Se rechazan claves `sb_publishable_…` como credencial del backend. La nueva variable tiene precedencia; para probar el JWT heredado hay que quitarla del entorno.

Referencias: [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [migración de claves](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

No se imprime ni guarda en logs la salida de `supabase status` con credenciales. La suite la analiza en memoria y verifica que la clave realmente tenga el formato actual, sin generar una cadena ficticia como sustituto de esa integración.

## Integración local real

Desde la raíz del repositorio:

```powershell
npx --yes supabase --version
npx --yes supabase start
npx --yes supabase db reset --local
node tools/test-supabase.js
```

Los comandos requieren un Docker Linux operativo. `test-supabase.js` exige el origen `http://127.0.0.1:54321` y usa únicamente el contenedor `supabase_db_reteque-os`. La inicialización de fixtures trunca las cinco tablas de este proyecto local; nunca se usa un endpoint remoto. Las llamadas del backend pasan por el gateway real de Supabase y PostgREST con la clave sb_secret obtenida de la CLI.

La suite incluye autenticación con clave actual sin Bearer, rechazo de clave pública/inválida/ausente, migración doble, conteos y totales, rollback, scrypt, fechas históricas, referencias desconocidas y las cuatro suites existentes con PostgreSQL. No sustituirla por `test-postgres.js`: esa otra prueba valida SQL real con un adaptador de transporte y sigue siendo útil, pero no valida el gateway de Supabase.

## Carga limitada a catálogo y configuración

Se añade `20261030010000_catalog_config_import.sql` y la RPC privada `rtq_import_catalog_config`. No recibe ni escribe pedidos o usuarios.

```powershell
# Validación sin red, permitida antes de la autorización de carga:
node tools/migrate-json-to-postgres.js <carpeta-temporal> --catalog-config-only --dry-run

# SOLO después de autorizar por separado el proyecto y esta carga concreta:
node tools/migrate-json-to-postgres.js <carpeta-temporal> --catalog-config-only
```

El modo limitado no abre `orders.db.json` ni `users.db.json`, ni los incluye en la petición HTTP. El modo completo ahora rechaza destinos fuera de localhost antes de enviar datos. La importación limitada comprueba todos los campos de productos y configuración en una transacción, sin borrar filas sobrantes ni tocar pedidos o usuarios.

## Comandos propuestos para aplicar el esquema remoto

Todavía NO deben ejecutarse. Antes de solicitar autorización se identificará el proyecto creado y se confirmará que la integración local pasó. La conexión se configurará mediante `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` y opciones TLS en el entorno privado; no se pondrán contraseñas ni URL con credenciales en el comando o en este documento.

Comprobación de destino, sin escribir:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -X --no-password -v ON_ERROR_STOP=1 -Atc 'SELECT current_database(), current_user, inet_server_addr();'
```

Aplicación de ambos archivos en una única transacción, sin datos:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -X --no-password -v ON_ERROR_STOP=1 --single-transaction --file 'supabase/migrations/20261030000000_transactional_storage.sql' --file 'supabase/migrations/20261030010000_catalog_config_import.sql'
```

Verificación de las cinco tablas, RLS y ausencia de políticas públicas:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -X --no-password -v ON_ERROR_STOP=1 -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('products','store_config','orders','order_items','staff_users') ORDER BY tablename; SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname='public' AND tablename IN ('products','store_config','orders','order_items','staff_users');"
```

Se presentarán esos comandos exactos junto al identificador de proyecto y los resultados locales antes de pedir autorización. Los comandos usan psql, no el SQL Editor, para mantener una transacción explícita y evitar pegar secretos en Chrome. La creación del proyecto continúa haciéndose en Chrome como pidió el propietario. Aplicar SQL con psql no registra automáticamente entradas en `supabase_migrations.schema_migrations`; si después se adopta el despliegue por CLI, su historial debe reconciliarse explícitamente antes de usar `db push`.

## Propuesta del primer administrador, sin contraseñas predeterminadas

No se ha creado ningún usuario remoto y esta propuesta no autoriza hacerlo.

1. Preparar un comando de bootstrap ejecutado por el propietario en un terminal de confianza. Pedir username, nombre y una contraseña elegida por él, dos veces y sin eco. Rechazar entrada vacía y exigir al menos 12 caracteres. No aceptar la contraseña como argumento de CLI ni usar `1234` u otro valor por defecto.
2. Generar localmente un salt aleatorio de 16 bytes y el hash scrypt de 64 bytes, con el formato hexadecimal que el login actual ya entiende. La contraseña en claro no se guarda ni se envía a Supabase.
3. Incorporar una RPC de bootstrap privada, SECURITY INVOKER y accesible solo por service_role. Dentro de una transacción, bloquear `staff_users`, comprobar que no existe ningún administrador, fijar role=admin y active=true en SQL e insertar username, nombre, salt, hash y fecha. Dos ejecuciones concurrentes deben permitir solo un primer administrador. Si ya existe alguno, fallar sin modificarlo.
4. Exigir autorización aparte para ejecutar ese bootstrap contra el proyecto remoto: crea un usuario en la nube, acción excluida del permiso de carga actual. No usar el migrador de pedidos/usuarios para esta operación.
5. Comprobar el login desde el backend y verificar que salt/hash nunca aparecen en respuestas públicas. Quitar la contraseña del entorno/memoria del proceso al terminar. Tras crear el primer administrador, retirar o revocar la RPC mediante una migración posterior autorizada.

El bootstrap es una propuesta pendiente de implementación y revisión; no se ha añadido una contraseña de arranque al servidor ni se abre un endpoint público de registro.
