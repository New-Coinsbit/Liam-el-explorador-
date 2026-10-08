import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateQuestions,isCorrect,validAnswer,publicQuestion} from '../server/questions.js';
import {ageOn,rating,imageValid} from '../server/security.js';

test('age validation and score thresholds',()=>{assert.equal(ageOn('2018-10-09',new Date('2026-10-08T12:00Z')),7);assert.ok(Number.isNaN(ageOn('2018-02-31')));assert.equal(rating(2,5).stars,1);assert.equal(rating(3,5).stars,2);assert.equal(rating(5,5).stars,3);assert.equal(imageValid('data:image/png;base64,aGVsbG8='),false);});
test('accounts, parental authorization, scores and classroom isolation',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-test-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';process.env.ADMIN_KEY='test-catalog-key';delete process.env.DATABASE_URL;
 const mail=[];process.env.APP_ORIGIN='https://liam.example.invalid';const {createApp}=await import('../server/index.js');const {app,db}=await createApp({sendMail:async m=>mail.push(m)});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const client=()=>{let cookie='';return async(url,method='GET',body,extra={})=>{const r=await fetch(base+'/api'+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...extra},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};};
 try{
 const a=client(),b=client(),teacher=client();assert.equal((await a('/me')).status,401);
 const school=(await a('/admin/schools','POST',{name:'Colegio de prueba'}, {Authorization:'Bearer test-catalog-key'})).data;
 const now=new Date();const birth=`${now.getUTCFullYear()-8}-01-01`;const student={role:'student',firstName:'Prueba',lastName:'Local',email:'first@example.invalid',password:'a-long-test-password',schoolId:school.id,grade:3,birthDate:birth,age:ageOn(birth),parentPin:'123456',consent:true};
 assert.equal((await a('/register','POST',{...student,age:19})).status,400);
 const registered=await a('/register','POST',student);assert.equal(registered.status,201);assert.match(registered.data.id,/^EX-/);assert.equal(registered.data.stars,0);
 assert.equal((await a('/rewards','POST',{title:'Paseo',target:10})).status,403);
 assert.equal((await a('/parent/unlock','POST',{pin:'654321'})).status,401);
 assert.equal((await a('/parent/unlock','POST',{pin:'123456'})).status,200);
 const reward=await a('/rewards','POST',{title:'Paseo',target:10});assert.equal(reward.status,201);
 assert.equal((await a('/groups','POST',{name:'Grupo no autorizado'})).status,403);
 assert.equal((await a('/me','PATCH',{avatar:24})).status,400);
 assert.equal((await a('/me','PATCH',{avatar:23})).status,200);
 const q=await a('/activities/practice-weather');assert.ok(q.data.questions.every(x=>!('answer' in x)));
 const good=[0,2,3,1,0];let r=await a('/activities/practice-weather/attempt','POST',{answers:good});assert.equal(r.data.stars,3);assert.equal(r.data.profile.stars,3);assert.equal(r.data.profile.level,2);
 r=await a('/activities/practice-weather/attempt','POST',{answers:good});assert.equal(r.data.profile.stars,3);
 r=await a('/activities/practice-weather/attempt','POST',{answers:[1,1,1,1,1]});assert.equal(r.data.stars,1);assert.equal(r.data.profile.stars,3);
 assert.equal((await b('/register','POST',{...student,email:'second@example.invalid'})).status,201);
 await b('/parent/unlock','POST',{pin:'123456'});await b('/rewards/'+reward.data.id,'DELETE');assert.equal((await a('/rewards')).data.length,1);
 assert.equal((await teacher('/register','POST',{role:'teacher',firstName:'Docente',lastName:'Local',email:'teacher@example.invalid',password:'another-long-password',subjects:['Ciencias'],schoolId:school.id,consent:true})).status,201);
 assert.equal((await teacher('/groups','POST',{name:'Sin autorización'})).status,403);
 assert.equal((await teacher('/account/send-verification','POST',{})).status,200);
 const verification=mail.at(-1).text.match(/token=([a-f0-9]+)/)[1];
 assert.equal((await teacher('/account/verify','POST',{token:verification})).status,200);
 assert.equal((await teacher('/account/verify','POST',{token:verification})).status,400);
 const teacherId=(await teacher('/me')).data.id;
 assert.equal((await a('/admin/teachers/'+teacherId,'POST',{approved:true},{Authorization:'Bearer test-catalog-key'})).status,200);
 const g=await teacher('/groups','POST',{name:'Ciencias tercero'});assert.equal(g.status,201);
 assert.equal((await a('/groups/'+g.data.id+'/messages')).status,403);
 assert.equal((await a('/groups/join','POST',{code:g.data.invite_code})).status,200);
 const m=await a('/groups/'+g.data.id+'/messages','POST',{body:'¡Hola clase!'});assert.equal(m.status,201);
 assert.equal((await teacher('/groups/'+g.data.id+'/messages')).data.length,1);
 assert.equal((await b('/groups/'+g.data.id+'/messages')).status,403);
 assert.equal((await a('/groups/'+g.data.id+'/reaction','POST',{messageId:m.data.id,emoji:'❤️'})).status,200);
 assert.equal((await teacher('/groups/'+g.data.id+'/messages')).data[0].reactions[0].count,1);

 // Locks apply to API requests, lists and attempts, not only the illustrated map.
 assert.equal((await b('/activities/practice-multiplication')).status,403);
 assert.equal((await b('/activities/practice-multiplication/attempt','POST',{answers:[1,2,3,0,1]})).status,403);
 assert.equal((await b('/activities')).data.find(x=>x.id==='practice-multiplication').locked,true);
 assert.equal((await a('/activities/practice-multiplication')).status,200);
 const retryPayload={answers:good,submissionId:'same-offline-submission'};
 await Promise.all([a('/activities/practice-weather/attempt','POST',retryPayload),a('/activities/practice-weather/attempt','POST',retryPayload)]);
 assert.equal((await a('/progress')).data.history.length,4);
 assert.equal((await a('/activities/practice-weather/attempt','POST',{...retryPayload,answers:[1,1,1,1,1]})).status,409);
 assert.equal((await a('/activities/practice-weather/attempt','POST',{...retryPayload,profileId:'EX-ANOTHER'})).status,409);
 assert.equal((await a('/rewards/'+reward.data.id+'/claim','POST',{})).status,409);
 const smallReward=(await a('/rewards','POST',{title:'Lectura juntos',target:3})).data;
 assert.equal((await a('/rewards/'+smallReward.id+'/claim','POST',{})).status,200);
 const delivered=(await a('/rewards')).data.find(x=>x.id===smallReward.id);assert.equal(delivered.claimed,true);assert.ok(delivered.claimed_at);
 assert.equal((await a('/rewards/'+smallReward.id+'/claim','POST',{})).status,200);
 assert.equal((await b('/rewards/'+smallReward.id+'/claim','POST',{})).status,404);
 // Private contacts need a shared classroom and approval from both responsible adults.
 const bid=(await b('/me')).data.id;
 assert.equal((await a('/contacts','POST',{publicId:bid})).status,400);
 await b('/groups/join','POST',{code:g.data.invite_code});
 const contact=await a('/contacts','POST',{publicId:bid});assert.equal(contact.status,201);
 assert.equal((await a('/contacts/'+contact.data.id+'/messages','POST',{body:'Hola'})).status,403);
 await b('/parent/lock','POST',{});assert.equal((await b('/contacts/'+contact.data.id+'/approve','POST',{})).status,403);
 await b('/parent/unlock','POST',{pin:'123456'});assert.equal((await b('/contacts/'+contact.data.id+'/approve','POST',{})).status,200);
 const dm=await a('/contacts/'+contact.data.id+'/messages','POST',{body:'¡Practicamos juntos!'});assert.equal(dm.status,201);
 assert.equal((await teacher('/contacts/'+contact.data.id+'/messages')).status,404);
 await b('/contacts/'+contact.data.id+'/reaction','POST',{messageId:dm.data.id,emoji:'❤️'});
 assert.equal((await a('/contacts/'+contact.data.id+'/messages')).data[0].reactions[0].count,1);
 await b('/contacts/'+contact.data.id+'/report','POST',{messageId:dm.data.id,reason:'Revisar'});
 const adminHeaders={Authorization:'Bearer test-catalog-key'};
 const reports=(await a('/admin/queue','GET',undefined,adminHeaders)).data.reports;
 assert.equal(reports.length,1);await a('/admin/reports/'+reports[0].id,'POST',{action:'hide'},adminHeaders);
 assert.equal((await a('/contacts/'+contact.data.id+'/messages')).data.length,0);
 assert.equal((await a('/contacts/'+contact.data.id+'/challenges','POST',{activityId:'practice-weather'})).status,201);
 assert.equal((await b('/contacts/'+contact.data.id+'/challenges')).data.length,1);
 await b('/contacts/'+contact.data.id+'/block','POST',{});
 assert.equal((await a('/contacts/'+contact.data.id+'/messages','POST',{body:'Bloqueado'})).status,403);
 // Teachers see only results shared with their own classrooms.
 assert.equal((await teacher('/groups/'+g.data.id+'/progress')).data.length,2);
 assert.equal((await b('/groups/'+g.data.id+'/progress')).status,403);
 // New question formats grade on the server and never reveal answers beforehand.
 for(const [id,answers] of [['practice-sentence-order',[[1,0,2],[2,1,0],[1,2,0]]],['practice-animal-matches',[[1,2,0],[1,2,0],[2,0,1]]],['practice-english-listen',[0,2,1]],['practice-river-calculation',[19,18,20]]]){
  const activity=await teacher('/activities/'+id);assert.equal(activity.status,200);assert.ok(activity.data.questions.every(q=>!('answer' in q)&&!('explanation' in q)));
  assert.equal((await teacher('/activities/'+id+'/attempt','POST',{answers})).data.stars,3);
 }
 // Drafts can be corrected before publication; published answer keys stay stable.
 const tu=(await db.query('SELECT id FROM users WHERE public_id=$1',[teacherId])).rows[0];
 const qs=Array.from({length:3},()=>({prompt:'¿Cuánto es 2 + 2?',options:['4','5','6','7'],answer:0,explanation:'2 + 2 = 4.'}));
 await db.query('INSERT INTO activities(id,owner_id,title,subject,questions) VALUES($1,$2,$3,$4,$5)',['draft-test',tu.id,'Borrador','Matemáticas',JSON.stringify(qs)]);
 assert.equal((await teacher('/activities/draft-test')).status,404);
 assert.equal((await a('/activities/draft-test?review=1')).status,404);
 assert.equal((await teacher('/activities/draft-test/draft','PUT',{title:'Corregido',subject:'Matemáticas',gradeMin:2,gradeMax:3,questions:qs})).status,200);
 assert.equal((await teacher('/activities/draft-test/review','POST',{})).status,200);
 assert.equal((await teacher('/activities/draft-test/draft','PUT',{questions:qs})).status,409);
 // Upgrade the legacy student account without losing its ID, stars or rewards.
 const childId=(await a('/me')).data.id;
 const fam=await a('/family/create','POST',{firstName:'Adulto',lastName:'Responsable',password:student.password,parentPassword:'private-parent-password'});
 assert.equal(fam.status,201);assert.equal(fam.data.role,'parent');
 const family=(await a('/family')).data;assert.equal(family.children[0].id,childId);assert.equal(family.children[0].stars,3);
 assert.equal((await a('/progress?child='+bid)).status,403);
 const sibling=await a('/family/children','POST',{firstName:'Otra',lastName:'Exploradora',grade:2,birthDate:birth,schoolId:school.id,password:'separate-child-password'});assert.equal(sibling.status,201);
 assert.equal((await a('/family')).data.children.length,2);
 assert.equal((await a('/family/select','POST',{id:bid})).status,404);
 assert.equal((await a('/family/select','POST',{id:childId})).data.parentUnlocked,false);
 assert.equal((await a('/family/return','POST',{})).status,403);
 assert.equal((await a('/parent/unlock','POST',{pin:'123456'})).status,200);
 assert.equal((await a('/family/return','POST',{})).data.role,'parent');
 const parentLogin=client();assert.equal((await parentLogin('/login','POST',{email:student.email,password:student.password})).status,401);
 assert.equal((await parentLogin('/login','POST',{email:student.email,password:'private-parent-password'})).data.role,'parent');
 const childLogin=client();assert.equal((await childLogin('/login','POST',{email:childId,password:student.password})).data.role,'student');
 // Recovery is single-use and invalidates the parent's and linked children's sessions.
 assert.equal((await parentLogin('/account/recover','POST',{email:student.email})).status,200);
 const resetToken=mail.at(-1).text.match(/token=([a-f0-9]+)/)[1];
 assert.equal((await parentLogin('/account/reset','POST',{token:resetToken,password:'new-private-parent-password',pin:'987654'})).status,200);
 assert.equal((await childLogin('/me')).status,401);
 assert.equal((await a('/me')).status,401);
 assert.equal((await parentLogin('/account/reset','POST',{token:resetToken,password:'new-private-parent-password',pin:'987654'})).status,400);
 assert.equal((await a('/login','POST',{email:student.email,password:'new-private-parent-password'})).status,200);
 assert.equal((await a('/rewards','POST',{title:'CSRF',target:5},{Origin:'https://untrusted.example'})).status,403);
 await a('/logout','POST',{});assert.equal((await a('/me')).status,401);
 }finally{await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
});

test('question contracts reject invalid answers and unsafe question payloads',()=>{
 const q={type:'matching',prompt:'Relaciona',left:['A','B'],right:['2','1'],answer:[1,0],explanation:'A es 1.'};
 assert.equal(validateQuestions([q,q,q]),true);assert.equal(validAnswer(q,[1,1]),false);assert.equal(isCorrect(q,[1,0]),true);assert.equal('answer' in publicQuestion(q),false);
 assert.equal(validateQuestions([q,{...q,answer:[0,0]},q]),false);
 assert.equal(validateQuestions([{...q,type:'unknown'},q,q]),false);
});

test('AI respects reinforcement goal and transition grade without retaining the photo',async()=>{
 const originalFetch=globalThis.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key-not-real';let payload;
 const questions=Array.from({length:3},()=>({prompt:'¿Cuál es una planta?',options:['Árbol','Piedra','Agua','Nube'],answer:0,explanation:'El árbol es una planta.'}));
 globalThis.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({questions})}]}]})};};
 try{const {generateQuestions}=await import('../server/ai.js');await generateQuestions('data:image/png;base64,example','Ciencias Naturales',0,'Reforzar errores',['Partes de la planta']);const prompt=payload.input[0].content[0].text;assert.match(prompt,/Grado: 0/);assert.match(prompt,/Reforzar errores/);assert.match(prompt,/Partes de la planta/);assert.equal(payload.store,false);}
 finally{globalThis.fetch=originalFetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});

test('existing 0.2 database upgrades without losing accounts, scores or rewards',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const {readFile}=await import('node:fs/promises');
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-migration-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';delete process.env.DATABASE_URL;
 const legacy=new PGlite(dir);await legacy.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
 await legacy.query("INSERT INTO users(id,public_id,role,first_name,last_name,email,password_hash,grade) VALUES('old-child','EX-LEGACY','student','Liam','Anterior','legacy@example.invalid','fixture',3)");
 await legacy.query("INSERT INTO activities(id,title,subject,questions,reviewed) VALUES('old-activity','Actividad conservada','Español','[]',true)");
 await legacy.query("INSERT INTO attempts VALUES('old-child','old-activity',2,80)");await legacy.query("INSERT INTO rewards(id,user_id,title,target) VALUES('old-reward','old-child','Mi premio',10)");await legacy.close();
 const {openDatabase}=await import('../server/database.js');let db;
 try{db=await openDatabase();assert.equal((await db.query("SELECT stars FROM attempts WHERE user_id='old-child'")).rows[0].stars,2);assert.equal((await db.query("SELECT title FROM rewards WHERE id='old-reward'")).rows[0].title,'Mi premio');assert.equal((await db.query("SELECT public_id FROM users WHERE id='old-child'")).rows[0].public_id,'EX-LEGACY');await db.close();db=await openDatabase();assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM schema_migrations')).rows[0].n,3);}
 finally{await db?.close();await rm(dir,{recursive:true,force:true});}
});
