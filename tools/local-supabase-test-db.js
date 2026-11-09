// SOLO pruebas: acceso al contenedor local de Supabase de este proyecto.
const { spawn } = require('child_process');
const assert = require('node:assert/strict');

function requireLocal() {
  assert.equal(process.env.RTQ_TEST_SUPABASE_LOCAL, '1', 'Falta habilitar explícitamente las pruebas locales');
  const url = new URL(process.env.SUPABASE_URL);
  assert.equal(url.origin, 'http://127.0.0.1:54321', 'Solo se permite Supabase local de RETEQUE-OS');
}
function sql(query, asService = true) {
  requireLocal();
  return new Promise((resolve,reject)=>{
    const child = spawn('docker', ['exec','-i','supabase_db_reteque-os','psql','-X','-w','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'],
      {windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',errorOutput='';
    child.stdout.on('data',d=>output+=d); child.stderr.on('data',d=>errorOutput+=d);
    child.on('error',()=>reject(new Error('No se pudo acceder al contenedor local de pruebas')));
    child.on('close',code=>{
      if(code) { const error=new Error('Supabase local rechazó la operación SQL de pruebas'); error.code=(errorOutput.match(/ERROR:\s+([A-Z0-9]{5})/)||[])[1]; reject(error); }
      else resolve(output.trim());
    });
    child.stdin.end(`BEGIN; SET LOCAL log_min_error_statement = 'panic'; ${asService?'SET LOCAL ROLE service_role;':''} ${query}; COMMIT;`);
  });
}
async function clearFixture() {
  await sql('TRUNCATE public.order_items,public.orders,public.products,public.staff_users,public.store_config RESTART IDENTITY CASCADE',false);
}
module.exports = { requireLocal, sql, clearFixture };
