const assert=require('node:assert/strict');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const webpush=require('web-push');
(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-mobile-ui-')),keys=webpush.generateVAPIDKeys();
 Object.assign(process.env,{LOCAL_DATA_DIR:dir,NODE_ENV:'test',VAPID_SUBJECT:'https://liam.example.invalid',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey});delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const deliveries=[];const {createApp}=await import('../server/index.js');const {app,db}=await createApp({pushSender:async(...args)=>deliveries.push(args)});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 // Simulate the OS permission layer only. No real subscription or external delivery.
 await context.addInitScript(({publicKey})=>{
  let subscription=null;
  const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async({applicationServerKey})=>{
   subscription={endpoint:'https://fcm.googleapis.com/fcm/send/UI-TEST',options:{applicationServerKey:applicationServerKey.buffer},toJSON(){return {endpoint:this.endpoint,keys:{p256dh:publicKey,auth:'a'.repeat(22)}};},unsubscribe:async()=>{subscription=null;return true;}};return subscription;
  }}};
  Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>registration,ready:Promise.resolve(registration)}});
  window.PushManager=function(){};window.Notification={permission:'default',requestPermission:async()=>{window.Notification.permission='granted';return 'granted';}};
 },{publicKey:keys.publicKey});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const registered=await context.request.post(origin+'/api/register',{data:{role:'student',firstName:'Prueba',lastName:'Móvil',email:'mobile@example.invalid',password:'mobile-test-password',parentPin:'123456',schoolName:'Colegio ficticio móvil',grade:3,birthDate:(new Date().getUTCFullYear()-8)+'-01-01',age:8,consent:true}});assert.equal(registered.status(),201);
  await page.goto(origin+'/#install');await page.getByRole('button',{name:'Activar notificaciones',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-mobile="notifications"]').disabled);
  await page.getByRole('button',{name:'Activar notificaciones',exact:true}).click();await page.getByText('Abre primero el área de padres con tu PIN.',{exact:true}).waitFor();assert.equal(deliveries.length,0);
  await context.request.post(origin+'/api/parent/unlock',{data:{pin:'123456'}});await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-mobile="notifications"]')?.disabled);
  await page.evaluate(()=>{Notification.requestPermission=async()=>{Notification.permission='denied';return 'denied';};});
  await page.getByRole('button',{name:'Activar notificaciones',exact:true}).click();await page.getByText('Las notificaciones están bloqueadas.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Activar notificaciones',exact:true}).isDisabled(),true);
  await page.evaluate(()=>{Notification.permission='default';Notification.requestPermission=async()=>{Notification.permission='granted';return 'granted';};});
  await page.getByRole('button',{name:'Volver a comprobar'}).click();await page.waitForFunction(()=>!document.querySelector('[data-mobile="notifications"]').disabled);
  await page.getByRole('button',{name:'Activar notificaciones',exact:true}).click();await page.getByText('Activas en este teléfono.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Activar notificaciones',exact:true}).isVisible(),false);
  await page.getByRole('button',{name:'Enviar prueba a este teléfono'}).click();await page.getByText('Prueba enviada.',{exact:false}).waitFor();assert.equal(deliveries.length,1);
  await page.getByRole('button',{name:'Desactivar notificaciones',exact:true}).click();await page.getByText('Sin activar en este teléfono.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Enviar prueba a este teléfono'}).isVisible(),false);
  await page.evaluate(()=>{Notification.permission='denied';});await page.getByRole('button',{name:'Volver a comprobar'}).click();await page.getByText('Las notificaciones están bloqueadas.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Activar notificaciones',exact:true}).isDisabled(),true);
  await page.route('**/api/push/config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,publicKey:null,subscribed:false})}));
  await page.getByRole('button',{name:'Volver a comprobar'}).click();await page.getByText('Las notificaciones están pendientes de activación en el servicio.',{exact:true}).waitFor();
  for(const width of [320,393,480]){await page.setViewportSize({width,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors,[]);console.log('Mobile push UI: consent, activation, test, unsubscribe, denied/unavailable states and 3 widths passed. Delivery simulated.');
 }finally{await context.close();await browser.close();await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
