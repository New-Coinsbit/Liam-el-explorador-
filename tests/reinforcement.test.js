import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('school photos: 20-image request reaches AI, old APK works, invalid selections fail before AI',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-photos-'));
 process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';process.env.OPENAI_API_KEY='fake-for-test';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const realFetch=globalThis.fetch,payloads=[];
 const questions=Array.from({length:3},()=>({prompt:'¿Cuánto es 2 + 2?',options:['4','5','6','7'],answer:0,explanation:'Dos más dos es cuatro.'}));
 globalThis.fetch=async(url,options)=>{
  if(url!=='https://api.openai.com/v1/responses')return realFetch(url,options);
  payloads.push(JSON.parse(options.body));return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({questions})}]}]})};
 };
 const {createApp}=await import('../server/index.js');const {app,db}=await createApp();const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const post=async(route,body)=>{const r=await fetch(base+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6fkAAAAASUVORK5CYII=','base64');
  // Valid PNGs with trailing padding make the combined JSON exceed the old 5 MB limit.
  const images=Array.from({length:20},(_,i)=>'data:image/png;base64,'+Buffer.concat([png,Buffer.alloc(220000,i)]).toString('base64'));
  const body={images,subject:'Matemáticas',grade:3,goal:'Repasar la clase',title:'Veinte páginas'};
  assert.equal((await post('/reinforcement',body)).status,401);
  assert.equal((await post('/register',{role:'teacher',firstName:'Docente',lastName:'Prueba',email:'photos@example.invalid',password:'test-photo-password-123',schoolName:'Colegio de prueba',subjects:['Matemáticas'],consent:true})).status,201);
  const response=await post('/reinforcement',body);assert.equal(response.status,201,JSON.stringify(response.data));
  assert.deepEqual(payloads[0].input[0].content.filter(x=>x.type==='input_image').map(x=>x.image_url),images);
  assert.equal(payloads[0].store,false);assert.equal(response.data.reviewed,false);
  const stored=(await db.query('SELECT image,questions FROM activities WHERE id=$1',[response.data.id])).rows[0];assert.equal(stored.image,null);assert.deepEqual(stored.questions,questions);
  const legacy=await post('/reinforcement',{...body,images:undefined,image:images[0]});assert.equal(legacy.status,201);assert.equal(payloads[1].input[0].content.filter(x=>x.type==='input_image').length,1);
  for(const bad of [[],[...images,images[0]],['data:image/png;base64,aGVsbG8='],'not-an-array'])assert.equal((await post('/reinforcement',{...body,images:bad})).status,400);
  assert.equal(payloads.length,2);
  const oversized=await post('/reinforcement',{...body,images:Array(20).fill('x'.repeat(1600000))});assert.equal(oversized.status,413);
 }finally{globalThis.fetch=realFetch;await new Promise(resolve=>server.close(resolve));await db.close();await rm(dir,{recursive:true,force:true});}
});
