import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import webpush from 'web-push';
import {ageOn} from '../server/security.js';

test('push: parent consent, device ownership, private payloads, expiry and rate limit',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-push-'));
 const keys=webpush.generateVAPIDKeys();Object.assign(process.env,{LOCAL_DATA_DIR:dir,NODE_ENV:'test',VAPID_SUBJECT:'https://liam.example.invalid',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey});delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const deliveries=[];let expired=false;
 const {createApp}=await import('../server/index.js');
 const {app,db}=await createApp({pushSender:async(...args)=>{if(expired)throw {statusCode:410};deliveries.push(args);}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const client=()=>{let cookie='';return async(url,method='GET',body)=>{const r=await fetch(base+'/api'+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};};
 try{
  const a=client(),b=client();assert.equal((await a('/push/config')).status,401);
  const publicConfig=(await a('/config')).data;assert.equal(publicConfig.push,true);assert.ok(!JSON.stringify(publicConfig).includes(keys.privateKey));
  const birth=(new Date().getUTCFullYear()-8)+'-01-01',email='push@example.invalid',password='push-local-password';
  assert.equal((await a('/register','POST',{role:'student',firstName:'Prueba',lastName:'Notificaciones',email,password,schoolName:'Colegio ficticio de pruebas',grade:3,birthDate:birth,age:ageOn(birth),parentPin:'123456',consent:true})).status,201);
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/TEST-ONLY',keys:{p256dh:keys.publicKey,auth:'a'.repeat(22)}};
  assert.equal((await a('/push/subscribe','POST',{subscription})).status,403);
  assert.equal((await a('/push/test','POST',{endpoint:subscription.endpoint})).status,403);
  await a('/parent/unlock','POST',{pin:'123456'});
  for(const endpoint of ['http://fcm.googleapis.com/a','https://fcm.googleapis.com.evil.invalid/a','https://127.0.0.1/a','https://secret@fcm.googleapis.com/a'])assert.equal((await a('/push/subscribe','POST',{subscription:{...subscription,endpoint}})).status,400);
  assert.equal((await a('/push/subscribe','POST',{subscription:{...subscription,extra:'private details'}})).status,200);
  const config=(await a('/push/config')).data;assert.equal(config.subscribed,true);assert.equal(config.publicKey,keys.publicKey);assert.ok(!JSON.stringify(config).includes(keys.privateKey));
  assert.equal((await a('/push/test','POST',{endpoint:subscription.endpoint})).status,200);
  assert.equal(deliveries.length,1);assert.deepEqual(JSON.parse(deliveries[0][1]),{kind:'test'});assert.equal(deliveries[0][0].extra,undefined);
  await b('/login','POST',{email,password});await b('/parent/unlock','POST',{pin:'123456'});
  assert.equal((await b('/push/test','POST',{endpoint:subscription.endpoint})).status,404,'another session cannot send to this phone');
  assert.equal((await b('/push/config')).data.subscribed,false);
  await b('/push/subscribe','POST',{subscription});assert.equal((await a('/push/config')).data.subscribed,false);
  expired=true;assert.equal((await b('/push/test','POST',{endpoint:subscription.endpoint})).status,410);
  assert.equal((await b('/push/config')).data.subscribed,false);assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM push_subscriptions')).rows[0].n,0);
  assert.equal((await b('/push/test','POST',{endpoint:subscription.endpoint})).status,429);
  await b('/push/subscribe','POST',{subscription});await b('/push/unsubscribe','POST',{});assert.equal((await b('/push/config')).data.subscribed,false);
  await b('/push/subscribe','POST',{subscription});await b('/logout','POST',{});assert.equal((await b('/push/config')).status,401);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM push_subscriptions')).rows[0].n,0,'logout removes the session subscription');
 }finally{await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
});
