// Supabase LOCAL real: usa gateway, clave sb_secret y PostgREST del contenedor.
// Antes: npx supabase start; npx supabase db reset --local (requieren autorización).
// Esta suite borra solo las cinco tablas del proyecto local de pruebas en loopback.
const fs=require('fs');
const os=require('os');
const path=require('path');
const crypto=require('crypto');
const assert=require('node:assert/strict');
const {spawn,execFileSync}=require('child_process');
const {SupabaseRpc}=require('./backend/repositories/supabase-rpc');
const {migrate,loadSnapshot}=require('./migrate-json-to-postgres');
const {sql,clearFixture}=require('./local-supabase-test-db');
const root=path.resolve(__dirname,'..');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rtq-supabase-test-'));
const hashes=()=>Object.fromEntries(fs.readdirSync(path.join(root,'data')).sort().filter(n=>fs.statSync(path.join(root,'data',n)).isFile()).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',n))).digest('hex')]));
const before=hashes();
function localStatus(){
  // stdout contiene claves: solo se analiza en memoria, nunca se imprime ni se guarda.
  let result;
  try {
    result=process.platform==='win32'
      ?execFileSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npx --yes supabase status --output json'],{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000})
      :execFileSync('npx',['--yes','supabase','status','--output','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
    return JSON.parse(result);
  }catch{throw new Error('Supabase local no está disponible o no se pudo leer su estado');}
}
async function suite(name){
  const env={...process.env,RTQ_STORAGE:'postgres'}; delete env.RTQ_TEST_SQL_BRIDGE;
  const child=spawn(process.execPath,[path.join(root,'tools',name)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  // Consumir salida sin copiar respuestas ni credenciales a logs.
  child.stdout.resume();child.stderr.resume();
  const timer=setTimeout(()=>child.kill(),90000);
  const code=await new Promise((resolve,reject)=>{child.on('error',()=>reject(new Error(`No se pudo iniciar ${name}`)));child.on('close',resolve);});
  clearTimeout(timer);
  console.log(`${name} Supabase/PostgREST real con sb_secret: ${code===0?'PASS':'FAIL'}`);
  assert.equal(code,0,`Suite ${name}`);
}
async function run(){
  const status=localStatus();
  const values=Object.values(status).filter(v=>typeof v==='string');
  const key=values.find(v=>v.startsWith('sb_secret_'));
  const publishable=values.find(v=>v.startsWith('sb_publishable_'));
  assert.ok(key,'La CLI debe proporcionar una clave secreta del formato actual');
  const url=status.API_URL||status.api_url;
  assert.equal(new URL(url).origin,'http://127.0.0.1:54321');
  process.env.SUPABASE_URL=url; process.env.SUPABASE_SECRET_KEY=key;
  process.env.RTQ_TEST_SUPABASE_LOCAL='1'; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let currentKeyRequests=0;
  const db=new SupabaseRpc({fetch:async(url,options)=>{
    assert.equal(options.headers.Authorization,undefined,'Una clave sb_secret no se envía como Bearer');
    assert.ok(options.headers.apikey.startsWith('sb_secret_'));
    currentKeyRequests++;
    return fetch(url,options);
  }});
  await clearFixture();
  assert.deepEqual(await db.operation('products.list'),[]);
  console.log('Autenticación real mediante apikey sb_secret, sin Bearer: PASS');
  for(const apikey of [null,'sb_secret_invalida_de_prueba',publishable].filter(k=>k!==undefined)){
    const response=await fetch(url+'/rest/v1/rpc/rtq_repository',{method:'POST',headers:{'Content-Type':'application/json',...(apikey?{apikey}:{})},body:JSON.stringify({p_operation:'orders.list',p_payload:{}})});
    assert.ok([401,403].includes(response.status),'Acceso sin secreto debe ser denegado');
    await response.arrayBuffer();
  }
  console.log('Sin clave, clave inválida y clave pública: acceso denegado');
  const dataDir=path.join(directory,'data');fs.cpSync(path.join(root,'data'),dataDir,{recursive:true});
  const dry=await migrate(dataDir,{dryRun:true});
  const first=await migrate(dataDir,{db});const second=await migrate(dataDir,{db});
  assert.deepEqual(first.source,first.destination);assert.deepEqual(first,second);assert.deepEqual(dry.source,first.source);
  assert.deepEqual(second.differences,[]);
  console.log(JSON.stringify({source:first.source,destination:second.destination,differences:second.differences}));
  console.log('Dry-run, migración real e idempotencia mediante PostgREST: PASS');
  const snapshot=loadSnapshot(dataDir);
  snapshot.orders[0].createdAt=null;
  snapshot.orders[0].items[0].productId='producto-inexistente-de-prueba';
  await clearFixture();await db.call('rtq_import_snapshot',{p_snapshot:snapshot});
  const historical=await db.operation('orders.find',{id:snapshot.orders[0].id});
  assert.equal(historical.createdAt,null);assert.equal(historical.items[0].productId,'producto-inexistente-de-prueba');
  const beforeFailure=await sql('SELECT md5(public.rtq_snapshot()::text)');
  const order={...snapshot.orders[0],id:'RTQ-SUPABASE-ATOMIC',customer:'Prueba sintética',phone:'',address:'',notes:'',reference:'',gps:'',
    items:[{productId:null,name:'Ítem sintético',qty:1,price:1,sauces:''}]};
  await assert.rejects(db.operation('orders.insert',{order:{...order,items:[order.items[0],{...order.items[0],qty:0}]}}));
  assert.equal(await sql('SELECT md5(public.rtq_snapshot()::text)'),beforeFailure);
  await assert.rejects(db.call('rtq_import_snapshot',{p_snapshot:{...snapshot,orders:[order,{...order,id:'RTQ-SUPABASE-INVALID',items:[{...order.items[0],qty:0}]}]}}));
  assert.equal(await sql('SELECT md5(public.rtq_snapshot()::text)'),beforeFailure);
  console.log('Rollback real de pedido/ítems e importación completa: PASS');
  const inserts=await Promise.allSettled([db.operation('orders.insert',{order}),db.operation('orders.insert',{order})]);
  assert.equal(inserts.filter(x=>x.status==='fulfilled').length,1);
  await assert.rejects(db.call('rtq_import_snapshot',{p_snapshot:snapshot}),e=>{assert.deepEqual(e.differences,['orders']);return true;});
  const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync('contraseña-sintética-local',salt,64).toString('hex');
  snapshot.users=[{username:'prueba_scrypt',name:'Usuario sintético',role:'admin',active:true,salt,passwordHash:hash,createdAt:new Date().toISOString()}];
  await clearFixture();await db.call('rtq_import_snapshot',{p_snapshot:snapshot});
  const {UsersRepository}=require('./backend/repositories/postgres.repositories');const users=new UsersRepository(db);
  const migratedUser=await users.find('prueba_scrypt');assert.equal(migratedUser.passwordHash,hash);assert.equal(migratedUser.salt,salt);
  assert.equal((await users.authenticate('prueba_scrypt','contraseña-sintética-local')).role,'admin');
  const rls=await sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN ('products','orders','order_items','staff_users','store_config') AND c.relrowsecurity",false);
  assert.equal(rls,'5');
  console.log('Fechas ausentes, referencias desconocidas, scrypt, RLS y concurrencia: PASS');
  const privateBefore=await sql("SELECT md5(((public.rtq_snapshot()->'orders') || (public.rtq_snapshot()->'users'))::text)");
  const limited=await migrate(dataDir,{db,catalogConfigOnly:true});
  assert.deepEqual(limited.source,{products:JSON.parse(fs.readFileSync(path.join(dataDir,'catalog.db.json'),'utf8')).length,storeConfig:1});assert.deepEqual(limited.source,limited.destination);
  assert.equal(await sql("SELECT md5(((public.rtq_snapshot()->'orders') || (public.rtq_snapshot()->'users'))::text)"),privateBefore);
  console.log('Modo catálogo/configuración: pedidos y usuarios locales intactos: PASS');
  for(const name of ['test-backend.js','test-system.js','test-access.js','test-reports.js'])await suite(name);
  assert.ok(currentKeyRequests>10);
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>{
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('rtq-supabase-test-'));
  fs.rmSync(directory,{recursive:true,force:true});
  assert.deepEqual(hashes(),before,'data/ debe quedar intacto');
  console.log('Hashes SHA-256 de data/ sin cambios');
});
