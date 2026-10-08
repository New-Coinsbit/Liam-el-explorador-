import express from 'express';
import {randomUUID,randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from './database.js';
import {token,digest,hash,verify,clean,ageOn,imageValid} from './security.js';
import {readFile} from 'node:fs/promises';
import {createMailer} from './mail.js';
import {accountRoutes} from './accounts.js';
import {learningRoutes} from './learning.js';
import {notifications} from './notifications.js';
import {communityRoutes} from './community.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function createApp({sendMail}={}){
 const mailer=createMailer(sendMail);const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 const db=await openDatabase();const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(self), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');next();});
 app.use('/api',(req,res,next)=>{if(process.env.APP_NATIVE_ORIGIN&&req.headers.origin===process.env.APP_NATIVE_ORIGIN){res.set({'Access-Control-Allow-Origin':process.env.APP_NATIVE_ORIGIN,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Vary':'Origin'});if(req.method==='OPTIONS')return res.sendStatus(204);}next();});
 app.use(express.json({limit:'5mb'}));
 app.use('/api',(req,res,next)=>{if(['POST','PUT','PATCH'].includes(req.method)){if(req.headers['content-length']==='0'||!req.is('application/json')||!req.body||typeof req.body!=='object'||Array.isArray(req.body))return res.status(400).json({error:'No se recibieron los datos del formulario. Revisa los campos e inténtalo otra vez.',code:'INVALID_INPUT'});}next();});
 app.use('/api',(req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin){const expected=process.env.APP_ORIGIN||`${req.protocol}://${req.get('host')}`;if(req.headers.origin!==expected&&req.headers.origin!==process.env.APP_NATIVE_ORIGIN)return res.status(403).json({error:'Origen no permitido.'});}next();});
 const buckets=new Map();
 function limit(name,count=20,window=60000){return(req,res,next)=>{const key=`${name}:${req.ip}`;const now=Date.now();let b=buckets.get(key);if(!b||b.end<now)b={n:0,end:now+window};b.n++;buckets.set(key,b);if(b.n>count)return res.set('Retry-After',String(Math.ceil((b.end-now)/1000))).status(429).json({error:'Demasiados intentos. Espera unos minutos antes de repetir.',code:'RATE_LIMITED'});if(buckets.size>10000)for(const[k,v]of buckets)if(v.end<now)buckets.delete(k);next();};}
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const row=async(q,p)=>(await db.query(q,p)).rows[0];
 const many=async(q,p)=>(await db.query(q,p)).rows;
 app.get('/api/health',async(req,res)=>{if(db)await db.query('SELECT 1');res.json({ok:true,database:!!db,version});});
 app.get('/api/config',(req,res)=>res.json({database:!!db,ai:!!process.env.OPENAI_API_KEY,grades:Array.from({length:12},(_,i)=>i),subjects:['Matemáticas','Español','Inglés','Ciencias Naturales','Ciencias Sociales','Tecnología','Arte'],email:mailer.enabled,release:version,worldStatus:'foundation'}));
 app.use('/api',(req,res,next)=>db?next():res.status(503).json({error:'El registro estará disponible cuando se active la base de datos de Liam.'}));
 async function profile(user,session){
  const totals=await row('SELECT COALESCE(SUM(stars),0)::int AS stars FROM attempts WHERE user_id=$1',[user.id]);
  const school=await row('SELECT name,approved FROM schools WHERE id=$1',[user.school_id]);
  const journey=user.role==='student'?(await learning.pathFor(user)).filter(a=>a.reviewed):[];
  const current=journey.findIndex(a=>a.stars<2);
  return {id:user.public_id,role:user.role,firstName:user.first_name,lastName:user.last_name,email:user.email,emailVerified:user.email_verified,teacherVerified:user.teacher_verified,hasFamily:!!(await row('SELECT 1 FROM family_links WHERE child_id=$1 OR parent_id=$1',[user.id])),grade:user.grade,birthDate:user.birth_date,subjects:user.subjects,school,avatar:user.avatar,hasPhoto:!!user.photo,stars:totals.stars,level:current<0?journey.length+1:current+1,parentUntil:session?.parent_until||null,parentUnlocked:user.role==='parent'||!!session?.parent_until&&new Date(session.parent_until)>new Date()};
 }
 async function auth(req,res,next){const raw=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('liam_session='))?.slice(13);if(!raw)return res.status(401).json({error:'Inicia sesión para continuar.',code:'SESSION_REQUIRED'});const s=await row('SELECT * FROM sessions WHERE token_hash=$1 AND expires_at>now()',[digest(raw)]);if(!s)return res.status(401).json({error:'Tu sesión terminó. Vuelve a ingresar para continuar.',code:'SESSION_EXPIRED'});req.session=s;req.user=await row('SELECT * FROM users WHERE id=$1',[s.user_id]);if(!req.user)return res.status(401).json({error:'Vuelve a iniciar sesión.',code:'SESSION_EXPIRED'});next();}
 const adult=(req,res,next)=>{if(req.user.role==='teacher'||req.user.role==='parent'||(req.session.parent_until&&new Date(req.session.parent_until)>new Date()))return next();res.status(403).json({error:'Abre el área de padres con tu PIN.',code:'PARENT_REQUIRED'});};
 const teacher=(req,res,next)=>req.user.role==='teacher'&&req.user.teacher_verified&&req.user.email_verified?next():res.status(403).json({error:'Esta acción requiere un profesor con correo confirmado y autorización del colegio.'});
 async function sessionFor(user,res){const t=token();await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[digest(t),user.id]);res.cookie('liam_session',t,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:604800000,path:'/'});}
 app.get('/api/schools',async(req,res)=>res.json(await many('SELECT id,name FROM schools WHERE approved=true ORDER BY name')));
 app.post('/api/register',limit('register',5,3600000),async(req,res)=>{
  const b=req.body;const role=b.role;const first=clean(b.firstName,80),last=clean(b.lastName,100),email=clean(b.email,200).toLowerCase();
  if(!['student','teacher'].includes(role)||first.length<2||last.length<2||!/^\S+@\S+\.\S+$/.test(email)||typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail(400,'Completa tus nombres, correo y una contraseña de al menos 12 caracteres.');
  if(b.consent!==true)fail(400,'Se requiere la autorización del adulto responsable.');
  const age=ageOn(b.birthDate);if(role==='student'&&(!Number.isInteger(age)||age<4||age>20||Number(b.age)!==age||b.grade==null||String(b.grade).trim()===''||!Number.isInteger(Number(b.grade))||Number(b.grade)<0||Number(b.grade)>11||!/^\d{6}$/.test(b.parentPin??'')))fail(400,'Revisa la edad, fecha de nacimiento, grado y PIN de padres de 6 dígitos.');
  const subjects=Array.isArray(b.subjects)?b.subjects.map(x=>clean(x,60)).filter(Boolean).slice(0,10):[];if(role==='teacher'&&!subjects.length)fail(400,'Selecciona al menos un área de enseñanza.');
  const user={id:randomUUID(),publicId:`${role==='student'?'EX':'PR'}-${randomBytes(5).toString('hex').toUpperCase()}`};
  const passwordHash=await hash(b.password),pinHash=role==='student'?await hash(b.parentPin):null;
  try{await db.transaction(async tx=>{
   let school=(await tx.query('SELECT id FROM schools WHERE id=$1 AND approved=true',[clean(b.schoolId)])).rows[0];
   if(!school){const schoolName=clean(b.schoolName,150);if(schoolName.length<4)fail(400,'Selecciona tu colegio o solicita su incorporación con el nombre completo.');school={id:randomUUID()};await tx.query('INSERT INTO schools(id,name) VALUES($1,$2)',[school.id,schoolName]);}
   await tx.query('INSERT INTO users(id,public_id,role,first_name,last_name,email,password_hash,parent_pin_hash,school_id,grade,birth_date,subjects) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[user.id,user.publicId,role,first,last,email,passwordHash,pinHash,school.id,role==='student'?Number(b.grade):null,role==='student'?b.birthDate:null,JSON.stringify(subjects)]);
  });}catch(e){if(e.code==='23505')fail(409,'Ya existe una cuenta con ese correo. Ingresa o recupera tu acceso.');throw e;}
  await sessionFor(user,res);res.status(201).json(await profile(await row('SELECT * FROM users WHERE id=$1',[user.id])));
 });
 app.post('/api/login',limit('login',12,600000),async(req,res)=>{const email=clean(req.body.email,200).toLowerCase();const u=await row('SELECT * FROM users WHERE email=$1 OR public_id=$2',[email,email.toUpperCase()]);if(!u||typeof req.body.password!=='string'||req.body.password.length>128||!await verify(req.body.password,u.password_hash))fail(401,'Correo, ID o contraseña incorrectos.');await sessionFor(u,res);res.json(await profile(u));});
 app.post('/api/logout',auth,async(req,res)=>{await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.session.token_hash]);res.clearCookie('liam_session',{path:'/'});res.json({ok:true});});
 app.get('/api/me',auth,async(req,res)=>res.json(await profile(req.user,req.session)));
 app.patch('/api/me',auth,async(req,res)=>{const a=Number(req.body.avatar);if(!Number.isInteger(a)||a<0||a>23)fail(400,'Elige uno de los 24 avatares.');await db.query('UPDATE users SET avatar=$1,photo=NULL WHERE id=$2',[a,req.user.id]);res.json({ok:true});});
 app.put('/api/me/photo',auth,adult,async(req,res)=>{if(!imageValid(req.body.image))fail(400,'Elige una imagen JPG, PNG o WebP de hasta 3 MB.');await db.query('UPDATE users SET photo=$1 WHERE id=$2',[req.body.image,req.user.id]);res.json({ok:true});});
 app.get('/api/me/photo',auth,async(req,res)=>res.json({image:req.user.photo}));
 app.post('/api/parent/unlock',auth,limit('pin',6,600000),async(req,res)=>{
  const family=await row('SELECT u.id,u.parent_pin_hash FROM users u JOIN family_links f ON f.parent_id=u.id WHERE f.child_id=$1',[req.user.id]);
  if(!/^\d{6}$/.test(req.body.pin??'')||!await verify(req.body.pin,family?.parent_pin_hash||req.user.parent_pin_hash))fail(401,'El PIN no coincide. Revisa los 6 dígitos.');
  const session=await row("UPDATE sessions SET parent_until=now()+interval '10 minutes',guardian_id=$2 WHERE token_hash=$1 RETURNING parent_until",[req.session.token_hash,family?.id||null]);res.json({ok:true,parentUntil:session.parent_until});
 });
 app.post('/api/parent/lock',auth,async(req,res)=>{await db.query('UPDATE sessions SET parent_until=NULL WHERE token_hash=$1',[req.session.token_hash]);res.json({ok:true});});
 app.get('/api/rewards',auth,async(req,res)=>res.json(await many('SELECT id,title,target,claimed,claimed_at FROM rewards WHERE user_id=$1 ORDER BY target',[req.user.id])));
 app.post('/api/rewards',auth,adult,async(req,res)=>{const title=clean(req.body.title,100),target=Number(req.body.target);if(!title||!Number.isInteger(target)||target<1||target>100000)fail(400,'Escribe un premio y una meta válida.');const id=randomUUID();await db.query('INSERT INTO rewards(id,user_id,title,target) VALUES($1,$2,$3,$4)',[id,req.user.id,title,target]);res.status(201).json({id,title,target,claimed:false});});
 app.delete('/api/rewards/:id',auth,adult,async(req,res)=>{await db.query('DELETE FROM rewards WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({ok:true});});
 const context={app,db,row,many,auth,adult,teacher,limit,fail,profile,sessionFor,mailer};
 accountRoutes(context);
 const learning=learningRoutes(context);
 const sendPush=notifications(context);
 communityRoutes({...context,...learning,sendPush});
 app.get('/api/groups',auth,async(req,res)=>res.json(await many('SELECT c.id,c.name,c.owner_id=$1 AS owned,CASE WHEN c.owner_id=$1 THEN c.invite_code ELSE NULL END AS invite_code FROM classrooms c JOIN memberships m ON m.group_id=c.id WHERE m.user_id=$1',[req.user.id])));
 app.post('/api/groups',auth,teacher,async(req,res)=>{const name=clean(req.body.name,80);if(name.length<3)fail(400,'Escribe el nombre del grupo.');const id=randomUUID(),code=randomBytes(6).toString('hex').toUpperCase();const grade=Number(req.body.grade??0);if(!Number.isInteger(grade)||grade<0||grade>11)fail(400,'Selecciona un grado válido.');await db.transaction(async tx=>{await tx.query('INSERT INTO classrooms(id,owner_id,name,invite_code,school_id,grade) VALUES($1,$2,$3,$4,$5,$6)',[id,req.user.id,name,code,req.user.school_id,grade]);await tx.query('INSERT INTO memberships VALUES($1,$2)',[id,req.user.id]);});res.status(201).json({id,name,invite_code:code,owned:true});});
 app.post('/api/groups/join',auth,adult,limit('join',10,600000),async(req,res)=>{if(req.user.role==='teacher'&&!req.user.teacher_verified)fail(403,'La cuenta del profesor requiere autorización.');const g=await row('SELECT id,name,school_id FROM classrooms WHERE invite_code=$1',[clean(req.body.code,30).toUpperCase()]);if(!g)fail(404,'Código de grupo no válido.');if(req.user.role==='parent'||g.school_id!==req.user.school_id)fail(403,'El grupo debe pertenecer al colegio del alumno.');await db.query('INSERT INTO memberships VALUES($1,$2) ON CONFLICT DO NOTHING',[g.id,req.user.id]);res.json(g);});
 async function member(req,res,next){if(req.user.role==='teacher'&&!req.user.teacher_verified)return res.status(403).json({error:'La cuenta del profesor requiere autorización.'});const m=await row('SELECT 1 FROM memberships WHERE group_id=$1 AND user_id=$2',[req.params.id,req.user.id]);if(!m)return res.status(403).json({error:'Solo pueden entrar los miembros de este grupo.'});next();}
 app.get('/api/groups/:id/messages',auth,member,async(req,res)=>{const messages=await many('SELECT m.id,m.body,m.created_at,u.public_id,u.first_name,u.role,u.avatar,m.user_id=$2 AS mine FROM messages m JOIN users u ON u.id=m.user_id WHERE group_id=$1 AND m.hidden=false ORDER BY created_at DESC LIMIT 60',[req.params.id,req.user.id]);const reactions=await many('SELECT r.message_id,r.emoji,count(*)::int AS count,bool_or(r.user_id=$2) AS mine FROM reactions r JOIN messages m ON m.id=r.message_id WHERE m.group_id=$1 GROUP BY r.message_id,r.emoji',[req.params.id,req.user.id]);res.json(messages.reverse().map(m=>({...m,reactions:reactions.filter(r=>r.message_id===m.id)})));});
 app.post('/api/groups/:id/messages',auth,member,limit('message',30),async(req,res)=>{const body=clean(req.body.body,1000);if(!body)fail(400,'Escribe un mensaje.');const id=randomUUID();await db.query('INSERT INTO messages(id,group_id,user_id,body) VALUES($1,$2,$3,$4)',[id,req.params.id,req.user.id,body]);res.status(201).json({id});});
 app.post('/api/groups/:id/reaction',auth,member,async(req,res)=>{const emoji=req.body.emoji;if(!['👍','❤️','😊','🎉'].includes(emoji))fail(400,'Reacción no válida.');const m=await row('SELECT id FROM messages WHERE id=$1 AND group_id=$2 AND hidden=false',[clean(req.body.messageId),req.params.id]);if(!m)fail(404,'Mensaje no encontrado.');const old=await row('SELECT 1 FROM reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',[m.id,req.user.id,emoji]);if(old)await db.query('DELETE FROM reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',[m.id,req.user.id,emoji]);else await db.query('INSERT INTO reactions VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[m.id,req.user.id,emoji]);res.json({ok:true});});
 app.post('/api/groups/:id/report',auth,member,async(req,res)=>{const m=await row('SELECT id FROM messages WHERE id=$1 AND group_id=$2 AND hidden=false',[clean(req.body.messageId),req.params.id]);if(!m)fail(404,'Mensaje no encontrado.');await db.query('INSERT INTO reports(id,reporter_id,message_id,reason,created_at) VALUES($1,$2,$3,$4,now())',[randomUUID(),req.user.id,m.id,clean(req.body.reason,500)||'Revisión solicitada']);res.json({ok:true});});
 app.delete('/api/groups/:id/messages/:messageId',auth,member,async(req,res)=>{const g=await row('SELECT owner_id FROM classrooms WHERE id=$1',[req.params.id]);await db.query('DELETE FROM messages WHERE id=$1 AND group_id=$2 AND (user_id=$3 OR $4=true)',[req.params.messageId,req.params.id,req.user.id,g.owner_id===req.user.id]);res.json({ok:true});});
 app.post('/api/groups/:id/share',auth,teacher,member,async(req,res)=>{const g=await row('SELECT id FROM classrooms WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);const a=await row('SELECT id FROM activities WHERE id=$1 AND owner_id=$2 AND reviewed=true',[clean(req.body.activityId),req.user.id]);if(!g||!a)fail(403,'Revisa tu actividad y selecciona un grupo propio.');await db.query('INSERT INTO shared_activities VALUES($1,$2) ON CONFLICT DO NOTHING',[g.id,a.id]);res.json({ok:true});});
 app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
 app.use(express.static(path.join(root,'public'),{maxAge:0}));
 app.use((err,req,res,next)=>{if(res.headersSent)return next(err);const status=err.status||500;if(status>=500)console.error(JSON.stringify({error:'request_failed',code:err.code||'UNKNOWN',path:req.path}));const message=err.type==='entity.parse.failed'?'Los datos enviados no se pudieron leer. Revisa el formulario e inténtalo de nuevo.':status===413?'La imagen es demasiado grande. Elige una foto más pequeña.':status>=500&&!err.status?'No se pudo completar la operación. Inténtalo nuevamente en un momento.':err.message;res.status(status).json({error:message});});
 return {app,db};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {app,db}=await createApp();const server=app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Liam application ready'));process.on('SIGTERM',()=>server.close(async()=>{await db?.close();process.exit(0);}));}
