import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ageOn} from '../server/security.js';

test('audit: stable paths, expired parental access, malformed requests and hidden messages',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-audit-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';process.env.ADMIN_KEY='audit-local-key';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const {createApp}=await import('../server/index.js');const {app,db}=await createApp();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const client=()=>{let cookie='';return async(url,method='GET',body)=>{const r=await fetch(base+'/api'+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};};
 try{
  const admin=await fetch(base+'/api/admin/schools',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer audit-local-key'},body:JSON.stringify({name:'Colegio de auditoría'})});const school=await admin.json();
  const birth=(new Date().getUTCFullYear()-8)+'-01-01';const body={role:'student',firstName:'Liam',lastName:'Auditoría',email:'audit@example.invalid',password:'audit-child-password',schoolId:school.id,grade:3,birthDate:birth,age:ageOn(birth),parentPin:'123456',consent:true};
  const student=client(),teacher=client();
  assert.equal((await student('/register','POST',{...body,grade:''})).status,400,'an empty grade is not transition');
  assert.equal((await student('/register','POST',body)).status,201);
  const prior=(await db.query('SELECT COUNT(*)::int AS n FROM schools')).rows[0].n;
  assert.equal((await student('/register','POST',{...body,schoolId:'request',schoolName:'Solicitud duplicada'})).status,409);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM schools')).rows[0].n,prior,'duplicate registration rolls back requested school');
  const tutor=await teacher('/register','POST',{role:'teacher',firstName:'Profe',lastName:'Auditoría',email:'teacher-audit@example.invalid',password:'audit-teacher-password',schoolId:school.id,subjects:['Matemáticas'],consent:true});assert.equal(tutor.status,201);
  await db.query('UPDATE users SET email_verified=true,teacher_verified=true WHERE public_id=$1',[tutor.data.id]);
  const group=(await teacher('/groups','POST',{name:'Tercero',grade:3})).data;
  const unlock=await student('/parent/unlock','POST',{pin:'123456'});assert.ok(new Date(unlock.data.parentUntil)>new Date());
  assert.equal((await student('/groups/join','POST',{code:group.invite_code})).status,200);
  const questions=Array.from({length:3},()=>({type:'number',prompt:'¿Cuánto es 1 + 1?',answer:2,explanation:'Uno más uno es dos.'}));
  const old=(await teacher('/activities','POST',{title:'Creada antes, compartida después',subject:'Matemáticas',gradeMin:3,gradeMax:3,questions})).data;
  const newer=(await teacher('/activities','POST',{title:'Compartida primero',subject:'Matemáticas',gradeMin:3,gradeMax:3,questions})).data;
  await teacher('/groups/'+group.id+'/share','POST',{activityId:newer.id});
  const first=(await student('/activities')).data;assert.equal(first.at(-1).id,newer.id);
  await teacher('/groups/'+group.id+'/share','POST',{activityId:old.id});
  const concurrent=await Promise.all([student('/activities'),student('/activities')]);
  for(const list of concurrent){assert.deepEqual(list.data.slice(0,-1).map(a=>a.id),first.map(a=>a.id));assert.equal(list.data.at(-1).id,old.id);assert.equal(list.data.at(-1).locked,true);}
  assert.equal((await student('/me')).data.level,1);
  await student('/activities/practice-weather/attempt','POST',{answers:[0,2,3,1,0]});assert.equal((await student('/me')).data.level,2);
  const message=(await student('/groups/'+group.id+'/messages','POST',{body:'Mensaje para moderar'})).data;
  await db.query('UPDATE messages SET hidden=true WHERE id=$1',[message.id]);assert.equal((await teacher('/groups/'+group.id+'/reaction','POST',{messageId:message.id,emoji:'❤️'})).status,404);
  await db.query("UPDATE sessions SET parent_until=now()-interval '1 minute'");
  assert.equal((await student('/me')).data.parentUnlocked,false);
  const expired=await student('/rewards','POST',{title:'Premio',target:3});assert.equal(expired.status,403);assert.equal(expired.data.code,'PARENT_REQUIRED');
  for(const content of [undefined,'null','[]','{broken']){const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:content});assert.equal(r.status,400);assert.equal(typeof (await r.json()).error,'string');}
  const huge=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'x'.repeat(6*1024*1024)})});assert.equal(huge.status,413);assert.match((await huge.json()).error,/tamaño permitido/);
  await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute'");assert.equal((await student('/me')).data.code,'SESSION_EXPIRED');
 }finally{await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
});
