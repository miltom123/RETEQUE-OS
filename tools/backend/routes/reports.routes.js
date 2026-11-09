// GET /api/reports y GET /api/reports/export (solo administrador; el permiso se valida en app.js)
const { buildReport, exportReport } = require('../../reports');
const { sendJson } = require('../http');
const { peruDay } = require('../dates');

async function handleReports({ req, res, pathname, parsedUrl }, { repos }) {
  if (pathname !== '/api/reports' && pathname !== '/api/reports/export') return false;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método no permitido.' });
  try {
    const report = buildReport(await repos.orders.getAll(), await repos.catalog.getAll(), parsedUrl.searchParams);
    if (pathname === '/api/reports') return sendJson(res, 200, report);
    const type = parsedUrl.searchParams.get('type') || 'details';
    const content = exportReport(report, type);
    res.writeHead(200, {
      'Content-Type': type === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="retequenos-${type}-${peruDay()}.${type === 'json' ? 'json' : 'csv'}"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
    });
    res.end(content);
    return true;
  } catch (error) { return sendJson(res, 400, { error: error.message }); }
}

module.exports = { handleReports };
