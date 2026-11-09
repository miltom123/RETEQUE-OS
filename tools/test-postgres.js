/* Integración SQL real, sin instalaciones: requiere binarios PostgreSQL existentes.
 * Crea un cluster DESECHABLE en os.tmpdir(), en loopback, y lo elimina al terminar.
 * El adaptador HTTP imita únicamente las llamadas RPC usadas por el backend:
 * NO sustituye la prueba pendiente con PostgREST/Supabase.
 * Uso: node tools/test-postgres.js --pg-bin <directorio con initdb, pg_ctl y psql>
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('child_process');
const { loadSnapshot, migrate, stats } = require('./migrate-json-to-postgres');
const { SupabaseRpc } = require('./backend/repositories/supabase-rpc');

const root = path.resolve(__dirname,'..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--pg-bin') throw new Error('Uso: node tools/test-postgres.js --pg-bin <directorio>');
const bin = path.resolve(args[1]);
const exe = name => path.join(bin,name+(process.platform==='win32'?'.exe':''));
for (const name of ['initdb','pg_ctl','psql']) assert.ok(fs.existsSync(exe(name)),`Falta ${name}; no se instala nada`);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'rtq-pg-test-'));
const cluster = path.join(temporary,'cluster');
const dataDir = path.join(temporary,'data');
const key = crypto.randomBytes(32).toString('hex');
let gateway, started = false, pgPort;
const fingerprints = () => Object.fromEntries(fs.readdirSync(path.join(root,'data')).sort().filter(n=>fs.statSync(path.join(root,'data',n)).isFile()).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',n))).digest('hex')]));
const before = fingerprints();
const command = (name,args) => execFileSync(exe(name),args,{windowsHide:true,stdio:'ignore',timeout:30000});
const pgArgs = () => ['-X','-w','-h','127.0.0.1','-p',String(pgPort),'-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'];
const literal = value => "'"+JSON.stringify(value).replace(/'/g,"''")+"'::jsonb";
function sql(query, asService = true) {
  return new Promise((resolve,reject)=>{
    const child=spawn(exe('psql'),pgArgs(),{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d); child.stderr.on('data',d=>stderr+=d);
    child.on('error',()=>reject(new Error('No se pudo ejecutar psql')));
    child.on('close',code=>{
      if(code) { const error = new Error('Operación SQL rechazada'); error.code=(stderr.match(/ERROR:\s+([A-Z0-9]{5})/)||[])[1]; reject(error); }
      else resolve(stdout.trim());
    });
    child.stdin.end(`BEGIN; SET LOCAL log_min_error_statement = 'panic'; ${asService?'SET LOCAL ROLE service_role;':''} ${query}; COMMIT;`);
  });
}
async function reset(snapshot) {
  return JSON.parse(await sql(`TRUNCATE public.order_items,public.orders,public.products,public.staff_users,public.store_config RESTART IDENTITY CASCADE; SET LOCAL ROLE service_role; SELECT public.rtq_import_snapshot(${literal(snapshot)})`,false));
}
async function freePort() {
  const server=net.createServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port; await new Promise(resolve=>server.close(resolve)); return port;
}
async function suite(name,env) {
  const child=spawn(process.execPath,[path.join(root,'tools',name)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output=''; child.stdout.on('data',d=>output+=d); child.stderr.on('data',d=>output+=d);
  const timer=setTimeout(()=>child.kill(),60000);
  const code=await new Promise(resolve=>child.on('close',resolve)); clearTimeout(timer);
  // No copiar respuestas, claves o registros de las suites a la salida.
  console.log(`${name} RTQ_STORAGE=postgres: ${code===0?'PASS':'FAIL'}`);
  if (code!==0) {
    const assertion = output.match(/AssertionError[^\r\n]*|Error: [^\r\n]*/);
    throw new Error(`Falló ${name}${assertion?': '+assertion[0]:''}`);
  }
}
async function run() {
  pgPort=await freePort();
  command('initdb',['-D',cluster,'-U','postgres','--auth=trust','--encoding=UTF8','--no-locale']);
  command('pg_ctl',['-D',cluster,'-l',path.join(temporary,'postgres.log'),'-o',`-h 127.0.0.1 -p ${pgPort}`,'-w','start']); started=true;
  await sql('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS',false);
  const migration=fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()
    .map(n=>fs.readFileSync(path.join(root,'supabase/migrations',n),'utf8')).join('\n');
  await sql(migration,false);
  console.log('Migración desde cero en PostgreSQL 17 aislado: PASS');
  gateway=http.createServer(async(req,res)=>{
    if(req.method!=='POST' || req.headers.authorization!==`Bearer ${key}`) {res.writeHead(403);res.end('{}');return;}
    try {
      let body=''; for await(const chunk of req) body+=chunk;
      const input=JSON.parse(body); let value;
      if(req.url==='/test/reset') value=await reset(input);
      else if(req.url==='/rest/v1/rpc/rtq_import_snapshot') value=JSON.parse(await sql(`SELECT public.rtq_import_snapshot(${literal(input.p_snapshot)})`));
      else if(req.url==='/rest/v1/rpc/rtq_import_catalog_config') value=JSON.parse(await sql(`SELECT public.rtq_import_catalog_config(${literal(input.p_products)},${literal(input.p_config)})`));
      else if(req.url==='/rest/v1/rpc/rtq_repository') {
        const operation="'"+String(input.p_operation).replace(/'/g,"''")+"'";
        value=JSON.parse(await sql(`SELECT public.rtq_repository(${operation},${literal(input.p_payload)})`));
      } else throw new Error('RPC de prueba desconocido');
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));
    } catch(error) {res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({code:error.code||'22023'}));}
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${gateway.address().port}`;
  const db=new SupabaseRpc({url,key});
  fs.cpSync(path.join(root,'data'),dataDir,{recursive:true});
  const dry=await migrate(dataDir,{dryRun:true});
  const first=await migrate(dataDir,{db});
  const second=await migrate(dataDir,{db});
  assert.deepEqual(first.source,first.destination); assert.deepEqual(second,first);
  assert.deepEqual(dry.source,first.source); assert.deepEqual(first.differences,[]);
  console.log('Dry-run, migración real e idempotencia (copias temporales): PASS');
  console.log(JSON.stringify({source:first.source,destination:second.destination,differences:second.differences}));
  const snapshot=loadSnapshot(dataDir);
  snapshot.orders[0].createdAt=null;
  snapshot.orders[0].items[0].productId='producto-inexistente-de-prueba';
  await reset(snapshot);
  const migrated=await db.operation('orders.find',{id:snapshot.orders[0].id});
  assert.equal(migrated.createdAt,null); assert.equal(migrated.items[0].productId,'producto-inexistente-de-prueba');
  assert.equal(await sql(`SELECT count(*) FROM public.order_items WHERE product_id IS NULL AND original_product_id = 'producto-inexistente-de-prueba'`),'1');
  // El error se provoca con datos sintéticos; nunca con datos personales del origen.
  const order={...snapshot.orders[0],id:'RTQ-ATOMIC-TEST',customer:'Prueba sintética',phone:'',address:'',notes:'',reference:'',gps:'',
    items:[{productId:null,name:'Producto de prueba',qty:1,price:1,sauces:''}]};
  const fingerprint=await sql('SELECT md5(public.rtq_snapshot()::text)');
  await assert.rejects(db.operation('orders.insert',{order:{...order,items:[order.items[0],{...order.items[0],qty:0}]}}));
  assert.equal(await sql('SELECT md5(public.rtq_snapshot()::text)'),fingerprint);
  const broken={...snapshot,orders:[order,{...order,id:'RTQ-ATOMIC-INVALID',items:[{...order.items[0],qty:0}]}]};
  await assert.rejects(db.call('rtq_import_snapshot',{p_snapshot:broken}));
  assert.equal(await sql('SELECT md5(public.rtq_snapshot()::text)'),fingerprint);
  console.log('Rollback de pedido/ítems e importación, fecha ausente y FK desconocida: PASS');
  const security=JSON.parse(await sql(`SELECT json_build_object('rls',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity), 'policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public'), 'publicAccess',has_table_privilege('anon','public.orders','SELECT'), 'publicRPC',has_function_privilege('authenticated','public.rtq_repository(text,jsonb)','EXECUTE'))`,false));
  assert.deepEqual(security,{rls:5,policies:0,publicAccess:false,publicRPC:false});
  await assert.rejects(sql("SET LOCAL ROLE anon; SELECT * FROM public.orders",false));
  await assert.rejects(sql("SET LOCAL ROLE authenticated; SELECT public.rtq_snapshot()",false));
  assert.equal(await sql('GRANT SELECT ON public.orders TO anon; SET LOCAL ROLE anon; SELECT count(*) FROM public.orders; RESET ROLE; REVOKE SELECT ON public.orders FROM anon',false),'0');
  console.log('RLS, ausencia de políticas y denegación de acceso público: PASS');
  const concurrent=await Promise.allSettled([db.operation('orders.insert',{order}),db.operation('orders.insert',{order})]);
  assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
  await Promise.all([db.operation('orders.patch',{id:order.id,patch:{status:'kitchen'}}),db.operation('orders.patch',{id:order.id,patch:{payVerified:true}})]);
  const changed=await db.operation('orders.find',{id:order.id}); assert.equal(changed.status,'kitchen');assert.equal(changed.payVerified,true);
  const extraOrder={...order,id:'RTQ-EXTRA-TEST'};
  await db.operation('orders.insert',{order:extraOrder});
  const extraFingerprint=await sql('SELECT md5(public.rtq_snapshot()::text)');
  await assert.rejects(db.call('rtq_import_snapshot',{p_snapshot:snapshot}));
  assert.equal(await sql('SELECT md5(public.rtq_snapshot()::text)'),extraFingerprint);
  console.log('Concurrencia de IDs, cambios parciales y conciliación con registros sobrantes: PASS');
  const salt=crypto.randomBytes(16).toString('hex');
  const hash=crypto.scryptSync('contraseña-sintética',salt,64).toString('hex');
  snapshot.users=[{username:'prueba_scrypt',name:'Usuario de prueba',role:'admin',active:true,salt,passwordHash:hash,createdAt:new Date().toISOString()}];
  await reset(snapshot);
  const { UsersRepository }=require('./backend/repositories/postgres.repositories');
  const users=new UsersRepository(db);
  const stored=await users.find('prueba_scrypt');
  assert.equal(stored.salt,salt); assert.equal(stored.passwordHash,hash);
  assert.equal((await users.authenticate('prueba_scrypt','contraseña-sintética')).role,'admin');
  assert.equal(await users.authenticate('prueba_scrypt','otra'),null);
  console.log('Migración de salt/hash scrypt y autenticación existente: PASS');
  const privateBefore=await sql("SELECT md5((COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM public.orders o),'[]'::jsonb) || COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM public.staff_users u),'[]'::jsonb))::text)");
  const limited=await migrate(dataDir,{db,catalogConfigOnly:true});
  assert.deepEqual(limited.source,{products:JSON.parse(fs.readFileSync(path.join(dataDir,'catalog.db.json'),'utf8')).length,storeConfig:1});
  assert.deepEqual(limited.source,limited.destination);
  assert.equal(await sql("SELECT md5((COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM public.orders o),'[]'::jsonb) || COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM public.staff_users u),'[]'::jsonb))::text)"),privateBefore);
  console.log('Modo exclusivo catálogo/configuración: sin cambios en pedidos ni usuarios: PASS');
  const env={...process.env,RTQ_STORAGE:'postgres',SUPABASE_URL:url,SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:key,RTQ_TEST_SQL_BRIDGE:url,RTQ_TEST_SUPABASE_LOCAL:''};
  for(const name of ['test-backend.js','test-system.js','test-access.js','test-reports.js']) await suite(name,env);
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(gateway) await new Promise(resolve=>gateway.close(resolve));
  if(started || fs.existsSync(path.join(cluster,'postmaster.pid'))) command('pg_ctl',['-D',cluster,'-m','immediate','-w','stop']);
  assert.equal(path.dirname(path.resolve(temporary)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('rtq-pg-test-'));
  fs.rmSync(temporary,{recursive:true,force:true});
  assert.deepEqual(fingerprints(),before,'data/ debe quedar intacto');
  console.log('Hashes de data/ y eliminación del cluster temporal: PASS');
});
