import webpush from 'web-push';
import {createECDH} from 'node:crypto';

export function pushConfig(env=process.env){
 const {VAPID_PUBLIC_KEY:publicKey,VAPID_PRIVATE_KEY:privateKey,VAPID_SUBJECT:subject}=env;
 if(!publicKey||!privateKey||!subject)return {enabled:false};
 try{
  const url=new URL(subject);
  if(!['https:','mailto:'].includes(url.protocol)||url.username||url.password)throw new Error('subject');
  if(!/^[A-Za-z0-9_-]{87}$/.test(publicKey)||!/^[A-Za-z0-9_-]{43}$/.test(privateKey))throw new Error('keys');
  const pair=createECDH('prime256v1');pair.setPrivateKey(Buffer.from(privateKey,'base64url'));
  if(pair.getPublicKey().toString('base64url')!==publicKey)throw new Error('pair');
  return {enabled:true,publicKey,vapidDetails:{subject,publicKey,privateKey}};
 }catch{return {enabled:false};}
}

export function notifications(ctx){
 const {app,db,row,many,auth,adult,limit,fail,pushSettings=pushConfig(),pushSender=webpush.sendNotification}=ctx;
 const {enabled,publicKey,vapidDetails}=pushSettings;
 app.get('/api/push/config',auth,async(req,res)=>res.json({enabled,publicKey:enabled?publicKey:null,subscribed:enabled&&!!await row('SELECT 1 FROM push_subscriptions WHERE session_hash=$1',[req.session.token_hash])}));
 app.post('/api/push/subscribe',auth,adult,async(req,res)=>{
  if(!enabled)fail(503,'Las notificaciones del teléfono están pendientes de activación.');
  const sub=req.body.subscription;let url;try{url=new URL(sub.endpoint);}catch{fail(400,'Suscripción no válida.');}
  const allowed=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||url.port||url.username||url.password||!allowed||sub.endpoint.length>3000||!/^[A-Za-z0-9_-]{80,120}$/.test(sub.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{20,32}$/.test(sub.keys?.auth||''))fail(400,'Servicio de notificaciones no compatible.');
  // Store only the fields needed by the push service, never caller-supplied metadata.
  const subscription={endpoint:sub.endpoint,keys:{p256dh:sub.keys.p256dh,auth:sub.keys.auth}};
  await db.query('INSERT INTO push_subscriptions(endpoint,user_id,session_hash,subscription) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,session_hash=EXCLUDED.session_hash,subscription=EXCLUDED.subscription',[sub.endpoint,req.user.id,req.session.token_hash,JSON.stringify(subscription)]);res.json({ok:true});
 });
 app.post('/api/push/unsubscribe',auth,async(req,res)=>{await db.query('DELETE FROM push_subscriptions WHERE session_hash=$1',[req.session.token_hash]);res.json({ok:true});});
 async function deliver(subscription,kind='community'){
  try{await pushSender(subscription,JSON.stringify({kind}),{TTL:600,timeout:5000,vapidDetails});return true;}
  catch(error){if([404,410].includes(error.statusCode)){await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1',[subscription.endpoint]);return false;}throw error;}
 }
 app.post('/api/push/test',auth,adult,limit('push-test',3,60000),async(req,res)=>{
  if(!enabled)fail(503,'Las notificaciones del teléfono están pendientes de activación.');
  const target=await row('SELECT subscription FROM push_subscriptions WHERE session_hash=$1 AND endpoint=$2',[req.session.token_hash,String(req.body.endpoint||'')]);
  if(!target)fail(404,'Activa primero las notificaciones en este teléfono.');
  let sent;try{sent=await deliver(target.subscription,'test');}catch{fail(503,'No pudimos enviar la prueba. Revisa la conexión y vuelve a intentarlo.');}
  if(!sent)fail(410,'El permiso anterior venció. Activa de nuevo las notificaciones.');
  res.json({ok:true});
 });
 return async user=>{
  if(!enabled)return;
  const subscriptions=await many('SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_hash WHERE p.user_id=$1 AND s.user_id=p.user_id AND s.expires_at>now()',[user]);
  await Promise.allSettled(subscriptions.map(p=>deliver(p.subscription)));
 };
}
