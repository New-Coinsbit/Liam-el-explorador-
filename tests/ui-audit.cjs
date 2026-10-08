const assert=require('node:assert/strict');
const {mkdtemp,rm,mkdir,writeFile}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-ui-audit-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';process.env.ADMIN_KEY='ui-audit-admin';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const {createApp}=await import('../server/index.js');const {app,db}=await createApp();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[],screens=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results',{recursive:true});
 const req=async(url,data)=>{const r=await context.request.post(origin+'/api'+url,{data});assert.ok(r.ok(),url+': '+await r.text());return r.json();};
 try{
  const school=await(await context.request.post(origin+'/api/admin/schools',{headers:{Authorization:'Bearer ui-audit-admin'},data:{name:'Colegio de auditoría móvil'}})).json();
  await req('/register',{role:'student',firstName:'Liam',lastName:'Prueba',email:'audit-mobile@example.invalid',password:'student-audit-password',parentPin:'123456',schoolId:school.id,grade:3,birthDate:(new Date().getUTCFullYear()-8)+'-01-01',age:8,consent:true});
  await req('/parent/unlock',{pin:'123456'});
  for(const width of [320,393,480]){
   await page.setViewportSize({width,height:width===320?568:852});
   for(const route of ['welcome','register','login','recovery','reset-password','verify-email','adventure','activities','profile','parents','family','progress','contacts','community','notifications','install','reinforce','teacher','editor']){
    await page.goto(origin+'/#'+route);await page.waitForFunction(()=>document.querySelector('main')&&!document.querySelector('.loading'));await page.evaluate(()=>document.fonts.ready);
    const measurements=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector('.page-header')?.getBoundingClientRect().height,nav:document.querySelector('.bottom-nav')?.getBoundingClientRect().height,text:document.querySelector('main').innerText}));
    assert.equal(measurements.overflow,false,route+' overflows at '+width);assert.ok(!/undefined|\[object Object\]|NaN/.test(measurements.text),route+' has a broken text value');
    if(measurements.header)assert.ok(measurements.header<=50,route+' header is not compact');
    screens.push({route,width,overflow:false,header:measurements.header||null});
    if(width===393&&['register','parents','profile','reinforce'].includes(route))await page.screenshot({path:'test-results/audit-'+route+'.png',fullPage:true});
   }
  }
  await page.setViewportSize({width:393,height:852});
  // Returning from the family setup must lead to the actual adult area.
  await page.goto(origin+'/#family');await page.locator('#family-create').waitFor();await page.locator('.page-header [data-nav]').click();await page.locator('#reward-form').waitFor();assert.equal(new URL(page.url()).hash,'#parents');
  // A late network response must not overwrite a more recently opened screen.
  let release;const hold=new Promise(r=>release=r);let observed,finished;const started=new Promise(r=>observed=r),handled=new Promise(r=>finished=r);
  await page.route('**/api/progress',async route=>{const response=await route.fetch();observed();await hold;await route.fulfill({response});finished();});
  await page.evaluate(()=>location.hash='progress');await started;await page.evaluate(()=>location.hash='profile');await page.getByRole('heading',{name:'Mi perfil',exact:true}).waitFor();release();await handled;await page.unroute('**/api/progress');
  await page.waitForTimeout(150);assert.equal(await page.getByRole('heading',{name:'Mi perfil',exact:true}).count(),1);
  // A camera-sized source photo is normalized; corrupt content fails visibly.
  const photo=await page.evaluate(async()=>{
   const {readImage}=await import('/js/api.js');const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1800;const ctx=canvas.getContext('2d');const pixels=ctx.createImageData(canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=(i*17)%251;pixels.data[i+1]=(i*13)%251;pixels.data[i+2]=(i*7)%251;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
   const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const data=await readImage(new File([blob],'colegio.png',{type:'image/png'}));const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data;});let invalid=false;try{await readImage(new File(['bad'],'bad.jpg',{type:'image/jpeg'}));}catch(e){invalid=/No se pudo leer/.test(e.message);}return {width:image.width,height:image.height,data,invalid};
  });assert.equal(photo.width,1600);assert.equal(photo.height,1200);assert.equal(photo.invalid,true);
  await page.goto(origin+'/#reinforce');await page.locator('#reinforce-form [name=title]').fill('Mi evaluación de ciencias');await page.locator('[name=subject]').selectOption('Ciencias Naturales',{force:true});await page.locator('[name=goal]').selectOption('Preparar evaluación',{force:true});
  const imageBytes=Buffer.from(photo.data.split(',')[1],'base64');await page.locator('#gallery-file').setInputFiles({name:'actividad.webp',mimeType:'image/webp',buffer:imageBytes});
  await page.locator('#image-preview img').waitFor();assert.equal(await page.locator('[name=title]').inputValue(),'Mi evaluación de ciencias');assert.equal(await page.locator('[name=subject]').inputValue(),'Ciencias Naturales');assert.equal(await page.locator('[name=goal]').inputValue(),'Preparar evaluación');
  // Expiration between opening a parent form and saving it must ask for the PIN again.
  await page.goto(origin+'/#parents');await page.locator('#reward-form').waitFor();await db.query("UPDATE sessions SET parent_until=now()-interval '1 minute'");await page.locator('#reward-form [name=title]').fill('Premio que requiere PIN');await page.locator('#reward-form [type=submit]').click();await page.locator('#parent-form').waitFor();assert.equal(await page.locator('#reward-form').count(),0);
  await page.locator('[name=pin]').fill('123456');await page.locator('#parent-form [type=submit]').click();await page.locator('#reward-form').waitFor();
  await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute'");await page.evaluate(()=>location.hash='notifications');await page.locator('#login-form').waitFor();assert.equal(new URL(page.url()).hash,'#login');
  const nativePage=await context.newPage();nativePage.on('pageerror',e=>errors.push(e.message));await nativePage.addInitScript(()=>globalThis.LIAM_NATIVE_CONFIG={preview:true,apiOrigin:null});await nativePage.goto(origin);await nativePage.getByText('Versión de prueba · sin cuentas reales',{exact:true}).waitFor();await nativePage.locator('.gold-button').click();await nativePage.locator('#adventure-map').waitFor();await nativePage.evaluate(()=>location.hash='install');await nativePage.getByText('La aplicación ya está instalada en este teléfono.',{exact:true}).waitFor();assert.equal(await nativePage.locator('[data-mobile=install]').count(),0);await nativePage.close();
  assert.deepEqual(errors,[]);await writeFile('test-results/ui-audit.json',JSON.stringify({screens,checks:['family back','stale response','camera normalization','corrupt photo','reinforcement fields preserved','expired adult PIN','expired session','native preview copy'],pageErrors:errors},null,2));console.log('PASS: '+screens.length+' mobile route/width checks; photos, navigation races, field preservation and session expiry.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
