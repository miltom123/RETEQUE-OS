// Validación con registros sintéticos: no lee data/ del negocio ni usa la nube.
const fs=require('fs');
const os=require('os');
const path=require('path');
const crypto=require('crypto');
const assert=require('node:assert/strict');
const { migrate,loadSnapshot,stats }=require('./migrate-json-to-postgres');
const { SupabaseRpc }=require('./backend/repositories/supabase-rpc');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rtq-migration-test-'));
const fixture={
  'catalog.db.json':[{id:'producto-prueba',name:'Producto sintético',icon:'',cat:'Pruebas',qty:'Una unidad',price:0.1,promo:null,sauces:'',badge:'',desc:'',stock:true}],
  'store.config.json':{name:'Negocio sintético',city:'Prueba',address:'',hours:'',whatsappDisplay:'',whatsappInternational:'',yape:{number:'',holder:''},mapsUrl:'',customSocial:{preserve:true}},
  'orders.db.json':[{id:'PEDIDO-PRUEBA',channel:'web',mode:'pickup',status:'new',subtotal:0.3,deliveryFee:0,discount:0,total:0.3,
    items:[{productId:'referencia-desconocida',name:'Ítem sintético',qty:3,price:0.1}]}]
};
const write=()=>{for(const [name,value] of Object.entries(fixture))fs.writeFileSync(path.join(directory,name),JSON.stringify(value));};
const hashes=()=>Object.fromEntries(fs.readdirSync(directory).sort().map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,n))).digest('hex')]));
async function run(){
  write(); const before=hashes();
  const dry=await migrate(directory,{dryRun:true,db:{call(){throw new Error('Dry-run no debe consultar la red');}}});
  assert.deepEqual(dry.source,{products:1,orders:1,items:1,users:0,orderTotal:'0.30'});
  assert.deepEqual(dry.warnings,{undatedOrders:1,unknownProductReferences:1,missingUsersFile:true});
  assert.deepEqual(hashes(),before);
  assert.deepEqual(loadSnapshot(directory).config.customSocial,{preserve:true});
  // Archivos privados deliberadamente ilegibles: el modo limitado no debe abrirlos.
  fs.writeFileSync(path.join(directory,'orders.db.json'),'no abrir datos privados');
  fs.writeFileSync(path.join(directory,'users.db.json'),'no abrir credenciales');
  const limited=await migrate(directory,{dryRun:true,catalogConfigOnly:true});
  assert.deepEqual(limited.source,{products:1,storeConfig:1});
  await migrate(directory,{catalogConfigOnly:true,db:{call:async(name,args)=>{
    assert.equal(name,'rtq_import_catalog_config');
    assert.deepEqual(Object.keys(args).sort(),['p_config','p_products']);return {differences:[]};
  }}});
  fs.unlinkSync(path.join(directory,'users.db.json'));write();
  await assert.rejects(migrate(directory,{db:{url:'https://remote.invalid',call(){throw new Error('No debe contactar la nube');}}}),/solo está habilitada en localhost/);
  const original=structuredClone(fixture);
  for(const mutation of [
    f=>f['catalog.db.json'].push(f['catalog.db.json'][0]),
    f=>f['catalog.db.json'][0].price=-1,
    f=>f['catalog.db.json'][0].price=1.001,
    f=>f['orders.db.json'][0].channel='otro',
    f=>f['orders.db.json'][0].createdAt='2026-02-30T00:00:00Z',
    f=>f['orders.db.json'][0].createdAt='2026-01-01T00:00:00',
    f=>f['orders.db.json'][0].items[0].qty=0,
    f=>f['orders.db.json'][0].unexpected='no descartar campos',
  ]){
    Object.assign(fixture,structuredClone(original));mutation(fixture);write();
    assert.throws(()=>loadSnapshot(directory),/Dato inválido/);
  }
  assert.equal(stats({products:[],users:[],orders:[{total:0.1,items:[]},{total:0.2,items:[]}]}).orderTotal,'0.30');
  for(const url of ['https://user:password@example.com','http://example.com','https://example.com?secret=x']){
    assert.throws(()=>new SupabaseRpc({url,key:'clave-sintética'}),/SUPABASE_URL/);
  }
  const rpc=new SupabaseRpc({url:'http://127.0.0.1:54321',key:'clave-sintética',fetch:async()=>({ok:false,json:async()=>({code:'23514',message:'dato que no debe propagarse',details:'detalle privado'})})});
  await assert.rejects(rpc.operation('orders.list'),error=>!error.message.includes('privado')&&!error.message.includes('propagarse'));
  const differences=new SupabaseRpc({url:'http://127.0.0.1:54321',key:'clave-sintética',fetch:async()=>({ok:false,json:async()=>({code:'RT001',details:'["orders"]'})})});
  await assert.rejects(differences.operation('orders.list'),error=>{assert.deepEqual(error.differences,['orders']);return true;});
  const invalidResponse=new SupabaseRpc({url:'http://127.0.0.1:54321',key:'clave-sintética',fetch:async(_url,options)=>{
    assert.equal(options.redirect,'error');
    return {ok:true,json:async()=>{throw new Error('respuesta privada');}};
  }});
  await assert.rejects(invalidResponse.operation('orders.list'),/respuesta inválida/);
  for (const key of ['sb_secret_prueba_sintetica','jwt-sintetico']) {
    const client = new SupabaseRpc({url:'http://127.0.0.1:54321',key,fetch:async(_url,options)=>{
      assert.equal(options.headers.apikey,key);
      if (key.startsWith('sb_secret_')) assert.equal(options.headers.Authorization,undefined);
      else assert.equal(options.headers.Authorization,`Bearer ${key}`);
      return {ok:true,json:async()=>null};
    }});
    await client.operation('orders.list');
  }
  assert.throws(()=>new SupabaseRpc({url:'http://127.0.0.1:54321',key:'sb_publishable_prueba'}),/clave secreta/);
  console.log('Migrador: validación, fechas, decimales, referencias históricas, dry-run sin red y errores sin PII: PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('rtq-migration-test-'));
  fs.rmSync(directory,{recursive:true,force:true});
});
