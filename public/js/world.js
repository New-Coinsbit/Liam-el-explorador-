import * as THREE from '../vendor/three.module.js';
import {loadRiggedCompanions} from './rigged-companions.js';
import {ambience} from './ambience.js';

const atlasRows = {liam: {y:0, h:.405, ratio:.617}, owl: {y:.409,h:.251,ratio:.996}, fox:{y:.668,h:.316,ratio:.791}};
const asset = name => globalThis.LIAM_ASSETS?.[name] || `/assets/${name}.webp`;

// Real 3D terrain, trail, water and foliage. Companions are animated cutout sprites
// in the 3D scene, preserving the approved artwork; they are not volumetric models.
export function mountWorld(container, {welcome = false, activities = [], level = 1, onLevel = () => {}, onUnavailable = () => {}} = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'low-power'}); }
  catch { container.classList.add('scene-fallback'); container.insertAdjacentHTML('afterbegin','<p class="scene-fallback-note">El dispositivo no pudo abrir el entorno 3D. Los retos siguen disponibles.</p>'); return () => {}; }
  let disposed = false, raf, tick = 0, last = performance.now(), lastDraw = 0, pendingTextures = 3;
  const resources = new Set(), disposeWithScene = r => (resources.add(r), r);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xabcac4); scene.fog = new THREE.FogExp2(0x9fb7a0, .006);
  const camera = new THREE.PerspectiveCamera(welcome ? 44 : 53, 1, .1, 260);
  const canvas = renderer.domElement; canvas.className = 'forest-canvas'; canvas.setAttribute('aria-label','Bosque 3D: arrastra para mirar 360 grados'); canvas.tabIndex = 0;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(canvas);
  const hemi = new THREE.HemisphereLight(0xebf8fd,0x4b622a,1.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2a1,2.3); sun.position.set(-16,32,14); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:75}); sun.shadow.bias=-.001; scene.add(sun); scene.add(sun.target);
  const loader = new THREE.TextureLoader();
  const load = (name, fn) => loader.load(asset(name), texture => { if (disposed) return texture.dispose(); pendingTextures--; disposeWithScene(texture); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); fn(texture); }, undefined, () => { pendingTextures--; container.dataset.textureFallback = 'true'; });
  load('forest-panorama', texture => { texture.mapping = THREE.EquirectangularReflectionMapping; scene.background = texture; scene.backgroundRotation.y = -.2; });
  let seed=17093; const rand=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const mat = (color, opts={}) => disposeWithScene(new THREE.MeshStandardMaterial({color,roughness:.9,...opts}));
  const geo = g => disposeWithScene(g);
  const add = (geometry, material, x=0,y=0,z=0) => { const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);scene.add(mesh);return mesh; };
  function texture(draw, size=256) { const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=disposeWithScene(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t; }
  const soil = texture((c,s)=>{c.fillStyle='#667247';c.fillRect(0,0,s,s);for(let i=0;i<14000;i++){const v=50+rand()*70;c.fillStyle=`rgba(${v|0},${v+12|0},${v*.5|0},.4)`;c.fillRect(rand()*s,rand()*s,1+rand()*3,1+rand()*2);}});
  soil.wrapS=soil.wrapT=THREE.RepeatWrapping; soil.repeat.set(32,32);
  const bark = texture((c,s)=>{c.fillStyle='#615039';c.fillRect(0,0,s,s);for(let i=0;i<250;i++){c.strokeStyle=`rgba(${50+rand()*65|0},${40+rand()*45|0},24,.45)`;c.beginPath();const x=rand()*s;c.moveTo(x,0);c.bezierCurveTo(x-10,80,x+10,140,x+rand()*12,s);c.stroke();}});
  bark.wrapS=bark.wrapT=THREE.RepeatWrapping; bark.repeat.set(2,4);
  const heightAt=(x,z)=>Math.sin(z*.037)*.8+Math.sin(x*.075)*.4+Math.cos(z*.055+x*.04)*.45;
  const groundGeo=geo(new THREE.PlaneGeometry(250,260,75,85)); groundGeo.rotateX(-Math.PI/2); groundGeo.translate(0,0,-65);
  const gp=groundGeo.attributes.position; for(let i=0;i<gp.count;i++)gp.setY(i,heightAt(gp.getX(i),gp.getZ(i))-.09);groundGeo.computeVertexNormals();
  const ground=add(groundGeo,mat(0xa5b473,{map:soil}));ground.receiveShadow=true;
  const distance = Math.max(85,Math.min(220,activities.length*13+40));
  const curve = new THREE.CatmullRomCurve3(Array.from({length:30},(_,i)=>{const z=14-i/29*distance,x=Math.sin(i/29*Math.PI*3)*6;return new THREE.Vector3(x,heightAt(x,z)+.04,z);}));
  const verts=[], uv=[], inds=[];
  for(let n=0;n<=265;n++){const i=n-45,t=Math.max(0,i/220),p=curve.getPoint(t),tangent=curve.getTangent(t);if(i<0)p.addScaledVector(tangent,i/220*distance);const normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();for(const side of [-1,1]){const v=p.clone().addScaledVector(normal,side*(1.5+Math.sin(i*.11)*.18));verts.push(v.x,heightAt(v.x,v.z)+.018,v.z);uv.push(side===-1?0:1,i/10);}if(n<265){const k=n*2;inds.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const pathTexture=texture((c,s)=>{c.fillStyle='#c5b080';c.fillRect(0,0,s,s);for(let i=0;i<4500;i++){c.fillStyle=rand()>.5?'#ac966e66':'#efe0ad55';c.fillRect(rand()*s,rand()*s,1+rand()*3,rand()*4+1);}for(let i=0;i<60;i++){c.fillStyle='#99836355';c.beginPath();c.ellipse(rand()*s,rand()*s,rand()*7+1,rand()*3+1,rand()*3,0,7);c.fill();}});pathTexture.wrapS=pathTexture.wrapT=THREE.RepeatWrapping;
  const pathGeo=geo(new THREE.BufferGeometry());pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));pathGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));pathGeo.setIndex(inds);pathGeo.computeVertexNormals();add(pathGeo,mat(0xffffff,{map:pathTexture,side:THREE.DoubleSide})).receiveShadow=true;
  const leafTexture=texture((c,s)=>{const g=c.createLinearGradient(0,0,s,s);g.addColorStop(0,'#acc966');g.addColorStop(.4,'#477e36');g.addColorStop(1,'#183f2b');c.fillStyle=g;c.beginPath();c.moveTo(s*.5,2);c.bezierCurveTo(s*.98,s*.26,s*.92,s*.78,s*.5,s*.98);c.bezierCurveTo(s*.09,s*.8,s*.08,s*.25,s*.5,2);c.fill();c.strokeStyle='#d1d68a77';c.lineWidth=2;c.beginPath();c.moveTo(s*.5,10);c.lineTo(s*.5,s*.94);c.stroke();for(let i=1;i<8;i++){c.beginPath();c.moveTo(s*.5,s*(.13+i*.1));c.lineTo(s*(i%2?.79:.21),s*(.05+i*.1));c.stroke();}},128);
  const foliageMaterial=disposeWithScene(new THREE.MeshBasicMaterial({color:0xddebd1,map:leafTexture,alphaTest:.25,side:THREE.DoubleSide,fog:true,toneMapped:false}));
  const fernMaterial=disposeWithScene(foliageMaterial.clone());
  let windShader;
  foliageMaterial.onBeforeCompile=shader=>{shader.uniforms.uWind={value:0};shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x += sin(uWind*1.4 + instanceMatrix[3].x*.15 + instanceMatrix[3].z*.09)*.13*(position.y+.5);\n#endif');windShader=shader;};
  const trees=[]; const matrix=new THREE.Object3D(); const treeCount=65, leavesPerTree=16;
  const trunks=new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(.2,.43,1,7)),mat(0x9e9277,{map:bark,bumpMap:bark,bumpScale:.18}),treeCount);trunks.castShadow=true;trunks.receiveShadow=true;scene.add(trunks);disposeWithScene(trunks);
  const foliage=new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1,1,1,3)),foliageMaterial,treeCount*leavesPerTree);scene.add(foliage);disposeWithScene(foliage);
  for(let i=0;i<treeCount;i++){const t=rand(),p=curve.getPoint(t),side=i%2?1:-1,x=p.x+side*(6+rand()*28),z=p.z+(rand()-.5)*8,h=6+rand()*5,y=heightAt(x,z);trees.push({x,y,z,h});matrix.position.set(x,y+h/2,z);matrix.rotation.set(0,rand()*6.28,side*.03);matrix.scale.set(1,h,1);matrix.updateMatrix();trunks.setMatrixAt(i,matrix.matrix);for(let j=0;j<leavesPerTree;j++){const angle=rand()*6.28,r=rand()*3.2;matrix.position.set(x+Math.cos(angle)*r,y+h-1+rand()*3.4,z+Math.sin(angle)*r);matrix.rotation.set((rand()-.5)*1.5,angle,(rand()-.5)*1.1);const size=2.9+rand()*1.4;matrix.scale.set(size*.8,size,1);matrix.updateMatrix();foliage.setMatrixAt(i*leavesPerTree+j,matrix.matrix);}}
  const rockMat=mat(0x888773),rocks=new THREE.InstancedMesh(geo(new THREE.DodecahedronGeometry(1,1)),rockMat,130);rocks.receiveShadow=true;rocks.castShadow=true;scene.add(rocks);disposeWithScene(rocks);
  for(let i=0;i<130;i++){const p=curve.getPoint(rand()),x=p.x+(i%2?1:-1)*(2.2+rand()*3.5),z=p.z;matrix.position.set(x,heightAt(x,z)+.07,z);matrix.rotation.set(rand(),rand()*6,rand());const size=.18+rand()*.75;matrix.scale.set(size,size*.6,size*.85);matrix.updateMatrix();rocks.setMatrixAt(i,matrix.matrix);}
  const ferns=new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1,1)),fernMaterial,240);scene.add(ferns);disposeWithScene(ferns);
  for(let i=0;i<240;i++){const p=curve.getPoint(rand()),x=p.x+(i%2?1:-1)*(2+rand()*6),z=p.z+(rand()-.5)*2;matrix.position.set(x,heightAt(x,z)+.2,z);matrix.rotation.set(-.05,rand()*6.28,0);matrix.scale.set(1.1+rand()*.9,1.1+rand()*.9,1);matrix.position.y+=.45;matrix.updateMatrix();ferns.setMatrixAt(i,matrix.matrix);}
  const waterTexture=texture((c,s)=>{c.fillStyle='#458e87';c.fillRect(0,0,s,s);for(let i=0;i<100;i++){c.strokeStyle=i%3?'#ade6d444':'#e7f6e055';c.beginPath();const y=rand()*s;c.moveTo(0,y);c.bezierCurveTo(80,y-12,180,y+12,s,y);c.stroke();}});waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;waterTexture.repeat.set(3,10);
  const waterMat=mat(0x93d4c3,{map:waterTexture,roughness:.25,metalness:.2,transparent:true,opacity:.9});
  const river=add(geo(new THREE.PlaneGeometry(7,150,12,50)),waterMat,-15,-.4,-46);river.rotation.x=-Math.PI/2;
  const waterfall=add(geo(new THREE.PlaneGeometry(4.8,11,6,16)),mat(0xd2fff0,{map:waterTexture,transparent:true,opacity:.73,side:THREE.DoubleSide,roughness:.3}),-15,5,-36);
  const cliff=add(geo(new THREE.DodecahedronGeometry(1,1)),rockMat,-16,3,-38);cliff.scale.set(8,8,4);cliff.rotation.z=.2;
  const cloudTexture=texture((c,s)=>{for(let i=0;i<14;i++){const x=s*(.17+rand()*.65),y=s*(.35+rand()*.3),r=s*(.11+rand()*.15),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,253,236,.65)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,s,s);}});
  const cloudMat=disposeWithScene(new THREE.SpriteMaterial({map:cloudTexture,transparent:true,opacity:.7,depthWrite:false,fog:false}));const clouds=[];
  for(let i=0;i<11;i++){const cloud=new THREE.Sprite(cloudMat);cloud.position.set((rand()-.5)*120,20+rand()*12,-10-rand()*130);cloud.scale.set(28+rand()*30,12+rand()*8,1);scene.add(cloud);clouds.push(cloud);}
  const falling=new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(.18,.3)),foliageMaterial,70);scene.add(falling);disposeWithScene(falling);const leafParticles=Array.from({length:70},()=>({x:(rand()-.5)*22,y:2+rand()*12,z:14-rand()*50,s:rand()*6.28}));
  const companions=new THREE.Group();scene.add(companions);const actors=[];const modelAbort=new AbortController();let rigged=null;
  if(!globalThis.LIAM_ASSETS)loadRiggedCompanions({parent:companions,signal:modelAbort.signal}).then(models=>{if(disposed){models?.dispose();return;}rigged=models;if(models)container.dataset.riggedCharacters='true';}).catch(()=>{container.dataset.riggedCharacters='unavailable';});
  load('companions-atlas',atlas=>{for(const [i,name] of ['owl','liam','fox'].entries()){const row=atlasRows[name],map=disposeWithScene(atlas.clone());map.needsUpdate=true;map.repeat.set(.25,row.h);map.offset.set(0,1-row.y-row.h);const material=disposeWithScene(new THREE.SpriteMaterial({map,alphaTest:.2,transparent:true,depthWrite:true,toneMapped:false}));const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);const h=name==='liam'?3.6:name==='owl'?(welcome?1.5:1.65):(welcome?1.65:1.8);sprite.scale.set(h*row.ratio,h,1);sprite.position.set((i-1)*(welcome?1.03:1.5),name==='owl'?.65:0,name==='liam'?0:.15);companions.add(sprite);actors.push({name,sprite,map,h,baseY:sprite.position.y,row});}});
  const owlPerch=add(geo(new THREE.DodecahedronGeometry(.55,1)),rockMat);owlPerch.scale.set(1,.8,1);
  load('forest-props', atlas=>{
    const part=(x,y)=>{const map=disposeWithScene(atlas.clone());map.repeat.set(.5,.5);map.offset.set(x*.5,(1-y)*.5);map.needsUpdate=true;return map;};
    foliageMaterial.map=part(0,0);foliageMaterial.needsUpdate=true;fernMaterial.map=part(1,0);fernMaterial.needsUpdate=true;
    const rockPhoto=disposeWithScene(new THREE.SpriteMaterial({map:part(0,1),alphaTest:.25,transparent:true,toneMapped:false}));
    const flowers=disposeWithScene(new THREE.SpriteMaterial({map:part(1,1),alphaTest:.25,transparent:true,toneMapped:false}));
    for(let i=0;i<62;i++){const p=curve.getPoint(rand()),x=p.x+(i%2?1:-1)*(2.1+rand()*4),z=p.z;const prop=new THREE.Sprite(i%3===0?flowers:rockPhoto);prop.center.set(.5,0);prop.position.set(x,heightAt(x,z),z);prop.scale.setScalar(1.1+rand()*1.1);scene.add(prop);}
    owlPerch.visible=false;const perch=new THREE.Sprite(rockPhoto);perch.center.set(.5,0);perch.position.set(welcome?-1.03:-1.5,0,.15);perch.scale.set(1.3,.95,1);companions.add(perch);
  });
  const shadowTexture=texture((c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'#07150ecc');g.addColorStop(1,'#07150e00');c.fillStyle=g;c.fillRect(0,0,s,s);});
  const shadow=add(geo(new THREE.PlaneGeometry(6,3.5)),disposeWithScene(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false})));shadow.rotation.x=-Math.PI/2;
  const pins=document.createElement('div');pins.className='level-pins';container.append(pins);const portals=[];
  const first=Math.max(0,level-3),count=Math.min(8,Math.max(6,activities.length-first));
  if(!welcome)for(let n=0;n<count;n++){const index=first+n,ready=index<activities.length,unlocked=ready&&index<level,p=curve.getPoint(.1+n*.105);const ring=add(geo(new THREE.TorusGeometry(.92,.07,8,40)),mat(unlocked?0xffc95c:0x9aac9f,{emissive:unlocked?0xb47917:0x173428,emissiveIntensity:unlocked?.7:.2}),p.x,p.y+.14,p.z);ring.rotation.x=-Math.PI/2;const base=add(geo(new THREE.CylinderGeometry(1.08,1.16,.13,32)),mat(unlocked?0xb9974e:0x617162),p.x,p.y+.03,p.z);base.receiveShadow=true;const button=document.createElement('button');button.type='button';button.className='level-pin'+(unlocked?' unlocked':' locked');button.textContent=String(index+1);button.setAttribute('aria-label',`Nivel ${index+1}${unlocked?' disponible':ready?' bloqueado':' próximamente'}`);button.dataset.level=String(index+1);button.addEventListener('click',()=>unlocked?onLevel(activities[index]):onUnavailable(ready?'Consigue dos estrellas en el nivel anterior para avanzar.':'Tu profesor añadirá las próximas actividades.'));pins.append(button);portals.push({position:p.clone().add(new THREE.Vector3(0,1.1,0)),button,ring});}
  let progress=welcome?.022:.025, yaw=0,pitch=welcome?.06:.22,zoom=welcome?10:12,walking=0,pointer=null,dragDistance=0;
  const center=new THREE.Vector3(),projected=new THREE.Vector3();
  function updateCamera(){const p=curve.getPoint(progress);companions.position.copy(p);companions.position.y+=.02;owlPerch.position.copy(p).add(new THREE.Vector3(welcome?-1.03:-1.5,.32,.15));shadow.position.copy(p);shadow.position.y+=.045;
    center.copy(p).add(new THREE.Vector3(0,welcome?2.35:1.35,welcome?0:-4.7));
    const azimuth=welcome?Math.sin(tick*.1)*.035:yaw;
    camera.position.copy(p).add(new THREE.Vector3(Math.sin(azimuth)*zoom, welcome?3.1:3.8+pitch*7,Math.cos(azimuth)*zoom));camera.lookAt(center);
    sun.position.copy(p).add(new THREE.Vector3(-16,32,14));sun.target.position.copy(p);
  }
  const onDown=e=>{if(welcome)return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};dragDistance=0;pins.classList.add('is-rotating');canvas.setPointerCapture(e.pointerId);};
  const onMove=e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;dragDistance+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.007;pitch=THREE.MathUtils.clamp(pitch+dy*.004,-.05,.65);pointer.x=e.clientX;pointer.y=e.clientY;};
  const onUp=()=>{pointer=null;};
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
  const keydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw+=.13;if(e.key==='ArrowRight')yaw-=.13;if(e.key==='ArrowUp')progress=Math.min(.87,progress+.006);if(e.key==='ArrowDown')progress=Math.max(.008,progress-.006);}};canvas.addEventListener('keydown',keydown);
  const handlers=[];const on=(el,event,fn)=>{if(el){el.addEventListener(event,fn);handlers.push([el,event,fn]);}};
  for(const [selector,direction] of [['[data-walk=forward]',1],['[data-walk=back]',-1]]){const b=container.querySelector(selector);on(b,'pointerdown',e=>{e.preventDefault();walking=direction;b.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])on(b,event,()=>walking=0);}
  on(container.querySelector('[data-look=left]'),'click',()=>yaw+=.35);on(container.querySelector('[data-look=right]'),'click',()=>yaw-=.35);
  on(container.querySelector('[data-look=reset]'),'click',()=>{yaw=0;pitch=.22;progress=.025;});
  const resize=()=>{if(disposed)return;const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;zoom=Math.max(welcome?10:12,(welcome?3.7:5.0)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const visibility=()=>{walking=0;last=performance.now();};document.addEventListener('visibilitychange',visibility);
  let frames=0;
  const worldPosition=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),corner=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),rayDirection=new THREE.Vector3();
  const occluders=[ground,cliff,trunks,rocks];
  // Screen-space labels must obey scene depth and leave every character's
  // full silhouette clear, even when the camera rotates behind the trail.
  function actorBounds(width,height){
    right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
    return actors.flatMap(({name,sprite})=>{
      sprite.getWorldPosition(worldPosition);
      let left=Infinity,top=Infinity,r=-Infinity,bottom=-Infinity,inFront=false;
      for(const x of [-.5,.5])for(const y of [0,1]){
        corner.copy(worldPosition).addScaledVector(right,x*sprite.scale.x).addScaledVector(up,y*sprite.scale.y).project(camera);
        if(corner.z>-1&&corner.z<1)inFront=true;
        const px=(corner.x*.5+.5)*width,py=(-corner.y*.5+.5)*height;
        left=Math.min(left,px);r=Math.max(r,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
      }
      return inFront?[{name,left,top,right:r,bottom}]:[];
    });
  }
  function placeLevels(){
    const width=container.clientWidth,height=container.clientHeight,bounds=actorBounds(width,height),placed=[];
    container.dataset.actorBounds=JSON.stringify(bounds);
    for(const portal of [...portals].sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position))){
      projected.copy(portal.position).project(camera);
      const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height,r=26;
      let shown=projected.z<1&&projected.z>-1&&x>r&&x<width-r&&y>170&&y<height-145;
      if(shown&&bounds.some(b=>x+r>b.left-8&&x-r<b.right+8&&y+r>b.top-8&&y-r<b.bottom+8))shown=false;
      if(shown&&placed.some(p=>Math.hypot(p.x-x,p.y-y)<50))shown=false;
      if(shown){
        rayDirection.subVectors(portal.position,camera.position);
        raycaster.set(camera.position,rayDirection.clone().normalize());raycaster.far=rayDirection.length()-.25;
        if(raycaster.intersectObjects(occluders,false).length)shown=false;
      }
      portal.button.hidden=!shown;
      if(shown){placed.push({x,y});portal.button.style.left=x+'px';portal.button.style.top=y+'px';}
      portal.ring.material.emissiveIntensity=.55;
    }
    if(!pointer)pins.classList.remove('is-rotating');
  }
  function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;if(ambience.motion)tick+=dt;
    if(walking){progress=THREE.MathUtils.clamp(progress+dt*.027*walking,.008,.87);}
    updateCamera();
    if(now-lastDraw<32)return;lastDraw=now;frames++;
    if(windShader)windShader.uniforms.uWind.value=tick;
    waterTexture.offset.y=-tick*.085;
    clouds.forEach((cloud,i)=>{cloud.position.x=((i*23+tick*.35)%150)-75;});
    // Generated poses are not a consistent animation rig. Keep the native
    // resting pose instead of morphing faces, floating or faking a walk cycle.
    rigged?.play(walking?'walk':'idle');if(ambience.motion)rigged?.update(dt);
    actors.forEach(actor=>{actor.sprite.visible=!rigged;actor.map.offset.x=0;actor.sprite.position.y=actor.baseY;actor.sprite.material.rotation=0;});
    leafParticles.forEach((p,i)=>{matrix.position.set(p.x+Math.sin(tick*.4+p.s)*2,((p.y-tick*.48)%13+13)%13,p.z);matrix.rotation.set(tick*.6+p.s,tick*.4,p.s+tick*.5);matrix.scale.setScalar(1);matrix.updateMatrix();falling.setMatrixAt(i,matrix.matrix);});falling.instanceMatrix.needsUpdate=true;
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);placeLevels();
    renderer.render(scene,camera);
    container.dataset.ready='true';container.dataset.assetsReady=String(pendingTextures===0);container.dataset.frames=String(frames);container.dataset.cameraYaw=yaw.toFixed(2);container.dataset.progress=progress.toFixed(3);container.dataset.motion=String(ambience.motion);container.dataset.animationTime=tick.toFixed(3);
  }
  raf=requestAnimationFrame(frame);
  return()=>{disposed=true;modelAbort.abort();rigged?.dispose();cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);handlers.forEach(([el,event,fn])=>el.removeEventListener(event,fn));for(const resource of resources)resource.dispose?.();renderer.dispose();renderer.forceContextLoss();canvas.remove();pins.remove();};
}
