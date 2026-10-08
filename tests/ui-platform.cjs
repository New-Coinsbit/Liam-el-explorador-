const assert=require('node:assert/strict');
const {mkdtemp,rm,mkdir}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'liam-ui-'));process.env.LOCAL_DATA_DIR=dir;process.env.NODE_ENV='test';process.env.ADMIN_KEY='ui-only-admin';delete process.env.DATABASE_URL;delete process.env.APP_ORIGIN;
 const {createApp}=await import('../server/index.js');const {app,db}=await createApp();const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results',{recursive:true});
 const choose=async(name,value)=>{const select=page.locator(`select[name="${name}"]`);await select.selectOption(value,{force:true});};
 try{
  const school=await (await context.request.post(origin+'/api/admin/schools',{headers:{Authorization:'Bearer ui-only-admin'},data:{name:'Colegio de prueba visual'}})).json();
  const birth=(new Date().getUTCFullYear()-8)+'-01-01';
  const registered=await context.request.post(origin+'/api/register',{data:{role:'student',firstName:'Liam',lastName:'Prueba',email:'ui-family@example.invalid',password:'student-ui-password',parentPin:'123456',schoolId:school.id,grade:3,birthDate:birth,age:8,consent:true}});assert.equal(registered.status(),201);
  await page.goto(origin+'/#activities');await page.locator('.activity-card').first().waitFor();assert.equal(await page.locator('.activity-card').count(),7);assert.equal(await page.locator('.activity-card').nth(1).isDisabled(),true);
  await page.locator('.activity-card').first().click();await page.locator('[data-action=begin-challenge]').click();
  for(const answer of [0,2,3,1,0]){await page.locator(`[data-answer="${answer}"]`).click();await page.locator('[data-action=next-question]').click();}
  await page.waitForURL('**/#result');assert.match(await page.locator('.result-stats').innerText(),/3 estrellas|3/);
  await page.goto(origin+'/#parents');await page.locator('[name=pin]').fill('123456');await page.locator('#parent-form [type=submit]').click();await page.locator('#reward-form').waitFor();
  await page.locator('#reward-form [name=title]').fill('Una tarde de lectura');await page.locator('#reward-form [name=target]').fill('3');await page.locator('#reward-form [type=submit]').click();await page.locator('[data-claim-reward]').click();await page.getByText(/^✓ Entregado/).waitFor();await page.screenshot({path:'test-results/31-reward-delivery.png',fullPage:true});
  await page.getByRole('button',{name:'Historial y avance escolar'}).click();await page.locator('.history-attempt').waitFor();await page.screenshot({path:'test-results/32-progress.png',fullPage:true});
  await page.goto(origin+'/#family');await page.locator('#family-create [name=firstName]').fill('Familia');await page.locator('#family-create [name=lastName]').fill('Prueba');await page.locator('#family-create [name=password]').fill('student-ui-password');await page.locator('#family-create [name=parentPassword]').fill('adult-exclusive-password');await page.locator('#family-create [type=submit]').click();await page.locator('#child-form').waitFor({state:'attached'});assert.equal(await page.locator('[data-platform=family-select]').count(),1);
  await page.getByText('Agregar otro niño',{exact:true}).click();await page.locator('#child-form [name=firstName]').fill('Sara');await page.locator('#child-form [name=lastName]').fill('Prueba');await choose('schoolId',school.id);await page.locator('#child-form [name=birthDate]').fill(birth);await page.locator('#child-form [name=password]').fill('sara-child-password');await page.locator('#child-form [type=submit]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-platform=family-select]').length===2);await page.locator('#toast.show').waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0');await page.screenshot({path:'test-results/33-family.png',fullPage:true});
  await page.locator('[data-platform=child-progress]').first().click();await page.locator('.history-attempt').waitFor();assert.match(await page.locator('main').innerText(),/Liam/);
  await page.goto(origin+'/#family');await page.locator('[data-platform=family-select]').first().click();await page.waitForSelector('#adventure-map');
  await page.goto(origin+'/#parents');assert.equal(await page.locator('#parent-form').count(),1);
  await page.locator('[name=pin]').fill('123456');await page.locator('#parent-form [type=submit]').click();await page.locator('#reward-form').waitFor();
  // Disconnect after loading an activity. Retry the exact queued answers once online.
  await page.goto(origin+'/#activities');await page.locator('.activity-card').first().click();await page.locator('[data-action=begin-challenge]').click();await context.setOffline(true);
  for(const answer of [0,2,3,1,0]){await page.locator(`[data-answer="${answer}"]`).click();await page.locator('[data-action=next-question]').click();}
  await page.getByRole('heading',{name:'Intento pendiente'}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('liam-pending-attempts')).length),1);
  await context.setOffline(false);await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('liam-pending-attempts')||'[]').length===0);const hist=await(await context.request.get(origin+'/api/progress')).json();assert.equal(hist.history.length,2);assert.equal(hist.profile.stars,3);
  await page.goto(origin+'/#install');await page.getByRole('heading',{name:'En tu teléfono'}).waitFor();await page.screenshot({path:'test-results/34-mobile.png',fullPage:true});
  // Teacher authors all three interactive formats through the actual editor.
  const tc=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const tp=await tc.newPage();tp.on('pageerror',e=>errors.push(e.message));
  const tr=await(await tc.request.post(origin+'/api/register',{data:{role:'teacher',firstName:'Profe',lastName:'Prueba',email:'ui-teacher@example.invalid',password:'teacher-ui-password',subjects:['Español'],schoolId:school.id,consent:true}})).json();await db.query('UPDATE users SET teacher_verified=true,email_verified=true WHERE public_id=$1',[tr.id]);
  await tp.goto(origin+'/#teacher');await tp.locator('[data-editor=new]').click();await tp.locator('#activity-editor').waitFor();await tp.locator('[name=title]').fill('Exploración combinada');await tp.locator('[name=topic]').fill('Lectura y cálculo');
  for(const [i,type] of [[0,'ordering'],[1,'matching'],[2,'number']]){await tp.locator(`select[name=type${i}]`).selectOption(type,{force:true});const det=tp.locator('.editor-question').nth(i);await det.evaluate(e=>e.open=true);await tp.locator(`[name=q${i}]`).fill(['Ordena la oración','Relaciona las parejas','¿Cuánto es 3 + 4?'][i]);await tp.locator(`[name=e${i}]`).fill('Buen trabajo. Practicamos paso a paso.');}
  await tp.locator('[name=items0]').fill('Liam\ncamina\nfeliz.');await tp.locator('[name=left1]').fill('🦊 Zorro\n🦉 Búho');await tp.locator('[name=right1]').fill('Zorro\nBúho');await tp.locator('[name=n2]').fill('7');await tp.screenshot({path:'test-results/35-activity-editor.png',fullPage:true});await tp.locator('#activity-editor [type=submit]').click();await tp.waitForURL('**/#teacher');await tp.locator('[data-activity]').click();await tp.locator('[data-action=begin-challenge]').click();
  for(const n of [2,1,0])await tp.locator(`[data-order="${n}"]`).click();await tp.locator('[data-action=next-question]').click();
  await tp.locator('select[data-match="0"]').selectOption('1',{force:true});await tp.locator('select[data-match="1"]').selectOption('0',{force:true});await tp.screenshot({path:'test-results/36-matching.png'});await tp.locator('[data-action=next-question]').click();await tp.locator('#number-answer').fill('7');await tp.locator('[data-action=next-question]').click();await tp.waitForURL('**/#result');assert.match(await tp.locator('.result-stats').innerText(),/EXCELENTE/);
  // Both sides can use the direct chat, and incoming messages refresh without erasing the composer.
  const group=await(await tc.request.post(origin+'/api/groups',{data:{name:'Grupo visual',grade:3}})).json();
  assert.equal((await context.request.post(origin+'/api/groups/join',{data:{code:group.invite_code}})).status(),200);
  const child=(await(await context.request.get(origin+'/api/me')).json()).id;
  const contact=await(await tc.request.post(origin+'/api/contacts',{data:{publicId:child}})).json();
  assert.equal((await context.request.post(origin+'/api/contacts/'+contact.id+'/approve',{data:{}})).status(),200);
  await page.goto(origin+'/#contacts');await page.locator('[data-platform=contact-open]').click();await page.locator('#direct-form').waitFor();await page.locator('#direct-form [name=body]').fill('Borrador que conservo');
  await tc.request.post(origin+'/api/contacts/'+contact.id+'/messages',{data:{body:'¡Hola, Liam!'}});
  await page.locator('#direct-messages').getByText('¡Hola, Liam!',{exact:true}).waitFor({timeout:10000});assert.equal(await page.locator('#direct-form [name=body]').inputValue(),'Borrador que conservo');
  await page.locator('#direct-form [type=submit]').click();await page.locator('#direct-messages').getByText('Borrador que conservo',{exact:true}).waitFor();
  // Keep all new screens within a narrow phone viewport.
  for(const width of [320,393,480]){await page.setViewportSize({width,height:740});for(const hash of ['parents','progress','family','contacts','install']){await page.goto(origin+'/#'+hash);await page.locator('.page-header').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,hash+' overflow '+width);}}
  assert.deepEqual(errors,[]);console.log('PASS: mobile UI, family, rewards, history, locks, offline retry and varied activities');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
