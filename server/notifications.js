import webpush from 'web-push';
export function notifications(ctx){
 const {app,db,row,many,auth,adult,fail}=ctx;
 const {VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT}=process.env;
 const enabled=!!(VAPID_PUBLIC_KEY&&VAPID_PRIVATE_KEY&&VAPID_SUBJECT);
 if(enabled)webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
 app.get('/api/push/config',auth,(req,res)=>res.json({enabled,publicKey:enabled?VAPID_PUBLIC_KEY:null}));
 app.post('/api/push/subscribe',auth,adult,async(req,res)=>{
  if(!enabled)fail(503,'Las notificaciones del teléfono están pendientes de activación.');
  const sub=req.body.subscription;let url;try{url=new URL(sub.endpoint);}catch{fail(400,'Suscripción no válida.');}
  const allowed=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||url.port||url.username||url.password||!allowed||sub.endpoint.length>3000||!/^[A-Za-z0-9_-]{80,120}$/.test(sub.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{20,32}$/.test(sub.keys?.auth||''))fail(400,'Servicio de notificaciones no compatible.');
  await db.query('INSERT INTO push_subscriptions(endpoint,user_id,session_hash,subscription) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,session_hash=EXCLUDED.session_hash,subscription=EXCLUDED.subscription',[sub.endpoint,req.user.id,req.session.token_hash,JSON.stringify(sub)]);res.json({ok:true});
 });
 app.post('/api/push/unsubscribe',auth,async(req,res)=>{await db.query('DELETE FROM push_subscriptions WHERE session_hash=$1',[req.session.token_hash]);res.json({ok:true});});
 return async user=>{
  if(!enabled)return;
  const subscriptions=await many('SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_hash WHERE p.user_id=$1 AND s.user_id=p.user_id AND s.expires_at>now()',[user]);
  await Promise.allSettled(subscriptions.map(async p=>{try{await webpush.sendNotification(p.subscription,JSON.stringify({title:'Liam El Explorador',body:'Tienes novedades en tu comunidad.',url:'/#notifications'}),{TTL:600,timeout:5000});}catch(e){if([404,410].includes(e.statusCode))await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1',[p.endpoint]);}}));
 };
}
