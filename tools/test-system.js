/**
 * Test de Verificación Integral: Fase 1 + Fase 2
 * Valida:
 * 1. Servidor Node.js y persistencia ACID de pedidos (Phase 1)
 * 2. Autenticación por PIN y control de acceso (Phase 1)
 * 3. Protección contra Stored XSS y Path Traversal (Phase 1)
 * 4. Fuente Única de Verdad: Configuración del negocio (/api/config) (Phase 2)
 * 5. Fuente Única de Verdad: Catálogo unificado (/api/catalog) (Phase 2)
 * 6. Ciclo de vida del catálogo: Crear, conmutar stock y eliminar en disco (Phase 2)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// Estas pruebas crean, modifican y borran registros. Si se ejecutan desde el proyecto,
// se copian a una carpeta temporal y se ejecutan allí para no tocar data/ del negocio.
const projectRoot = path.resolve(__dirname, '..');
const realTemp = fs.realpathSync.native(os.tmpdir());
const runningInTemp = fs.realpathSync.native(projectRoot).startsWith(realTemp + path.sep);

function runInTemporaryCopy() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-system-test-'));
  try {
    for (const folder of ['tools', 'data', 'app']) fs.cpSync(path.join(projectRoot, folder), path.join(tempRoot, folder), { recursive: true });
    fs.cpSync(path.join(projectRoot, 'web', 'src'), path.join(tempRoot, 'web', 'src'), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, 'Iniciar app (celular).cmd'), path.join(tempRoot, 'Iniciar app (celular).cmd'));
    console.log(`Ejecutando en copia temporal: ${tempRoot}`);
    const result = spawnSync(process.execPath, [path.join(tempRoot, 'tools', 'test-system.js')], { stdio: 'inherit', timeout: 60000 });
    process.exitCode = result.status === 0 ? 0 : 1;
  } finally {
    const resolved = path.resolve(tempRoot);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('rtq-system-test-')) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

if (!runningInTemp) {
  runInTemporaryCopy();
} else {
  process.argv = ['node', 'tools/server.js', '--port', '3098', '--pin', '2026'];
  require('./server.js');
  setTimeout(runTests, 500);
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 3098,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n--- INICIANDO BATERÍA DE PRUEBAS INTEGRALES (FASE 1 + FASE 2) ---\n');
  let passed = 0;
  let total = 0;

  async function assert(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ [FAIL] ${desc}:`, e.message);
    }
  }

  // 1. Obtener token de admin
  let authToken = '';
  await assert('Autenticación Admin: Obtener token con PIN 2026', async () => {
    const res = await request('POST', '/api/auth/login', { pin: '2026' });
    if (res.status !== 200 || !res.body.token) throw new Error('No devolvió token');
    authToken = res.body.token;
  });

  // 2. Fuente Única de Verdad: Configuración del Negocio
  await assert('Fuente Única de Verdad: GET /api/config devuelve datos oficiales unificados', async () => {
    const res = await request('GET', '/api/config');
    if (res.status !== 200 || res.body.whatsappInternational !== '51912266950') {
      throw new Error(`Config inválida o teléfono desincronizado: ${JSON.stringify(res.body)}`);
    }
  });

  // 3. Fuente Única de Verdad: Catálogo Maestro
  await assert('Fuente Única de Verdad: GET /api/catalog devuelve productos maestros en disco', async () => {
    const res = await request('GET', '/api/catalog');
    if (res.status !== 200 || !Array.isArray(res.body) || res.body.length < 40) {
      throw new Error(`Catálogo inválido o incompleto: ${res.body?.length} productos`);
    }
  });

  // 4. Catálogo: Creación y Persistencia Transaccional
  const testProd = {
    id: 'test_tequeno_premium',
    name: 'Tequeños Premium Trufados',
    cat: 'Especiales',
    price: 24.50,
    qty: '10 unid.',
    sauces: 'Salsa tártara trufada',
    badge: 'NUEVO',
    desc: 'Edición limitada con queso artesanal.',
    stock: true
  };

  await assert('Catálogo: POST /api/catalog guarda producto con token en catalog.db.json', async () => {
    const res = await request('POST', '/api/catalog', testProd, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200 || !res.body.product) throw new Error(`Fallo guardado: ${res.status}`);

    const dbRaw = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'catalog.db.json'), 'utf8');
    if (!dbRaw.includes('test_tequeno_premium')) throw new Error('No se persistió en catalog.db.json');
  });

  // 5. Catálogo: Conmutación de Stock (Stock toggle)
  await assert('Catálogo: PATCH /api/catalog/:id/stock actualiza stock en backend', async () => {
    const res = await request('PATCH', '/api/catalog/test_tequeno_premium/stock', { stock: false }, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200 || res.body.product?.stock !== false) {
      throw new Error(`Stock no conmutado: ${JSON.stringify(res.body)}`);
    }
  });

  // 6. Catálogo: Eliminación (DELETE)
  await assert('Catálogo: DELETE /api/catalog/:id remueve el producto del archivo en disco', async () => {
    const res = await request('DELETE', '/api/catalog/test_tequeno_premium', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200 || !res.body.ok) throw new Error(`Fallo borrado: ${res.status}`);

    const dbRaw = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'catalog.db.json'), 'utf8');
    if (dbRaw.includes('test_tequeno_premium')) throw new Error('El producto no fue removido del archivo');
  });

  // 7. Verificación de Código: Cero String-Sniffing en ProductConfiguratorModal.tsx
  await assert('Arquitectura: Verificación de eliminación completa de "sniff" en ProductConfiguratorModal.tsx', async () => {
    const code = fs.readFileSync(path.resolve(__dirname, '..', 'web', 'src', 'components', 'configurator', 'ProductConfiguratorModal.tsx'), 'utf8');
    if (code.includes('const sniff =') || code.includes('sniff(')) {
      throw new Error('Aún existe lógica de "sniff" en ProductConfiguratorModal.tsx');
    }
    if (code.includes('productOrPromo: any;')) {
      throw new Error('Aún existe tipado "any" en ProductConfiguratorModal.tsx');
    }
  });

  // 8. Verificación de Teléfono en App Móvil
  await assert('Consistencia: Verificación de teléfono oficial en app/js/mobile/services/order.service.js', async () => {
    const code = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'js', 'mobile', 'services', 'order.service.js'), 'utf8');
    if (code.includes('51952741852')) {
      throw new Error('Aún existe el número erróneo 51952741852 en order.service.js');
    }
    if (!code.includes('51912266950')) {
      throw new Error('No se encontró el número oficial 51912266950 en order.service.js');
    }
  });

  // 9. Seguridad: Protección contra Fuga de PII en GET /api/pedidos
  await assert('Seguridad [SEC-02]: GET /api/pedidos sin autenticación es bloqueado con 401 (Anti-PII Leak)', async () => {
    const res = await request('GET', '/api/pedidos');
    if (res.status !== 401) {
      throw new Error(`Esperado 401, recibido ${res.status}`);
    }
  });

  // 10. Seguridad: Acceso Autorizado a Comandas con Token
  await assert('Seguridad: GET /api/pedidos con token de admin devuelve comandas completas', async () => {
    const res = await request('GET', '/api/pedidos', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200 || !Array.isArray(res.body)) {
      throw new Error(`Esperado 200 con array de pedidos, recibido ${res.status}`);
    }
  });

  // 11. Seguridad: Control de Acceso Roto (BOLA/BAC) Bloqueado en Mutación de Pedidos
  await assert('Seguridad [SEC-01]: PATCH /api/pedidos/:id sin token es bloqueado con 401', async () => {
    const res = await request('PATCH', '/api/pedidos/RTQ-2064', { status: 'delivered' });
    if (res.status !== 401) {
      throw new Error(`Fallo de seguridad: se permitió mutar pedido sin autenticación (${res.status})`);
    }
  });

  // 12. Seguridad: Mutación Autorizada de Pedido con Token
  await assert('Seguridad: PATCH /api/pedidos/:id con token actualiza estado de pedido', async () => {
    const res = await request('PATCH', '/api/pedidos/RTQ-2064', { status: 'kitchen' }, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200 || res.body.order?.status !== 'kitchen') {
      throw new Error(`Fallo al actualizar estado con token: ${res.status}`);
    }
  });

  // 13. Seguridad: Sanitización Estricta de ID contra Stored XSS en Inserción de Pedidos
  await assert('Seguridad [SEC-03]: POST /api/pedidos sanitiza ID contra inyección de comillas/etiquetas', async () => {
    const maliciousPayload = {
      id: "RTQ-XSS');alert(1);//",
      customer: 'Atacante XSS',
      phone: '999999999',
      items: [{ name: 'Test', qty: 1, price: 10 }],
      total: 10
    };
    const res = await request('POST', '/api/pedidos', maliciousPayload);
    if (res.status !== 201 || !res.body.order) {
      throw new Error(`Fallo creación pedido: ${res.status}`);
    }
    const cleanId = res.body.order.id;
    if (cleanId.includes("'") || cleanId.includes('"') || cleanId.includes(';') || cleanId.includes('<')) {
      throw new Error(`El ID no fue sanitizado adecuadamente: ${cleanId}`);
    }
  });

  // 14. Red: Verificación de Cabeceras CORS (Soporte DELETE)
  await assert('Red [CORS-01]: Cabecera Access-Control-Allow-Methods incluye DELETE', async () => {
    const res = await request('OPTIONS', '/api/catalog');
    const allowMethods = res.headers['access-control-allow-methods'] || '';
    if (!allowMethods.includes('DELETE')) {
      throw new Error(`CORS no incluye DELETE: "${allowMethods}"`);
    }
  });

  // 15. DevOps: Verificación del Lanzador Iniciar app (celular).cmd
  await assert('DevOps [DEV-01]: Iniciar app (celular).cmd inicia con @echo off sin erratas', async () => {
    const launcher = fs.readFileSync(path.resolve(__dirname, '..', 'Iniciar app (celular).cmd'), 'utf8');
    if (launcher.startsWith('a@echo off')) {
      throw new Error('Aún existe la errata "a@echo off"');
    }
    if (!launcher.startsWith('@echo off')) {
      throw new Error('No comienza con "@echo off"');
    }
  });

  // 16. Consistencia: Teléfono Oficial en Comanda Térmica
  await assert('Consistencia [CONFIG-01]: Comanda térmica en kanban.module.js imprime teléfono oficial 51912266950', async () => {
    const kanbanCode = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'js', 'admin', 'modules', 'kanban.module.js'), 'utf8');
    if (kanbanCode.includes('+51 952 000 111')) {
      throw new Error('Aún existe el número antiguo "+51 952 000 111" en kanban.module.js');
    }
    if (!kanbanCode.includes('51 912 266 950')) {
      throw new Error('No se encontró el número oficial "51 912 266 950" en kanban.module.js');
    }
  });

  // 17. Seguridad: Sanitización XSS en Motor de Cupones (promos.module.js)
  await assert('Seguridad [SEC-06]: promos.module.js contiene escapeHtml y neutralización de CSV', async () => {
    const code = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'js', 'admin', 'modules', 'promos.module.js'), 'utf8');
    if (!code.includes('function escapeHtml(str)')) {
      throw new Error('No se encontró función escapeHtml en promos.module.js');
    }
    if (!code.includes('escapeHtml(c.code)')) {
      throw new Error('No se está sanitizando c.code en renderCoupons');
    }
    if (!code.includes('sanitizeCsvCell')) {
      throw new Error('No se encontró función sanitizeCsvCell para prevenir inyección CSV');
    }
  });

  // 18. Seguridad: Sanitización XSS en Dashboard Feedback (dashboard.module.js)
  await assert('Seguridad [SEC-07]: dashboard.module.js sanitiza opiniones de clientes y productos', async () => {
    const code = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'js', 'admin', 'modules', 'dashboard.module.js'), 'utf8');
    if (!code.includes('function escapeHtml(str)')) {
      throw new Error('No se encontró función escapeHtml en dashboard.module.js');
    }
    if (!code.includes('escapeHtml(r.customer)')) {
      throw new Error('No se está sanitizando r.customer en renderDashboardFeedback');
    }
  });

  // 19. Seguridad: Sanitización XSS en Encuestas (surveys.module.js)
  await assert('Seguridad [SEC-08]: surveys.module.js sanitiza tarjetas de encuestas en renderSurveys', async () => {
    const code = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'js', 'admin', 'modules', 'surveys.module.js'), 'utf8');
    if (!code.includes('escapeHtml(s.id)')) {
      throw new Error('No se está sanitizando s.id en renderSurveys');
    }
    if (!code.includes('escapeHtml(s.title)')) {
      throw new Error('No se está sanitizando s.title en renderSurveys');
    }
  });

  // 20. Integridad Financiera: Servidor recalcula y defiende subtotal y total contra manipulación
  await assert('Integridad Financiera [FIN-01]: Servidor rechaza totales manipulados y recalcula subtotal/total', async () => {
    const tamperedOrder = {
      id: 'RTQ-TAMPERED-01',
      customer: 'Auditor Financiero',
      phone: '952000000',
      items: [
        { name: 'Tequeños', qty: 2, price: 20.00 }, // subtotal real = 40.00
        { name: 'Bebida', qty: 1, price: 10.00 }    // total acumulado = 50.00
      ],
      deliveryFee: 5.00,
      discount: 0,
      subtotal: 0.10, // Intento de manipulación de cliente
      total: 0.10     // Intento de pagar 10 centavos por S/ 55.00
    };
    const res = await request('POST', '/api/pedidos', tamperedOrder);
    if (res.status !== 201 || !res.body.order) {
      throw new Error(`Fallo creación pedido de prueba: ${res.status}`);
    }
    const saved = res.body.order;
    if (saved.subtotal !== 50.00) {
      throw new Error(`Servidor no corrigió el subtotal manipulado: esperado 50.00, recibido ${saved.subtotal}`);
    }
    if (saved.total !== 55.00) {
      throw new Error(`Servidor no protegió el total financiero: esperado 55.00, recibido ${saved.total}`);
    }
  });

  // 21. Precisión Matemática: Redondeo monetario con Epsilon
  await assert('Precisión Matemática [MATH-01]: Redondeo en web/src/lib/money.ts elimina desbordamiento decimal', async () => {
    const moneyFile = fs.readFileSync(path.resolve(__dirname, '..', 'web', 'src', 'lib', 'money.ts'), 'utf8');
    if (!moneyFile.includes('roundMoney')) {
      throw new Error('No se encontró función roundMoney en web/src/lib/money.ts');
    }
    if (!moneyFile.includes('Number.EPSILON')) {
      throw new Error('roundMoney debe usar Number.EPSILON para precisión de punto flotante');
    }
  });

  // Limpieza Post-Pruebas: Restaurar estado original de pedidos en disco
  try {
    const dbPath = path.resolve(__dirname, '..', 'data', 'orders.db.json');
    if (fs.existsSync(dbPath)) {
      const orders = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const cleaned = orders
        .filter(o => !o.id.includes('XSS') && !o.id.includes('TAMPERED'))
        .map(o => {
          if (o.id === 'RTQ-2064') {
            return { ...o, status: 'new', time: 'Recién recibido', elapsedMinutes: 0 };
          }
          return o;
        });
      fs.writeFileSync(dbPath, JSON.stringify(cleaned, null, 2), 'utf8');
    }
  } catch (e) {}

  console.log(`\n======================================================`);
  console.log(`RESUMEN: ${passed}/${total} pruebas pasaron exitosamente.`);
  console.log(`======================================================\n`);

  process.exit(passed === total ? 0 : 1);
}
