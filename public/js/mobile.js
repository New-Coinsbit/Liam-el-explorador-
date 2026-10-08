import {api,post} from './api.js';
export function installMobile({app,state,page,card,toast,button}){
 let installPrompt,registration,syncing=false;
 const key='liam-pending-attempts';
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'[]');}catch{return [];}};
 const write=items=>{try{sessionStorage.setItem(key,JSON.stringify(items));}catch{throw new Error('El teléfono no permite conservar el intento pendiente. Mantén este reto abierto y vuelve a guardar cuando tengas internet.');}};
 const offlineCopy=!!globalThis.LIAM_ASSETS||!!globalThis.LIAM_NATIVE_CONFIG;
 if(!offlineCopy&&'serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').then(r=>{registration=r;}).catch(()=>{});
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
 function screen(){const native=!!globalThis.LIAM_NATIVE_CONFIG;app.innerHTML=page('En tu teléfono',card(`<h2>Liam siempre a mano</h2>${native?'<p>La aplicación ya está instalada en este teléfono.</p>':'<p>Instala la aplicación desde tu navegador para abrirla a pantalla completa.</p>'+button('INSTALAR APLICACIÓN','data-mobile="install"')+'<p class="muted">Si no aparece el aviso, abre el menú del navegador y elige «Instalar aplicación» o «Añadir a la pantalla de inicio».</p>'}<h2>Conexión y permisos</h2><p class="muted">Puedes terminar un reto que ya abriste si pierdes internet. Sus respuestas quedan pendientes en esta pestaña hasta reconectar con el mismo alumno. Mantén la pestaña abierta hasta que se confirme el guardado.</p><p class="muted">Cámara y galería se abren únicamente cuando eliges tomar o subir una foto. Las conversaciones y fotos privadas no se guardan en la caché de la aplicación.</p><div class="stack"><button class="secondary" data-mobile="sync">Guardar intentos pendientes (${read().filter(a=>a.profileId===state.user?.id).length})</button>${native?'<p class="muted">Las notificaciones del teléfono todavía no están disponibles en esta versión.</p>':'<button class="secondary" data-mobile="notifications">Activar notificaciones del teléfono</button><button class="text-link" data-mobile="unsubscribe">Desactivar notificaciones</button>'}</div>`));}
 app.addEventListener('click',async e=>{const b=e.target.closest('[data-mobile]');if(!b)return;try{
  switch(b.dataset.mobile){
   case 'install':if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast('Usa el menú del navegador: Instalar aplicación o Añadir a inicio.');break;
   case 'sync':await sync({manual:true});screen();break;
   case 'notifications':{
    if(state.preview)throw new Error('Necesitas una cuenta real para activar las notificaciones.');
    if(!state.user.parentUnlocked&&state.user.role==='student')throw new Error('Abre primero el área de padres con tu PIN.');
    if(!('Notification' in window)||!('PushManager' in window)||!registration)throw new Error('Este navegador no permite notificaciones. Prueba desde la aplicación instalada.');
    const config=await api('/push/config');if(!config.enabled)throw new Error('Las notificaciones del teléfono están pendientes de activación.');
    if(await Notification.requestPermission()!=='granted')throw new Error('No se activaron las notificaciones.');
    const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/'));const applicationServerKey=Uint8Array.from(raw,c=>c.charCodeAt(0));
    const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});await post('/push/subscribe',{subscription:sub.toJSON()});toast('Notificaciones activadas.');break;
   }
   case 'unsubscribe':await post('/push/unsubscribe',{});await (await registration?.pushManager.getSubscription())?.unsubscribe();toast('Notificaciones desactivadas.');break;
  }
 }catch(err){toast(err.message);}});
 return {screen,submit,sync};
}
