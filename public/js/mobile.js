import {api,post} from './api.js';
export function installMobile({app,state,page,card,toast,button}){
 let installPrompt,registration,syncing=false,currentPush;
 const key='liam-pending-attempts';
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'[]');}catch{return [];}};
 const write=items=>{try{sessionStorage.setItem(key,JSON.stringify(items));}catch{throw new Error('El teléfono no permite conservar el intento pendiente. Mantén este reto abierto y vuelve a guardar cuando tengas internet.');}};
 const offlineCopy=!!globalThis.LIAM_ASSETS||!!globalThis.LIAM_NATIVE_CONFIG;
 const workerReady=!offlineCopy&&'serviceWorker' in navigator&&window.isSecureContext?navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{registration=r;return r;}).catch(()=>null):Promise.resolve(null);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
 async function sync({manual=false}={}){
  if(syncing||!state.user||state.preview)return;syncing=true;
  try{const me=await api('/me');if(me.id!==state.user.id)return;for(const item of read().filter(a=>a.profileId===me.id)){const result=await post('/activities/'+encodeURIComponent(item.activityId)+'/attempt',item);write(read().filter(a=>a.submissionId!==item.submissionId));if(state.user?.id===me.id){state.user=result.profile;toast('Tu intento pendiente se guardó. Revisa el historial para ver el resultado.');}}}catch(error){if(manual)toast(error.message);}finally{syncing=false;}
 }
 window.addEventListener('online',()=>sync());window.addEventListener('liam-session-ready',()=>sync());
 async function submit(activityId,answers,submissionId){
  const item={activityId,answers,submissionId,profileId:state.user.id};
  try{return await post('/activities/'+activityId+'/attempt',item);}catch(e){if(e.code!=='NETWORK')throw e;const pending=read().filter(x=>x.submissionId!==submissionId);pending.push(item);write(pending);return {queued:true};}
 }
 function screen(){const native=!!globalThis.LIAM_NATIVE_CONFIG;currentPush=null;app.innerHTML=page('En tu teléfono',card(`<h2>Liam siempre a mano</h2>${native?'<p>La aplicación ya está instalada en este teléfono.</p>':'<p>Instala la aplicación desde tu navegador para abrirla a pantalla completa.</p>'+button('INSTALAR APLICACIÓN','data-mobile="install"')+'<p class="muted">Si no aparece el aviso, abre el menú del navegador y elige «Instalar aplicación» o «Añadir a la pantalla de inicio».</p>'}<h2>Conexión y permisos</h2><p class="muted">Puedes terminar un reto que ya abriste si pierdes internet. Sus respuestas quedan pendientes en esta pestaña hasta reconectar con el mismo alumno. Mantén la pestaña abierta hasta que se confirme el guardado.</p><p class="muted">Cámara y galería se abren únicamente cuando eliges tomar o subir una foto. Las conversaciones y fotos privadas no se guardan en la caché de la aplicación.</p><button class="secondary" data-mobile="sync">Guardar intentos pendientes (${read().filter(a=>a.profileId===state.user?.id).length})</button>`)+card(`<h2>Notificaciones del teléfono</h2>${native?'<p class="muted">Las notificaciones del teléfono todavía no están disponibles en esta versión Android. Puedes consultar los avisos dentro de Liam.</p>':'<div id="phone-push"><p class="muted" role="status" aria-live="polite">Comprobando este teléfono…</p><div class="stack"><button class="secondary" data-mobile="notifications" disabled>Activar notificaciones</button><button class="secondary" data-mobile="test" hidden>Enviar prueba a este teléfono</button><button class="text-link" data-mobile="unsubscribe" hidden>Desactivar notificaciones</button><button class="text-link" data-mobile="push-refresh">Volver a comprobar</button></div><p class="muted">El adulto autoriza su activación. Los avisos no muestran nombres, mensajes ni calificaciones y dejan de enviarse cuando cierras sesión.</p></div>'}`));if(!native)refreshPush();}
 async function refreshPush(){
  const host=app.querySelector('#phone-push');if(!host)return;currentPush=null;
  const status=host.querySelector('[role="status"]'),activate=host.querySelector('[data-mobile="notifications"]'),test=host.querySelector('[data-mobile="test"]'),off=host.querySelector('[data-mobile="unsubscribe"]');
  activate.disabled=true;activate.hidden=false;test.hidden=true;off.hidden=true;status.textContent='Comprobando este teléfono…';
  if(state.preview){status.textContent='Necesitas una cuenta real para activar las notificaciones.';return;}
  if(!('Notification' in window)||!('PushManager' in window)||offlineCopy){status.textContent='Este navegador no permite notificaciones. Prueba desde la aplicación instalada; en iPhone o iPad añádela primero a la pantalla de inicio.';return;}
  let timer;
  try{
   const [config,ready]=await Promise.all([api('/push/config'),Promise.race([workerReady,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),8000);})])]);
   if(!host.isConnected)return;
   if(!ready){status.textContent='El teléfono aún está preparando la aplicación. Vuelve a comprobar en unos segundos.';return;}
   const subscription=await ready.pushManager.getSubscription();if(!host.isConnected)return;
   currentPush={config,subscription};off.hidden=!subscription&&!config.subscribed;
   if(!config.enabled){status.textContent='Las notificaciones están pendientes de activación en el servicio.';return;}
   if(Notification.permission==='denied'){status.textContent='Las notificaciones están bloqueadas. Activa el permiso de Liam en los ajustes del navegador y vuelve a comprobar.';return;}
   const active=Notification.permission==='granted'&&config.subscribed&&!!subscription&&sameKey(subscription,config.publicKey);
   activate.hidden=active;activate.disabled=false;test.hidden=!active;
   status.textContent=active?'Activas en este teléfono. Puedes enviar una prueba para comprobar que llegan.':'Sin activar en este teléfono. Elige «Activar notificaciones» cuando quieras recibir avisos.';
  }catch(error){if(host.isConnected)status.textContent=error.message;}finally{clearTimeout(timer);}
 }
 const keyBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 function sameKey(subscription,key){const current=subscription.options?.applicationServerKey;if(!current)return false;const a=new Uint8Array(current),b=keyBytes(key);return a.length===b.length&&a.every((v,i)=>v===b[i]);}
 app.addEventListener('click',async e=>{const b=e.target.closest('[data-mobile]');if(!b||b.disabled)return;b.disabled=true;try{
  switch(b.dataset.mobile){
   case 'install':if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast('Usa el menú del navegador: Instalar aplicación o Añadir a inicio.');break;
   case 'sync':await sync({manual:true});screen();break;
   case 'notifications':{
    if(state.preview)throw new Error('Necesitas una cuenta real para activar las notificaciones.');
    if(!state.user.parentUnlocked&&state.user.role==='student')throw new Error('Abre primero el área de padres con tu PIN.');
    if(!registration||!currentPush?.config.enabled)throw new Error('Pulsa «Volver a comprobar» antes de activar las notificaciones.');
    const config=currentPush.config,epoch=globalThis.LIAM_ACCOUNT_EPOCH||0;
    // Ask in the click gesture; fetching configuration first can lose the gesture on iOS.
    if(await Notification.requestPermission()!=='granted')throw new Error('No se activaron las notificaciones. Puedes cambiar el permiso desde los ajustes del navegador.');
    if(epoch!==(globalThis.LIAM_ACCOUNT_EPOCH||0))break;
    let sub=await registration.pushManager.getSubscription(),created=false;
    if(sub&&!sameKey(sub,config.publicKey)){await sub.unsubscribe();sub=null;}
    if(!sub){sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)});created=true;}
    if(epoch!==(globalThis.LIAM_ACCOUNT_EPOCH||0)){if(created)await sub.unsubscribe();break;}
    try{await post('/push/subscribe',{subscription:sub.toJSON()});}catch(error){if(created)await sub.unsubscribe().catch(()=>{});throw error;}
    toast('Notificaciones activadas.');await refreshPush();break;
   }
   case 'test':await post('/push/test',{endpoint:currentPush?.subscription?.endpoint});toast('Prueba enviada. Revisa las notificaciones de este teléfono.');break;
   case 'push-refresh':await refreshPush();break;
   case 'unsubscribe':await post('/push/unsubscribe',{});await (await registration?.pushManager.getSubscription())?.unsubscribe();toast('Notificaciones desactivadas.');await refreshPush();break;
  }
 }catch(err){toast(err.message);if(['notifications','test'].includes(b.dataset.mobile))await refreshPush();}finally{if(b.isConnected&&b.dataset.mobile!=='notifications')b.disabled=false;}});
 return {screen,submit,sync};
}
