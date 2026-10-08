const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(require('node:url').pathToFileURL(process.argv[2]||path.join(root,'../Liam_El_Explorador_v0.1.html')).href+'#preview');
 await p.waitForFunction(()=>document.querySelector('#adventure-map')?.dataset.assetsReady==='true');
 const rows=[];
 for(const [width,height] of [[320,568],[360,800],[393,852],[480,740]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(120);
  const result=await p.evaluate(()=>{
   const map=document.querySelector('#adventure-map'),box=map.getBoundingClientRect(),s=Number(map.dataset.imageScale),offset=JSON.parse(map.dataset.imageOffset);
   // Native bounds measured on the approved plate, independent of marker anchors.
   const characters=[{name:'Liam',x:232,y:840,w:255,h:618},{name:'owl',x:0,y:650,w:220,h:215},{name:'fox',x:418,y:1035,w:285,h:425}].map(r=>({name:r.name,left:box.left+offset.left+r.x*s,top:box.top+offset.top+r.y*s,right:box.left+offset.left+(r.x+r.w)*s,bottom:box.top+offset.top+(r.y+r.h)*s}));
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const controls=[...map.querySelectorAll('.trail-node:not([hidden]),.scene-start,.scene-mission,.map-discovery')].filter(el=>getComputedStyle(el).display!=='none');
   const overlaps=controls.flatMap(el=>characters.filter(c=>overlap(el.getBoundingClientRect(),c)).map(c=>el.className+'/'+c.name));
   const markers=[...map.querySelectorAll('.trail-node:not([hidden])')].map(el=>el.getBoundingClientRect());
   const start=map.querySelector('.scene-start').getBoundingClientRect(),navBox=document.querySelector('.bottom-nav').getBoundingClientRect();
   if(start.bottom>navBox.top+.5)throw Error('Start button hidden under navigation');
   const colliding=markers.some((r,i)=>markers.slice(i+1).some(other=>overlap(r,other)));
   return {overlaps,colliding,overflow:document.documentElement.scrollWidth>innerWidth,clipped:markers.some(r=>r.left<box.left||r.right>box.right||r.top<box.top||r.bottom>box.bottom),nav:document.querySelector('.bottom-nav').getBoundingClientRect().height};
  });
  assert.deepEqual(result.overlaps,[],`${width}: artwork covered`);assert.equal(result.colliding,false);assert.equal(result.overflow,false);assert.equal(result.clipped,false);assert.ok(result.nav<=60);
  await p.screenshot({path:path.join(root,`test-results/approved-map-${width}.png`),fullPage:true});rows.push({width,height,...result});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'test-results/approved-map-review.json'),JSON.stringify(rows,null,2));await b.close();console.log('PASS: approved artwork clear of levels/header/start button at 320/360/393/480; markers stay on-screen and do not overlap; compact nav and no JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
