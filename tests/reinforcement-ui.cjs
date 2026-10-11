const assert=require('node:assert/strict');
const {mkdtemp,rm,mkdir}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-photos-ui-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const {createApp}=await import('../server/index.js');const {app,db}=await createApp();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:393,height:852},permissions:['camera']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const registered=await context.request.post(origin+'/api/register',{data:{role:'teacher',firstName:'Docente',lastName:'Prueba',email:'ui-photos@example.invalid',password:'school-photo-test-123',schoolName:'Colegio de prueba',subjects:['Matemáticas'],consent:true}});assert.equal(registered.status(),201,await registered.text());
  await page.route('**/api/config',async route=>{const response=await route.fetch();const json=await response.json();await route.fulfill({json:{...json,ai:true}});});
  await page.goto(origin+'/#reinforce');await page.locator('#gallery-file').waitFor({state:'attached'});
  await page.locator('[name=title]').fill('Mis páginas del colegio');await page.locator('[name=subject]').selectOption('Ciencias Naturales',{force:true});
  await page.locator('[name=goal]').selectOption('Reforzar errores',{force:true});
  // Camera opens a live capture dialog; choosing the gallery is a separate action.
  let choosers=0;page.on('filechooser',()=>choosers++);
  await page.locator('#take-school-photo').click();await page.locator('dialog [data-capture]:enabled').waitFor();
  assert.equal(choosers,0);await page.locator('dialog [data-capture]').click();await page.waitForFunction(()=>document.querySelector('#photo-count').textContent==='1 de 20 imágenes');
  assert.equal(await page.locator('dialog.school-camera').count(),0);
  const chooser=page.waitForEvent('filechooser');await page.locator('#choose-school-images').click();assert.equal((await chooser).isMultiple(),true);
  const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=800;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,800);ctx.fillStyle='#16392b';ctx.font='24px Arial';ctx.fillText('Actividad de prueba: 2 + 2 = ?',30,100);return c.toDataURL('image/png').split(',')[1];}),'base64');
  const file=n=>({name:'pagina-'+n+'.png',mimeType:'image/png',buffer:png});
  await page.locator('#gallery-file').setInputFiles([file(2),file(3)]);await page.waitForFunction(()=>document.querySelector('#photo-count').textContent==='3 de 20 imágenes');
  await page.locator('#gallery-file').setInputFiles(Array.from({length:18},(_,i)=>file(i+4)));
  await page.waitForFunction(()=>document.querySelector('#photo-count').textContent==='20 de 20 imágenes'&&document.querySelector('#photo-message').textContent.includes('máximo'));
  assert.equal(await page.locator('#image-preview img').count(),20);assert.equal(await page.locator('#take-school-photo').isDisabled(),true);assert.equal(await page.locator('#choose-school-images').isDisabled(),true);
  assert.equal(await page.locator('[name=title]').inputValue(),'Mis páginas del colegio');assert.equal(await page.locator('[name=subject]').inputValue(),'Ciencias Naturales');assert.equal(await page.locator('[name=goal]').inputValue(),'Reforzar errores');
  await page.getByRole('button',{name:'Quitar imagen 2',exact:true}).click();assert.equal(await page.locator('#image-preview img').count(),19);
  await page.locator('#gallery-file').setInputFiles([file(2)]);await page.waitForFunction(()=>document.querySelector('#photo-count').textContent==='20 de 20 imágenes');
  // All selected pages go in one request. A server failure preserves them for retry.
  let sent;await page.route('**/api/reinforcement',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:503,json:{error:'Servicio de prueba no disponible'}});});
  await page.locator('#reinforce-form [type=submit]').click();await page.locator('.error-inline').waitFor();assert.equal(sent.images.length,20);assert.equal('image' in sent,false);assert.equal(await page.locator('#image-preview img').count(),20);
  for(const width of [320,393,480]){await page.setViewportSize({width,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.setViewportSize({width:393,height:852});await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/reinforcement-20-images.png',fullPage:true});
  // Navigation preserves the selection; sign-out clears it.
  await page.evaluate(()=>location.hash='profile');await page.getByRole('heading',{name:'Mi perfil',exact:true}).waitFor();await page.evaluate(()=>location.hash='reinforce');await page.locator('#photo-count').waitFor();assert.equal(await page.locator('#image-preview img').count(),20);
  await page.getByRole('button',{name:'Quitar imagen 1',exact:true}).click();
  await page.locator('#gallery-file').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')});await page.waitForFunction(()=>document.querySelector('#photo-message').textContent.includes('no se pudieron'));assert.equal(await page.locator('#image-preview img').count(),19);
  await page.locator('#take-school-photo').click();await page.locator('dialog [data-capture]:enabled').waitFor();const track=await page.evaluateHandle(()=>document.querySelector('video').srcObject.getVideoTracks()[0]);await page.locator('dialog [data-close]').click();assert.equal(await track.evaluate(t=>t.readyState),'ended');assert.equal(await page.locator('#image-preview img').count(),19);
  await page.evaluate(()=>location.hash='profile');await page.locator('[data-action=logout]').click();await page.locator('[data-action=preview]').waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: direct web camera, multiple gallery batches, limit 20/21, remove/re-add, form preservation, all 20 submitted, failure retry, corrupt image, cancel camera, navigation and 320/393/480px layout.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
