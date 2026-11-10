# Pasar la API de producción a Supabase

Mientras la API en Render guarde en archivos JSON, cada redespliegue o reinicio puede borrar los pedidos: el disco del plan gratuito no es permanente. Con `RTQ_STORAGE=postgres` los pedidos, el catálogo, la configuración y los usuarios viven en Supabase y sobreviven a los reinicios.

Estos pasos los hace el propietario. Ninguna clave se pega en el chat, en el código ni en un commit.

## 1. Crear el proyecto

En supabase.com, organización Miltom123, crear el proyecto RETEQUE-OS (plan Free, región Americas). Guardar la contraseña de la base en un gestor de contraseñas; la API no la usa.

## 2. Crear las tablas

En el SQL Editor del proyecto, pegar y ejecutar el contenido de cada archivo de `supabase/migrations/`, uno por uno y en este orden:

1. `20261030000000_transactional_storage.sql`
2. `20261030010000_catalog_config_import.sql`
3. `20261109000000_product_options.sql`
4. `20261109010000_order_statuses.sql`

## 3. Cargar la carta y la configuración

En Project Settings → API Keys copiar la URL del proyecto y la clave secreta (`sb_secret_…`). En una terminal de esta carpeta, con una copia de `data/` en una carpeta temporal:

```powershell
$env:SUPABASE_URL = '<url del proyecto>'
$env:SUPABASE_SECRET_KEY = '<clave secreta>'
node tools/migrate-json-to-postgres.js <carpeta-temporal> --catalog-config-only --dry-run
node tools/migrate-json-to-postgres.js <carpeta-temporal> --catalog-config-only
```

Esto sube solo productos y configuración. No sube pedidos ni usuarios.

## 4. Configurar Render

En el servicio de la API, Environment, agregar:

| Variable | Valor |
|---|---|
| `RTQ_STORAGE` | `postgres` |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SECRET_KEY` | clave secreta `sb_secret_…` |
| `RTQ_ADMIN_PASSWORD` | contraseña del administrador, 8 caracteres o más |
| `RTQ_CAJA_PASSWORD` | contraseña de caja, 8 caracteres o más |

Guardar y dejar que Render redespliegue. Al arrancar con la base sin usuarios, la API crea `administrador` y `caja` con esas contraseñas. Si ya hay usuarios no crea ni cambia ninguno.

## 5. Comprobar

- El registro de Render muestra `Persistencia: PostgreSQL mediante Supabase` y `Cuentas iniciales creadas`.
- Entrar al panel con `administrador`.
- Hacer un pedido de prueba en la web, confirmarlo en el panel, pulsar "Manual Deploy" en Render y verificar que el pedido sigue ahí.

## Lo que hay que saber

- Los pedidos que hoy están en los archivos de Render no se copian. Hacer el cambio con la tienda cerrada y sin pedidos por confirmar.
- Para volver atrás basta quitar `RTQ_STORAGE`; los pedidos creados en Supabase se quedan en Supabase.
- Las sesiones del panel y la protección contra pedidos duplicados siguen en memoria: tras un reinicio hay que volver a iniciar sesión.
- Supabase Free pausa los proyectos sin actividad durante una semana. Con la tienda en uso no ocurre.
