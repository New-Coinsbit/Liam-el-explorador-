import {readImage} from './api.js';
import {icon} from './components.js';

export const MAX_IMAGES=20;
export const MAX_IMAGE_DATA=28_000_000;

// Keep the selection in memory only; never put school photos in the public cache.
export function mountReinforcementPhotos(root,{images,onChange,onBusy,current}){
 let disposed=false,busy=false,locked=false,stream=null,dialog=null;
 const active=()=>!disposed&&root.isConnected&&current();
 root.innerHTML=`<div id="image-preview" class="school-photos"></div><p id="photo-count" class="muted" role="status"></p><div class="two-cols"><button type="button" class="secondary" id="take-school-photo">${icon('camera')} Tomar foto</button><button type="button" class="secondary" id="choose-school-images">${icon('image')} Elegir imágenes</button></div><input class="file-input" type="file" id="camera-file" accept="image/*" capture="environment"><input class="file-input" type="file" id="gallery-file" accept="image/jpeg,image/png,image/webp" multiple><p class="muted">Hasta 20 imágenes por actividad. Puedes combinar fotos nuevas e imágenes de la galería.</p><p id="photo-message" class="notice" role="status" hidden></p>`;
 const preview=root.querySelector('#image-preview'),count=root.querySelector('#photo-count'),message=root.querySelector('#photo-message');
 const camera=root.querySelector('#camera-file'),gallery=root.querySelector('#gallery-file');
 function tell(text){message.textContent=text;message.hidden=!text;}
 function draw(){
  preview.replaceChildren();
  if(!images.length){const empty=document.createElement('p');empty.className='muted center';empty.textContent='Añade las páginas o actividades que quieras repasar.';preview.append(empty);}
  images.forEach((src,i)=>{
   const figure=document.createElement('figure'),img=document.createElement('img'),remove=document.createElement('button'),caption=document.createElement('figcaption');
   img.src=src;img.alt=`Actividad seleccionada ${i+1}`;img.loading='lazy';
   caption.textContent=`Imagen ${i+1}`;remove.type='button';remove.className='secondary';remove.textContent='Quitar';remove.setAttribute('aria-label',`Quitar imagen ${i+1}`);remove.disabled=busy||locked;
   remove.onclick=()=>{if(busy||locked)return;images=images.filter((_,n)=>n!==i);onChange(images);tell('');draw();};
   figure.append(img,caption,remove);preview.append(figure);
  });
  count.textContent=`${images.length} de ${MAX_IMAGES} imágenes`;
  for(const button of root.querySelectorAll('#take-school-photo,#choose-school-images'))button.disabled=busy||locked||images.length>=MAX_IMAGES;
  camera.disabled=gallery.disabled=busy||locked||images.length>=MAX_IMAGES;
 }
 function setBusy(value){busy=value;onBusy(value);if(active())draw();}
 async function addFiles(files){
  if(!active()||busy||locked||!files.length)return;
  setBusy(true);tell('Preparando imágenes…');let failures=0,overflow=false,lastError='';
  try{
   for(const file of files){
    if(!active())return;
    if(images.length>=MAX_IMAGES){overflow=true;break;}
    try{
     const image=await readImage(file);if(!active())return;
     if(images.reduce((sum,x)=>sum+x.length,0)+image.length>MAX_IMAGE_DATA)throw new Error('El conjunto supera 20 MB. Quita alguna imagen o utiliza fotos más pequeñas.');
     images=[...images,image];onChange(images);draw();
    }catch(e){failures++;lastError=e.message;}
   }
  }finally{if(active()){setBusy(false);tell([overflow?'El máximo es 20 imágenes. Las imágenes restantes no se añadieron.':'',failures?`${failures} imagen(es) no se pudieron añadir. ${lastError}`:''].filter(Boolean).join(' '));}}
 }
 for(const input of [camera,gallery])input.onchange=()=>{const files=Array.from(input.files||[]);input.value='';void addFiles(files);};
 root.querySelector('#choose-school-images').onclick=()=>gallery.click();
 function closeCamera(){stream?.getTracks().forEach(track=>track.stop());stream=null;if(dialog){dialog.close();dialog.remove();dialog=null;}}
 async function openCamera(){
  if(busy||locked||images.length>=MAX_IMAGES)return;
  tell('');
  // The Android host handles capture inputs with ACTION_IMAGE_CAPTURE only.
  if(globalThis.Capacitor?.isNativePlatform?.()||globalThis.LIAM_NATIVE_CONFIG?.apiOrigin){camera.click();return;}
  if(!navigator.mediaDevices?.getUserMedia){tell('Este navegador no permite abrir la cámara. Abre Liam en un navegador con acceso a cámara o utiliza la app Android.');return;}
  setBusy(true);
  dialog=document.createElement('dialog');dialog.className='school-camera';dialog.setAttribute('aria-labelledby','school-camera-title');
  dialog.innerHTML='<h2 id="school-camera-title">Fotografía tu actividad</h2><video autoplay muted playsinline></video><p class="muted" role="status">Abriendo la cámara…</p><div class="two-cols"><button type="button" class="gold-button small" data-capture disabled>Tomar foto</button><button type="button" class="secondary" data-close>Cancelar</button></div>';
  root.append(dialog);const ownDialog=dialog,video=dialog.querySelector('video');
  const cancel=()=>{closeCamera();if(active())setBusy(false);};
  dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});dialog.querySelector('[data-close]').onclick=cancel;dialog.showModal();
  try{
   const opened=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}},audio:false});
   if(!active()||dialog!==ownDialog){opened.getTracks().forEach(track=>track.stop());return;}
   stream=opened;video.srcObject=stream;await video.play();if(!active()||dialog!==ownDialog)return;
   dialog.querySelector('p').textContent='Encuadra la página para que el texto se vea con claridad.';
   const capture=dialog.querySelector('[data-capture]');capture.disabled=false;
   capture.onclick=async()=>{
    if(!video.videoWidth||!video.videoHeight)return;capture.disabled=true;
    const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
    canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
    if(!active()||dialog!==ownDialog)return;
    closeCamera();setBusy(false);if(blob)await addFiles([new File([blob],'actividad.jpg',{type:'image/jpeg'})]);else tell('No se pudo tomar la foto. Inténtalo de nuevo.');
   };
  }catch(e){if(active()&&dialog===ownDialog){cancel();tell(e.name==='NotAllowedError'?'Permite el acceso a la cámara en los ajustes del navegador y vuelve a pulsar Tomar foto.':'No se pudo abrir la cámara. Comprueba que esté disponible y vuelve a intentarlo.');}}
 }
 root.querySelector('#take-school-photo').onclick=()=>void openCamera();
 const hide=()=>{closeCamera();if(active())setBusy(false);};window.addEventListener('pagehide',hide);
 draw();
 return {get busy(){return busy;},setLocked(value){locked=value;draw();},dispose(){disposed=true;closeCamera();window.removeEventListener('pagehide',hide);}};
}
