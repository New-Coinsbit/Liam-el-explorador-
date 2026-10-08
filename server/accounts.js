import {randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {token,digest,hash,verify,clean,ageOn} from './security.js';
export function accountRoutes(ctx){
 const {app,db,row,many,auth,adult,limit,fail,profile,sessionFor,mailer}=ctx;
 const cookieOptions={httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'};
 const ownFamily=async req=>req.user.role==='parent'?req.user:row('SELECT u.* FROM users u JOIN family_links f ON f.parent_id=u.id WHERE f.child_id=$1',[req.user.id]);
 async function issue(user,purpose){
  if(!mailer.enabled)fail(503,'El correo de recuperación está pendiente de activación.');
  const raw=token();await db.query('INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+interval \'30 minutes\')',[digest(raw),user.id,purpose]);
  const origin=process.env.APP_ORIGIN;if(!origin){await db.query('DELETE FROM account_tokens WHERE token_hash=$1',[digest(raw)]);fail(503,'Falta configurar la dirección de la aplicación.');}
  try{await mailer.send({to:user.email,subject:purpose==='verify'?'Confirma tu correo · Liam El Explorador':'Recupera tu acceso · Liam El Explorador',text:`Abre este enlace para ${purpose==='verify'?'confirmar tu correo':'elegir una nueva contraseña y PIN'}. Es de un solo uso y vence en 30 minutos.\n${origin}/#${purpose==='verify'?'verify-email':'reset-password'}?token=${raw}\nSi no lo solicitaste, ignora este correo.`});}catch(e){await db.query('DELETE FROM account_tokens WHERE token_hash=$1',[digest(raw)]);fail(503,'No se pudo enviar el correo. Intenta nuevamente más tarde.');}
 }
 app.post('/api/account/recover',limit('recover',5,3600000),async(req,res)=>{
  if(!mailer.enabled)fail(503,'El correo de recuperación está pendiente de activación.');
  const u=await row('SELECT * FROM users WHERE email=$1',[clean(req.body.email,200).toLowerCase()]);if(u)await issue(u,'reset');res.json({ok:true,message:'Si el correo corresponde a una cuenta, recibirás un enlace para recuperar el acceso.'});
 });
 app.post('/api/account/reset',limit('reset',10,600000),async(req,res)=>{
  const {password,pin}=req.body;if(typeof password!=='string'||password.length<12||password.length>128||!/^\d{6}$/.test(pin||''))fail(400,'Usa una contraseña de 12 caracteres o más y un PIN de 6 dígitos.');
  const passwordHash=await hash(password),pinHash=await hash(pin);
  await db.transaction(async tx=>{
   const t=(await tx.query("DELETE FROM account_tokens WHERE token_hash=$1 AND purpose='reset' AND expires_at>now() RETURNING user_id",[digest(clean(req.body.token,128))])).rows[0];if(!t)fail(400,'El enlace ya se usó o ha vencido. Solicita uno nuevo.');
   await tx.query('UPDATE users SET password_hash=$1,parent_pin_hash=$2,email_verified=true WHERE id=$3',[passwordHash,pinHash,t.user_id]);
   await tx.query('DELETE FROM sessions WHERE user_id=$1 OR guardian_id=$1 OR user_id IN (SELECT child_id FROM family_links WHERE parent_id=$1)',[t.user_id]);
   await tx.query('DELETE FROM account_tokens WHERE user_id=$1',[t.user_id]);
  });res.clearCookie('liam_session',{path:'/'});res.json({ok:true});
 });
 app.post('/api/account/send-verification',auth,limit('verify-mail',4,3600000),async(req,res)=>{const u=req.user.email?req.user:await ownFamily(req);if(!u?.email)fail(400,'Completa primero tu cuenta familiar.');if(!u.email_verified)await issue(u,'verify');res.json({ok:true});});
 app.post('/api/account/verify',limit('verify-token',10,600000),async(req,res)=>{await db.transaction(async tx=>{const t=(await tx.query("DELETE FROM account_tokens WHERE token_hash=$1 AND purpose='verify' AND expires_at>now() RETURNING user_id",[digest(clean(req.body.token,128))])).rows[0];if(!t)fail(400,'El enlace ya se usó o ha vencido.');await tx.query('UPDATE users SET email_verified=true WHERE id=$1',[t.user_id]);});res.json({ok:true});});
 app.post('/api/family/create',auth,adult,async(req,res)=>{
  if(req.user.role!=='student'||await ownFamily(req))fail(409,'La cuenta ya tiene una familia vinculada.');
  const first=clean(req.body.firstName,80),last=clean(req.body.lastName,100),password=req.body.password;
  if(first.length<2||last.length<2||typeof password!=='string'||password.length>128||!await verify(password,req.user.password_hash))fail(400,'Completa el nombre del adulto y confirma la contraseña actual.');
  if(typeof req.body.parentPassword!=='string'||req.body.parentPassword.length<12||req.body.parentPassword.length>128||req.body.parentPassword===password)fail(400,'Elige una contraseña exclusiva para el adulto, distinta de la del niño.');
  const parentHash=await hash(req.body.parentPassword);
  const id=randomUUID(),publicId='FA-'+randomBytes(5).toString('hex').toUpperCase();
  await db.transaction(async tx=>{
   const u=(await tx.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];
   if(!u.email)fail(409,'La cuenta ya tiene una familia vinculada.');
   await tx.query('UPDATE users SET email=NULL,parent_pin_hash=NULL WHERE id=$1',[u.id]);
   await tx.query("INSERT INTO users(id,public_id,role,first_name,last_name,email,password_hash,parent_pin_hash,email_verified) VALUES($1,$2,'parent',$3,$4,$5,$6,$7,$8)",[id,publicId,first,last,u.email,parentHash,u.parent_pin_hash,u.email_verified]);
   await tx.query('INSERT INTO family_links(parent_id,child_id) VALUES($1,$2)',[id,u.id]);
   await tx.query('DELETE FROM sessions WHERE user_id=$1',[u.id]);
  });const parent=await row('SELECT * FROM users WHERE id=$1',[id]);await sessionFor(parent,res);res.status(201).json(await profile(parent));
 });
 app.get('/api/family',auth,adult,async(req,res)=>{const parent=await ownFamily(req);if(!parent)return res.json({linked:false,children:[]});const children=await many('SELECT u.* FROM users u JOIN family_links f ON f.child_id=u.id WHERE f.parent_id=$1 ORDER BY u.created_at',[parent.id]);res.json({linked:true,parent:{id:parent.public_id,firstName:parent.first_name,email:parent.email},children:await Promise.all(children.map(u=>profile(u)))});});
 app.post('/api/family/children',auth,adult,async(req,res)=>{
  const parent=await ownFamily(req);if(!parent)fail(400,'Crea primero tu cuenta familiar.');
  const b=req.body,first=clean(b.firstName,80),last=clean(b.lastName,100),age=ageOn(b.birthDate),grade=Number(b.grade);
  if(first.length<2||last.length<2||!Number.isInteger(age)||age<4||age>20||b.grade==null||String(b.grade).trim()===''||!Number.isInteger(grade)||grade<0||grade>11||typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail(400,'Revisa el nombre, cumpleaños, grado y contraseña del alumno.');
  const school=await row('SELECT id FROM schools WHERE id=$1 AND approved=true',[clean(b.schoolId)]);if(!school)fail(400,'Selecciona un colegio aprobado.');
  const id=randomUUID(),publicId='EX-'+randomBytes(5).toString('hex').toUpperCase(),passwordHash=await hash(b.password);
  await db.transaction(async tx=>{await tx.query("INSERT INTO users(id,public_id,role,first_name,last_name,password_hash,school_id,grade,birth_date) VALUES($1,$2,'student',$3,$4,$5,$6,$7,$8)",[id,publicId,first,last,passwordHash,school.id,grade,b.birthDate]);await tx.query('INSERT INTO family_links VALUES($1,$2)',[parent.id,id]);});res.status(201).json(await profile(await row('SELECT * FROM users WHERE id=$1',[id])));
 });
 app.post('/api/family/select',auth,adult,async(req,res)=>{const parent=await ownFamily(req);if(!parent)fail(403,'No hay una familia vinculada.');const child=await row('SELECT u.* FROM users u JOIN family_links f ON f.child_id=u.id WHERE f.parent_id=$1 AND u.public_id=$2',[parent.id,clean(req.body.id)]);if(!child)fail(404,'Alumno no encontrado en tu familia.');await db.query('UPDATE sessions SET user_id=$1,guardian_id=$2,parent_until=NULL WHERE token_hash=$3',[child.id,parent.id,req.session.token_hash]);res.json(await profile(child,{guardian_id:parent.id}));});
 app.post('/api/family/return',auth,adult,async(req,res)=>{const parent=await ownFamily(req);if(!parent)fail(403,'No hay una familia vinculada.');await db.query('UPDATE sessions SET user_id=$1,guardian_id=NULL,parent_until=NULL WHERE token_hash=$2',[parent.id,req.session.token_hash]);res.json(await profile(parent));});
 app.post('/api/family/child-password',auth,adult,async(req,res)=>{const parent=await ownFamily(req),password=req.body.password;if(!parent||typeof password!=='string'||password.length<12||password.length>128)fail(400,'Revisa la nueva contraseña.');const child=await row('SELECT u.id FROM users u JOIN family_links f ON f.child_id=u.id WHERE f.parent_id=$1 AND u.public_id=$2',[parent.id,clean(req.body.id)]);if(!child)fail(404,'Alumno no encontrado.');await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await hash(password),child.id]);await db.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[child.id,req.session.token_hash]);res.json({ok:true});});
 app.post('/api/admin/login',limit('admin-login',5,600000),async(req,res)=>{const expected=process.env.ADMIN_KEY;const actual=String(req.body.key||'');if(!expected||!timingSafeEqual(Buffer.from(digest(actual)),Buffer.from(digest(expected))))fail(403,'Acceso restringido.');const raw=token();await db.query("INSERT INTO admin_sessions VALUES($1,now()+interval '30 minutes')",[digest(raw)]);res.cookie('liam_admin',raw,{...cookieOptions,maxAge:1800000});res.json({ok:true});});
 async function admin(req,res,next){
  if(process.env.ADMIN_KEY&&req.get('Authorization')===`Bearer ${process.env.ADMIN_KEY}`)return next();
  const raw=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('liam_admin='))?.slice(11);
  if(!raw||!await row('SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND expires_at>now()',[digest(raw)]))return res.status(403).json({error:'Abre la administración con tu clave.'});next();
 }
 app.get('/api/admin/queue',admin,async(req,res)=>res.json({schools:await many('SELECT * FROM schools ORDER BY approved,name'),teachers:await many("SELECT u.public_id,u.first_name,u.last_name,u.email_verified,u.teacher_verified,u.subjects,s.name AS school FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE role='teacher' ORDER BY created_at"),reports:await many("SELECT r.id,r.reason,r.created_at,r.status,COALESCE(m.body,d.body) AS body FROM reports r LEFT JOIN messages m ON m.id=r.message_id LEFT JOIN direct_messages d ON d.id=r.direct_message_id WHERE r.status='open' ORDER BY r.created_at")}));
 app.post('/api/admin/schools',admin,async(req,res)=>{const name=clean(req.body.name,150);if(name.length<4)fail(400,'Nombre no válido.');const id=clean(req.body.id)||randomUUID();await db.query('INSERT INTO schools(id,name,approved) VALUES($1,$2,true) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,approved=true',[id,name]);res.json({id,name});});
 app.post('/api/admin/teachers/:id',admin,async(req,res)=>{const u=await row("SELECT u.id,u.email_verified,s.approved FROM users u JOIN schools s ON s.id=u.school_id WHERE public_id=$1 AND role='teacher'",[req.params.id]);if(!u)fail(404,'Profesor no encontrado.');if(req.body.approved===true&&(!u.approved||!u.email_verified))fail(409,'Primero deben aprobarse el colegio y confirmarse el correo.');await db.query('UPDATE users SET teacher_verified=$1 WHERE id=$2',[req.body.approved===true,u.id]);res.json({ok:true});});
 app.post('/api/admin/reports/:id',admin,async(req,res)=>{const r=await row("SELECT * FROM reports WHERE id=$1 AND status='open'",[req.params.id]);if(!r)fail(404,'Reporte no encontrado.');if(!['hide','dismiss'].includes(req.body.action))fail(400,'Elige ocultar o cerrar sin cambios.');await db.transaction(async tx=>{if(req.body.action==='hide'){if(r.message_id)await tx.query('UPDATE messages SET hidden=true WHERE id=$1',[r.message_id]);if(r.direct_message_id)await tx.query('UPDATE direct_messages SET hidden=true WHERE id=$1',[r.direct_message_id]);}await tx.query("UPDATE reports SET status='resolved',resolution=$1,resolved_at=now() WHERE id=$2",[req.body.action,r.id]);});res.json({ok:true});});
 app.post('/api/admin/logout',admin,async(req,res)=>{const raw=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('liam_admin='))?.slice(11);if(raw)await db.query('DELETE FROM admin_sessions WHERE token_hash=$1',[digest(raw)]);res.clearCookie('liam_admin',{path:'/'});res.json({ok:true});});
 return {ownFamily};
}
