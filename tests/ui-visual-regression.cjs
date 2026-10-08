const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),url=require('node:url').pathToFileURL(process.argv[2]||path.join(root,'../Liam_El_Explorador_v0.1.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const evidence=[];
 for(const [width,height] of [[320,568],[393,852],[480,740]]){
  await page.setViewportSize({width,height});await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('.welcome-art')?.complete);
  const cover=await page.locator('.welcome-art').boundingBox(),actions=await page.locator('.welcome-actions').boundingBox();
  assert.ok(Math.abs(cover.width/cover.height-933/1686)<.001);
  assert.ok(cover.x>=-.5&&cover.x+cover.width<=width+.5,'Cover is cut horizontally');
  // The title ends at y=535 and all companions end at y=1360 in the
  // approved 1686px artwork. Actions must stay below those actual pixels.
  assert.ok(actions.y>=cover.y+cover.height*1360/1686,'Buttons cover approved characters');
  assert.ok(cover.y+cover.height*535/1686<height,'Full title is outside portrait viewport');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(root,`test-results/portrait-${width}-welcome.png`),fullPage:true});
  await page.getByRole('button',{name:'Ver avance de la aplicación'}).click();
  await page.waitForFunction(()=>document.querySelector('#adventure-map')?.dataset.assetsReady==='true');
  await page.getByRole('button',{name:'Abrir el prototipo 360 grados',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#forest')?.dataset.assetsReady==='true');
  const density=await page.locator('canvas').evaluate(c=>c.width/c.getBoundingClientRect().width);
  assert.ok(density>=1.99,'3D canvas is downsampled on a 2x mobile display');
  const motion=page.locator('[data-action=toggle-motion]');
  if(await motion.getAttribute('aria-pressed')==='true')await motion.click();
  for(let i=0;i<20;i++){
   const previous=await page.locator('#forest').getAttribute('data-frames');
   await page.getByRole('button',{name:'Girar a la derecha',exact:true}).click();
   await page.waitForFunction(prev=>document.querySelector('#forest').dataset.frames!==prev,previous);
   const overlaps=await page.evaluate(()=>{
    const world=document.querySelector('#forest'),origin=world.getBoundingClientRect(),actors=JSON.parse(world.dataset.actorBounds);
    return [...world.querySelectorAll('.level-pin:not([hidden])')].flatMap(p=>{const r=p.getBoundingClientRect();return actors.filter(a=>r.right-origin.left>a.left&&r.left-origin.left<a.right&&r.bottom-origin.top>a.top&&r.top-origin.top<a.bottom).map(a=>`${p.dataset.level}/${a.name}`)});
   });
   assert.deepEqual(overlaps,[],`Labels overlap at ${width}px angle ${i}`);
   if(width===393&&[3,8,13,18].includes(i))await page.screenshot({path:path.join(root,`test-results/rotation-${i}.png`)});
  }
  await page.getByRole('button',{name:'Volver al inicio de la pista',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#forest').dataset.cameraYaw==='0.00');
  await page.screenshot({path:path.join(root,`test-results/portrait-${width}-adventure.png`)});
  evidence.push({width,height,density,rotationAngles:20,overlaps:0});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'test-results/visual-review.json'),JSON.stringify(evidence,null,2));
 await browser.close();console.log('PASS: full approved cover and clear character silhouettes at 320/393/480px; 60 camera angles, no label overlaps, 2x rendering and no JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
