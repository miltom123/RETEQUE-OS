/**
 * RETEQUEÑOS OS - Punto de entrada del servidor local
 *
 * Mantiene la misma forma de uso de siempre (node tools/server.js [--port N] [--lan] [--pin PIN])
 * y sigue empezando a escuchar al ejecutarse o al hacer require('./server.js'), porque los
 * lanzadores .cmd y tools/test-system.js dependen de ello.
 *
 * La lógica vive en tools/backend/ (ver documentacion/ARQUITECTURA_BACKEND_MODULAR.md).
 * Para pruebas sin abrir puertos ni usar data/, importar createApp desde ./backend/app.
 */
const os = require('os');
const { parseArgs } = require('./backend/config');
const { createApp } = require('./backend/app');
const { DataFileError } = require('./backend/repositories/json-file');

// Detección de IP local para conexión celular
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const { port: PORT, bindAll: BIND_ALL, adminPin, legacyPinEnabled } = parseArgs(process.argv.slice(2), process.env);

// Inicio del servidor
function startServer({ server, paths }) {
  const bindHost = BIND_ALL ? '0.0.0.0' : '127.0.0.1';
  server.listen(PORT, bindHost, () => {
    const localIp = getLocalIp();
    console.log('======================================================');
    console.log('RETEQUEÑOS OS - SERVIDOR DE PRODUCCIÓN LOCAL');
    console.log('======================================================');
    console.log(`✓ Servidor activo en:    http://localhost:${PORT}`);
    console.log(`✓ Panel Administrador:   http://localhost:${PORT}/admin`);
    console.log(`✓ API REST Pedidos:      http://localhost:${PORT}/api/pedidos`);
    console.log('✓ Acceso del equipo:     administrador / caja');
    if (legacyPinEnabled) console.log('✓ Acceso PIN heredado:   habilitado expresamente');
    console.log(process.env.RTQ_STORAGE === 'postgres'
      ? '✓ Persistencia: PostgreSQL mediante Supabase (solo backend)'
      : `✓ Persistencia en disco: ${paths.ordersFile}`);

    if (BIND_ALL && localIp) {
      console.log(`✓ Acceso desde celular:  http://${localIp}:${PORT} (WiFi local)`);
    } else if (!BIND_ALL) {
      console.log(`* Modo local estricto. Para abrir a la red WiFi usa: --lan`);
    }
    console.log('======================================================\n');
  });
}

// Un archivo de datos ilegible detiene el arranque con un mensaje claro y sin tocar el archivo
let app = null;
try {
  app = createApp({ adminPin, legacyPinEnabled });
} catch (error) {
  if (!(error instanceof DataFileError)) throw error;
  console.error('======================================================');
  console.error('RETEQUEÑOS OS - EL SERVIDOR NO SE INICIÓ');
  console.error(error.message);
  console.error('======================================================');
  process.exitCode = 1;
}

if (app) startServer(app);
